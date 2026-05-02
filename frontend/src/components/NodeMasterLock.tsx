import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Cpu, Activity, AlertTriangle, Key } from 'lucide-react';

interface NodeMasterLockProps {
  onUnlock: () => void;
}

export default function NodeMasterLock({ onUnlock }: NodeMasterLockProps) {
  const [inputKey, setInputKey] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'VERIFYING' | 'DENIED' | 'GRANTED'>('IDLE');
  const [attempts, setAttempts] = useState(0);

  // Arham's Master Neural Key
  const MASTER_KEY = 'ARHAM_SENTINEL_777';

  const handleVerify = () => {
    setStatus('VERIFYING');
    
    setTimeout(() => {
      if (inputKey === MASTER_KEY) {
        setStatus('GRANTED');
        setTimeout(onUnlock, 1500);
        localStorage.setItem('ARHAM_NODE_SESSION', 'ACTIVE');
      } else {
        setStatus('DENIED');
        setAttempts(prev => prev + 1);
        setTimeout(() => setStatus('IDLE'), 2000);
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[999] bg-black flex items-center justify-center p-6 overflow-hidden">
      {/* Background Matrix-like glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,163,0.05)_0%,transparent_100%)]" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative bg-black border border-primary/20 rounded-[3rem] p-10 shadow-[0_0_50px_rgba(0,255,163,0.1)]"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black border border-primary/20 p-4 rounded-2xl">
          <Shield className={`w-8 h-8 ${status === 'DENIED' ? 'text-error animate-shake' : 'text-primary'}`} />
        </div>

        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl font-headline font-black text-white uppercase tracking-tighter italic">
            Node_Master_Lock
          </h2>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">
            Authorized Personnel Only: [ARHAM_NODE]
          </p>
        </div>

        <div className="space-y-6">
          <div className="relative">
            <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
            <input 
              type="password"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="ENTER_NEURAL_KEY..."
              className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs font-mono text-white focus:outline-none focus:border-primary/50 placeholder:text-slate-700 transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>

          <button 
            onClick={handleVerify}
            disabled={status !== 'IDLE' || !inputKey}
            className={`w-full py-4 rounded-2xl font-mono text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${
              status === 'GRANTED' ? 'bg-primary text-black' :
              status === 'DENIED' ? 'bg-error/20 text-error border border-error/30' :
              'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'
            }`}
          >
            {status === 'VERIFYING' ? (
              <>
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent animate-spin rounded-full" />
                Validating_Node...
              </>
            ) : status === 'GRANTED' ? (
              <>
                <Cpu className="w-4 h-4" />
                Access_Granted
              </>
            ) : status === 'DENIED' ? (
              <>
                <AlertTriangle className="w-4 h-4" />
                Invalid_Signature
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Authorize_Node
              </>
            )}
          </button>
        </div>

        {attempts > 2 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3 text-error"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[9px] font-mono uppercase font-bold tracking-tight">Warning: Excessive unauthorized sync attempts logs reported to Neural Registry.</span>
          </motion.div>
        )}

        <div className="mt-8 pt-8 border-t border-white/5 flex justify-between items-center text-[8px] font-mono text-slate-600 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Bio_Metric_Ready
          </div>
          <div>AES_256_ACTIVE</div>
        </div>
      </motion.div>

      {/* Grid Scan Effect */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,163,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,163,0.1)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>
    </div>
  );
}
