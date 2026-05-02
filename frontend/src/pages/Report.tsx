import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Megaphone, ShieldAlert, Send, FileText, Globe, Lock, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Report() {
  const [formData, setFormData] = useState({
    type: 'PHISHING_URL',
    content: '',
    description: '',
    urgency: 'MEDIUM'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      await response.json();
      setSubmitted(true);
    } catch (error) {
      console.error('Report submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-8 bg-primary/10 rounded-full border-4 border-primary shadow-cyber-glow"
        >
          <Send className="w-16 h-16 text-primary" />
        </motion.div>
        <div className="space-y-2">
          <h2 className="text-4xl font-headline font-black text-white uppercase tracking-tighter italic">Intelligence_Received</h2>
          <p className="text-on-surface-variant font-mono uppercase tracking-widest">Your report has been integrated into the Neural Network.</p>
        </div>
        <button 
          onClick={() => setSubmitted(false)}
          className="px-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-headline font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Submit_Another_Report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-12">
      <div className="space-y-2">
        <h1 className="text-4xl font-headline font-black text-white uppercase tracking-tighter italic flex items-center gap-4">
          <Megaphone className="text-primary" />
          Threat_Intake_Portal
        </h1>
        <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em]">Contribute to Global Phishing Intelligence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass-panel p-10 rounded-[3rem] space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-2">Threat_Type</label>
              <div className="grid grid-cols-2 gap-4">
                {['PHISHING_URL', 'SCAM_EMAIL', 'SMS_SMISHING', 'VOICE_SCAM'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type })}
                    className={cn(
                      "py-4 rounded-2xl border font-mono text-[10px] font-bold uppercase tracking-widest transition-all",
                      formData.type === type 
                        ? "bg-primary/10 border-primary text-primary shadow-cyber-glow" 
                        : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                    )}
                  >
                    {type.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-2">Evidence_Content (URL/EMAIL/TEXT)</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Paste the suspicious content here..."
                rows={4}
                className="w-full bg-surface/50 border border-white/5 rounded-3xl p-6 text-white font-mono text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700"
              />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] block ml-2">Context_Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe the threat context..."
                className="w-full bg-surface/50 border border-white/5 rounded-2xl p-6 text-white font-mono text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-black font-headline font-black py-6 rounded-3xl flex items-center justify-center gap-3 transition-all disabled:opacity-50 group"
            >
              {isSubmitting ? <Activity className="animate-spin" /> : <Send className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              <span className="text-xl uppercase italic tracking-tighter">Transmit_Intelligence</span>
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-8 rounded-[2rem] border-primary/20">
            <ShieldAlert className="w-8 h-8 text-primary mb-4" />
            <h3 className="text-lg font-headline font-black text-white uppercase tracking-tight mb-2">Anonymity_Protocol</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed font-mono uppercase">
              All reports are encrypted and stripped of PII before neural integration. Your identity remains protected.
            </p>
          </div>
          <div className="glass-panel p-8 rounded-[2rem]">
            <Globe className="w-8 h-8 text-tertiary mb-4" />
            <h3 className="text-lg font-headline font-black text-white uppercase tracking-tight mb-2">Global_Impact</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed font-mono uppercase">
              Your contribution helps protect 14M+ users worldwide by updating our real-time blacklist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
