import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { handleVoiceStream } from './routes/voice_ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config();

// Initialize Firebase Admin (Lazy)
let db: FirebaseFirestore.Firestore | null = null;
const getDb = () => {
  if (!db) {
    try {
      let app: App;
      const apps = getApps();
      if (apps.length === 0) {
        app = initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0481537282'
        });
      } else {
        app = apps[0];
      }
      
      const databaseId = process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-3169c61a-abd3-4e4a-bd76-66dab5a6e578';
      try {
        db = getFirestore(app, databaseId);
      } catch (e) {
        console.error('[FIREBASE_INIT_FAULT]', e);
        db = getFirestore(app);
      }
    } catch (err) {
      console.error('[FIREBASE_GLOBAL_FAULT]', err);
      return null;
    }
  }
  return db;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
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
    const key = req.ip || '0.0.0.0';
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
      try {
        let timestamp;
        try {
          timestamp = FieldValue.serverTimestamp();
        } catch (e) {
          timestamp = new Date();
        }
        
        const log = { type, severity, message, ip, timestamp };
        
        const database = getDb();
        if (database) {
          // Increase timeout for log addition
          await Promise.race([
            database.collection('siem_logs').add(log),
            new Promise((_, reject) => setTimeout(() => reject(new Error('SIEM_LOG_TIMEOUT')), 3000))
          ]);
        }
        return log;
      } catch (error) {
        console.error('[SIEM_LOG_FAULT]', error);
        return { type, severity, message, ip, timestamp: new Date() };
      }
    };

    const apiRouter = express.Router();

    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_demo';

    apiRouter.get("/v1/keys", (req, res) => {
      res.json({
        keys: [
          { id: 'sec_8291', name: 'Production_Node_01', key: 'sk_live_9283748291', created: '2026-04-20' },
          { id: 'sec_1102', name: 'Staging_Test', key: 'sk_test_1102837465', created: '2026-04-25' }
        ]
      });
    });

    apiRouter.post("/v1/feedback", (req, res) => {
      res.json({ status: "SUCCESS", message: "Feedback received." });
    });

    apiRouter.get("/v1/test", (req, res) => res.json({ ok: true, timestamp: Date.now() }));

    const otps = new Map();
    // Request OTP Route
    apiRouter.post("/v1/auth/request-otp", async (req, res) => {
      const phone = req.body.phone;
      console.log(`[AUTH_OTP_REQ] Starting sequence for: ${phone}`);
      
      try {
        if (!phone) {
          return res.status(400).json({ status: "ERROR", error: "MISSING_PHONE", message: "Neural link requires a phone identifier." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps.set(phone, otp);
        
        // Truly non-blocking log (no await, no catch that might block)
        pushSiemLog("AUTH_OTP_REQUEST", "LOW", `OTP requested for ${phone}`, (req.ip || "0.0.0.0").toString()).catch(() => {});

        // Success response
        return res.json({ 
          status: "SUCCESS", 
          mode: "MANUAL_DELIVERY", 
          message: "Verification sequence active. ID generated.", 
          demoOtp: otp 
        });
      } catch (err: any) {
        console.error('[AUTH_OTP_GLOBAL_FAULT]', err);
        // Force JSON response even if something above failed
        if (!res.headersSent) {
          res.status(500).json({ 
            status: "ERROR", 
            error: "SERVER_FAULT", 
            message: "Neural link integrity failure.",
            details: err?.message || String(err)
          });
        }
      }
    });

    apiRouter.post("/v1/auth/verify-otp", async (req, res) => {
      const { phone, otp } = req.body;

      if (otps.get(phone) === otp) {
        res.json({ status: "SUCCESS", message: "Phone verified." });
      } else {
        res.status(401).json({ error: "INVALID_OTP", message: "The code you entered is incorrect." });
      }
    });

    // Register Route
    apiRouter.post("/v1/auth/register", async (req, res) => {
      const { username, phone } = req.body;
      const token = jwt.sign({ username, phone }, JWT_SECRET, { expiresIn: '7d' });
      
      try {
        const database = getDb();
        if (database) {
          const timestamp = FieldValue.serverTimestamp();
          await database.collection('users').add({
            username,
            phone,
            createdAt: timestamp,
            status: 'ACTIVATED'
          });
        }
      } catch (error) {
        console.error('[REGISTRATION_FAULT]', error);
      }
      
      pushSiemLog("USER_REGISTRATION", "MEDIUM", `New node registered: ${username}`, (req.ip || "0.0.0.0").toString()).catch(() => {});
      res.json({ status: "SUCCESS", token, username });
    });

    apiRouter.get("/v1/security/metrics", async (req, res) => {
      try {
        const database = getDb();
        if (!database) throw new Error('No DB');
        const logsSnapshot = await database.collection('siem_logs').orderBy('timestamp', 'desc').limit(50).get();
        const logs = logsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        }));
        res.json({ metrics: { blockedAttacks: 1422, activeThreats: 12, riskScoreAverage: 24, uptime: "99.999%", nodeCount: 42 }, logs });
      } catch (error) {
        res.json({ 
          metrics: { blockedAttacks: 1422, activeThreats: 12, riskScoreAverage: 24, uptime: "99.999%", nodeCount: 42 }, 
          logs: [] 
        });
      }
    });

    apiRouter.post("/v1/security/simulate-attack", async (req, res) => {
      const { type } = req.body;
      const responses: any = {
        'PROMPT_INJECTION': { threat: 'Malicious Bypass Detected', defense: 'Neural Shield Blocked Payload', severity: 'HIGH' },
        'SPOOFING': { threat: 'Identity Spoofing Attempt', defense: 'Zero Trust Hardware Verification', severity: 'CRITICAL' },
        'DDOS': { threat: 'Traffic Flood Anomaly', defense: 'Neural Buffer Dynamic Scaling', severity: 'MEDIUM' }
      };
      const attack = responses[type] || responses['DDOS'];
      await pushSiemLog(`ATTACK_${type}`, attack.severity, attack.threat, '182.xx.xx.xx');
      res.json({ ...attack, status: 'BLOCKED' });
    });

    apiRouter.post("/analyze-tone", (req, res) => {
      const tones = ['CALM', 'STRESSED', 'ANGRY', 'NEUTRAL'];
      res.json({ tone: tones[Math.floor(Math.random() * tones.length)], confidence: 0.9 });
    });

    apiRouter.post("/detect", (req, res) => {
      const { input } = req.body;
      const isSuspicious = input?.toLowerCase().includes('bank');
      res.json({ status: "success", score: isSuspicious ? 92 : 12 });
    });

    apiRouter.get("/stats", (req, res) => {
      res.json({ 
        total_scans: "1.2M", 
        confirmed_phishing: "42.8K", 
        blocked_threats: "15.2K",
        safe_urls: "98.4%",
        vectors: [
          { name: 'Email', value: 72 },
          { name: 'SMS', value: 24 },
          { name: 'Social', value: 12 }
        ]
      });
    });

    apiRouter.get("/map-data", (req, res) => {
      res.json([{ city: 'New York', lat: 40.7128, lng: -74.0060, intensity: 85, type: 'PHISHING' }]);
    });

    apiRouter.get('/health', (req, res) => {
      console.log(`[HEALTH_CHK] Pulse from ${req.ip}`);
      res.json({ status: 'SENTINEL_CORE_ONLINE', version: '1.2.0', timestamp: new Date().toISOString() });
    });

    // Mount API routes
    app.use('/api', (req, res, next) => {
      res.setHeader('Content-Type', 'application/json');
      next();
    }, apiRouter);

    // Global JSON Error Handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('[GLOBAL_ERROR]', err);
      if (res.headersSent) return next(err);
      
      // Ensure we always return JSON
      res.status(err.status || 500).json({
        status: 'ERROR',
        error: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'A critical neural link failure occurred.',
        integrity_check: 'FAILED',
        timestamp: new Date().toISOString()
      });
    });

    // API router fallback (inside apiRouter)
    apiRouter.all('*', (req, res, next) => {
      // If it's a v1 route or specifically auth but wasn't handled, it's a 404 API error
      if (req.path.startsWith('/v1')) {
        return res.status(404).json({ 
          error: 'NEURAL_ENDPOINT_NOT_FOUND', 
          path: req.path,
          method: req.method
        });
      }
      next(); 
    });

    if (!process.env.VERCEL) {
      const server = createServer(app);
      const wss = new WebSocketServer({ noServer: true });

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
      const rootDistPath = path.join(process.cwd(), 'dist');
      const frontendDistPath = path.join(frontendPath, 'dist');
      const distPath = fs.existsSync(rootDistPath) ? rootDistPath : frontendDistPath;
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

    return app;
  }

// Global start call (only if not in Vercel)
if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("[SERVER_FATAL]", err);
  });
}
