import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, Sparkles, ShieldCheck, AlertCircle, Cpu, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { getApiUrl } from '../lib/api';

export default function GPTPage() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;

    setIsAnalyzing(true);
    setAnalysis(null);

    try {
      const res = await fetch(getApiUrl('/api/v1/ai/analyze'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Analyze this content for phishing or social engineering: "${input}"`,
          schema: {
            type: 'object',
            properties: {
              summary: { type: 'string' },
              risk_level: { type: 'string' },
              indicators: { 
                type: 'array',
                items: { type: 'string' }
              },
              recommendation: { type: 'string' }
            }
          }
        })
      });
      
      if (!res.ok) throw new Error(`Neural Link Offline: ${res.statusText}`);
      const result = await res.json();
      setAnalysis(result);
    } catch (error: any) {
      console.error('GPT Analysis failed:', error);
      setAnalysis({
        summary: `Neural analysis failed: ${error.message || 'Connection error'}.`,
        risk_level: "UNKNOWN",
        indicators: ["CONNECTION_TIMEOUT"],
        recommendation: "Retry the scan or check system integrity."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 bg-tertiary/10 rounded-3xl border border-tertiary/20 mb-4">
          <Bot className="w-10 h-10 text-tertiary" />
        </div>
        <h1 className="text-5xl font-headline font-black text-white uppercase tracking-tighter italic">
          Neural_GPT <span className="text-tertiary">v2.0</span>
        </h1>
        <p className="text-on-surface-variant font-mono uppercase tracking-[0.2em]">Deep Semantic Analysis & Behavioral Reasoning</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-8 rounded-[3rem] border-tertiary/20 shadow-[0_0_40px_rgba(255,193,116,0.1)]">
            <form onSubmit={handleAnalyze} className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">Semantic_Intake</label>
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3 h-3 text-tertiary" />
                    <span className="text-[9px] font-mono text-tertiary uppercase">LLM_CORE: READY</span>
                  </div>
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="PASTE SUSPICIOUS EMAIL, CHAT LOG, OR SCRIPT FOR DEEP NEURAL ANALYSIS..."
                  rows={10}
                  className="w-full bg-surface/50 border border-white/5 rounded-[2rem] p-8 text-white font-mono text-sm focus:outline-none focus:border-tertiary/50 transition-all placeholder:text-slate-700 leading-relaxed"
                />
              </div>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="w-full bg-tertiary hover:bg-tertiary/90 text-black font-headline font-black py-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all disabled:opacity-50 group"
              >
                {isAnalyzing ? <Zap className="animate-spin" /> : <Sparkles className="group-hover:rotate-12 transition-transform" />}
                <span className="text-xl uppercase italic tracking-tighter">Execute_Deep_Scan</span>
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-center space-y-6 glass-panel rounded-[3rem] p-12"
              >
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-tertiary/20 border-t-tertiary rounded-full animate-spin" />
                  <Bot className="absolute inset-0 m-auto w-8 h-8 text-tertiary animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight italic">Reasoning...</h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Deconstructing Semantic Vectors</p>
                </div>
              </motion.div>
            ) : analysis ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className={cn(
                  "glass-panel p-8 rounded-[2.5rem] border-2",
                  analysis.risk_level === 'CRITICAL' ? "border-error/50" : "border-primary/50"
                )}>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Risk_Assessment</span>
                    <span className={cn(
                      "px-4 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-widest",
                      analysis.risk_level === 'CRITICAL' ? "bg-error text-white" : "bg-primary text-black"
                    )}>
                      {analysis.risk_level}
                    </span>
                  </div>
                  <p className="text-sm text-white font-mono leading-relaxed italic">
                    "{analysis.summary}"
                  </p>
                </div>

                <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
                  <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-tertiary" />
                    Behavioral_Indicators
                  </h4>
                  <div className="space-y-3">
                    {(analysis.indicators || []).map((indicator: string, i: number) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5"
                      >
                        <div className="w-1 h-1 bg-tertiary rounded-full mt-1.5" />
                        <span className="text-[11px] font-mono text-slate-300 uppercase leading-tight">{indicator}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 p-6 rounded-[2rem] flex items-start gap-4">
                  <ShieldCheck className="w-6 h-6 text-primary shrink-0" />
                  <div className="space-y-1">
                    <h5 className="text-xs font-headline font-black text-primary uppercase tracking-tight">Recommendation</h5>
                    <p className="text-[10px] font-mono text-on-surface-variant uppercase leading-relaxed">
                      {analysis.recommendation}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-6 glass-panel rounded-[3rem] p-12 opacity-40">
                <Bot className="w-16 h-16 text-slate-500" />
                <div className="space-y-2">
                  <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight italic">Awaiting_Input</h3>
                  <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Neural reasoning engine idle</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
