import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  getFirebaseServices,
  rtdbRestGet,
  rtdbRestWrite,
  firestoreRestGetDoc,
} from './config';

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

  const { auth, error } = getFirebaseServices();
  if (!auth) {
    throw new Error(error || 'Firebase is not available in this environment.');
  }

  const cleanDisplayUsername = username.trim();
  const normalized = normalizeUsername(cleanDisplayUsername);
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

  // Non-blocking username registry write + profile displayName update
  try {
    await Promise.race([
      updateProfile(user, { displayName: cleanDisplayUsername }),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
  } catch {
    // ignore
  }

  rtdbRestWrite(`usernames/${normalized}`, {
    uid: user.uid,
    username: cleanDisplayUsername,
    normalizedUsername: normalized,
    createdAtMs: Date.now(),
  }).catch(() => {});

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

  const { auth, error } = getFirebaseServices();
  if (!auth) {
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

/**
 * Unified Sign In / Create Account:
 * 1. Attempts Firebase Auth `signInWithEmailAndPassword` directly first (zero Firestore quota needed!).
 * 2. If the user does not exist yet, creates the account via `createUserWithEmailAndPassword`.
 * 3. If the account already exists (`auth/email-already-in-use`), throws a clear wrong-password error.
 * 4. Never hangs if Firestore writes are throttled.
 */
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

  const { auth } = getFirebaseServices();
  if (!auth) {
    return authenticateLocalFallback(cleanDisplayUsername, normalized, password);
  }

  const internalEmail = usernameToInternalAuthEmail(normalized);

  // Step 1: Try signing in directly with Firebase Auth (fastest path, 0 Firestore reads/writes)
  try {
    const signInCred = await signInWithEmailAndPassword(auth, internalEmail, password);
    const user = signInCred.user;
    let displayUsername = user.displayName || cleanDisplayUsername;

    if (!user.displayName) {
      try {
        const rtdbUser = await rtdbRestGet<{ username?: string }>(`usernames/${normalized}`, 2000);
        if (rtdbUser && typeof rtdbUser.username === 'string') {
          displayUsername = rtdbUser.username;
        } else {
          const docSnap = await firestoreRestGetDoc(`usernames/${normalized}`, false, 2000);
          if (docSnap.exists && typeof docSnap.data.username === 'string') {
            displayUsername = docSnap.data.username;
          }
        }
      } catch {
        // use cleanDisplayUsername
      }
    }

    return {
      account: {
        uid: user.uid,
        username: displayUsername,
        normalizedUsername: normalized,
      },
      isNewAccount: false,
    };
  } catch (signInErr: any) {
    const code = signInErr?.code || '';
    if (code === 'auth/wrong-password') {
      throw new Error('Invalid username or password.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please wait a moment and try again.');
    }
    // If invalid-credential or user-not-found, check if we can register this username as a new account
  }

  // Step 2: Try creating the account in Firebase Auth
  try {
    const createCred = await createUserWithEmailAndPassword(auth, internalEmail, password);
    const user = createCred.user;

    try {
      await Promise.race([
        updateProfile(user, { displayName: cleanDisplayUsername }),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // ignore
    }

    // Non-blocking write to Realtime Database usernames registry
    rtdbRestWrite(`usernames/${normalized}`, {
      uid: user.uid,
      username: cleanDisplayUsername,
      normalizedUsername: normalized,
      createdAtMs: Date.now(),
    }).catch(() => {});

    return {
      account: {
        uid: user.uid,
        username: cleanDisplayUsername,
        normalizedUsername: normalized,
      },
      isNewAccount: true,
    };
  } catch (createErr: any) {
    const code = createErr?.code || '';
    if (code === 'auth/email-already-in-use') {
      // Account exists in Firebase Auth, which means the password in Step 1 was wrong!
      throw new Error('Invalid username or password.');
    }
    if (code === 'auth/too-many-requests') {
      throw new Error('Too many failed attempts. Please wait a moment and try again.');
    }
    if (code === 'auth/operation-not-allowed' || code === 'auth/network-request-failed') {
      return authenticateLocalFallback(cleanDisplayUsername, normalized, password);
    }
    throw new Error(createErr?.message || 'Authentication failed. Please try again.');
  }
}

export async function logoutPlayer(): Promise<void> {
  const { auth } = getFirebaseServices();
  if (auth) {
    try {
      await Promise.race([
        signOut(auth),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // ignore
    }
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
