import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, XCircle, PhoneOff, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface RiskAlertProps {
  score: number;
  scamType?: string | null;
  onTerminate: () => void;
  onDismiss?: () => void;
}

export default function RiskAlert({ score, scamType, onTerminate, onDismiss }: RiskAlertProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-surface/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full glass-panel p-10 rounded-[3rem] border-error/50 shadow-[0_0_100px_rgba(255,77,77,0.2)] text-center space-y-8"
      >
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-error/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative p-6 bg-error/10 rounded-full border-2 border-error">
            <ShieldAlert className="w-12 h-12 text-error" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-4xl font-headline font-black text-white uppercase tracking-tighter italic">Critical_Threat</h2>
            {scamType && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-2 px-6 bg-error text-white font-mono text-xs font-black rounded-lg inline-block shadow-[0_0_20px_rgba(255,77,77,0.4)] border border-white/20 mb-2 uppercase tracking-widest"
              >
                Category: {scamType}
              </motion.div>
            )}
            <p className="text-xs font-mono text-error uppercase tracking-[0.3em] font-bold">Scam Pattern Detected (Confidence: {score}%)</p>
          </div>
        </div>

        <p className="text-sm text-on-surface-variant font-mono leading-relaxed uppercase">
          Neural analysis has identified high-probability social engineering tactics. Immediate termination recommended.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={onTerminate}
            className="w-full bg-error text-white font-headline font-black py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-error/90 transition-all shadow-lg uppercase italic tracking-tighter text-xl"
          >
            <PhoneOff className="w-6 h-6" />
            Terminate_Call
          </button>
          
          <button
            onClick={onDismiss}
            className="w-full bg-white/5 border border-white/10 text-slate-400 font-mono text-[10px] py-4 rounded-2xl hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            Ignore (Not Recommended)
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-[9px] font-mono text-slate-600 uppercase tracking-widest">
          <Zap className="w-3 h-3" />
          <span>Sentinel_Neural_Shield_v4.2</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
