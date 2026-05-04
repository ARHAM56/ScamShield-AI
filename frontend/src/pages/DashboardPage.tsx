import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, ShieldAlert, Activity, Globe, Zap, ArrowUpRight, ShieldCheck, Clock, MessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { cn } from '../lib/utils';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [riskTrendData, setRiskTrendData] = useState<any[]>([]);
  const [emotionStats, setEmotionStats] = useState<any[]>([
    { name: 'FEAR', count: 42, color: '#ff4d4d' },
    { name: 'GREED', count: 38, color: '#8dff74' },
    { name: 'URGENCY', count: 56, color: '#f59e0b' },
    { name: 'AUTHORITY', count: 24, color: '#3b82f6' },
    { name: 'NEUTRAL', count: 12, color: '#64748b' }
  ]);
  const [dbCount, setDbCount] = useState(0);

  useEffect(() => {
    // Mock backend stats
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => setStats(data || { vectors: [] }));

    // Real-time Intelligence Feed from Firestore
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentReports(reports.slice(0, 5));
      
      // Transform for trend chart
      const trend = reports.reverse().map((r: any) => ({
        time: r.createdAt?.toDate?.() ? new Date(r.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '---',
        score: r.riskScore || 0
      }));
      setRiskTrendData(trend);

      // Emotion stats for the bar chart
      const emotions = reports.reduce((acc: any, curr: any) => {
        const emo = curr.emotion || 'NEUTRAL';
        acc[emo] = (acc[emo] || 0) + 1;
        return acc;
      }, {});

      setEmotionStats([
        { name: 'FEAR', count: emotions['FEAR'] || 12, color: '#ff4d4d' },
        { name: 'GREED', count: emotions['GREED'] || 8, color: '#8dff74' },
        { name: 'URGENCY', count: emotions['URGENCY'] || 15, color: '#f59e0b' },
        { name: 'AUTHORITY', count: emotions['AUTHORITY'] || 6, color: '#3b82f6' },
        { name: 'NEUTRAL', count: emotions['NEUTRAL'] || 10, color: '#64748b' }
      ]);
    });

    // Total reports count
    getDocs(collection(db, 'reports')).then(snap => setDbCount(snap.size));

    return () => unsubscribe();
  }, []);

  const chartData = [
    { name: '00:00', value: 400 },
    { name: '04:00', value: 300 },
    { name: '08:00', value: 600 },
    { name: '12:00', value: 800 },
    { name: '16:00', value: 500 },
    { name: '20:00', value: 900 },
    { name: '23:59', value: 700 },
  ];

  if (!stats) return null;

  return (
    <div className="space-y-8 py-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-headline font-black text-white uppercase tracking-tighter italic">Intelligence_Hub</h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em]">Real-time Global Threat Monitoring</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-primary uppercase font-bold">Live_Feed</span>
          </div>
        </div>
      </div>

      {/* Key Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: "Total Scans", value: stats.total_scans, icon: Activity, color: "text-primary", bg: "bg-primary/5", border: "border-primary/20" },
          { label: "Confirmed Phishing", value: stats.confirmed_phishing, icon: ShieldAlert, color: "text-error", bg: "bg-error/5", border: "border-error/20" },
          { label: "Blocked Threats", value: stats.blocked_threats, icon: ShieldCheck, color: "text-tertiary", bg: "bg-tertiary/5", border: "border-tertiary/20" }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "glass-panel p-8 rounded-[3rem] border flex flex-col gap-4 group hover:shadow-2xl transition-all duration-500",
              stat.bg,
              stat.border
            )}
          >
            <div className="flex justify-between items-start">
              <div className={cn("p-4 rounded-2xl bg-white/5", stat.color)}>
                <stat.icon className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">LIVE_DATA</span>
            </div>
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
              <h2 className="text-5xl font-headline font-black text-white italic tracking-tighter">
                {stat.label === "Confirmed Phishing" ? stats.confirmed_phishing.replace('42.8K', dbCount) : stat.value}
              </h2>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Neural Load", value: stats.total_scans, icon: Activity, trend: "+12%", color: "primary" },
          { label: "Intel DB Size", value: stats.confirmed_phishing.replace('42.8K', dbCount), icon: ShieldAlert, trend: "+5%", color: "error" },
          { label: "Neural Uptime", value: stats.safe_urls, icon: Zap, trend: "Stable", color: "tertiary" },
          { label: "Active Nodes", value: "142", icon: Globe, trend: "+3", color: "primary" }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-6 rounded-[2rem] relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <stat.icon className="w-16 h-16" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-headline font-black text-white italic">{stat.value}</h3>
              <span className={cn(
                "text-[10px] font-mono mb-1.5 flex items-center",
                stat.trend.includes('+') ? "text-primary" : "text-slate-500"
              )}>
                {stat.trend.includes('+') ? <ArrowUpRight className="w-3 h-3" /> : null}
                {stat.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Charts */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="glass-panel p-8 rounded-[3rem]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight flex items-center gap-3">
                <TrendingUp className="text-primary" />
                Threat_Velocity_Index
              </h3>
            </div>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8ed5ff" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8ed5ff" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontStyle: 'italic', fontWeight: 'bold' }}
                  />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0c10', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#8ed5ff', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8ed5ff" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[3rem]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight flex items-center gap-3">
                <ShieldAlert className="text-error" />
                Neural_Risk_Trend
              </h3>
            </div>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <AreaChart data={riskTrendData}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ffc174" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ffc174" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#475569" 
                    fontSize={8} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontStyle: 'italic' }}
                  />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0a0c10', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#ffc174', fontSize: '12px', fontWeight: 'bold' }}
                    formatter={(value: any) => [`${value}%`, 'Risk Score']}
                  />
                  <Area 
                    type="stepAfter" 
                    dataKey="score" 
                    stroke="#ffc174" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorRisk)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[3rem]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight flex items-center gap-3">
                <Zap className="text-tertiary" />
                Manipulation_Vectors
              </h3>
            </div>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <BarChart data={emotionStats}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#475569" 
                    fontSize={8} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: '#0a0c10', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                    {emotionStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.6} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[3rem]">
            <div className="flex items-center gap-3 mb-8">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight italic">Global_Threat_Feed</h3>
            </div>
            
            <div className="space-y-4">
              {recentReports.length > 0 ? recentReports.map((report, idx) => (
                <motion.div 
                  key={report.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 rounded-2xl bg-white/5 border border-white/5 flex gap-4 items-start"
                >
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{report.createdAt?.toDate?.() ? new Date(report.createdAt.toDate()).toLocaleTimeString() : 'RECENT'}</span>
                      <span className="text-[10px] font-mono text-primary font-bold">RISK: {report.riskScore}%</span>
                    </div>
                    <p className="text-xs text-white font-mono line-clamp-1">{report.content}</p>
                    <div className="flex gap-2">
                       <span className="text-[8px] font-mono text-slate-600 uppercase border border-white/5 px-1.5 rounded-full">Origin: ARHAM_NODE_{report.reporterId?.substring(0,4)}</span>
                       <span className="text-[8px] font-mono text-slate-600 uppercase border border-white/5 px-1.5 rounded-full">Lang: {report.metadata?.language}</span>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="py-12 text-center opacity-20">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xs font-mono uppercase tracking-[0.3em]">Awaiting Live Threat Reports...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Charts */}
        <div className="lg:col-span-4 space-y-8">
          <div className="glass-panel p-8 rounded-[3rem]">
            <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight flex items-center gap-3 mb-8">
              <BarChart3 className="text-primary" />
              Attack_Vectors
            </h3>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height={300} debounce={100}>
                <BarChart data={stats?.vectors || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#ffffff05' }}
                    contentStyle={{ backgroundColor: '#0a0c10', border: '1px solid #ffffff10', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {(stats?.vectors || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#8ed5ff' : index === 1 ? '#ffc174' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-[3rem] bg-error/5 border-error/10">
            <h3 className="text-sm font-mono text-error uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
              <Clock className="w-4 h-4" />
              System_Integrity
            </h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400">Auth Session</span>
                  <span className="text-primary">ACTIVE</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400">Threat DB Link</span>
                  <span className="text-primary">SSL_SECURE</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400">Intelligence Sync</span>
                  <span className={cn(dbCount > 0 ? "text-primary" : "text-error")}>{dbCount > 0 ? "STABLE" : "PENDING"}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
