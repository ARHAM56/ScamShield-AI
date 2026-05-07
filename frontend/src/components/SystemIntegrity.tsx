import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Cpu, Activity, Zap, Database, Globe, Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export default function SystemIntegrity() {
  const [dbStatus, setDbStatus] = useState({ state: 'Analyzing', load: 12 });
  const [authStatus, setAuthStatus] = useState({ state: 'Analyzing', load: 5 });
  const [neuralCore, setNeuralCore] = useState({ state: 'Optimal', load: 42 });

  useEffect(() => {
    const checkSystems = async () => {
      try {
        // Test Firestore Link
        const q = query(collection(db, 'reports'), limit(1));
        await getDocs(q);
        setDbStatus({ state: 'Synced', load: 18 });
      } catch (e) {
        setDbStatus({ state: 'Restricted', load: 45 });
      }

      // Check Auth
      if (auth.currentUser) {
        setAuthStatus({ state: 'Secure', load: 8 });
      } else {
        setAuthStatus({ state: 'Passive', load: 15 });
      }

      // Check Neural Health
      try {
        const res = await fetch('/api/health');
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setNeuralCore({ 
          state: data.ai_status === 'SIMULATED' ? 'Simulated' : 
                 data.ai_status === 'ONLINE' ? 'Optimal' : 'Offline', 
          load: data.ai_status === 'SIMULATED' ? 12 : 42 
        });
      } catch (e) {
        setNeuralCore({ state: 'Offline', load: 0 });
      }
    };

    checkSystems();
    const interval = setInterval(checkSystems, 10000);
    return () => clearInterval(interval);
  }, []);

  const systems = [
    { name: 'Neural_Core_v4', status: neuralCore.state, load: neuralCore.load, icon: Cpu },
    { name: 'Global_Threat_DB', status: dbStatus.state, load: dbStatus.load, icon: Database },
    { name: 'RealTime_Interceptor', status: 'Active', load: 64, icon: Zap },
    { name: 'Edge_Nodes', status: 'Operational', load: 31, icon: Globe },
    { name: 'Encryption_Layer', status: authStatus.state, load: authStatus.load, icon: Lock },
  ];

  return (
    <div className="space-y-12 py-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-headline font-black text-white uppercase tracking-tighter italic flex items-center gap-4">
          <Activity className="text-primary" />
          System_Integrity_Matrix
        </h1>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em]">Core Infrastructure & Neural Health</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          {systems.map((system, i) => (
            <motion.div
              key={system.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-6 rounded-[2rem] flex items-center gap-6 group hover:border-primary/30 transition-all"
            >
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-primary/10 transition-colors">
                <system.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-sm font-headline font-black text-white uppercase tracking-wider">{system.name}</h3>
                    <p className="text-[10px] font-mono text-primary uppercase font-bold tracking-widest">{system.status}</p>
                  </div>
                  <span className="text-xs font-mono text-slate-500 uppercase">Load: {system.load}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${system.load}%` }}
                    className="h-full bg-primary shadow-[0_0_10px_#8ed5ff]"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-8">
          <div className="glass-panel p-10 rounded-[3rem] border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Activity className="w-48 h-48 text-primary" />
            </div>
            <div className="relative z-10 space-y-6">
              <h3 className="text-2xl font-headline font-black text-white uppercase tracking-tight italic">Neural_Load_Distribution</h3>
              <div className="flex items-center gap-8">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-white/5"
                    />
                    <motion.circle
                      cx="64"
                      cy="64"
                      r="58"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="364.4"
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 * (1 - 0.82) }}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-headline font-black text-white italic">82%</span>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                      <span>Processing Power</span>
                      <span className="text-primary">82%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[82%] bg-primary" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                      <span>Memory Allocation</span>
                      <span className="text-tertiary">64%</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[64%] bg-tertiary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] border-white/5">
            <h3 className="text-lg font-headline font-black text-white uppercase tracking-tight mb-4 italic">Security_Protocols</h3>
            <div className="space-y-3">
              {[
                'Quantum_Encryption_Active',
                'Multi_Factor_Neural_Sync',
                'Zero_Trust_Architecture',
                'Real_Time_Heuristic_Analysis'
              ].map((protocol) => (
                <div key={protocol} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{protocol}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
