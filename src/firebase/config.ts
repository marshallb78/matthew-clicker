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

/**
 * Circuit Breaker for Firestore Writes:
 * When the Firebase Spark Free Plan daily write quota (20,000 writes/day) is reached,
 * Firestore returns HTTP 429 / RESOURCE_EXHAUSTED.
 * Using stateless REST calls + this circuit breaker prevents the Firestore JS SDK
 * from hanging promises or clogging its WebChannel connection with infinite retries.
 */
let writeCooldownUntilMs = 0;
const WRITE_COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes cooldown on 429 quota exceeded

export function isCloudWriteCoolingDown(): boolean {
  return Date.now() < writeCooldownUntilMs;
}

export function markCloudWriteQuotaExceeded(): void {
  writeCooldownUntilMs = Date.now() + WRITE_COOLDOWN_DURATION_MS;
}

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

const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

export function decodeFirestoreValue(valObj: any): any {
  if (!valObj || typeof valObj !== 'object') return null;
  if ('stringValue' in valObj) return String(valObj.stringValue);
  if ('booleanValue' in valObj) return Boolean(valObj.booleanValue);
  if ('nullValue' in valObj) return null;
  if ('integerValue' in valObj) return Number(valObj.integerValue);
  if ('doubleValue' in valObj) return Number(valObj.doubleValue);
  if ('timestampValue' in valObj) return valObj.timestampValue;
  if ('arrayValue' in valObj) {
    const values = valObj.arrayValue?.values;
    return Array.isArray(values) ? values.map(decodeFirestoreValue) : [];
  }
  if ('mapValue' in valObj) {
    return decodeFirestoreFields(valObj.mapValue?.fields || {});
  }
  return null;
}

export function decodeFirestoreFields(fields: Record<string, any> | undefined): Record<string, any> {
  if (!fields || typeof fields !== 'object') return {};
  const result: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = decodeFirestoreValue(v);
  }
  return result;
}

export function encodeFirestoreValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) {
      return { integerValue: '0' };
    }
    // Use integerValue for safe integers < 1e15, doubleValue for floats or huge numbers (Quadrillions to Decillions)
    if (Number.isInteger(val) && Math.abs(val) < 1e15) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => encodeFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    // Handle serverTimestamp sentinel or plain objects
    if ('_methodName' in val && val._methodName === 'serverTimestamp') {
      return { timestampValue: new Date().toISOString() };
    }
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function encodeFirestoreDocument(data: Record<string, any>): { fields: Record<string, any> } {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreValue(v);
    }
  }
  return { fields };
}

async function getAuthBearerHeaders(requireAuth: boolean): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (typeof window === 'undefined') return headers;
  const { auth } = getFirebaseServices();
  if (auth?.currentUser) {
    try {
      const token = await Promise.race([
        auth.currentUser.getIdToken(),
        new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch {
      // Proceed without token if unavailable
    }
  } else if (requireAuth) {
    throw new Error('Not authenticated');
  }
  return headers;
}

/**
 * Fast, non-hanging Firestore document read via REST with a hard timeout.
 * Never gets stuck behind a backed-up Firestore WebChannel write queue.
 */
export async function firestoreRestGetDoc(
  docPath: string,
  requireAuth = false,
  timeoutMs = 3500
): Promise<{ exists: boolean; id: string; data: Record<string, any> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = await getAuthBearerHeaders(requireAuth);
    const res = await fetch(`${FIRESTORE_REST_BASE}/${docPath}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    if (res.status === 404) {
      return { exists: false, id: docPath.split('/').pop() || '', data: {} };
    }
    if (!res.ok) {
      throw new Error(`Firestore GET ${docPath} failed (${res.status})`);
    }
    const json = await res.json();
    const id = (json.name || docPath).split('/').pop() || '';
    return {
      exists: true,
      id,
      data: decodeFirestoreFields(json.fields),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fast, non-hanging Firestore collection list via REST with a hard timeout.
 */
export async function firestoreRestListDocs(
  collectionPath: string,
  pageSize = 100,
  timeoutMs = 4000
): Promise<Array<{ id: string; data: Record<string, any> }>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(
      `${FIRESTORE_REST_BASE}/${collectionPath}?pageSize=${pageSize}`,
      {
        method: 'GET',
        signal: controller.signal,
      }
    );
    if (!res.ok) {
      throw new Error(`Firestore LIST ${collectionPath} failed (${res.status})`);
    }
    const json = await res.json();
    const docs = Array.isArray(json.documents) ? json.documents : [];
    return docs.map((d: any) => ({
      id: (d.name || '').split('/').pop() || '',
      data: decodeFirestoreFields(d.fields),
    }));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fast, non-hanging Firestore document write (PATCH) via REST with Circuit Breaker.
 * - Immediately returns `false` if write quota is in cooldown (`429 RESOURCE_EXHAUSTED`),
 *   preventing the app from ever freezing or spamming retries.
 */
export async function firestoreRestSetDoc(
  docPath: string,
  data: Record<string, any>,
  timeoutMs = 3500
): Promise<boolean> {
  if (isCloudWriteCoolingDown()) {
    return false;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = await getAuthBearerHeaders(true);
    const body = JSON.stringify(encodeFirestoreDocument(data));
    const res = await fetch(`${FIRESTORE_REST_BASE}/${docPath}`, {
      method: 'PATCH',
      headers,
      body,
      signal: controller.signal,
    });

    if (res.status === 429) {
      markCloudWriteQuotaExceeded();
      console.warn('Firestore daily write quota reached (429); pausing cloud writes for 5m.');
      return false;
    }

    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
