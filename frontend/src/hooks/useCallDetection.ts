import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth, waitForAuth, handleFirestoreError } from '../lib/firebase';

import { getAi, MODEL_NAME, Type } from '../lib/gemini';
import { getApiUrl } from '../lib/api';

// [SENTINEL_RISK_ENGINE] Strategy-based analysis pipeline
const analyzeIntentVector = async (text: string, tone: string, recentScams: string[] = []) => {
  const sanitizedScams = (recentScams || []).map(s => s.length > 200 ? s.substring(0, 200) + '...' : s);
  const memoryContext = sanitizedScams.length > 0 
    ? `\n[NEURAL_MEMORY] Pattern_Delta: ${sanitizedScams.join(' | ')}`
    : "";

  const ai = getAi();
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `[SYSTEM_DIRECTIVE]: You are a Multi-Vector Scam Detection Engine. 
      Analyze the conversation intent using: Behavioral Heuristics, Manipulation Vectors, and Neural Memory.
      
      ${memoryContext}
      Current_Tone_Feedback: ${tone}
      
      Detection Requirements:
      1. Emotion Classification: [FEAR, URGENCY, GREED, AUTHORITY, NEUTRAL]
      2. Intent Pattern: [FINANCIAL_FRAUD, SPOOFING, ACCOUNT_THREAT, SOCIAL_ENGINEERING, SAFE]
      3. Risk Weight: 0-100 (Scale with Tone/Emotion)
      4. Insight: Professional security brief.
      
      Input: "${text}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING },
          emotion: { type: Type.STRING },
          risk: { type: Type.NUMBER },
          language: { type: Type.STRING },
          insight: { type: Type.STRING },
          cleanedText: { type: Type.STRING }
        },
        required: ["intent", "emotion", "risk", "language", "insight", "cleanedText"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

interface TranscriptEntry {
  id: string;
  text: string;
  sender: 'CALLER' | 'SYSTEM';
  timestamp: string;
  isRisk?: boolean;
  language?: string;
  emotion?: string;
  tone?: string;
  insights?: string;
  isReported?: boolean;
  reputationCount?: number;
  feedbackSubmitted?: boolean;
}

export enum BluetoothStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

export function useCallDetection() {
  const [isScanning, setIsScanning] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isBluetoothConnected] = useState(true);
  const [connectionStatus] = useState<BluetoothStatus>(BluetoothStatus.CONNECTED);
  const [errorMessage] = useState<string | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [voiceTone, setVoiceTone] = useState<'CALM' | 'STRESSED' | 'ANGRY' | 'NEUTRAL'>('NEUTRAL');
  const [detectedIntent, setDetectedIntent] = useState<string | null>(null);
  const [showBreachModal, setShowBreachModal] = useState(false);

  // Fetch recent scam intel for "Neural Memory"
  const getRecentScamIntel = async () => {
    try {
      const q = query(collection(db, 'reports'), where('riskScore', '>=', 80), orderBy('riskScore', 'desc'), limit(5));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data().content).filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  const connectBluetooth = useCallback(async () => {
    // Manual connection no longer required
  }, []);

  const startDetection = useCallback(() => {
    setIsScanning(true);
    setRiskScore(0);
    setDetectedIntent(null);
    setShowBreachModal(false);
    setTranscript([]);
  }, []);

  const checkReputation = async (text: string) => {
    try {
      await waitForAuth();
      const q = query(collection(db, 'reports'), where('content', '==', text.trim()));
      const snap = await getDocs(q);
      return snap.size;
    } catch (e) {
      console.error('Reputation check failed:', e);
      handleFirestoreError(e, 'list', 'reports');
      return 0;
    }
  };

  const reportScam = async (entry: TranscriptEntry) => {
    try {
      const user = await waitForAuth();
      if (!user) {
        console.warn('🛡️ Reporting blocked: Anonymous Auth not enabled in Firebase Console.');
        return;
      }

      setIsRetraining(true);
      
      await addDoc(collection(db, 'reports'), {
        content: entry.text.trim(),
        riskScore: entry.isRisk ? 90 : 10,
        reporterId: (user as any).uid,
        createdAt: serverTimestamp(),
        metadata: {
          language: entry.language || 'unknown',
          isVoice: true
        }
      });
      
      setTranscript(prev => prev.map(t => 
        t.id === entry.id ? { ...t, isReported: true } : t
      ));

      // Simulate neural context shift
      setTimeout(() => setIsRetraining(false), 3000);
    } catch (e) {
      console.error('Reporting failed:', e);
      handleFirestoreError(e, 'create', 'reports');
      setIsRetraining(false);
    }
  };

  const processTranscript = useCallback(async (text: string) => {
    setIsScanning(true);
    
    // [PIPELINE_INIT]: Create preliminary entry
    const entryId = `live-${Date.now()}`;
    const currentTone = voiceTone;

    setTranscript(prev => [...prev, {
      id: entryId,
      text: text,
      sender: 'CALLER',
      timestamp: new Date().toLocaleTimeString(),
      tone: currentTone
    }]);

    try {
      // [STEP_1]: Fetch Intelligence Memory
      const recentScams = await getRecentScamIntel();
      
      // [STEP_2]: Execute Intelligence Pipeline
      const result = await analyzeIntentVector(text, currentTone, recentScams);

      // [STEP_3]: Multi-Vector Risk Calibration
      let calculatedRisk = result.risk || 0;
      const weights = { 
        FEAR: 20, URGENCY: 20, GREED: 25, AUTHORITY: 15, 
        ANGRY: 15, STRESSED: 10 
      };
      
      if (result.emotion) calculatedRisk += (weights[result.emotion as keyof typeof weights] || 0);
      if (currentTone) calculatedRisk += (weights[currentTone as keyof typeof weights] || 0);
      
      // [STEP_4]: Global Reputation Verification
      const reputationCount = await checkReputation(result.cleanedText || text);
      calculatedRisk = reputationCount > 0 ? 99 : Math.min(100, calculatedRisk);

      // [STEP_5]: Neural Context Sync
      setTranscript(prev => prev.map(item => 
        item.id === entryId 
          ? { 
              ...item, 
              text: result.cleanedText || item.text, 
              isRisk: calculatedRisk > 45,
              language: result.language,
              emotion: result.emotion,
              tone: currentTone,
              insights: reputationCount > 0 
                ? `[CRITICAL_THREAT] Reputation Match (${reputationCount}x). Vector: ${result.intent}.`
                : `[${result.intent}] ${result.insight} (Confidence: ${Math.round(calculatedRisk)}%)`,
              reputationCount
            } 
          : item
      ));

      if (calculatedRisk > 45) {
        setRiskScore(prev => Math.max(prev, calculatedRisk));
        if (calculatedRisk > 75) {
          setDetectedIntent(result.intent || 'SUSPICIOUS_PATTERN');
          setShowBreachModal(true);
        }
      }
    } catch (e: any) {
      console.error('Detection pipeline fault:', e);
    } finally {
      setIsScanning(false);
    }
  }, [voiceTone]);

  const transcribeAudio = useCallback(async (base64Audio: string, mimeType: string) => {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [
          { text: "Analyze this audio snippet. 1. Transcribe the speech accurately (Hindi/English/Hinglish). 2. Detect the speaker's TONE (Choose EXACTLY ONE from [ANGRY, STRESSED, CALM, NEUTRAL]). Return JSON: { 'text': string, 'tone': string }. If no speech, text should be '[NO_SPEECH]' and tone 'NEUTRAL'." },
          { inlineData: { mimeType, data: base64Audio } }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              tone: { type: Type.STRING }
            },
            required: ["text", "tone"]
          }
        }
      });

      const resultData = JSON.parse(response.text || '{}');
      
      const transcriptText = resultData.text;
      const detectedTone = resultData.tone || 'NEUTRAL';

      setVoiceTone(detectedTone as any);

      if (transcriptText && transcriptText.trim() && !transcriptText.includes('[NO_SPEECH]')) {
        await processTranscript(transcriptText);
      } else {
        setTranscript(prev => [...prev, {
          id: `sys-${Date.now()}`,
          text: "Neural Link: Passive scanning active, but no clear voice recognized.",
          sender: 'SYSTEM',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (e: any) {
      console.error('Transcription Protocol Failure:', e);
      const errorMsg = e.message || "Signal processing fault.";
      setTranscript(prev => [...prev, {
        id: `sys-err-${Date.now()}`,
        text: `Neural Link Error: ${errorMsg}`,
        sender: 'SYSTEM',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }, [processTranscript]);

  const stopDetection = useCallback(() => {
    setIsScanning(false);
    setRiskScore(0);
    setDetectedIntent(null);
    setShowBreachModal(false);
  }, []);

  // [RL_STRATEGY]: Reinforcement Learning Feedback Loop
  const submitFeedback = useCallback(async (entryId: string, actual: 'scam' | 'safe') => {
    const entry = transcript.find(t => t.id === entryId);
    if (!entry) return;

    try {
      await fetch(getApiUrl('/api/v1/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detectionId: entryId,
          actual,
          predicted: entry.isRisk ? 'scam' : 'safe',
          text: entry.text,
          confidence: riskScore
        })
      });
      
      setTranscript(prev => prev.map(t => 
        t.id === entryId ? { ...t, feedbackSubmitted: true } : t
      ));
    } catch (e) {
      console.error('Feedback loop failure:', e);
    }
  }, [transcript, riskScore]);

  return {
    isScanning,
    riskScore,
    transcript,
    isBluetoothConnected,
    connectBluetooth,
    startDetection,
    stopDetection,
    processTranscript,
    transcribeAudio,
    reportScam,
    submitFeedback,
    isReportingAvailable: !!auth.currentUser,
    isRetraining,
    voiceTone,
    detectedIntent,
    showBreachModal,
    setShowBreachModal,
    connectionStatus,
    errorMessage
  };
}
