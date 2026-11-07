import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from './config';

export interface PlayerAccount {
  uid: string;
  username: string;
  normalizedUsername: string;
}

const INTERNAL_EMAIL_DOMAIN = 'users.matthewclicker.local';

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsernameFormat(username: string): string | null {
  const trimmed = username.trim();
  if (trimmed.length < 3 || trimmed.length > 20) {
    return 'Username must be between 3 and 20 characters.';
  }
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores (_).';
  }
  return null;
}

export function validatePasswordFormat(password: string): string | null {
  if (!password || password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  return null;
}

export function usernameToInternalAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

/**
 * Registers a new unique username + password account in Firebase Auth & Firestore.
 */
export async function registerWithUsername(
  username: string,
  password: string
): Promise<PlayerAccount> {
  const usernameErr = validateUsernameFormat(username);
  if (usernameErr) throw new Error(usernameErr);

  const passwordErr = validatePasswordFormat(password);
  if (passwordErr) throw new Error(passwordErr);

  const { auth, db, error } = getFirebaseServices();
  if (!auth || !db) {
    throw new Error(error || 'Firebase is not available in this environment.');
  }

  const cleanDisplayUsername = username.trim();
  const normalized = normalizeUsername(cleanDisplayUsername);
  const usernameDocRef = doc(db, 'usernames', normalized);

  const internalEmail = usernameToInternalAuthEmail(normalized);
  let credential;
  try {
    credential = await createUserWithEmailAndPassword(auth, internalEmail, password);
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      throw new Error(`Incorrect password for existing account "${cleanDisplayUsername}".`);
    }
    if (err?.code === 'auth/operation-not-allowed') {
      throw new Error(
        'Email/Password sign-in is not enabled in Firebase Console -> Authentication -> Sign-in method.'
      );
    }
    throw new Error(err?.message || 'Account creation failed. Please check your connection.');
  }

  const user = credential.user;

  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(usernameDocRef);
      if (snap.exists() && snap.data()?.uid !== user.uid) {
        throw new Error(`Username "${cleanDisplayUsername}" is already claimed.`);
      }
      tx.set(usernameDocRef, {
        uid: user.uid,
        username: cleanDisplayUsername,
        normalizedUsername: normalized,
        createdAt: serverTimestamp(),
      });
    });
  } catch {
    // Continue even if username index write is delayed
  }

  await updateProfile(user, { displayName: cleanDisplayUsername });

  return {
    uid: user.uid,
    username: cleanDisplayUsername,
    normalizedUsername: normalized,
  };
}

/**
 * Logs in an existing player using their username and password.
 */
export async function loginWithUsername(
  username: string,
  password: string
): Promise<PlayerAccount> {
  const usernameErr = validateUsernameFormat(username);
  if (usernameErr) throw new Error(usernameErr);

  if (!password) {
    throw new Error('Please enter your password.');
  }

  const { auth, db, error } = getFirebaseServices();
  if (!auth || !db) {
    throw new Error(error || 'Firebase is not available.');
  }

  const normalized = normalizeUsername(username);
  const internalEmail = usernameToInternalAuthEmail(normalized);

  try {
    const credential = await signInWithEmailAndPassword(auth, internalEmail, password);
    const user = credential.user;
    const displayUsername = user.displayName || username.trim();

    return {
      uid: user.uid,
      username: displayUsername,
      normalizedUsername: normalized,
    };
  } catch (err: any) {
    if (
      err?.code === 'auth/invalid-credential' ||
      err?.code === 'auth/user-not-found' ||
      err?.code === 'auth/wrong-password'
    ) {
      throw new Error('Invalid username or password.');
    }
    if (err?.code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please wait a moment and try again.');
    }
    throw new Error(err?.message || 'Login failed. Please check your internet connection.');
  }
}

/**
 * Unified Sign In / Create Account:
 * Checks if the username exists; if it exists, signs the player in.
 * If it does not exist yet, automatically creates the account and signs them in!
 * Includes a local-credential fallback if Firebase Auth Email/Password is not yet enabled on the console.
 */
const LOCAL_ACCOUNTS_KEY = 'matthew_clicker_local_accounts_v1';

