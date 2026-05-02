import React from 'react';
import { Shield, ShieldAlert, BarChart3, Map as MapIcon, Phone, Bot, Cpu, CreditCard, ShieldCheck, Megaphone, LineChart, Globe, Sparkles, Activity, Mic, Network, Zap, Code, Terminal as TerminalAlt, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const navItems = [
    { id: 'scan', label: 'Scan', icon: Shield, mobileIcon: ShieldCheck },
    { id: 'call', label: 'Call', icon: Phone, mobileIcon: Phone },
    { id: 'gpt', label: 'GPT', icon: Bot, mobileIcon: Sparkles },
    { id: 'report', label: 'Report', icon: ShieldAlert, mobileIcon: Megaphone },
    { id: 'stats', label: 'Stats', icon: BarChart3, mobileIcon: LineChart },
    { id: 'integrity', label: 'Integrity', icon: Cpu, mobileIcon: Activity },
    { id: 'map', label: 'Map', icon: MapIcon, mobileIcon: Globe },
    { id: 'pricing', label: 'Pricing', icon: CreditCard, mobileIcon: CreditCard },
    { id: 'pitch', label: 'Neural', icon: Network, mobileIcon: Zap },
    { id: 'developer', label: 'SaaS', icon: Code, mobileIcon: TerminalAlt },
    { id: 'secops', label: 'SecOps', icon: ShieldAlert, mobileIcon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary/30">
      {/* Top Bar */}
      <header className="fixed top-0 z-50 w-full bg-surface/60 backdrop-blur-2xl border-b border-white/5 shadow-cyber-xl">
        <div className="flex justify-between items-center px-8 py-5">
          <div className="flex items-center gap-4 cursor-pointer group" onClick={() => setActiveTab('stats')}>
            <div className="relative">
              <Shield className="text-primary w-7 h-7 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_#8ed5ff]" />
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase font-headline text-glow">SENTINEL_v1.0</h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden md:flex gap-8 items-center">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "text-[11px] font-mono uppercase tracking-[0.3em] transition-all cursor-pointer relative py-2",
                    activeTab === item.id ? "text-primary font-bold" : "text-on-surface-variant hover:text-primary/70"
                  )}
                >
                  {item.label}
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="activeNav"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_#8ed5ff]"
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
            <div className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/20 flex items-center gap-3 shadow-cyber-glow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-[0.2em]">CORE_LINK: ACTIVE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface/40 backdrop-blur-3xl border-r border-white/5 shadow-cyber-xl hidden md:flex flex-col gap-2 p-6 pt-28 z-40">
        <div className="mb-8 px-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-4 bg-primary rounded-full" />
            <span className="text-primary font-black text-xs uppercase tracking-[0.3em]">COMMAND_CENTER</span>
          </div>
          <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest pl-3">Neural_Interface_v4.2</p>
        </div>
        <nav className="flex flex-col gap-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ease-out cursor-pointer group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-primary/10 text-primary shadow-cyber-glow border border-primary/20" 
                  : "text-on-surface-variant hover:bg-white/5 hover:text-primary/70"
              )}
            >
              <div className={cn(
                "absolute inset-y-0 left-0 w-1 bg-primary transition-transform duration-300",
                activeTab === item.id ? "scale-y-100" : "scale-y-0"
              )} />
              <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === item.id ? "text-primary drop-shadow-[0_0_8px_#8ed5ff]" : "text-on-surface-variant")} />
              <span className="font-headline font-bold text-sm uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div 
          onClick={() => setActiveTab('integrity')}
          className="mt-auto p-6 glass-panel rounded-3xl border border-white/5 relative group overflow-hidden cursor-pointer hover:border-primary/40 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg cyber-glow group-hover:scale-110 transition-transform">
              <LineChart className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[10px] font-mono text-on-surface uppercase tracking-[0.2em] group-hover:text-primary transition-colors">System_Integrity</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                <span>Neural Load</span>
                <span className="text-primary">82%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '82%' }}
                  className="h-full bg-primary shadow-[0_0_10px_#8ed5ff]"
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase">
                <span>Node Sync</span>
                <span className="text-tertiary">94%</span>
              </div>
              <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '94%' }}
                  className="h-full bg-tertiary shadow-[0_0_10px_#ffc174]"
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="md:ml-72 pt-32 pb-24 md:pb-8 px-8 min-h-screen relative">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-7xl mx-auto"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center pb-4 pt-2 bg-surface/90 backdrop-blur-md border-t border-sky-400/20 md:hidden shadow-[0_-4px_20px_rgba(56,189,248,0.1)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              activeTab === item.id ? "text-primary scale-110" : "text-on-surface-variant opacity-60"
            )}
          >
            <item.mobileIcon className="w-6 h-6" />
            <span className="font-mono text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Decorative Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-[0.05]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(142,213,255,0.08),transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-surface/0 via-surface/20 to-surface" />
      </div>
    </div>
  );
}
