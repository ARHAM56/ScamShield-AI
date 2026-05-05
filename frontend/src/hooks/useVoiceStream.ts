import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";

const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

// Helper to add WAV header (16kHz, mono, 16-bit PCM)
function addWavHeader(pcmData: Uint8Array): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const sampleRate = 16000;
  
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmData.length, true); // size
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // length
  view.setUint16(20, 1, true); // type (PCM)
  view.setUint16(22, 1, true); // channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmData.length, true);

  const wav = new Uint8Array(44 + pcmData.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcmData, 44);
  return wav;
}

export function useVoiceStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<{ text: string, score: number, timestamp: string, analysis?: any }[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const audioBufferRef = useRef<number[]>([]);
  const isTranscribingRef = useRef(false);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeTranscript = async (text: string) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: `Analyze this call snippet for scam risk: "${text}". Return JSON: { "risk_score": number, "scam_type": string, "warning_message": string }` }] }],
        config: { responseMimeType: "application/json" }
      });
      
      const result = JSON.parse(response.text || '{}');
      return { 
        risk_score: result.risk_score || 45, 
        scam_type: result.scam_type || "UNKNOWN", 
        warning_message: result.warning_message || "Processing..." 
      };
    } catch (e) {
      console.error('[VOICE_HOOK] AI Analysis failed:', e);
      return { risk_score: 45, scam_type: "UNKNOWN", warning_message: "Processing..." };
    }
  };

  const transcribeAudio = async () => {
    if (audioBufferRef.current.length < 32000 || isTranscribingRef.current) return;
    
    isTranscribingRef.current = true;
    try {
      // Get current buffer and clear it
      const pcmData = new Uint8Array(audioBufferRef.current);
      audioBufferRef.current = [];
      
      const wavData = addWavHeader(pcmData);
      const base64Wav = btoa(String.fromCharCode(...wavData));

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcribe this audio call snippet. Listen carefully for phishing or scam attempts. Return ONLY the transcription text." },
              { inlineData: { mimeType: "audio/wav", data: base64Wav } }
            ]
          }
        ]
      });

      const transcriptText = response.text;
      if (transcriptText && transcriptText.trim()) {
        console.log('[VOICE_HOOK] Neural Transcribe:', transcriptText);
        
        // Analyze and broadcast
        const analysis = await analyzeTranscript(transcriptText);
        
        socketRef.current?.send(JSON.stringify({
          type: 'FINAL_TRANSCRIPTION',
          text: transcriptText,
          risk_score: analysis.risk_score
        }));
      }
    } catch (e) {
      console.error('[VOICE_HOOK] Transcription failed:', e);
    } finally {
      isTranscribingRef.current = false;
    }
  };

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/api/voice-stream`);

    socket.onopen = () => {
      console.log('[VOICE_HOOK] WebSocket Connected');
      setIsConnected(true);
    };

    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'AUDIO_CHUNK') {
          setIsSpeaking(true);
          if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 500);

          // Decode base64 and add to buffer
          const binary = atob(data.audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          audioBufferRef.current.push(...Array.from(bytes));
          
          // Trigger transcription if we have enough (~2 seconds at 16kHz)
          if (audioBufferRef.current.length >= 64000) {
            transcribeAudio();
          }
        }

        if (data.type === 'TRANSCRIPTION') {
          setTranscripts(prev => [...prev, {
            text: data.text,
            score: data.risk_score,
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } catch (e) {
        // Not JSON or parse error, ignore
      }
    };

    socket.onclose = () => {
      console.log('[VOICE_HOOK] WebSocket Disconnected');
      setIsConnected(false);
    };

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.close();
  }, []);

  const sendSimulatedTranscript = useCallback((text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(`SIM_TRANSCRIPT:${text}`);
    }
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, []);

  return [isConnected, transcripts, connect, disconnect, sendSimulatedTranscript, isSpeaking] as const;
}