function authenticateLocalFallback(
  cleanDisplayUsername: string,
  normalized: string,
  password: string
): { account: PlayerAccount; isNewAccount: boolean } {
  let store: Record<string, { username: string; password: string; uid: string }> = {};
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (raw) store = JSON.parse(raw);
  } catch {
    store = {};
  }

  const existing = store[normalized];
  if (existing) {
    if (existing.password !== password) {
      throw new Error('Invalid username or password.');
    }
    return {
      account: {
        uid: existing.uid,
        username: existing.username,
        normalizedUsername: normalized,
      },
      isNewAccount: false,
    };
  }

  const uid = `acct_${normalized}`;
  store[normalized] = {
    username: cleanDisplayUsername,
    password,
    uid,
  };
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(store));
  } catch {
    // ignore storage quota errors
  }

  return {
    account: {
      uid,
      username: cleanDisplayUsername,
      normalizedUsername: normalized,
    },
    isNewAccount: true,
  };
}

export async function authenticateUnified(
  username: string,
  password: string
): Promise<{ account: PlayerAccount; isNewAccount: boolean }> {
  const usernameErr = validateUsernameFormat(username);
  if (usernameErr) throw new Error(usernameErr);

  const passwordErr = validatePasswordFormat(password);
  if (passwordErr) throw new Error(passwordErr);

  const cleanDisplayUsername = username.trim();
  const normalized = normalizeUsername(cleanDisplayUsername);

  const { auth, db } = getFirebaseServices();
  if (!auth || !db) {
    return authenticateLocalFallback(cleanDisplayUsername, normalized, password);
  }

  const usernameDocRef = doc(db, 'usernames', normalized);

  // Check if username document exists in Firestore (with fast timeout)
  let usernameExistsInDb = false;
  try {
    const existingSnap = await Promise.race([
      getDoc(usernameDocRef),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);
    usernameExistsInDb = Boolean(existingSnap && existingSnap.exists());
  } catch {
    usernameExistsInDb = false;
  }

  if (usernameExistsInDb) {
    try {
      const account = await loginWithUsername(cleanDisplayUsername, password);
      return { account, isNewAccount: false };
    } catch (err: any) {
      if (String(err?.message || '').includes('Invalid username or password')) {
        throw err;
      }
      return authenticateLocalFallback(cleanDisplayUsername, normalized, password);
    }
  }

  // Otherwise try creating the account first; if Firebase Auth says email-already-in-use, try signing in!
  const internalEmail = usernameToInternalAuthEmail(normalized);
  try {
    const credential = await createUserWithEmailAndPassword(auth, internalEmail, password);
    const user = credential.user;
    try {
      await runTransaction(db, async (tx) => {
        tx.set(usernameDocRef, {
          uid: user.uid,
          username: cleanDisplayUsername,
          normalizedUsername: normalized,
          createdAt: serverTimestamp(),
        });
      });
    } catch {
      // ignore
    }
    await updateProfile(user, { displayName: cleanDisplayUsername });
    return {
      account: {
        uid: user.uid,
        username: cleanDisplayUsername,
        normalizedUsername: normalized,
      },
      isNewAccount: true,
    };
  } catch (err: any) {
    if (err?.code === 'auth/email-already-in-use') {
      const account = await loginWithUsername(cleanDisplayUsername, password);
      return { account, isNewAccount: false };
    }
    // If Firebase Console Email/Password provider isn't enabled yet or network is blocked, fall back seamlessly
    return authenticateLocalFallback(cleanDisplayUsername, normalized, password);
  }
}

export async function logoutPlayer(): Promise<void> {
  const { auth } = getFirebaseServices();
  if (auth) {
    await signOut(auth);
  }
}

export function subscribeToAuthChanges(
  callback: (account: PlayerAccount | null) => void
): () => void {
  const { auth } = getFirebaseServices();
  if (!auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, (user: User | null) => {
    if (!user) {
      callback(null);
      return;
    }
    const emailPrefix = user.email ? user.email.split('@')[0] : 'player';
    const username = user.displayName || emailPrefix;
    callback({
      uid: user.uid,
      username,
      normalizedUsername: normalizeUsername(username),
    });
  });
}
