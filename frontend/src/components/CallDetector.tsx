import React from 'react';
import { motion } from 'motion/react';
import { Shield, ShieldAlert, Zap, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface CallDetectorProps {
  isScanning: boolean;
  onStart: () => void;
  onStop: () => void;
  isDisabled?: boolean;
}

export default function CallDetector({ isScanning, onStart, onStop }: CallDetectorProps) {
  return (
    <div className="glass-panel p-10 rounded-[3rem] border-primary/20 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Shield className="w-32 h-32 text-primary" />
      </div>
      
      <div className="relative z-10 space-y-8">
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">Neural Interception Engine v4.2</p>
        </div>

        <div className="flex flex-col gap-4">
          {!isScanning ? (
            <button
              onClick={onStart}
              className="w-full bg-primary hover:bg-primary/90 text-black font-headline font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all group/btn shadow-cyber-xl"
            >
              <Zap className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
              <span className="text-xl uppercase italic tracking-tighter">Initiate_Protection</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="w-full bg-error hover:bg-error/90 text-white font-headline font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all group/btn shadow-[0_0_30px_rgba(255,77,77,0.3)]"
            >
              <ShieldAlert className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
              <span className="text-xl uppercase italic tracking-tighter">Terminate_Scan</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Engine Status</span>
            <div className="flex items-center gap-2">
              <div className={cn("w-1.5 h-1.5 rounded-full", isScanning ? "bg-primary animate-pulse" : "bg-slate-700")} />
              <span className="text-[10px] font-mono text-white uppercase">{isScanning ? 'Running' : 'Standby'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-mono text-slate-500 uppercase">Detection Mode</span>
            <span className="text-[10px] font-mono text-white uppercase block">Neural_Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}
