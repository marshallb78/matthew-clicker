import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, onIdTokenChanged } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

export const TAB_SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyCTXzcBJ5khpXzaXgd8WfaUfYntPFGZuqg',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'matthew-clicker-2268f.firebaseapp.com',
  databaseURL:
    env.VITE_FIREBASE_DATABASE_URL ||
    'https://matthew-clicker-2268f-default-rtdb.firebaseio.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'matthew-clicker-2268f',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'matthew-clicker-2268f.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '603829057642',
  appId: env.VITE_FIREBASE_APP_ID || '1:603829057642:web:a41632c2d5f8e398fa7213',
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let initError: string | null = null;
let cachedAuthIdToken: string | null = null;
let idTokenListenerAttached = false;

let writeCooldownUntilMs = 0;
const WRITE_COOLDOWN_DURATION_MS = 5 * 60 * 1000;

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
    if (!idTokenListenerAttached && authInstance) {
      idTokenListenerAttached = true;
      onIdTokenChanged(authInstance, async (user) => {
        if (!user) {
          cachedAuthIdToken = null;
          return;
        }
        try {
          cachedAuthIdToken = await user.getIdToken();
        } catch {
          // keep previous token if transient
        }
      });
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

const RTDB_REST_BASE = firebaseConfig.databaseURL.replace(/\/$/, '');
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;

export async function getAuthIdToken(timeoutMs = 2500): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const { auth } = getFirebaseServices();
  if (!auth?.currentUser) {
    cachedAuthIdToken = null;
    return null;
  }
  try {
    const token = await Promise.race([
      auth.currentUser.getIdToken(),
      new Promise<string | null>((resolve) => setTimeout(() => resolve(cachedAuthIdToken), timeoutMs)),
    ]);
    if (token) cachedAuthIdToken = token;
    return token;
  } catch {
    return cachedAuthIdToken;
  }
}

export function getCachedAuthIdTokenSync(): string | null {
  return cachedAuthIdToken;
}

/**
 * Stateless Firebase Realtime Database GET via HTTP REST with status reporting & automatic retry.
 * Explicitly distinguishes HTTP 200 (ok: true, even when data === null) from network/timeout failures (ok: false).
 */
export async function rtdbRestGetWithStatus<T = any>(
  path: string,
  timeoutMs = 6500,
  retries = 1
): Promise<{ ok: boolean; data: T | null }> {
  const cleanPath = path.replace(/^\/+|\.json$/g, '');
  const token = await getAuthIdToken(1800);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const url = token
        ? `${RTDB_REST_BASE}/${cleanPath}.json?auth=${encodeURIComponent(token)}`
        : `${RTDB_REST_BASE}/${cleanPath}.json`;
      let res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok && token && (res.status === 401 || res.status === 403)) {
        res = await fetch(`${RTDB_REST_BASE}/${cleanPath}.json`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
      }
      if (res.ok) {
        return { ok: true, data: (await res.json()) as T | null };
      }
    } catch {
      // retry if attempts remain
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  return { ok: false, data: null };
}

/**
 * Stateless Firebase Realtime Database GET via HTTP REST.
 * - Zero persistent WebSocket overhead (supports thousands of concurrent players).
 * - Unlimited daily reads/writes under the 10 GB/month bandwidth tier.
 */
export async function rtdbRestGet<T = any>(
  path: string,
  timeoutMs = 5500
): Promise<T | null> {
  const res = await rtdbRestGetWithStatus<T>(path, timeoutMs, 1);
  return res.data;
}

/**
 * Stateless Firebase Realtime Database PUT/PATCH via HTTP REST.
 * - Unlimited daily writes on the Free Spark plan!
 */
export async function rtdbRestWrite(
  path: string,
  data: Record<string, any>,
  method: 'PUT' | 'PATCH' = 'PUT',
  timeoutMs = 4500,
  keepalive = false
): Promise<boolean> {
  const cleanPath = path.replace(/^\/+|\.json$/g, '');
  const token = await getAuthIdToken();
  const url = token
    ? `${RTDB_REST_BASE}/${cleanPath}.json?auth=${encodeURIComponent(token)}`
    : `${RTDB_REST_BASE}/${cleanPath}.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive,
      signal: controller.signal,
    });
    if (res.ok) return true;
    if (token) {
      const fallbackRes = await fetch(`${RTDB_REST_BASE}/${cleanPath}.json`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive,
        signal: controller.signal,
      });
      return fallbackRes.ok;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Synchronous keepalive write for beforeunload / pagehide / visibilitychange so closing
 * a phone or desktop browser flushes the latest save before the tab terminates.
 */
export function rtdbRestWriteKeepalive(
  path: string,
  data: Record<string, any>,
  method: 'PUT' | 'PATCH' = 'PUT'
): void {
  if (typeof fetch === 'undefined') return;
  const cleanPath = path.replace(/^\/+|\.json$/g, '');
  const token = cachedAuthIdToken;
  const url = token
    ? `${RTDB_REST_BASE}/${cleanPath}.json?auth=${encodeURIComponent(token)}`
    : `${RTDB_REST_BASE}/${cleanPath}.json`;
  try {
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore unload errors
  }
}

/**
 * Stateless Firebase Realtime Database DELETE via HTTP REST.
 */
export async function rtdbRestDelete(
  path: string,
  timeoutMs = 3500
): Promise<boolean> {
  const cleanPath = path.replace(/^\/+|\.json$/g, '');
  const token = await getAuthIdToken();
  const url = token
    ? `${RTDB_REST_BASE}/${cleanPath}.json?auth=${encodeURIComponent(token)}`
    : `${RTDB_REST_BASE}/${cleanPath}.json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'DELETE',
      signal: controller.signal,
    });
    if (res.ok) return true;
    if (token) {
      const fallbackRes = await fetch(`${RTDB_REST_BASE}/${cleanPath}.json`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      return fallbackRes.ok;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

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
  const token = await getAuthIdToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else if (requireAuth && typeof window !== 'undefined') {
    throw new Error('Not authenticated');
  }
  return headers;
}

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
      return false;
    }

    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
