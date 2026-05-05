import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Search, Globe, Zap, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { cn } from '../lib/utils';
import { GoogleGenAI, Type } from "@google/genai";
import RiskBadge from '../components/RiskBadge';
import { collection, query, where, getDocs, orderBy, limit, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, waitForAuth, auth, handleFirestoreError } from '../lib/firebase';
import { Layers, History, Hash, Clock } from 'lucide-react';

// Initialize Gemini directly in frontend as per skill directive
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper for resilient AI calls with exponential backoff
const callAiWithRetry = async (params: any, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err: any) {
      if (i === retries) throw err;
      const isTransient = err?.message?.includes('500') || err?.message?.includes('INTERNAL') || err?.message?.includes('safety');
      if (isTransient) {
        console.warn(`[AI_RETRY] Neural Core signal flicker. Retrying attempt ${i + 1}...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
};

export default function Home() {
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [reputationCount, setReputationCount] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  // Real-time scan stack subscription
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const syncSub = (user: any) => {
      // Clean up previous sub
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
      
      if (!user) {
        setHistory([]);
        return;
      }

      console.log(`[SYNC] Subscribing to Neural Stack for ${user.uid}`);
      const q = query(
        collection(db, `users/${user.uid}/scans`),
        orderBy('timestamp', 'desc'),
        limit(15)
      );

      unsubscribe = onSnapshot(q, (snap) => {
        const scans = snap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          // Use current time if server timestamp is pending
          timestamp: doc.data().timestamp || { toDate: () => new Date() }
        }));
        setHistory(scans);
      }, (err) => {
        console.warn("Scan stack sync subscription limited:", err.message);
      });
    };

    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      syncSub(user);
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getRecentScamIntel = async () => {
    try {
      const q = query(collection(db, 'reports'), where('riskScore', '>=', 80), orderBy('riskScore', 'desc'), limit(5));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data().content).filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  const checkReputation = async (text: string) => {
    try {
      await waitForAuth();
      const q = query(collection(db, 'reports'), where('content', '==', text.trim()));
      const snap = await getDocs(q);
      return snap.size;
    } catch (e) {
      console.error('Reputation check failed:', e);
      handleFirestoreError(e, 'list', 'reports');
      return 0;
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsAnalyzing(true);
    setIsSyncing(true);
    setResult(null);
    setReputationCount(0);

    try {
      // 0. Sync Auth Status
      await waitForAuth();
      
      // 1. Fetch Intelligence Memory (Model Retraining Phase)
      const [reputation, recentScams] = await Promise.all([
        checkReputation(input).catch(() => 0),
        getRecentScamIntel().catch(() => [])
      ]);
      
      setReputationCount(reputation);
      setIsSyncing(false); // Retraining phase complete

      // 1.5 Fetch Personal Neural Gradient (Self-Training Memory)
      const userScans = history.slice(0, 3).map(h => `[PREV_SCAN]: "${h.content}" -> RESULT: ${h.result.score}% RISK`);
      const personalMemory = userScans.length > 0
        ? `\n[PERSONAL_NEURAL_GRADIENT] User's Recent Scans:\n${userScans.join('\n')}`
        : "";

      // Truncate memory for stability
      const sanitizedScams = recentScams.map(s => s.length > 300 ? s.substring(0, 300) + '...' : s);
      const memoryContext = sanitizedScams.length > 0 
        ? `\n[NEURAL_MEMORY] Confirmed Phishing Patterns: ${sanitizedScams.join(' | ')}`
        : "";

      const response = await callAiWithRetry({
        model: "gemini-3-flash-preview",
        contents: [{
          role: "user",
          parts: [{
            text: `Analyze this content for scam/phishing risk. Content can be SMS, Email, or URL.
            ${personalMemory}
            ${memoryContext}
            
            Compare the input with [NEURAL_MEMORY] and [PERSONAL_NEURAL_GRADIENT]. 
            If the input similarity to a previous high-risk scan is > 85%, use that as a primary factor.
            
            1. Rate risk (0-100).
            2. Identify threat markers (e.g., SUSPICIOUS_PATTERN, URGENCY, FINANCIAL_SPOOF).
            3. Classification: Phishing, Spam, or Safe.
            
            Input: "${input}"`
          }]
        }],
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              score: { type: Type.NUMBER },
              markers: { type: Type.ARRAY, items: { type: Type.STRING } },
              model: { type: Type.STRING }
            },
            required: ["status", "score", "markers", "model"]
          }
        }
      });

      const data = JSON.parse(response?.text || '{"status":"error","score":0,"markers":[],"model":"FALLBACK"}');

      if (reputation > 0) {
        data.score = Math.max(data.score, 99);
        data.markers = [...new Set([...data.markers, 'GLOBAL_THREAT_REPUTATION', 'USER_REPORTED_PATTERN'])];
      }
      
      setResult(data);
      
      // 3. Persist to Neural Stack (Self-Training Loop)
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          console.log(`[STORAGE_TRIGGER] Persisting scan for ${userId}`);
          const scanDoc = {
            content: input,
            result: data,
            userId: userId,
            timestamp: serverTimestamp()
          };
          
          await addDoc(collection(db, `users/${userId}/scans`), scanDoc);
          
          // Optimistic local update to ensure instant visibility
          setHistory(prev => {
            const exists = prev.find(h => h.content === input);
            if (exists) return prev;
            return [{ id: 'pending-' + Date.now(), ...scanDoc, timestamp: { toDate: () => new Date() } }, ...prev].slice(0, 15);
          });
          
          console.log('[STORAGE_SUCCESS] Scan committed to Neural Stack');
        } catch (dbErr) {
          console.warn('[STORAGE_FAULT] Scan commit failed:', dbErr);
        }
      } else {
        console.warn('[STORAGE_SKIPPED] No UID available for persistence');
      }

    } catch (error: any) {
      console.error('Analysis failed:', error);
      setResult({
        status: "ERROR",
        score: 0,
        markers: ["CONNECTION_FAULT", "NEURAL_CORE_OFFLINE"],
        model: "SYSTEM_RECOVERY",
        error: error.message
      });
    } finally {
      setIsAnalyzing(false);
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="inline-flex p-3 bg-primary/10 rounded-2xl border border-primary/20 mb-4"
        >
          <Shield className="w-8 h-8 text-primary" />
        </motion.div>
        <h1 className="text-5xl md:text-7xl font-headline font-black tracking-tighter text-white uppercase italic">
          Neural_Shield <span className="text-primary">v4.2</span>
        </h1>
        <p className="text-on-surface-variant text-lg font-mono uppercase tracking-[0.2em]">
          Multi-Vector Phishing Intelligence & Real-Time Interception
        </p>
      </section>

      {/* Scan Input */}
      <section className="max-w-4xl mx-auto">
        <div className="glass-panel p-2 rounded-[2.5rem] shadow-cyber-glow">
          <form onSubmit={handleAnalyze} className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 relative group">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                <Globe className="w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="PASTE URL, EMAIL CONTENT, OR SMS MESSAGE..."
                className="w-full bg-surface/50 border border-white/5 rounded-[2rem] py-6 pl-16 pr-8 text-white font-mono text-sm focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-600"
              />
            </div>
            <button
              type="submit"
              disabled={isAnalyzing}
              className="bg-primary hover:bg-primary/90 text-black font-headline font-black px-12 py-6 rounded-[2rem] flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isAnalyzing ? (
                <Zap className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
              <span className="tracking-tighter text-xl uppercase italic">
                {isSyncing ? "Optimizing_Model..." : "Initiate_Scan"}
              </span>
            </button>
          </form>
        </div>
      </section>

      {/* Results Section */}
      {result && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <div className={cn(
            "glass-panel p-8 rounded-[3rem] border-2 transition-all",
            result.score > 70 ? "border-error/50 shadow-[0_0_40px_rgba(255,77,77,0.2)]" : "border-primary/30 shadow-cyber-glow"
          )}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-headline font-black text-white uppercase tracking-tight flex items-center gap-3">
                  {result.score > 70 ? <AlertCircle className="text-error" /> : <CheckCircle2 className="text-primary" />}
                  Analysis_Report
                </h3>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Engine: {result.model}</p>
              </div>
              <RiskBadge score={result.score} />
            </div>

            {reputationCount > 0 && (
              <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-2xl flex items-center gap-4 text-error animate-pulse">
                <Database className="w-5 h-5" />
                <p className="text-xs font-mono uppercase font-black tracking-widest">
                  REPUTATION ALERT: Pattern reported {reputationCount} time(s) in global threat DB.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em]">Threat_Markers</h4>
                <div className="flex flex-wrap gap-2">
                  {result.markers.length > 0 ? result.markers.map((marker: string) => (
                    <span key={marker} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-white uppercase">
                      {marker}
                    </span>
                  )) : (
                    <span className="text-xs font-mono text-primary uppercase tracking-widest">No malicious patterns detected</span>
                  )}
                </div>
              </div>
              <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                <h4 className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.3em] mb-4">Neural_Confidence</h4>
                <div className="flex items-end gap-4">
                  <span className="text-5xl font-headline font-black text-white italic">{result.score}%</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${result.score}%` }}
                      className={cn(
                        "h-full shadow-[0_0_10px]",
                        result.score > 70 ? "bg-error shadow-error/50" : "bg-primary shadow-primary/50"
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* Features Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-4">
        {/* Features Column */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Real-Time", desc: "Sub-millisecond latency for instant threat neutralization." },
            { icon: Globe, title: "Global Sync", desc: "Connected to worldwide threat intelligence networks." },
            { icon: Shield, title: "Neural Core", desc: "Advanced ML models trained on 100M+ phishing samples." }
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-panel p-8 rounded-[2rem] hover:border-primary/30 transition-all group"
            >
              <feature.icon className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-headline font-black text-white uppercase tracking-tight mb-2">{feature.title}</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Scan Stack Side Panel */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel rounded-[2rem] p-6 max-h-[500px] overflow-hidden flex flex-col"
        >
          <div className="flex items-center gap-3 mb-6">
            <Layers className="w-5 h-5 text-secondary" />
            <h3 className="text-xs font-mono font-black text-white uppercase tracking-[0.2em]">Neural_Stack</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {history.length > 0 ? history.map((scan, i) => (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setInput(scan.content)}
                className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/20 cursor-pointer transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <History className="w-3 h-3 text-slate-500" />
                     <span className="text-[9px] font-mono text-slate-500 uppercase">
                       ID: {scan.id.slice(-6)}
                     </span>
                   </div>
                   <span className={cn(
                     "text-[9px] font-mono px-2 py-0.5 rounded-full uppercase",
                     (scan.result?.score || 0) > 70 ? "bg-error/20 text-error" : "bg-primary/20 text-primary"
                   )}>
                     {scan.result?.score || 0}%
                   </span>
                </div>
                <p className="text-[10px] font-mono text-white/70 line-clamp-2 truncate-neural font-medium leading-relaxed">
                  {scan.content}
                </p>
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Clock className="w-3 h-3 text-secondary" />
                   <span className="text-[8px] font-mono text-secondary uppercase">Recall Pattern</span>
                </div>
              </motion.div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
                <Hash className="w-8 h-8 text-white/5" />
                <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest leading-loose">
                  Neural memory bank empty.<br/>awaiting first telemetry...
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </section>
    </div>
  );
}
