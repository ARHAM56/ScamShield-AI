import React from 'react';
import { motion } from 'motion/react';
import { Check, Zap, Shield, Crown } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Pricing() {
  const plans = [
    {
      name: "SENTINEL_FREE",
      price: "0",
      features: ["Basic URL Scan", "Community Intelligence", "Standard Dashboard"],
      icon: Shield,
      color: "primary"
    },
    {
      name: "SENTINEL_PRO",
      price: "29",
      features: ["Deep Neural Analysis", "Real-time Call Protection", "Advanced Threat Map", "API Access"],
      icon: Zap,
      color: "tertiary",
      popular: true
    },
    {
      name: "SENTINEL_ENTERPRISE",
      price: "99",
      features: ["Custom ML Training", "Dedicated Security Node", "24/7 Incident Response", "Unlimited Scans"],
      icon: Crown,
      color: "error"
    }
  ];

  return (
    <div className="min-h-screen pt-32 pb-20 px-8 relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-20" />
      
      <div className="relative z-10 max-w-7xl mx-auto space-y-20">
        <div className="text-center space-y-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-7xl font-headline font-black text-white tracking-tighter text-glow"
          >
            MONETIZATION_CORE
          </motion.h1>
          <p className="text-slate-400 font-mono uppercase tracking-[0.4em]">Select your security clearance level</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "glass-panel p-12 rounded-[3rem] border border-white/10 bg-surface/30 backdrop-blur-3xl relative overflow-hidden group hover:border-white/20 transition-all",
                plan.popular && "border-tertiary/50 shadow-[0_0_50px_rgba(255,184,0,0.1)]"
              )}
            >
              {plan.popular && (
                <div className="absolute top-8 right-8 px-4 py-1 bg-tertiary text-black font-mono text-[10px] font-black rounded-full tracking-widest">
                  MOST_POPULAR
                </div>
              )}

              <div className="space-y-8">
                <div className={cn("p-4 rounded-2xl w-fit", plan.color === 'primary' ? 'bg-primary/20 text-primary' : plan.color === 'tertiary' ? 'bg-tertiary/20 text-tertiary' : 'bg-error/20 text-error')}>
                  <plan.icon className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-2xl font-headline font-black text-white uppercase tracking-tight">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-headline font-black text-white">${plan.price}</span>
                    <span className="text-slate-500 font-mono text-sm uppercase">/month</span>
                  </div>
                </div>

                <ul className="space-y-4">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-3 text-slate-400 font-mono text-xs uppercase tracking-wider">
                      <Check className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button className={cn(
                  "w-full py-5 rounded-2xl font-headline font-black text-lg uppercase tracking-widest transition-all shadow-cyber-xl",
                  plan.color === 'primary' ? 'bg-primary text-black hover:shadow-primary/40' : plan.color === 'tertiary' ? 'bg-tertiary text-black hover:shadow-tertiary/40' : 'bg-error text-white hover:shadow-error/40'
                )}>
                  Initialize_Plan
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
