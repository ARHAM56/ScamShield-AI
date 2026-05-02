import React from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, Globe, Database, Activity, Cpu, Lock, Network, Share2, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

export default function PitchPage() {
  const slides = [
    {
      title: "SCAMSHIELD AI: THE FUTURE OF CALL PROTECTION",
      subtitle: "Detecting Intent, Not Just Numbers",
      icon: Shield,
      content: "Current systems fail because they rely on static number databases. ScamShield analyzes the DNA of the conversation in real-time.",
      stats: ["700M+ Users Affected", "10B+ Global Fraud Loss", "1.2s Detection Latency"]
    },
    {
      title: "THE NEURAL PIPELINE",
      subtitle: "Architecture for Unlimited Scale",
      icon: Network,
      content: "Distributed edge nodes capture audio, stream to GPU-accelerated microservices, and process multi-vector risk scores via transformers.",
      stats: ["Distributed Edge Computing", "Multi-Vector Analysis", "Automated Policy Updates"]
    },
    {
      title: "DISTRIBUTED INTELLIGENCE",
      subtitle: "Global Network Immunity",
      icon: Globe,
      content: "When one node reports a new scam pattern, the entire global network is retrained within seconds. This is collective immunity.",
      stats: ["Zero-Day Protection", "Network-Wide Sync", "Decentralized Intel"]
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-20 px-6 sm:px-10 lg:px-20 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-20 text-center"
      >
        <span className="text-primary font-mono text-xs font-bold uppercase tracking-[0.4em] mb-4 block">INVESTOR_PRESENTATION_v2.0</span>
        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-white mb-6">
          NEURAL_CORE<span className="text-primary text-3xl md:text-5xl">.ai</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
          The world's first decentralized, conversational intelligence engine designed to eradicate phone-based financial fraud.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-32">
        {slides.map((slide, i) => (
          <motion.div
            key={slide.title}
            initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="glass-panel p-10 rounded-[3rem] border border-white/5 group hover:border-primary/30 transition-all duration-700"
          >
            <div className="p-4 rounded-3xl bg-primary/10 w-fit mb-8 group-hover:bg-primary/20 transition-colors">
              <slide.icon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-black text-white italic tracking-tight mb-2 uppercase">{slide.title}</h3>
            <p className="text-primary text-xs font-mono font-bold tracking-widest mb-6">{slide.subtitle}</p>
            <p className="text-slate-400 leading-relaxed mb-8">{slide.content}</p>
            
            <div className="space-y-3">
              {slide.stats.map(stat => (
                <div key={stat} className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
                  <Zap className="w-3 h-3 text-tertiary" />
                  {stat}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel p-12 rounded-[4rem] border border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full -mr-48 -mt-48" />
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl font-black italic text-white tracking-tighter mb-8 uppercase leading-none">
              Scaling to <br/><span className="text-primary text-7xl">1M+ NODES</span>
            </h2>
            <div className="space-y-6">
              {[
                { label: "GPU CONCURRENCY", value: "99.9% Latency Target", icon: Cpu },
                { label: "DISTRIBUTED REPLICATION", value: "Redis-backed Real-time Sync", icon: Layers },
                { label: "NEURAL ZERO-TRUST", value: "End-to-end Encrypted Transcription", icon: Lock }
              ].map(item => (
                <div key={item.label} className="flex gap-4">
                  <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <item.icon className="w-5 h-5 text-tertiary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">{item.label}</p>
                    <p className="text-white font-medium">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-black/40 rounded-[3rem] p-8 border border-white/5 font-mono text-[10px] text-slate-400">
            <div className="flex justify-between mb-4 border-b border-white/5 pb-4">
              <span className="text-primary font-bold">SYSTEM_HEALTH: STABLE</span>
              <span className="animate-pulse">● LIVE_TELEMETRY</span>
            </div>
            <div className="space-y-2">
              <p>{">"} INITIALIZING DISTRIBUTED_REPLICATION...</p>
              <p>{">"} CONNECTING TO MUMBAI_EDGE_01... OK</p>
              <p>{">"} LOADING NEURAL_STRATEGY_FACTORY... OK</p>
              <p>{">"} HYDRATING MEMORY_CACHE from REDIS_CLUSTER... DONE</p>
              <p className="text-tertiary">{">"} SCALING_K8S_PODS: ACTIVE [CPU: 24.2%]</p>
              <p>{">"} NOISE_CANCELLATION: ENABLED</p>
              <p>{">"} EMOTION_VECTORS: SYNCED</p>
              <p className="text-error">{">"} ANOMALY_DETECTED: SPOOFING_SIGNATURE_42</p>
              <p>{">"} BROADCASTING_THREAT_DELTA... SUCCESS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
