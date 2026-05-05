# ScamShield AI: Neural Phishing Protection

## 🚀 Architecture: MICROSERVICES_v2.0

ScamShield AI is a distributed security platform designed for real-time threat detection across web and mobile.

### 🌐 Frontend (frontend-web)
- **React 18 + Vite**: High-performance UI with 100D parallax.
- **Sentinel Neural Core**: Client-side heuristics and AI integration.
- **Monetization**: Integrated subscription and payment systems.

### 📱 Mobile (android-app)
- **Kotlin Core**: Native Android protection.
- **Audio Service**: Real-time voice scam detection via foreground services.

### 🧠 Backend (Microservices)
- **API Gateway**: Entry point for all requests (Express/Node).
- **GPT Service**: Deep neural analysis (Python/Flask).
- **Detection Service**: URL/Text ML models.
- **Voice Service**: Real-time audio analysis.
- **Auth Service**: JWT-based secure authentication.
- **Payment Service**: Razorpay/Stripe integration.

### 🛡️ Security & Monitoring
- **DoS Protection**: Redis-backed rate limiting.
- **Observability**: Prometheus + Grafana metrics.
- **Infrastructure**: Docker + Kubernetes orchestration.

### 🛠️ Design Patterns
- **Strategy**: Pluggable detection algorithms.
- **Facade**: Simplified interface for complex neural operations.
- **Factory**: Structured result generation.
- **Builder**: Complex threat report construction.
- **Observer**: Real-time UI synchronization.

## 🛡️ Security Features
- **Rate Limiting**: Distributed protection against brute-force scans.
- **Bot Detection**: Heuristic-based bot identification.
- **Payload Limits**: Protection against large-payload DoS attacks.
- **IP Blocking**: Automatic banning of identified attackers.

## 📈 Monitoring
- **Real-time Metrics**: Live traffic and threat visualization.
- **Anomaly Logging**: Detailed logs for security auditing.
- **Alert Manager**: Instant notifications for critical breaches.

## 🚀 Deployment (Production Guide)

If you are deploying this app to GitHub and then to a host like **Render**, **Railway**, or **Vercel**, follow these steps:

### 1. Environment Variables
Ensure the following variables are set in your hosting provider's dashboard:
- `GEMINI_API_KEY`: Your Google AI Studio API key.
- `JWT_SECRET`: A long random string for auth security.
- `VITE_FIREBASE_PROJECT_ID`: Your Firebase Project ID.
- `VITE_FIREBASE_FIRESTORE_DATABASE_ID`: (Optional) Your Firestore Database ID.

### 2. Build & Start Commands
- **Build Command**: `npm run build`
- **Start Command**: `npm start` (or `node server.ts` if your host supports TypeScript natively, otherwise build the server first).
- **OutDir**: The build process creates a `dist` folder in the root. The server is configured to serve this folder.

### 3. Database Sync
This app uses **Firebase (Firestore)** for real-time logs and user data. 
1. Go to your Firebase Console.
2. Enable **Firestore Database**.
3. Apply the security rules found in `firestore.rules`.
4. Ensure your project ID matches the environment variable.

### 4. Common Issues
### AI Integration Details
- **Provider**: Google Gemini
- **Security**: The `GEMINI_API_KEY` is kept **server-side** in the `backend/api-gateway/server.ts` to prevent exposure in the browser.
- **Workflow**: Frontend sends requests to `/api/v1/ai/*` -> Backend appends the key and calls Google APIs -> Response is returned to frontend.

### Troubleshooting
- **NEURAL_CORE_OFFLINE / Connection Fault?**
  - This means the frontend cannot reach the backend `/api/health` endpoint.
  - **Environment Variables**: Ensure `GEMINI_API_KEY` and `JWT_SECRET` are set in your deployment platform's environment variables dashboard.
  - **Backend URL**: If the frontend is on a different domain, you MUST set `VITE_API_BASE_URL` on the frontend host.
  - **Local Dev**: Ensure you have a `.env` file with these keys.
