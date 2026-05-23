import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db, auth, waitForAuth, handleFirestoreError } from '../lib/firebase';

import { getApiUrl } from '../lib/api';

// [SENTINEL_RISK_ENGINE] Strategy-based analysis pipeline
const analyzeIntentVector = async (text: string, tone: string, recentScams: string[] = []) => {
  const sanitizedScams = (recentScams || []).map(s => s.length > 200 ? s.substring(0, 200) + '...' : s);
  const memoryContext = sanitizedScams.length > 0 
    ? `\n[NEURAL_MEMORY] Pattern_Delta: ${sanitizedScams.join(' | ')}`
    : "";

  const res = await fetch(getApiUrl('/api/v1/ai/analyze'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: text,
      tone,
      memoryContext
    })
  });

  if (!res.ok) {
    throw new Error(`AI Scan Core failed on status ${res.status}`);
  }

  return await res.json();
};

interface TranscriptEntry {
  id: string;
  text: string;
  sender: 'CALLER' | 'SYSTEM';
  timestamp: string;
  isRisk?: boolean;
  language?: string;
  emotion?: string;
  tone?: string;
  insights?: string;
  isReported?: boolean;
  reputationCount?: number;
  feedbackSubmitted?: boolean;
}

export enum BluetoothStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

export function useCallDetection() {
  const [isScanning, setIsScanning] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isBluetoothConnected] = useState(true);
  const [connectionStatus] = useState<BluetoothStatus>(BluetoothStatus.CONNECTED);
  const [errorMessage] = useState<string | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const [voiceTone, setVoiceTone] = useState<'CALM' | 'STRESSED' | 'ANGRY' | 'NEUTRAL'>('NEUTRAL');
  const [detectedIntent, setDetectedIntent] = useState<string | null>(null);
  const [showBreachModal, setShowBreachModal] = useState(false);

  // Fetch recent scam intel for "Neural Memory"
  const getRecentScamIntel = async () => {
    try {
      const q = query(collection(db, 'reports'), where('riskScore', '>=', 80), orderBy('riskScore', 'desc'), limit(5));
      const snap = await getDocs(q);
      return snap.docs.map(doc => doc.data().content).filter(Boolean);
    } catch (e) {
      return [];
    }
  };

  const connectBluetooth = useCallback(async () => {
    // Manual connection no longer required
  }, []);

  const startDetection = useCallback(() => {
    setIsScanning(true);
    setRiskScore(0);
    setDetectedIntent(null);
    setShowBreachModal(false);
    setTranscript([]);
  }, []);

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

  const reportScam = async (entry: TranscriptEntry) => {
    try {
      const user = await waitForAuth();
      if (!user) {
        console.warn('🛡️ Reporting blocked: Anonymous Auth not enabled in Firebase Console.');
        return;
      }

      setIsRetraining(true);
      
      await addDoc(collection(db, 'reports'), {
        content: entry.text.trim(),
        riskScore: entry.isRisk ? 90 : 10,
        reporterId: (user as any).uid,
        createdAt: serverTimestamp(),
        metadata: {
          language: entry.language || 'unknown',
          isVoice: true
        }
      });
      
      setTranscript(prev => prev.map(t => 
        t.id === entry.id ? { ...t, isReported: true } : t
      ));

      // Simulate neural context shift
      setTimeout(() => setIsRetraining(false), 3000);
    } catch (e) {
      console.error('Reporting failed:', e);
      handleFirestoreError(e, 'create', 'reports');
      setIsRetraining(false);
    }
  };

  const processTranscript = useCallback(async (text: string) => {
    setIsScanning(true);
    
    // [PIPELINE_INIT]: Create preliminary entry
    const entryId = `live-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const currentTone = voiceTone;

    setTranscript(prev => [...prev, {
      id: entryId,
      text: text,
      sender: 'CALLER',
      timestamp: new Date().toLocaleTimeString(),
      tone: currentTone
    }]);

    try {
      // [STEP_1]: Fetch Intelligence Memory
      const recentScams = await getRecentScamIntel();
      
      // [STEP_2]: Execute Intelligence Pipeline
      const result = await analyzeIntentVector(text, currentTone, recentScams);

      // [STEP_3]: Multi-Vector Risk Calibration
      let calculatedRisk = result.risk || 0;
      const weights = { 
        FEAR: 20, URGENCY: 20, GREED: 25, AUTHORITY: 15, 
        ANGRY: 15, STRESSED: 10 
      };
      
      if (result.emotion) calculatedRisk += (weights[result.emotion as keyof typeof weights] || 0);
      if (currentTone) calculatedRisk += (weights[currentTone as keyof typeof weights] || 0);
      
      // [STEP_4]: Global Reputation Verification
      const reputationCount = await checkReputation(result.cleanedText || text);
      calculatedRisk = reputationCount > 0 ? 99 : Math.min(100, calculatedRisk);

      // [STEP_5]: Neural Context Sync
      setTranscript(prev => prev.map(item => 
        item.id === entryId 
          ? { 
              ...item, 
              text: result.cleanedText || item.text, 
              isRisk: calculatedRisk > 45,
              language: result.language,
              emotion: result.emotion,
              tone: currentTone,
              insights: reputationCount > 0 
                ? `[CRITICAL_THREAT] Reputation Match (${reputationCount}x). Vector: ${result.intent}.`
                : `[${result.intent}] ${result.insight} (Confidence: ${Math.round(calculatedRisk)}%)`,
              reputationCount
            } 
          : item
      ));

      if (calculatedRisk > 45) {
        setRiskScore(prev => Math.max(prev, calculatedRisk));
        if (calculatedRisk > 75) {
          setDetectedIntent(result.intent || 'SUSPICIOUS_PATTERN');
          setShowBreachModal(true);
        }
      }

      return {
        text: result.cleanedText || text,
        isRisk: calculatedRisk > 45,
        score: Math.round(calculatedRisk),
        language: result.language || 'English',
        emotion: result.emotion || 'NEUTRAL',
        tone: currentTone,
        intent: result.intent || 'STANDARD_COMMUNICATION',
        insight: result.insight || 'No suspicious pattern matched.'
      };
    } catch (e: any) {
      console.error('Detection pipeline fault:', e);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [voiceTone]);

  const transcribeAudio = useCallback(async (base64Audio: string, mimeType: string) => {
    try {
      const res = await fetch(getApiUrl('/api/v1/ai/transcribe'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64Audio,
          mimeType,
          model: 'tarteel-ai/whisper-base-ar-quran',
          isCallPanel: true
        })
      });

      if (!res.ok) {
        throw new Error(`Voice analysis failed with status Code: ${res.status}`);
      }

      const resultData = await res.json();
      
      const transcriptText = resultData.text;
      const detectedTone = resultData.tone || 'NEUTRAL';

      setVoiceTone(detectedTone as any);

      if (transcriptText && transcriptText.trim() && !transcriptText.includes('[NO_SPEECH]')) {
        const analysis = await processTranscript(transcriptText);
        return {
          text: transcriptText,
          analysis
        };
      } else {
        console.log("Neural Link: Passive scanning active, but no clear voice recognized.");
        return null;
      }
    } catch (e: any) {
      console.error('Transcription Protocol Failure:', e);
      return null;
    }
  }, [processTranscript]);

  const stopDetection = useCallback(() => {
    setIsScanning(false);
    setRiskScore(0);
    setDetectedIntent(null);
    setShowBreachModal(false);
  }, []);

  // [RL_STRATEGY]: Reinforcement Learning Feedback Loop
  const submitFeedback = useCallback(async (entryId: string, actual: 'scam' | 'safe') => {
    const entry = transcript.find(t => t.id === entryId);
    if (!entry) return;

    try {
      await fetch(getApiUrl('/api/v1/feedback'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detectionId: entryId,
          actual,
          predicted: entry.isRisk ? 'scam' : 'safe',
          text: entry.text,
          confidence: riskScore
        })
      });
      
      setTranscript(prev => prev.map(t => 
        t.id === entryId ? { ...t, feedbackSubmitted: true } : t
      ));
    } catch (e) {
      console.error('Feedback loop failure:', e);
    }
  }, [transcript, riskScore]);

  return {
    isScanning,
    riskScore,
    transcript,
    isBluetoothConnected,
    connectBluetooth,
    startDetection,
    stopDetection,
    processTranscript,
    transcribeAudio,
    reportScam,
    submitFeedback,
    isReportingAvailable: !!auth.currentUser,
    isRetraining,
    voiceTone,
    detectedIntent,
    showBreachModal,
    setShowBreachModal,
    connectionStatus,
    errorMessage
  };
}
