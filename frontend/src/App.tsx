import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Report from './pages/Report';
import DashboardPage from './pages/DashboardPage';
import MapView from './components/MapView';
import CallPage from './pages/CallPage';
import GPTPage from './pages/GPTPage';
import Pricing from './pages/Pricing';
import PitchPage from './pages/PitchPage';
import DeveloperPage from './pages/DeveloperPage';
import SecurityOpsPage from './pages/SecurityOpsPage';
import SystemIntegrity from './components/SystemIntegrity';
import NodeMasterLock from './components/NodeMasterLock';
import Onboarding from './components/Onboarding';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'motion/react';
import { testConnection } from './lib/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState('stats');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  useEffect(() => {
    // Initial boot tests
    console.log("[APP] Initializing Neural Node...");
    
    const initTimer = setTimeout(() => {
       if (isCheckingSession) {
         console.warn("[APP] Initialization timeout. Forcing session ready state.");
         setIsCheckingSession(false);
       }
    }, 3000);

    try {
      testConnection();
    } catch (e) {
      console.error("[APP] Firebase sync fault:", e);
    }

    // Check if user has ever registered
    try {
      const onboardStatus = localStorage.getItem('NEURAL_ONBOARD_COMPLETED');
      if (onboardStatus === 'TRUE') {
        setIsOnboarded(true);
      }

      // Check if current session is authorized
      const session = localStorage.getItem('ARHAM_NODE_SESSION');
      if (session === 'ACTIVE') {
        setIsAuthorized(true);
      }
    } catch (e) {
      console.error("[APP] LocalStorage access blocked:", e);
    }
    
    setIsCheckingSession(false);
    clearTimeout(initTimer);

    // Global bypass for developer convenience (Console command: SENTINEL_BYPASS())
    (window as any).SENTINEL_BYPASS = () => {
      localStorage.setItem('NEURAL_ONBOARD_COMPLETED', 'TRUE');
      localStorage.setItem('ARHAM_NODE_SESSION', 'ACTIVE');
      window.location.reload();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full" />
          <p className="font-mono text-[8px] text-primary uppercase tracking-[0.3em]">Neural_Sync_Initializing</p>
        </div>
      </div>
    );
  }

  // Phase 1: First-time ID creation
  if (!isOnboarded) {
    return (
      <Onboarding 
        onComplete={() => {
          localStorage.setItem('NEURAL_ONBOARD_COMPLETED', 'TRUE');
          setIsOnboarded(true);
          // If session was marked active by a bypass/registration, skip lock
          if (localStorage.getItem('ARHAM_NODE_SESSION') === 'ACTIVE') {
            setIsAuthorized(true);
          }
        }} 
      />
    );
  }

  // Phase 2: Session unlock
  if (!isAuthorized) {
    return <NodeMasterLock onUnlock={() => setIsAuthorized(true)} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'scan':
        return <Home />;
      case 'call':
        return <CallPage />;
      case 'gpt':
        return <GPTPage />;
      case 'report':
        return <Report />;
      case 'stats':
        return <DashboardPage />;
      case 'integrity':
        return <SystemIntegrity />;
      case 'map':
        return <MapView />;
      case 'pricing':
        return <Pricing />;
      case 'pitch':
        return <PitchPage />;
      case 'developer':
        return <DeveloperPage />;
      case 'secops':
        return <SecurityOpsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* 13D Dynamic Lighting Layer */}
      <motion.div 
        style={{ 
          left: springX, 
          top: springY,
          transform: 'translate(-50%, -50%)'
        }}
        className="fixed w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0 opacity-50"
      />
      
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        <div className="relative z-10">
          {renderContent()}
        </div>
      </Layout>
    </div>
  );
}
