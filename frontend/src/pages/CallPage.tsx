import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Phone, Shield, AlertCircle, Terminal, Activity, Mic, MicOff, PlayCircle, Loader2, Globe, Database, AlertTriangle, CheckCircle, Clock, X, FileText, MessageSquare } from 'lucide-react';
import { useCallDetection } from '../hooks/useCallDetection';
import CallDetector from '../components/CallDetector';
import LiveTranscript from '../components/LiveTranscript';
import RiskBadge from '../components/RiskBadge';
import RiskAlert from '../components/RiskAlert';
import { cn } from '../lib/utils';

export default function CallPage() {
  const { 
    isScanning, 
    riskScore, 
    transcript, 
    startDetection,
    stopDetection,
    errorMessage,
    processTranscript,
    transcribeAudio,
    reportScam,
    submitFeedback,
    isReportingAvailable,
    isRetraining,
    voiceTone,
    detectedIntent,
    showBreachModal,
    setShowBreachModal
  } = useCallDetection();

  const handleReport = async (entry: any) => {
    await reportScam(entry);
  };

  const handleFeedback = async (entryId: string, actual: 'scam' | 'safe') => {
    await submitFeedback(entryId, actual);
  };

  const [testInput, setTestInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveRecordingText, setLiveRecordingText] = useState('');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const recognitionTextRef = useRef<string>('');

  const [postCallDetail, setPostCallDetail] = useState<{
    text: string;
    isRisk: boolean;
    score: number;
    language: string;
    emotion: string;
    tone: string;
    intent: string;
    insight: string;
  } | null>(null);

  const handleTest = async () => {
    if (testInput.trim()) {
      const textToScan = testInput;
      setTestInput('');
      const report = await processTranscript(textToScan);
      if (report) {
        setPostCallDetail(report);
      }
    }
  };

  const [micError, setMicError] = useState<string | null>(null);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      audioChunksRef.current = [];

      // Local Client-side Speech Recognition as an instant high-fidelity fallback and booster
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const rec = new SpeechRecognitionClass();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';
          recognitionTextRef.current = '';
          setLiveRecordingText('');
          
          rec.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              const transcriptSegment = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcriptSegment;
              } else {
                interimTranscript += transcriptSegment;
              }
            }
            
            const words = (recognitionTextRef.current + (finalTranscript ? ' ' + finalTranscript : '') + (interimTranscript ? ' ' + interimTranscript : '')).trim();
            setLiveRecordingText(words);
            
            if (finalTranscript) {
              recognitionTextRef.current = (recognitionTextRef.current + ' ' + finalTranscript).trim();
            }
          };
          
          rec.onerror = (recErr: any) => {
            console.warn("[SPEECH_REC_WARN]", recErr);
          };
          
          rec.onend = () => {
            console.log("[SPEECH_REC_END]");
          };
          
          recognitionRef.current = rec;
          rec.start();
        } catch (recStartErr) {
          console.warn("[SPEECH_REC_START_ERR]", recStartErr);
        }
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        setIsTranscribing(true);
        setLiveRecordingText('');
        
        // Stop browser speech recognition if running
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {}
        }
        
        // Let's wait a tiny bit to make sure final speech recognition results are accumulated
        await new Promise(r => setTimeout(r, 600));

        const spokenCandidateText = recognitionTextRef.current.trim();
        console.log("[FINAL_SPEECH_REC_TRANSCRIPT]:", spokenCandidateText);

        if (spokenCandidateText) {
          // Process strictly the exact words spoken by the user via microphone
          console.log("[GENUINE_USER_SPEECH]:", spokenCandidateText);
          const analysisResult = await processTranscript(spokenCandidateText);
          if (analysisResult) {
            setPostCallDetail(analysisResult);
          }
          setIsTranscribing(false);
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        if (audioChunksRef.current.length === 0) {
          setIsTranscribing(false);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          if (base64) {
            const res = await transcribeAudio(base64, mimeType);
            if (res && res.analysis) {
              setPostCallDetail(res.analysis);
            }
          }
          setIsTranscribing(false);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access failed:', err);
      setMicError('Microphone access denied or not supported. Please check browser permissions.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && isRecording) {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="space-y-8 py-8">
      {/* Neural Core Manual Injector */}
      <div className="glass-panel p-6 rounded-[2.5rem] border-primary/20 bg-primary/5 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
          <input 
            type="text" 
            value={testInput} 
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="NEURAL_INJECT: Simulate incoming voice text (e.g. 'I need your OTP')..."
            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-[10px] font-mono text-white focus:outline-none focus:border-primary/50"
            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "p-3 rounded-2xl transition-all duration-300 relative",
              isRecording 
                ? "bg-error text-white shadow-[0_0_20px_rgba(255,77,77,0.4)]" 
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            )}
          >
            {isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            {isRecording && (
              <span className="absolute -top-1 -right-1 block w-3 h-3 bg-error rounded-full animate-ping" />
            )}
          </button>
          <button 
            onClick={handleTest}
            disabled={!testInput.trim()}
            className="flex-1 md:flex-none px-8 py-3 bg-primary text-black rounded-2xl text-[10px] font-mono font-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-30 flex items-center justify-center gap-3 transition-all"
          >
            <Activity className="w-4 h-4" />
            Inject
          </button>
        </div>
      </div>

      {errorMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-4 text-error"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-mono uppercase tracking-wider">{errorMessage}</p>
        </motion.div>
      )}

      {micError && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center gap-4 text-error"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-xs font-mono uppercase tracking-wider">{micError}</p>
        </motion.div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-headline font-black text-white uppercase tracking-tighter italic flex items-center gap-4">
            <Shield className="text-primary" />
            Neural_Interceptor
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em]">Central Registry Interface . Secure Node: ARHAM</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="px-6 py-3 rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-[0_0_20px_rgba(100,200,255,0.2)]">
            <Mic className="w-4 h-4 text-secondary" />
            ASR: whisper-base-ar-quran
          </div>

          <div className="px-6 py-3 rounded-2xl border border-primary/20 bg-primary/10 text-primary font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-cyber-glow">
            <Globe className="w-4 h-4 animate-spin-slow" />
            Distributed_Node: Mumbai_Edge_01
          </div>
          
          {isRetraining && (
            <div className="px-6 py-3 rounded-2xl border border-tertiary/20 bg-tertiary/10 text-tertiary font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-[0_0_20px_rgba(255,200,100,0.2)] animate-pulse">
              <Database className="w-4 h-4 animate-bounce" />
              Syncing_Global_Delta...
            </div>
          )}
          
          <div className="px-6 py-3 rounded-2xl border border-primary/20 bg-primary/10 text-primary font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-cyber-glow">
            <Activity className="w-4 h-4 animate-pulse" />
            Neural_Stream: Active
          </div>

          <div className={cn(
            "px-6 py-3 rounded-2xl border font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 transition-all duration-500",
            voiceTone === 'ANGRY' && "border-error/40 bg-error/10 text-error shadow-[0_0_20px_rgba(255,77,77,0.3)]",
            voiceTone === 'STRESSED' && "border-amber-500/40 bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]",
            voiceTone === 'CALM' && "border-primary/40 bg-primary/10 text-primary shadow-[0_0_20px_rgba(142,213,255,0.3)]",
            voiceTone === 'NEUTRAL' && "border-slate-500/40 bg-slate-500/10 text-slate-500"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              voiceTone === 'ANGRY' && "bg-error animate-ping",
              voiceTone === 'STRESSED' && "bg-amber-500 animate-pulse",
              voiceTone === 'CALM' && "bg-primary animate-pulse",
              voiceTone === 'NEUTRAL' && "bg-slate-500"
            )} />
            Tone: {voiceTone}
          </div>
          
          <RiskBadge score={riskScore} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Control Panel */}
        <div className="lg:col-span-4 space-y-6">
          <CallDetector 
            isScanning={isScanning} 
            onStart={startDetection} 
            onStop={stopDetection}
          />
          
          <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
            <div className="flex items-center gap-3">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Voice Intensity</span>
                  <span className={cn(
                    "text-[10px] font-mono font-bold",
                    voiceTone === 'ANGRY' ? "text-error" : "text-primary"
                  )}>
                    {voiceTone === 'ANGRY' ? 'HIGH' : voiceTone === 'STRESSED' ? 'ELEVATED' : 'STABLE'}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "30%" }}
                    animate={{ 
                      width: voiceTone === 'ANGRY' ? "95%" : voiceTone === 'STRESSED' ? "75%" : voiceTone === 'CALM' ? "40%" : "20%",
                      backgroundColor: voiceTone === 'ANGRY' ? "#ff4d4d" : voiceTone === 'STRESSED' ? "#f59e0b" : "#8ed5ff"
                    }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Latency</span>
                <span className="text-xs font-mono text-primary">24ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Packet Loss</span>
                <span className="text-xs font-mono text-primary">0.02%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Neural Load</span>
                <span className="text-xs font-mono text-primary">14%</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 text-primary">
                <Activity className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Processing_Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Transcript */}
        <div className="lg:col-span-8">
          <LiveTranscript 
            transcript={transcript} 
            isScanning={isScanning} 
            onReport={handleReport}
            onFeedback={handleFeedback}
            canReport={isReportingAvailable}
            liveRecordingText={liveRecordingText}
          />
        </div>
      </div>

      {/* Critical Alert Overlay */}
      {showBreachModal && (
        <RiskAlert 
          score={riskScore} 
          scamType={detectedIntent} 
          onTerminate={() => {
            stopDetection();
            setShowBreachModal(false);
          }} 
          onDismiss={() => setShowBreachModal(false)}
        />
      )}

      {/* Post-Call Conversation Analysis Alert Modal */}
      {postCallDetail && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          id="post-call-analysis-overlay"
          className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-surface/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            className={cn(
              "max-w-xl w-full glass-panel p-8 rounded-[2.5rem] border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.6)] relative overflow-hidden space-y-6",
              postCallDetail.isRisk 
                ? "border-error/40 shadow-[0_0_80px_rgba(255,77,77,0.15)]" 
                : "border-primary/40 shadow-[0_0_80px_rgba(142,213,255,0.15)]"
            )}
          >
            {/* Close Button top-right */}
            <button 
              onClick={() => setPostCallDetail(null)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Backdrop Circle */}
            <div className={cn(
              "absolute -top-16 -left-16 w-48 h-48 blur-3xl opacity-25 rounded-full pointer-events-none",
              postCallDetail.isRisk ? "bg-error" : "bg-primary"
            )} />

            {/* Title Icon and Identification */}
            <div className="flex items-center gap-4 relative z-10 select-none">
              <div className={cn(
                "p-3 rounded-2xl border",
                postCallDetail.isRisk 
                  ? "bg-error/10 border-error/30 text-error animate-pulse" 
                  : "bg-primary/10 border-primary/30 text-primary"
              )}>
                {postCallDetail.isRisk ? <AlertTriangle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest block">
                  Conversational AI Scanner
                </span>
                <h3 className="text-2xl font-headline font-black uppercase italic tracking-tight text-white">
                  {postCallDetail.isRisk ? "Threat_Detected_Alert" : "Conversation_Verified_Safe"}
                </h3>
              </div>
            </div>

            {/* Converted Speech text display */}
            <div className="space-y-2 relative z-10">
              <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase select-none">
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /> Converted Speech Text:</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-500" /> ASR Streamed</span>
              </div>
              <div className="p-5 rounded-2xl bg-black/60 border border-white/5 text-xs font-mono text-white leading-relaxed italic relative">
                <span className="absolute -top-2 left-4 px-2 py-0.5 bg-black/80 border border-white/10 text-[7px] font-bold text-slate-400 uppercase tracking-widest rounded-md pointer-events-none select-none">Speech-To-Text Output</span>
                "{postCallDetail.text}"
              </div>
            </div>

            {/* Telemetry & Metrics panel */}
            <div className="space-y-4 relative z-10">
              {/* Risk Slider bar */}
              <div className="space-y-2 select-none">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Threat Vector Risk</span>
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    postCallDetail.isRisk ? "text-error animate-pulse" : "text-primary"
                  )}>
                    {postCallDetail.score}% ({postCallDetail.isRisk ? 'CRITICAL_RISK' : 'SAFE'})
                  </span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${postCallDetail.score}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      postCallDetail.isRisk ? "bg-error" : "bg-primary"
                    )}
                  />
                </div>
              </div>

              {/* Badges and Attributes */}
              <div className="grid grid-cols-2 gap-4 select-none">
                <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">Affective Tone</span>
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      postCallDetail.tone === 'ANGRY' ? "bg-error" : postCallDetail.tone === 'STRESSED' ? "bg-amber-500" : "bg-primary"
                    )} />
                    {postCallDetail.tone}
                  </span>
                </div>
                
                <div className="p-3.5 rounded-xl border border-white/5 bg-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-slate-500 uppercase block">Recognized Intent</span>
                  <span className="text-xs font-mono font-bold text-primary truncate block uppercase">
                    {postCallDetail.intent.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Intelligence Insight box */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/5 text-[10px] font-mono text-slate-300 leading-normal flex gap-2 w-full items-start">
                <MessageSquare className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider block">Neural Security Insight:</span>
                  <p className="uppercase">{postCallDetail.insight}</p>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-4 pt-2 relative z-10">
              {postCallDetail.isRisk ? (
                <button
                  onClick={async () => {
                    await reportScam({
                      id: `temp-${Date.now()}`,
                      text: postCallDetail.text,
                      isRisk: true,
                      language: postCallDetail.language,
                      tone: postCallDetail.tone,
                      sender: 'CALLER',
                      timestamp: new Date().toLocaleTimeString()
                    });
                    setPostCallDetail(null);
                  }}
                  className="w-full bg-error hover:bg-error/90 text-white font-headline font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase italic text-xs tracking-wider shadow-[0_0_20px_rgba(255,77,77,0.2)]"
                >
                  <AlertCircle className="w-4 h-4" />
                  Report Threat
                </button>
              ) : (
                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-primary font-mono text-[9px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 select-none text-center">
                  <Shield className="w-4 h-4" />
                  Verified Legit
                </div>
              )}
              
              <button
                onClick={() => setPostCallDetail(null)}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-mono text-[10px] uppercase font-bold py-4 rounded-xl border border-white/10 transition-all tracking-widest text-center"
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
