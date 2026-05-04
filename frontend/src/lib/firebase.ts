import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

// Ensure the user is signed in (anonymously) for secure rules to work
let authRetryCount = 0;
const MAX_RETRY = 3;

onAuthStateChanged(auth, (user) => {
  if (!user && authRetryCount < MAX_RETRY) {
    signInAnonymously(auth).catch(err => {
      if (err.code === 'auth/admin-restricted-operation') {
        console.warn("Anonymous auth is disabled in Firebase Console. Some secure features may be restricted.");
      } else if (err.code === 'auth/network-request-failed') {
        authRetryCount++;
        console.warn(`Initial auth network failure (Attempt ${authRetryCount}/${MAX_RETRY}). Retrying in 2s...`);
        setTimeout(() => {
          // Re-triggering sign-in if still no user
          if (!auth.currentUser) signInAnonymously(auth).catch(() => {});
        }, 2000);
      } else {
        console.error("Initial auth failed:", err);
      }
    });
  }
});

export async function waitForAuth(): Promise<any> {
  return new Promise((resolve) => {
    // If already has a user, or we've explicitly checked and it's null (synced stay)
    if (auth.currentUser) return resolve(auth.currentUser);
    
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        console.warn("Auth synchronization timed out. Proceeding with current state.");
        unsubscribe();
        resolve(auth.currentUser);
      }
    }, 5000);

    const unsubscribe = auth.onAuthStateChanged((user) => {
      resolved = true;
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType | string;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType | string, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    // Try to get a public document to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established.");
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('the client is offline')) {
      console.warn("Firebase service unavailable (client offline?). Operations will resume when connectivity returns.");
    } else if (error.code === 'permission-denied') {
      console.error("Firebase permission denied. Check your Firestore rules.");
    } else {
      console.error("Firebase connection diagnostic:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
    }
  }
}
