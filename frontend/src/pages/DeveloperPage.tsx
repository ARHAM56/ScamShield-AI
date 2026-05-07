import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Terminal, Key, Shield, Network, Activity, Cpu, Database, Eye, EyeOff, Copy, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

import { getApiUrl } from '../lib/api';

export default function DeveloperPage() {
  const [keys, setKeys] = useState<any[]>([]);
  const [showKeyId, setShowKeyId] = useState<string | null>(null);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/keys'))
      .then(async res => {
        const text = await res.text();
        if (!res.ok) throw new Error(`HTTP_${res.status}: ${text}`);
        return JSON.parse(text);
      })
      .then(data => setKeys(data?.keys || []))
      .catch(err => {
        console.error('[DEV] Key retrieval failure:', err);
        setKeys([]);
      });
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 sm:px-10 lg:px-20 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <span className="text-primary font-mono text-xs font-bold uppercase tracking-[0.4em] mb-4 block">DEVELOPER_NODE_v1.0</span>
        <h1 className="text-6xl font-black italic tracking-tighter text-white mb-6 uppercase">
          Neural_SaaS<span className="text-primary text-4xl">.hub</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl font-medium leading-relaxed">
          Integrate the world's most powerful conversational risk engine into your own fintech or telecom platform.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* API Keys Panel */}
          <div className="glass-panel p-10 rounded-[3rem] border border-white/5">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary/10">
                  <Key className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white italic uppercase tracking-tight">Access_Credentials</h3>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Manage your neural interface keys</p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/5 text-xs font-mono font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-black transition-all">
                <Plus className="w-4 h-4" />
                Generate_Key
              </button>
            </div>

            <div className="space-y-4">
              {keys.map((k) => (
                <div key={k.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row justify-between gap-6 hover:border-primary/20 transition-all">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-white uppercase italic">{k.name}</span>
                      <span className="text-[10px] font-mono text-slate-600">ID: {k.id}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/5 font-mono text-xs">
                      <span className="text-slate-500 overflow-hidden text-ellipsis">
                        {showKeyId === k.id ? k.key : '••••••••••••••••••••••••'}
                      </span>
                      <div className="flex items-center gap-2 ml-auto">
                        <button onClick={() => setShowKeyId(showKeyId === k.id ? null : k.id)} className="p-2 hover:text-primary transition-colors">
                          {showKeyId === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button className="p-2 hover:text-primary transition-colors">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex sm:flex-col justify-between sm:text-right">
                    <span className="text-[10px] font-mono text-slate-600 uppercase">Created: {k.created}</span>
                    <span className="text-[10px] font-mono text-primary uppercase font-bold">Status: Active</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Start Guide */}
          <div className="glass-panel p-10 rounded-[3rem] border border-white/5 font-mono">
            <div className="flex items-center gap-4 mb-8">
              <Terminal className="w-5 h-5 text-tertiary" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Neural_Integration_Guide</h3>
            </div>
            <div className="bg-black/60 p-6 rounded-2xl border border-white/5 text-[11px] leading-relaxed space-y-4 text-slate-400">
              <p className="text-primary">// Step 1: Initialize Neural Interceptor</p>
              <p className="text-white">{"const response = await fetch('https://neural-core.ai/v1/analyze', {"}</p>
              <p className="pl-4">method: 'POST',</p>
              <p className="pl-4 text-tertiary">headers: {"{ 'Authorization': 'Bearer YOUR_API_KEY' }"},</p>
              <p className="pl-4">body: {"JSON.stringify({ text: 'Bank alert: Transfer...' })"}</p>
              <p className="text-white">{"});"}</p>
              <p className="text-primary mt-6">// Result includes multi-vector risk scores & emotion DNA</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="glass-panel p-10 rounded-[3rem] border border-white/5 space-y-8">
            <h3 className="text-sm font-mono font-bold text-slate-500 uppercase tracking-widest">SaaS_Pulse_Metrics</h3>
            
            {[
              { label: 'API Uptime', value: '99.99%', color: 'text-primary', icon: Activity },
              { label: 'Neural Throughput', value: '1.2M req/sec', color: 'text-white', icon: Cpu },
              { label: 'Global Memory nodes', value: '42 Active', color: 'text-tertiary', icon: Globe },
              { label: 'Intelligence sync', value: '0.4s', color: 'text-white', icon: Database },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 text-slate-600" />
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-tight">{item.label}</span>
                </div>
                <span className={cn("text-sm font-mono font-bold", item.color)}>{item.value}</span>
              </div>
            ))}

            <div className="pt-6 border-t border-white/5">
              <button className="w-full py-4 rounded-2xl bg-primary text-black text-xs font-black uppercase tracking-widest italic hover:scale-105 transition-all">
                Upgrade_To_Enterprise
              </button>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[2.5rem] border border-error/20 bg-error/5 space-y-4">
             <div className="flex items-center gap-3 text-error">
               <Shield className="w-5 h-5 shadow-[0_0_10px_rgba(255,77,77,0.5)]" />
               <h4 className="text-xs font-mono font-bold uppercase tracking-widest leading-none">Security_Health</h4>
             </div>
             <p className="text-[10px] font-mono text-slate-500 uppercase leading-relaxed">
               All API traffic is protected by AES-256 and monitored for pattern injection attacks.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Globe(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
