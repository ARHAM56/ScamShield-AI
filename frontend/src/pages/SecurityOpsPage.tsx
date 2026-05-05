import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldAlert, ShieldCheck, Activity, Terminal, Zap, Lock, Globe, AlertTriangle, Eye, Server, Radio, Database } from 'lucide-react';
import { cn } from '../lib/utils';

import { getApiUrl } from '../lib/api';

export default function SecurityOpsPage() {
  const [metrics, setMetrics] = useState<any>({
    blockedAttacks: 0,
    activeThreats: 0,
    riskScoreAverage: 0,
    uptime: "100%",
    nodeCount: 0
  });
  const [logs, setLogs] = useState<any[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastDefense, setLastDefense] = useState<any>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(getApiUrl('/api/v1/security/metrics'));
      const data = await res.json();
      if (data.metrics) setMetrics(data.metrics);
      if (data.logs) setLogs(data.logs);
    } catch (e) {
      console.error('Telemetric failure:', e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const simulateAttack = async (type: string) => {
    setIsSimulating(true);
    setLastDefense(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/security/simulate-attack'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      setLastDefense(data);
      fetchMetrics();
    } catch (e) {
      console.error('Simulation fault:', e);
    } finally {
      setTimeout(() => setIsSimulating(false), 2000);
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 sm:px-10 lg:px-20 max-w-7xl mx-auto space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row justify-between items-end gap-8"
      >
        <div>
          <span className="text-secondary font-mono text-xs font-bold uppercase tracking-[0.4em] mb-4 block">SIEM_TELEMETRY_CENTER</span>
          <h1 className="text-6xl font-black italic tracking-tighter text-white uppercase italic">
            Security_Ops<span className="text-secondary text-4xl">.v2</span>
          </h1>
        </div>
        <div className="flex gap-4 p-2 bg-white/5 rounded-3xl border border-white/10">
           <div className="px-6 py-3 rounded-2xl bg-secondary/10 text-secondary font-mono text-[10px] font-bold uppercase flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
             NEURAL_FIREWALL: ACTIVE
           </div>
           <div className="px-6 py-3 rounded-2xl bg-white/5 text-slate-400 font-mono text-[10px] font-bold uppercase flex items-center gap-3">
             UPTIME: {metrics?.uptime || "100%"}
           </div>
        </div>
      </motion.div>

      {/* Real-time Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: "Blocked_Attacks", value: metrics?.blockedAttacks || 0, icon: ShieldCheck, color: "text-secondary", bg: "bg-secondary/5" },
          { label: "Active_Threats", value: metrics?.activeThreats || 0, icon: Activity, color: "text-error", bg: "bg-error/5" },
          { label: "Memory_Nodes", value: metrics?.nodeCount || 0, icon: Database, color: "text-primary", bg: "bg-primary/5" },
          { label: "Risk_Horizon", value: `${metrics?.riskScoreAverage || 0}%`, icon: Radio, color: "text-tertiary", bg: "bg-tertiary/5" }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn("glass-panel p-8 rounded-[3rem] border border-white/5 group", stat.bg)}
          >
            <div className={cn("p-4 rounded-2xl bg-white/5 w-fit mb-4", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h2 className={cn("text-4xl font-black italic tracking-tighter mt-1", stat.color)}>{stat.value}</h2>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* SIEM Live Feed */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="glass-panel p-10 rounded-[3rem] border border-white/5 flex flex-col h-full min-h-[600px]">
             <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-4">
                 <Terminal className="w-6 h-6 text-secondary" />
                 <h2 className="text-xl font-bold text-white uppercase italic tracking-tight">Neural_SIEM_Logs</h2>
               </div>
               <span className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                 <Activity className="w-3 h-3 text-secondary" /> 
                 LIVE_STREAMING
               </span>
             </div>

             <div className="flex-1 space-y-3 font-mono text-[10px] overflow-y-auto max-h-[500px] scrollbar-hide">
               <AnimatePresence mode='popLayout'>
                 {(logs || []).map((log) => (
                   <motion.div
                     key={log.id}
                     initial={{ opacity: 0, x: -20 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className={cn(
                       "p-4 rounded-xl border flex items-center justify-between group hover:bg-white/5 transition-all",
                       log.severity === 'CRITICAL' ? 'bg-error/10 border-error/20 text-error' :
                       log.severity === 'HIGH' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                       'bg-white/5 border-white/10 text-slate-400'
                     )}
                   >
                     <div className="flex items-center gap-4">
                       <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                       <span className="font-bold">[{log.type}]</span>
                       <span className="text-white/80">{log.message}</span>
                     </div>
                     <div className="flex items-center gap-4">
                       <span className="opacity-50">IP: {log.ip}</span>
                       <div className={cn(
                         "px-2 py-0.5 rounded-full text-[8px] font-black",
                         log.severity === 'CRITICAL' ? 'bg-error text-black' :
                         log.severity === 'HIGH' ? 'bg-amber-500 text-black' :
                         'bg-white/10 text-white'
                       )}>
                         {log.severity}
                       </div>
                     </div>
                   </motion.div>
                 ))}
               </AnimatePresence>
             </div>
          </div>
        </div>

        {/* Attack Simulator & Defensive Policy */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-panel p-10 rounded-[3rem] border border-white/5">
             <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest mb-8">Attack_Simulator</h3>
             <div className="space-y-4">
               {[
                 { id: 'PROMPT_INJECTION', label: 'Prompt Injection', color: 'bg-amber-500' },
                 { id: 'SPOOFING', label: 'Identity Spoofing', color: 'bg-error' },
                 { id: 'DDOS', label: 'Neural Flood (DDoS)', color: 'bg-blue-500' }
               ].map(attack => (
                 <button
                   key={attack.id}
                   disabled={isSimulating}
                   onClick={() => simulateAttack(attack.id)}
                   className="w-full p-6 rounded-2xl bg-white/5 border border-white/5 text-left group hover:border-white/20 transition-all flex justify-between items-center"
                 >
                   <div>
                     <p className="text-white font-bold text-xs uppercase tracking-tight">{attack.label}</p>
                     <p className="text-[10px] font-mono text-slate-500">Trigger standard attack vector</p>
                   </div>
                   <Zap className={cn("w-4 h-4 text-slate-600 group-hover:text-white transition-colors", isSimulating && "animate-pulse")} />
                 </button>
               ))}
             </div>

             <AnimatePresence>
               {lastDefense && (
                 <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0 }}
                   className="mt-8 p-6 rounded-2xl bg-secondary/10 border border-secondary/20"
                 >
                    <div className="flex items-center gap-3 text-secondary mb-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Neural_Response_Report</span>
                    </div>
                    <p className="text-xs text-white font-bold mb-1">{lastDefense.threat}</p>
                    <p className="text-[10px] text-secondary/80 font-mono italic">{lastDefense.defense}</p>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          <div className="glass-panel p-10 rounded-[3rem] border border-white/5 space-y-6">
             <h3 className="text-sm font-bold text-white italic uppercase tracking-tight flex items-center gap-3">
               <Lock className="w-4 h-4 text-secondary" />
               Zero_Trust_Posture
             </h3>
             <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                   <span className="text-[10px] font-mono text-slate-400 uppercase">MFA_ENFORCED</span>
                   <div className="w-8 h-4 bg-secondary/20 border border-secondary/50 rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-secondary rounded-full" />
                   </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                   <span className="text-[10px] font-mono text-slate-400 uppercase">GEO_FENCING</span>
                   <div className="w-8 h-4 bg-secondary/20 border border-secondary/50 rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-secondary rounded-full" />
                   </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                   <span className="text-[10px] font-mono text-slate-400 uppercase">DEVICE_INTEGRITY</span>
                   <div className="w-8 h-4 bg-secondary/20 border border-secondary/50 rounded-full relative">
                      <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-secondary rounded-full" />
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
