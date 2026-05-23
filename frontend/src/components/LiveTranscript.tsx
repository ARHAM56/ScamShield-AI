import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Shield, Clock, AlertTriangle, MessageSquarePlus, CheckCheck } from 'lucide-react';
import { cn } from '../lib/utils';

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

interface LiveTranscriptProps {
  transcript: TranscriptEntry[];
  isScanning: boolean;
  onReport?: (entry: TranscriptEntry) => void;
  onFeedback?: (entryId: string, actual: 'scam' | 'safe') => void;
  canReport?: boolean;
  liveRecordingText?: string;
}

export default function LiveTranscript({ transcript, isScanning, onReport, onFeedback, canReport = true, liveRecordingText }: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, liveRecordingText]);

  return (
    <div className="glass-panel rounded-[3rem] border-white/5 flex flex-col h-[600px] overflow-hidden">
      <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <h3 className="text-sm font-headline font-black text-white uppercase tracking-widest italic">Live_Transcript_Stream</h3>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-primary/80">Multi_Lang: HI/EN</span>
          <div className="h-4 w-[1px] bg-white/10" />
          <Clock className="w-3 h-3 text-slate-500" />
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {transcript.length === 0 && !isScanning && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-4">
              <Shield className="w-16 h-16 text-slate-500" />
              <p className="font-mono text-xs uppercase tracking-[0.3em]">Awaiting Neural Stream...</p>
            </div>
          )}
          
          {transcript.map((entry, idx) => (
            <motion.div
              key={`${entry.id || idx}-${idx}`}
              initial={{ opacity: 0, x: entry.sender === 'CALLER' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "flex flex-col gap-2",
                entry.sender === 'CALLER' ? "items-start" : "items-end"
              )}
            >
              <div className="flex items-center gap-2 px-2">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{entry.timestamp}</span>
                <span className={cn(
                  "text-[9px] font-mono font-black uppercase tracking-widest",
                  entry.sender === 'CALLER' ? "text-primary" : "text-tertiary"
                )}>
                  {entry.sender}
                </span>
                {entry.language && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-mono uppercase border border-white/5">
                    {entry.language}
                  </span>
                )}
                {entry.emotion && (
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded-full font-mono uppercase border",
                    entry.emotion === 'FEAR' && "bg-error/20 text-error border-error/30",
                    entry.emotion === 'GREED' && "bg-tertiary/20 text-tertiary border-tertiary/30",
                    entry.emotion === 'URGENCY' && "bg-amber-500/20 text-amber-500 border-amber-500/30",
                    entry.emotion === 'AUTHORITY' && "bg-blue-500/20 text-blue-500 border-blue-500/30",
                    entry.emotion === 'NEUTRAL' && "bg-slate-500/20 text-slate-500 border-slate-500/30"
                  )}>
                    Manipulation_Vector: {entry.emotion}
                  </span>
                )}
                {entry.tone && (
                  <span className={cn(
                    "text-[8px] px-1.5 py-0.5 rounded-full font-mono uppercase border",
                    entry.tone === 'ANGRY' && "bg-error/20 text-error border-error/30",
                    entry.tone === 'STRESSED' && "bg-amber-500/20 text-amber-500 border-amber-500/30",
                    entry.tone === 'CALM' && "bg-primary/20 text-primary border-primary/30",
                    entry.tone === 'NEUTRAL' && "bg-slate-500/20 text-slate-500 border-slate-500/30"
                  )}>
                    Voice_Tone: {entry.tone}
                  </span>
                )}
                {entry.reputationCount !== undefined && entry.reputationCount > 0 && (
                   <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-error/20 text-error font-mono uppercase border border-error/20">
                    Banned Pattern Detected ({entry.reputationCount})
                  </span>
                )}
              </div>
              
              <div className={cn(
                "max-w-[80%] p-5 rounded-3xl text-sm font-mono leading-relaxed relative group transition-all",
                entry.sender === 'CALLER' 
                  ? "bg-white/5 border border-white/10 text-white rounded-tl-none" 
                  : "bg-primary/10 border border-primary/20 text-primary rounded-tr-none",
                entry.isRisk && "border-error/50 bg-error/5 text-error shadow-[0_0_20px_rgba(255,77,77,0.1)]"
              )}>
                {entry.isRisk && (
                  <div className="absolute -top-2 -right-2 bg-error text-white p-1 rounded-full shadow-lg">
                    <AlertTriangle className="w-3 h-3" />
                  </div>
                )}
                {entry.text}

                {entry.insights && (
                  <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/40 italic flex items-start gap-2">
                    <Shield className="w-3 h-3 mt-0.5 text-primary/50" />
                    <span>AI insight: {entry.insights}</span>
                  </div>
                )}

                {entry.sender === 'CALLER' && onReport && (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onReport(entry)}
                      disabled={entry.isReported || !canReport}
                      className={cn(
                        "mt-4 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest transition-all",
                        entry.isReported 
                          ? "text-primary opacity-100" 
                          : !canReport
                            ? "text-slate-600 cursor-not-allowed opacity-50"
                            : "text-slate-500 hover:text-white"
                      )}
                    >
                      {entry.isReported ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : !canReport ? (
                        <Shield className="w-3 h-3 opacity-30" />
                      ) : (
                        <MessageSquarePlus className="w-3 h-3" />
                      )}
                      {entry.isReported 
                        ? 'Reported to Intellectual DB' 
                        : !canReport 
                          ? 'Intel_Sharing: Locked (Auth Required)' 
                          : 'Report as Scam'}
                    </button>
                    {!canReport && !entry.isReported && (
                      <span className="text-[8px] font-mono text-slate-600 uppercase tracking-tighter">
                         Enable "Anonymous" Auth inside Firebase Console to activate global grid sync.
                      </span>
                    )}

                    {onFeedback && !entry.feedbackSubmitted && (
                      <div className="flex gap-4 mt-2 border-t border-white/5 pt-2">
                        <span className="text-[8px] font-mono text-slate-500 uppercase flex items-center">Neural_Feedback:</span>
                        <button 
                          onClick={() => onFeedback(entry.id, 'scam')}
                          className="text-[9px] font-mono font-bold text-error hover:text-white transition-colors"
                        >
                          [CONFIRM_SCAM]
                        </button>
                        <button 
                          onClick={() => onFeedback(entry.id, 'safe')}
                          className="text-[9px] font-mono font-bold text-primary hover:text-white transition-colors"
                        >
                          [MARK_SAFE]
                        </button>
                      </div>
                    )}
                    {entry.feedbackSubmitted && (
                      <div className="mt-2 border-t border-white/5 pt-2">
                        <span className="text-[8px] font-mono text-tertiary uppercase italic flex items-center gap-2">
                          <CheckCheck className="w-2 h-2" />
                          Reinforcement_Signal_Sent
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          
          {liveRecordingText && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-2 items-start"
            >
              <div className="flex items-center gap-2 px-2">
                <span className="text-[9px] font-mono text-primary uppercase tracking-widest animate-pulse">● LIVE_TRANSCRIBING</span>
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">USER_MIC_STREAM</span>
              </div>
              <div className="max-w-[80%] p-5 rounded-3xl text-sm font-mono leading-relaxed bg-white/5 border border-primary/40 text-white rounded-tl-none relative shadow-[0_0_20px_rgba(142,213,255,0.1)]">
                {liveRecordingText}
                <span className="inline-block w-1.5 h-4 ml-1.5 bg-primary animate-pulse" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
