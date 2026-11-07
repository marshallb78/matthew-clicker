import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCTXzcBJ5khpXzaXgd8WfaUfYntPFGZuqg',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'matthew-clicker-2268f.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'matthew-clicker-2268f',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'matthew-clicker-2268f.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '603829057642',
  appId: env.VITE_FIREBASE_APP_ID || '1:603829057642:web:a41632c2d5f8e398fa7213',
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let initError: string | null = null;

export function getFirebaseServices(): {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  error: string | null;
} {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, db: null, error: null };
  }

  try {
    if (!appInstance) {
      appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    }
    if (!authInstance) {
      authInstance = getAuth(appInstance);
    }
    if (!dbInstance) {
      dbInstance = getFirestore(appInstance);
    }
    return { app: appInstance, auth: authInstance, db: dbInstance, error: null };
  } catch (err: unknown) {
    initError = (err as Error)?.message || 'Failed to initialize Firebase services.';
    console.error('Firebase initialization error:', err);
    return { app: null, auth: null, db: null, error: initError };
  }
}

