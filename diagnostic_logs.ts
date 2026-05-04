import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const app = initializeApp({
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0481537282'
});
const db = getFirestore(app, process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 'ai-studio-3169c61a-abd3-4e4a-bd76-66dab5a6e578');

async function checkLogs() {
  console.log("Checking SIEM logs...");
  const snapshot = await db.collection('siem_logs').orderBy('timestamp', 'desc').limit(5).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

checkLogs().catch(console.error);
