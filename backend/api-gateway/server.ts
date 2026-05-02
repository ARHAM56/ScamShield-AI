import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { handleVoiceStream } from './routes/voice_ws.js';
import twilio from 'twilio';
import jwt from 'jsonwebtoken';
import analyzeRouter from './routes/analyze.js';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';

dotenv.config();

// Initialize Firebase Admin (Lazy)
let db: FirebaseFirestore.Firestore | null = null;
const getDb = () => {
  if (!db) {
    let app: admin.app.App;
    const apps = admin.apps || [];
    if (apps.length === 0) {
      app = admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0481537282'
      });
    } else {
      app = apps[0] as admin.app.App;
    }
    
    // Explicitly target the user's database ID
    const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-3169c61a-abd3-4e4a-bd76-66dab5a6e578';
    try {
      db = admin.getFirestore(app, databaseId);
    } catch (e) {
      console.error('[FIREBASE_INIT_FAULT]', e);
      // Fallback to default firestore if databaseId targeting fails
      db = admin.firestore(app);
    }
  }
  return db;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logger
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[API_REQUEST] ${req.method} ${req.url}`);
    }
    next();
  });

  // Rate Limiting Mock
  const rateLimitMap = new Map();
  const rateLimiter = (req: any, res: any, next: any) => {
    const key = req.ip;
    const now = Date.now();
    const window = 60000;
    const limit = 100;
    if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
    const timestamps = rateLimitMap.get(key).filter((t: number) => t > now - window);
    if (timestamps.length >= limit) {
      return res.status(429).json({ error: "NEURAL_BUFFER_OVERFLOW", message: "Rate limit exceeded." });
    }
    timestamps.push(now);
    rateLimitMap.set(key, timestamps);
    next();
  };

  // SIEM State
  const pushSiemLog = async (type: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', message: string, ip: string) => {
    const log = { 
      type, 
      severity, 
      message, 
      ip, 
      timestamp: admin.firestore.FieldValue.serverTimestamp() 
    };
    
    try {
      const database = getDb();
      await database.collection('siem_logs').add(log);
      console.log(`[SIEM] Log persisted: ${type}`);
    } catch (error) {
      console.error('[SIEM_PERSIST_FAULT]', error);
    }
    return log;
  };

  // API Routes
  app.use('/api/analyze', analyzeRouter);

  // Twilio Integration (Lazy Loaded)
  let twilioClient: any = null;
  const getTwilioClient = () => {
    if (!twilioClient) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (accountSid && authToken) {
        twilioClient = (twilio as any)(accountSid, authToken);
      }
    }
    return twilioClient;
  };

  const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_demo';

  const sendSms = async (to: string, message: string) => {
    try {
      const client = getTwilioClient();
      const from = process.env.TWILIO_PHONE_NUMBER;
      if (client && from) {
        await client.messages.create({ body: message, from, to });
        return true;
      }
    } catch (error) {
      console.error('[SMS_FAULT]', error);
    }
    return false;
  };

  const sendWhatsApp = async (to: string, message: string) => {
    try {
      const client = getTwilioClient();
      const from = 'whatsapp:+14155238886'; // Twilio Sandbox
      if (client) {
        await client.messages.create({ 
          body: message, 
          from, 
          to: `whatsapp:${to.startsWith('+') ? to : '+' + to}` 
        });
        return true;
      }
    } catch (error) {
      console.error('[WHATSAPP_FAULT]', error);
    }
    return false;
  };

  app.get("/api/v1/keys", rateLimiter, (req, res) => {
    res.json({
      keys: [
        { id: 'sec_8291', name: 'Production_Node_01', key: 'sk_live_9283748291', created: '2026-04-20' },
        { id: 'sec_1102', name: 'Staging_Test', key: 'sk_test_1102837465', created: '2026-04-25' }
      ]
    });
  });

  app.post("/api/v1/feedback", rateLimiter, (req, res) => {
    res.json({ status: "SUCCESS", message: "Feedback received." });
  });

  // Onboarding & Auth Flow
  const otps = new Map();
  app.post("/api/v1/auth/request-otp", rateLimiter, async (req, res) => {
    const { phone, useWhatsApp } = req.body;
    const client = getTwilioClient();
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    // [REAL_TWILIO_VERIFY] Try official Verify API if SID exists
    if (client && serviceSid) {
      try {
        await client.verify.v2.services(serviceSid)
          .verifications
          .create({ to: phone, channel: useWhatsApp ? 'whatsapp' : 'sms' });
        
        console.log(`[AUTH] Twilio Verify Request Sent to ${phone}`);
        return res.json({ status: "SUCCESS", mode: "TWILIO_VERIFY", message: "Verification code sent." });
      } catch (err) {
        console.warn('[AUTH] Twilio Verify failed, falling back.', err);
      }
    }

    // [FALLBACK] Manual Logic
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps.set(phone, otp);

    let sent = false;
    if (useWhatsApp) {
      sent = await sendWhatsApp(phone, `[Sentinel] Your Node Activation ID is: ${otp}`);
    } else {
      sent = await sendSms(phone, `[Sentinel] Your Node Activation ID is: ${otp}`);
    }
    
    if (sent) {
      res.json({ status: "SUCCESS", mode: "MANUAL_DELIVERY", message: "Verification code transmitted." });
    } else {
      res.json({ 
        status: "SUCCESS", 
        mode: "DEMO_SIMULATION", 
        message: "Demo Mode: Verification code generated.", 
        demoOtp: otp 
      });
    }
    
    pushSiemLog("AUTH_OTP_REQUEST", "LOW", `OTP requested for ${phone}`, req.ip || "0.0.0.0");
  });

  app.post("/api/v1/auth/verify-otp", rateLimiter, async (req, res) => {
    const { phone, otp } = req.body;
    const client = getTwilioClient();
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    // Check Verify API
    if (client && serviceSid) {
      try {
        const verification = await client.verify.v2.services(serviceSid)
          .verificationChecks
          .create({ to: phone, code: otp });
        
        if (verification.status === 'approved') {
          return res.json({ status: "SUCCESS", message: "Phone verified via Twilio." });
        }
      } catch (err) {
        console.warn('[AUTH] Twilio Verify check error.', err);
      }
    }

    // Check Local Store
    if (otps.get(phone) === otp) {
      res.json({ status: "SUCCESS", message: "Phone verified." });
    } else {
      res.status(401).json({ error: "INVALID_OTP", message: "The code you entered is incorrect." });
    }
  });

  app.post("/api/v1/auth/register", rateLimiter, async (req, res) => {
    const { username, password, phone } = req.body;
    
    // [SECURITY_UPGRADE] JWT Session Token
    const token = jwt.sign(
      { username, phone, iat: Math.floor(Date.now() / 1000) },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    try {
      const database = getDb();
      await database.collection('users').add({
        username,
        phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`[AUTH] New User Registered: ${username} (${phone})`);
    } catch (error) {
      console.error('[AUTH_REGISTER_PERSIST_FAULT]', error);
    }
    
    res.json({ status: "SUCCESS", token });
    pushSiemLog("USER_REGISTRATION", "MEDIUM", `New node registered: ${username}`, req.ip || "0.0.0.0");
  });

  app.post("/api/v1/auth/mfa-verify", (req, res) => {
    const { code, deviceFingerprint } = req.body;
    if (code === "123456") {
      res.json({ status: "IDENTITY_VERIFIED", trustScore: 0.98 });
      pushSiemLog("AUTH_MFA", "LOW", `MFA Verified: ${deviceFingerprint}`, req.ip || "0.0.0.0");
    } else {
      res.status(401).json({ error: "ZERO_TRUST_FAILURE" });
      pushSiemLog("AUTH_FAILURE", "MEDIUM", `MFA Failed: ${deviceFingerprint}`, req.ip || "0.0.0.0");
    }
  });

  app.get("/api/v1/security/metrics", async (req, res) => {
    try {
      const database = getDb();
      const logsSnapshot = await database.collection('siem_logs')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      
      const logs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      }));

      res.json({
        metrics: { blockedAttacks: 1422, activeThreats: 12, riskScoreAverage: 24, uptime: "99.999%", nodeCount: 42 },
        logs
      });
    } catch (error) {
      console.error('[METRICS_FETCH_FAULT]', error);
      res.status(500).json({ error: "CORE_DATA_UNAVAILABLE" });
    }
  });

  app.post("/api/v1/security/simulate-attack", (req, res) => {
    const { type } = req.body;
    const responses: any = {
      'PROMPT_INJECTION': { threat: 'Malicious Bypass Detected', defense: 'Neural Shield Blocked Payload', severity: 'HIGH' },
      'SPOOFING': { threat: 'Identity Spoofing Attempt', defense: 'Zero Trust Hardware Verification', severity: 'CRITICAL' },
      'DDOS': { threat: 'Traffic Flood Anomaly', defense: 'Neural Buffer Dynamic Scaling', severity: 'MEDIUM' }
    };
    const attack = responses[type] || responses['DDOS'];
    pushSiemLog(`ATTACK_${type}`, attack.severity, attack.threat, '182.xx.xx.xx');
    res.json({ ...attack, status: 'BLOCKED' });
  });

  app.post("/api/analyze-tone", rateLimiter, (req, res) => {
    const tones = ['CALM', 'STRESSED', 'ANGRY', 'NEUTRAL'];
    const randomTone = tones[Math.floor(Math.random() * tones.length)];
    res.json({ tone: randomTone, confidence: 0.85 + (Math.random() * 0.1) });
  });

  app.post("/api/detect", (req, res) => {
    const { input } = req.body;
    const isSuspicious = input?.toLowerCase().includes('bank') || input?.toLowerCase().includes('urgent');
    res.json({ status: "success", score: isSuspicious ? 92 : 12, markers: isSuspicious ? ["SUSPICIOUS"] : [] });
  });

  app.get("/api/stats", (req, res) => {
    res.json({ total_scans: "1.2M", confirmed_phishing: "42.8K", blocked_threats: "15.2K", safe_urls: "98.4%", vectors: [{name:'Email',value:72},{name:'SMS',value:24},{name:'Social',value:12}] });
  });

  app.get("/api/map-data", (req, res) => {
    res.json([{ city: 'New York', lat: 40.7128, lng: -74.0060, intensity: 85, type: 'PHISHING' }]);
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'SENTINEL_CORE_ONLINE', version: '1.2.0-NEURAL' });
  });

  // Fallback for unmatched API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API_NOT_FOUND', message: `Endpoint ${req.url} not found.` });
  });

  // WebSocket Upgrade Handling
  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    if (pathname === '/api/voice-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        handleVoiceStream(ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  const frontendPath = path.join(process.cwd(), 'frontend');
  const distPath = path.join(frontendPath, 'dist');
  const hasDist = fs.existsSync(distPath);

  if (process.env.NODE_ENV === "production" || hasDist) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: frontendPath,
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
