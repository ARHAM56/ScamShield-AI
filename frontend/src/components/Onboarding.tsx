import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Phone, Key, User, Lock, ArrowRight, CheckCircle2, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

type Step = 'phone' | 'otp' | 'register' | 'success';

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activePhone, setActivePhone] = useState('');
  const [useWhatsApp, setUseWhatsApp] = useState(false);
  const [coreStatus, setCoreStatus] = useState<'OFFLINE' | 'ONLINE' | 'CHECKING'>('CHECKING');

  React.useEffect(() => {
    const checkPulse = async () => {
      try {
        const res = await fetch('/api/health').catch(() => ({ ok: false }));
        if (res && 'ok' in res && res.ok) setCoreStatus('ONLINE');
        else setCoreStatus('OFFLINE');
      } catch {
        setCoreStatus('OFFLINE');
      }
    };
    checkPulse();
  }, []);

  const handleRequestOtp = async () => {
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith('+')) {
      // Auto-prefix India if it looks like a 10-digit number
      if (formattedPhone.length === 10) formattedPhone = '+91' + formattedPhone;
      else if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) formattedPhone = '+' + formattedPhone;
    }
    
    if (formattedPhone.length < 8) return setError('Invalid identifier');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, useWhatsApp })
      });
      
      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        const snippet = text.substring(0, 50).replace(/[<>]/g, '');
        throw new Error(`INTERNAL_LINK_ERR: (${res.status}) [${snippet}...]`);
      }

      if (!res.ok) {
        throw new Error(data.message || data.error || `NEURAL_GATE_DENIED: ${res.status}`);
      }

      setActivePhone(formattedPhone);
      if (data.demoOtp) {
        setOtp(data.demoOtp);
      }
      setStep('otp');
    } catch (e: any) {
      console.error('[Onboarding] Request fault:', e);
      // Detailed error for troubleshooting
      const errorMsg = e.message || 'NEURAL_LINK_FAULT';
      setError(`${errorMsg} - Link integrity compromised. Use Bypass if manual sync fails.`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: activePhone, otp })
      });
      if (res.ok) setStep('register');
      else setError('Invalid access code.');
    } catch (e) {
      setError('Neural verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (username.length < 3) return setError('Username too short');
    if (password.length < 6) return setError('Password must be 6+ chars');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, phone: activePhone })
      });
      const data = await res.json();
      if (data.status === 'SUCCESS') {
        localStorage.setItem('sentinel_token', data.token);
        localStorage.setItem('ARHAM_NODE_SESSION', 'ACTIVE');
        setStep('success');
        setTimeout(onComplete, 2000);
      } else {
        setError('Registration fault.');
      }
    } catch (e) {
      setError('Registration fault.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black">
      {/* Background Matrix Effect */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent" />
        <div className="grid grid-cols-12 gap-1 h-full w-full">
           {Array.from({ length: 48 }).map((_, i) => (
             <motion.div
               key={i}
               initial={{ opacity: 0 }}
               animate={{ opacity: [0, 1, 0] }}
               transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
               className="h-full w-px bg-primary/20"
             />
           ))}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg glass-panel p-10 rounded-[3rem] border border-white/10 bg-black/40 backdrop-blur-3xl overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
        
        <AnimatePresence mode="wait">
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
                  <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase italic">
                  Node_Activation
                </h2>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-2">
                  Identity initiation sequence v1.0
                </p>
                <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                    coreStatus === 'ONLINE' ? "bg-green-500" : coreStatus === 'CHECKING' ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                    Neural_Core: {coreStatus}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    placeholder="+91 (000) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 font-mono text-sm text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg transition-colors", useWhatsApp ? "bg-green-500/20 text-green-500" : "bg-slate-500/10 text-slate-500")}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase italic">WhatsApp_Delivery</p>
                      <p className="text-[8px] font-mono text-slate-500">Route via encrypted chat</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setUseWhatsApp(!useWhatsApp)}
                    className={cn(
                      "w-10 h-5 rounded-full relative transition-all duration-300",
                      useWhatsApp ? "bg-green-500" : "bg-slate-700"
                    )}
                  >
                    <motion.div 
                      animate={{ x: useWhatsApp ? 20 : 2 }}
                      className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                    />
                  </button>
                </div>

                {error && (
                  <div 
                    onClick={() => setError(null)}
                    className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 cursor-pointer hover:bg-red-500/20 transition-colors"
                  >
                    <p className="text-[10px] font-mono text-red-500 uppercase text-center">{error}</p>
                    <p className="text-[8px] font-mono text-red-500/50 uppercase text-center mt-1">Check Neural_Core status or click to dismiss</p>
                  </div>
                )}
                
                <button
                  onClick={handleRequestOtp}
                  disabled={loading || phone.length < 8}
                  className="w-full py-5 rounded-2xl bg-primary text-black font-black uppercase tracking-widest italic hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                >
                  {loading ? 'Transmitting...' : (
                    <>
                      Begin_Sequence
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-6 border-t border-white/5 flex flex-col items-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Connection Issues?</p>
                    <button 
                      onClick={() => {
                        localStorage.setItem('NEURAL_ONBOARD_COMPLETED', 'TRUE');
                        localStorage.setItem('ARHAM_NODE_SESSION', 'ACTIVE');
                        window.location.reload();
                      }}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-mono text-secondary hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                    >
                      Emergency_Bypass (Skip_Verification)
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'otp' && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <button 
                onClick={() => setStep('phone')}
                className="flex items-center gap-2 text-[10px] font-mono text-slate-500 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> RE_ROUTE
              </button>
              
              <div className="text-center">
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">Enter_Access_ID</h3>
                <p className="text-[10px] font-mono text-slate-500 mt-2">Neural code sent to {phone}</p>
                {otp && (
                  <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-[10px] font-mono text-primary uppercase tracking-widest">Simulation_Mode_Active</p>
                    <p className="text-xl font-mono text-white tracking-[0.5em] mt-1">{otp}</p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <Key className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="......"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 font-mono text-2xl tracking-[0.5em] text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all outline-none text-center"
                  />
                </div>
                {error && <p className="text-[10px] font-mono text-error uppercase text-center">{error}</p>}

                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length < 6}
                  className="w-full py-5 rounded-2xl bg-secondary text-black font-black uppercase tracking-widest italic hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  {loading ? 'Verifying...' : 'Verify_ID'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'register' && (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h3 className="text-2xl font-black italic text-white uppercase tracking-tighter">Create_Node_Profile</h3>
                <p className="text-[10px] font-mono text-slate-500 mt-2">Establish permanent encrypted identity</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 font-mono text-sm text-white focus:border-primary/50 transition-all outline-none"
                  />
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-14 pr-6 font-mono text-sm text-white focus:border-primary/50 transition-all outline-none"
                  />
                </div>
                {error && <p className="text-[10px] font-mono text-error uppercase text-center">{error}</p>}

                <button
                  onClick={handleRegister}
                  disabled={loading}
                  className="w-full py-5 rounded-2xl bg-primary text-black font-black uppercase tracking-widest italic hover:scale-[1.02] transition-all"
                >
                  {loading ? 'Initializing...' : 'Establish_Global_Node'}
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center space-y-6 py-8"
            >
              <div className="w-20 h-20 rounded-full bg-secondary/20 flex items-center justify-center text-secondary ring-4 ring-secondary/10 animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter">Connection_Live</h3>
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-2">{username} successfully linked</p>
              </div>
              <div className="text-[10px] font-mono text-secondary animate-pulse uppercase">
                Synchronizing with Sentinel Core...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
