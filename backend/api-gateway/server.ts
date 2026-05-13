import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { handleVoiceStream } from "./routes/voice_ws";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

dotenv.config();

let db: FirebaseFirestore.Firestore | null = null;

const getDb = () => {
  if (!db) {
    try {
      let app: App;

      const apps = getApps();

      if (apps.length === 0) {
        app = initializeApp({
          projectId:
            process.env.VITE_FIREBASE_PROJECT_ID ||
            "gen-lang-client-0481537282",
        });
      } else {
        app = apps[0];
      }

      const databaseId =
        process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
        "ai-studio-3169c61a-abd3-4e4a-bd76-66dab5a6e578";

      try {
        db = getFirestore(app, databaseId);
      } catch (e) {
        console.error("[FIREBASE_INIT_FAULT]", e);
        db = getFirestore(app);
      }
    } catch (err) {
      console.error("[FIREBASE_GLOBAL_FAULT]", err);
      return null;
    }
  }

  return db;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startServer() {
  const app = express();

  const PORT = process.env.PORT
    ? parseInt(process.env.PORT)
    : 3000;

  // =========================
  // CORS
  // =========================

  app.use(
    cors({
      origin: [
        "https://scamshield-ai-drds.onrender.com",
        "https://your-netlify-app.netlify.app",
      ],
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    })
  );

  // =========================
  // BODY PARSER
  // =========================

  app.use(express.json({ limit: "50mb" }));

  app.use(
    express.urlencoded({
      limit: "50mb",
      extended: true,
    })
  );

  // =========================
  // REQUEST LOGGER
  // =========================

  app.use((req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      if (req.url.startsWith("/api")) {
        console.log(
          `[API_TRACE] ${req.method} ${req.url} -> ${
            res.statusCode
          } (${Date.now() - start}ms)`
        );
      }
    });

    next();
  });

  // =========================
  // STATUS ROUTE
  // =========================

  app.get("/api/status", (req, res) => {
    res.send("Backend Running");
  });

  // =========================
  // CHECK ENV ROUTE
  // =========================

  app.get("/check", (req, res) => {
    res.json({
      backend: "RUNNING",

      gemini_key: process.env.GEMINI_API_KEY
        ? "FOUND"
        : "MISSING",

      jwt_secret: process.env.JWT_SECRET
        ? "FOUND"
        : "MISSING",

      node_env:
        process.env.NODE_ENV || "NOT_SET",

      render_url:
        "https://scamshield-ai-drds.onrender.com",
    });
  });

  // =========================
  // RATE LIMITER
  // =========================

  const rateLimitMap = new Map();

  const rateLimiter = (
    req: any,
    res: any,
    next: any
  ) => {
    const key = req.ip || "0.0.0.0";

    const now = Date.now();

    const window = 60000;

    const limit = 100;

    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const timestamps = rateLimitMap
      .get(key)
      .filter(
        (t: number) => t > now - window
      );

    if (timestamps.length >= limit) {
      return res.status(429).json({
        error: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
      });
    }

    timestamps.push(now);

    rateLimitMap.set(key, timestamps);

    next();
  };

  // =========================
  // SIEM LOGGER
  // =========================

  const pushSiemLog = async (
    type: string,
    severity:
      | "LOW"
      | "MEDIUM"
      | "HIGH"
      | "CRITICAL",
    message: string,
    ip: string
  ) => {
    try {
      let timestamp;

      try {
        timestamp =
          FieldValue.serverTimestamp();
      } catch {
        timestamp = new Date();
      }

      const log = {
        type,
        severity,
        message,
        ip,
        timestamp,
      };

      const database = getDb();

      if (database) {
        await Promise.race([
          database
            .collection("siem_logs")
            .add(log),

          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "SIEM_LOG_TIMEOUT"
                  )
                ),
              3000
            )
          ),
        ]);
      }

      return log;
    } catch (error) {
      console.error(
        "[SIEM_LOG_FAULT]",
        error
      );

      return {
        type,
        severity,
        message,
        ip,
        timestamp: new Date(),
      };
    }
  };

  // =========================
  // API ROUTER
  // =========================

  const apiRouter = express.Router();

  apiRouter.use((req, res, next) => {
    res.setHeader(
      "Content-Type",
      "application/json"
    );

    next();
  });

  const JWT_SECRET =
    process.env.JWT_SECRET ||
    "fallback_secret_for_demo";

  // =========================
  // TEST ROUTE
  // =========================

  apiRouter.get("/v1/test", (req, res) => {
    res.json({
      ok: true,
      timestamp: Date.now(),
    });
  });

  // =========================
  // FEEDBACK
  // =========================

  apiRouter.post(
    "/v1/feedback",
    (req, res) => {
      res.json({
        status: "SUCCESS",
        message: "Feedback received",
      });
    }
  );

  // =========================
  // OTP
  // =========================

  const otps = new Map();

  apiRouter.post(
    "/v1/auth/request-otp",
    async (req, res) => {
      const phone = req.body.phone;

      try {
        if (!phone) {
          return res.status(400).json({
            status: "ERROR",
            error: "MISSING_PHONE",
          });
        }

        const otp = Math.floor(
          100000 + Math.random() * 900000
        ).toString();

        otps.set(phone, otp);

        pushSiemLog(
          "AUTH_OTP_REQUEST",
          "LOW",
          `OTP requested for ${phone}`,
          (
            req.ip || "0.0.0.0"
          ).toString()
        ).catch(() => {});

        return res.json({
          status: "SUCCESS",
          demoOtp: otp,
        });
      } catch (err: any) {
        console.error(
          "[AUTH_OTP_ERROR]",
          err
        );

        res.status(500).json({
          status: "ERROR",
          message: err.message,
        });
      }
    }
  );

  apiRouter.post(
    "/v1/auth/verify-otp",
    async (req, res) => {
      const { phone, otp } = req.body;

      if (otps.get(phone) === otp) {
        res.json({
          status: "SUCCESS",
          message: "Phone verified",
        });
      } else {
        res.status(401).json({
          error: "INVALID_OTP",
        });
      }
    }
  );

  // =========================
  // REGISTER
  // =========================

  apiRouter.post(
    "/v1/auth/register",
    async (req, res) => {
      const { username, phone } =
        req.body;

      const token = jwt.sign(
        { username, phone },
        JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      try {
        const database = getDb();

        if (database) {
          await database
            .collection("users")
            .add({
              username,
              phone,
              createdAt:
                FieldValue.serverTimestamp(),
              status: "ACTIVE",
            });
        }
      } catch (error) {
        console.error(
          "[REGISTER_ERROR]",
          error
        );
      }

      res.json({
        status: "SUCCESS",
        token,
        username,
      });
    }
  );

  // =========================
  // SECURITY METRICS
  // =========================

  apiRouter.get(
    "/v1/security/metrics",
    async (req, res) => {
      res.json({
        metrics: {
          blockedAttacks: 1422,
          activeThreats: 12,
          riskScoreAverage: 24,
          uptime: "99.999%",
        },
      });
    }
  );

  // =========================
  // HEALTH
  // =========================

  apiRouter.get(
    "/health",
    async (req, res) => {
      res.json({
        status:
          "SENTINEL_CORE_ONLINE",

        version: "1.2.0",

        timestamp:
          new Date().toISOString(),

        ai_enabled: true,
      });
    }
  );

  // =========================
  // 404
  // =========================

  apiRouter.all("*", (req, res) => {
    res.status(404).json({
      error:
        "NEURAL_ENDPOINT_NOT_FOUND",

      path: req.originalUrl,
    });
  });

  // =========================
  // MOUNT ROUTER
  // =========================

  app.use("/api", apiRouter);

  // =========================
  // ERROR HANDLER
  // =========================

  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      console.error(
        "[GLOBAL_ERROR]",
        err
      );

      if (res.headersSent) {
        return next(err);
      }

      res.status(500).json({
        status: "ERROR",
        message:
          err.message ||
          "Internal server error",
      });
    }
  );

  // =========================
  // HTTP + WEBSOCKET
  // =========================

  const server = createServer(app);

  const wss = new WebSocketServer({
    noServer: true,
  });

  server.on(
    "upgrade",
    (request, socket, head) => {
      const pathname = new URL(
        request.url!,
        `http://${request.headers.host}`
      ).pathname;

      if (
        pathname ===
        "/api/voice-stream"
      ) {
        wss.handleUpgrade(
          request,
          socket,
          head,
          (ws) => {
            handleVoiceStream(
              ws,
              request
            );
          }
        );
      } else {
        socket.destroy();
      }
    }
  );

  // =========================
  // FRONTEND SERVE
  // =========================

  const distPath = path.join(
    process.cwd(),
    "dist"
  );

  const hasDist =
    fs.existsSync(distPath);

  if (
    process.env.NODE_ENV ===
      "production" ||
    hasDist
  ) {
    console.log(
      `[SERVER] Production mode`
    );

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(
        path.join(
          distPath,
          "index.html"
        )
      );
    });
  } else {
    console.log(
      `[SERVER] Development mode`
    );

    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },

        appType: "spa",

        root: path.join(
          process.cwd(),
          "frontend"
        ),
      });

    app.use(vite.middlewares);
  }

  // =========================
  // START SERVER
  // =========================

  server.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `[SERVER] Running on ${PORT}`
      );
    }
  );

  return app;
}

// =========================
// BOOTSTRAP
// =========================

startServer().catch((err) => {
  console.error(
    "[SERVER_FATAL]",
    err
  );
});
