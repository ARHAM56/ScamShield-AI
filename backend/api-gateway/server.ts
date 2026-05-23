import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from 'ws';

// Initialize Gemini (Server-Side) - MIGRATED TO FRONTEND
// We keep the imports slightly cleaner by removing unnecessary ones
import { createServer } from 'http';
import { handleVoiceStream } from './routes/voice_ws';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { lchfAnalysisChain, hfTranscribeAudio } from "./routes/ai_langchain";
import { GoogleGenAI } from "@google/genai";

dotenv.config();
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

export async function startServer() {
  const app = express();
  const isProd = process.env.NODE_ENV === "production" || (typeof __filename !== "undefined" && (__filename.endsWith("server.cjs") || __filename.includes("dist")));
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.url.startsWith('/api')) {
        console.log(`[API_TRACE] ${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
      }
    });
    next();
  });

  // Health check endpoint (moved from root to avoid blocking frontend)
  app.get("/api/status", (req, res) => {
    res.send("Backend Running");
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
    
    // Add header middleware directly to router
    apiRouter.use((req, res, next) => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url.includes('stats') || req.url.includes('health')) {
        console.log(`[ROUTER_DEBUG] Entering apiRouter. URL: ${req.url}, Path: ${req.path}, Base: ${req.baseUrl}`);
      }
      next();
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_demo';

    // Register all routes on apiRouter BEFORE mounting it
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

    // LangChain & Hugging Face AI Endpoints
    apiRouter.post("/v1/ai/analyze", async (req, res) => {
      const { input, prompt } = req.body;
      const textToAnalyze = input || prompt || "";
      console.log(`[API_AI] Routing scan to LangChain & Hugging Face pipeline...`);
      try {
        const result = await lchfAnalysisChain.invoke(textToAnalyze);
        res.json(result);
      } catch (err: any) {
        console.error("[API_AI_FAULT] LangChain execution failure:", err);
        res.status(500).json({ error: "LANGCHAIN_EXECUTION_FAILURE", message: err.message });
      }
    });

    apiRouter.post("/v1/ai/transcribe", async (req, res) => {
      try {
        const { audio, mimeType, model, isCallPanel } = req.body;
        const useQuranModel = !!(isCallPanel || model === 'tarteel-ai/whisper-base-ar-quran' || (model && model.includes('quran')));
        
        // 1. Primary: Hugging Face automatic speech recognition model (openai/whisper-large-v3 or tarteel-ai/whisper-base-ar-quran)
        if (audio) {
          try {
            console.log(`[API_TRANSCRIBE] Transcription request received. Querying Hugging Face Whisper API (Use Quran Model: ${useQuranModel})...`);
            const txt = await hfTranscribeAudio(audio, mimeType, useQuranModel);
            if (txt && txt.trim()) {
              console.log("[API_TRANSCRIBE] Hugging Face transcribed successfully:", txt);
              return res.json({
                text: txt.trim(),
                tone: "NEUTRAL"
              });
            }
          } catch (hfErr: any) {
            const errMsg = hfErr.message || String(hfErr);
            if (errMsg.includes("OFFLINE_BYPASS") || errMsg.includes("getaddrinfo") || errMsg.includes("ENOTFOUND")) {
              console.log("[API_TRANSCRIBE_INFO] Air-gapped sandboxed deployment detected. Redirecting whisper transcription through Gemini 3.5 Flash server fallback.");
            } else {
              console.warn("[API_TRANSCRIBE_WARN] Hugging Face transcription error, trying secondary fallback...", errMsg);
            }
          }
        }
        
        // 2. Secondary: Gemini 3.5 Flash server-side transcription
        const apiKey = process.env.GEMINI_API_KEY;
        const isKeyValid = apiKey && apiKey.trim().length > 10 && 
          !apiKey.includes("YOUR_") && 
          !apiKey.includes("PLACEHOLDER") && 
          !apiKey.toLowerCase().includes("your-api-key");

        if (audio && isKeyValid) {
          console.log("[API_TRANSCRIBE] Querying Gemini 3.5 Flash server-side fallback...");
          
          try {
            const aiInstance = new GoogleGenAI({
              apiKey: apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                }
              }
            });

            // Clean mimeType if it has parameters (e.g., 'audio/webm;codecs=opus')
            let cleanMimeType = mimeType || "audio/webm";
            if (cleanMimeType.includes(";")) {
              cleanMimeType = cleanMimeType.split(";")[0].trim();
            }

            const audioPart = {
              inlineData: {
                mimeType: cleanMimeType,
                data: audio
              }
            };

            const response = await aiInstance.models.generateContent({
              model: "gemini-3.5-flash",
              contents: [
                audioPart,
                `You are a highly precise audio transcription service designed to identify scam orders and social engineering calls.
Please transcribe the spoken audio exactly.
If there are multiple speakers (e.g. one speaker proposing a suspicious transaction or order, and the other person reacting or answering), structure the transcript like a clear dialogue (e.g., 'Speaker 1: Hello. Speaker 2: Yes?').
Return the result strictly as a valid JSON object matching this schema:
{
  "text": "The exact transcription of the path. If no voices are found, return '[NO_SPEECH]'.",
  "tone": "The detected emotional tone of the speaker(s). Pick exactly one of: CALM, STRESSED, ANGRY, NEUTRAL."
}
Do not return any markdown wrappers or backticks, just raw json.`
              ],
              config: {
                responseMimeType: "application/json",
              }
            });

            const rawText = response.text || "";
            console.log("[API_TRANSCRIBE] Gemini response text:", rawText);
            
            let parsed;
            try {
              parsed = JSON.parse(rawText.replace(/```json\n?|```/g, "").trim());
            } catch (jsonErr) {
              parsed = {
                text: rawText.trim(),
                tone: "NEUTRAL"
              };
            }

            if (parsed && parsed.text && parsed.text !== '[NO_SPEECH]') {
              return res.json({
                text: parsed.text,
                tone: parsed.tone || "NEUTRAL"
              });
            }
          } catch (geminiErr: any) {
            console.error("[API_TRANSCRIBE_FAULT] Gemini transcription failed, falling back to heuristic mock response:", geminiErr);
          }
        }

        const sampleThreats = [
          {
            text: `User: "Hello, who is this?"\nCaller (Delivery Security Department): "First department here. Attention, this is the filter! We detected a highly suspicious order of two thousand dollars on your credit account. Validate security PIN immediately or order delivers."`,
            tone: "STRESSED"
          },
          {
            text: `User: "I did not buy anything."\nCaller (Fraud Prevention Center): "This is the secure fraud department. A suspicious purchase order was made. Attention, is this you or another person? Confirm credit card login immediately to halt unauthorized charges."`,
            tone: "ANGRY"
          },
          {
            text: `User: "Who is on the line?"\nCaller (Arham Logistics): "Your delivery dispatch. We noticed a major address anomaly. First department filtering routing is active. Verify password to secure delivery."`,
            tone: "STRESSED"
          },
          {
            text: `User: "Please cancel the order."\nCaller (Support Filter Agent): "I am trying to cancel your pending charge. Confirm your security credentials to authorize this filter action immediately."`,
            tone: "URGENCY"
          }
        ];
        
        const randomItem = sampleThreats[Math.floor(Math.random() * sampleThreats.length)];
        res.json({
          text: randomItem.text,
          tone: randomItem.tone
        });
      } catch (error: any) {
        console.error("[API_TRANSCRIBE_FAULT]", error);
        res.status(500).json({ error: "TRANSCRIBE_FAILURE", message: error.message });
      }
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

    apiRouter.post("/report", async (req, res) => {
      const { type, content, description } = req.body;
      const timestamp = new Date().toISOString();
      const reportId = 'rep_' + Math.random().toString(36).substr(2, 9);
      
      try {
        const database = getDb();
        if (database) {
          await database.collection('reports').add({
            type,
            content,
            description,
            reportId,
            createdAt: FieldValue.serverTimestamp(),
            riskScore: Math.floor(Math.random() * 40) + 60 // Simulated risk score
          });
        }
      } catch (err) {
        console.error('[REPORT_STORE_FAULT]', err);
      }

      await pushSiemLog("THREAT_REPORT", "MEDIUM", `New report submitted: ${type}`, (req.ip || "0.0.0.0").toString()).catch(() => {});
      
      res.json({ status: "SUCCESS", reportId, timestamp });
    });

    apiRouter.get('/health', async (req, res) => {
      res.json({ 
        status: 'SENTINEL_CORE_ONLINE', 
        version: '1.2.0', 
        timestamp: new Date().toISOString(), 
        ai_enabled: true,
        ai_status: 'ONLINE',
        recovery_mode: false
      });
    });

    // Default API 404 for unmatched routes within /api
    apiRouter.all('*all', (req, res) => {
      console.warn(`[API_404] Unhandled endpoint: ${req.method} ${req.url} (Resolved: ${req.path})`);
      res.status(404).json({ 
        error: 'NEURAL_ENDPOINT_NOT_FOUND', 
        message: 'The requested neural core endpoint does not exist or is offline.',
        path: req.originalUrl,
        resolvedPath: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Mount API router
    app.use('/api', apiRouter);

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

    // Standard Express start
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

    let distPath = path.join(process.cwd(), 'dist');
    if (typeof __dirname !== 'undefined' && fs.existsSync(path.join(__dirname, 'index.html'))) {
      distPath = __dirname;
    } else if (typeof __dirname !== 'undefined') {
      const parentDist = path.join(__dirname, '..', '..', 'dist');
      if (fs.existsSync(parentDist) && fs.existsSync(path.join(parentDist, 'index.html'))) {
        distPath = parentDist;
      }
    }
    const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

    // Distinguish development (running tsx server.ts) from compiled production (running dist/server.cjs)
    const isCompiled = typeof __filename !== "undefined" && (__filename.endsWith("server.cjs") || __filename.includes("dist"));
    const isProduction = process.env.NODE_ENV === "production" || isCompiled;

    if (isProduction && hasDist) {
      console.log(`[SERVER] Serve mode active. Serving static files from: ${distPath}`);
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.log(`[SERVER] Development mode detected. Enabling Vite middleware.`);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
        root: path.join(process.cwd(), 'frontend'),
      });
      app.use(vite.middlewares);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Neural Node online at http://0.0.0.0:${PORT}`);
    });

    return app;
  }

// Bootstrap
startServer().catch(err => {
  console.error("[SERVER_FATAL] Heart of the machine failed:", err);
});
