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
 * Resolves the underlying Firebase Auth email for a username (supports renamed accounts!).
 */
async function resolveAuthEmailForUsername(normalized: string): Promise<{
  authEmail: string;
  displayUsername?: string;
}> {
  const fallbackEmail = usernameToInternalAuthEmail(normalized);
  try {
    const rtdbEntry = await rtdbRestGet<{
      uid?: string;
      username?: string;
      authEmail?: string;
    }>(`usernames/${normalized}`, 2000);
    if (rtdbEntry && typeof rtdbEntry.authEmail === 'string' && rtdbEntry.authEmail.includes('@')) {
      return {
        authEmail: rtdbEntry.authEmail,
        displayUsername: rtdbEntry.username,
      };
    }
    if (rtdbEntry && typeof rtdbEntry.username === 'string') {
      return {
        authEmail: fallbackEmail,
        displayUsername: rtdbEntry.username,
      };
    }
  } catch {
    // use fallback
  }
  return { authEmail: fallbackEmail };
}

/**
 * Registers a new unique username + password account in Firebase Auth & RTDB.
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
    authEmail: internalEmail,
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
  const { authEmail, displayUsername: mappedDisplay } = await resolveAuthEmailForUsername(normalized);

  try {
    const credential = await signInWithEmailAndPassword(auth, authEmail, password);
    const user = credential.user;
    const displayUsername = mappedDisplay || user.displayName || username.trim();

    return {
      uid: user.uid,
      username: displayUsername,
      normalizedUsername: normalizeUsername(displayUsername),
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
 * Unified Sign In / Create Account (supports renamed accounts seamlessly).
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

  const { authEmail, displayUsername: mappedDisplay } = await resolveAuthEmailForUsername(normalized);

  // Step 1: Try signing in directly with Firebase Auth
  try {
    const signInCred = await signInWithEmailAndPassword(auth, authEmail, password);
    const user = signInCred.user;
    let displayUsername = mappedDisplay || user.displayName || cleanDisplayUsername;

    try {
      const userDoc = await rtdbRestGet<{ username?: string }>(`users/${user.uid}`, 2000);
      if (userDoc && typeof userDoc.username === 'string' && userDoc.username.trim().length >= 3) {
        displayUsername = userDoc.username.trim();
      } else if (!user.displayName) {
        const docSnap = await firestoreRestGetDoc(`usernames/${normalized}`, false, 2000);
        if (docSnap.exists && typeof docSnap.data.username === 'string') {
          displayUsername = docSnap.data.username;
        }
      }
    } catch {
      // use displayUsername
    }

    return {
      account: {
        uid: user.uid,
        username: displayUsername,
        normalizedUsername: normalizeUsername(displayUsername),
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
  }

  // Step 2: Try creating the account in Firebase Auth
  const internalEmail = usernameToInternalAuthEmail(normalized);
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

    rtdbRestWrite(`usernames/${normalized}`, {
      uid: user.uid,
      username: cleanDisplayUsername,
      normalizedUsername: normalized,
      authEmail: internalEmail,
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

/**
 * Changes a player's username across Firebase Auth, RTDB `usernames`, `users/{uid}`, and `leaderboards`.
 */
export async function changeAccountUsername(
  uid: string,
  oldUsername: string,
  newUsername: string,
  seasonId: string = 'season_1'
): Promise<string> {
  const formatErr = validateUsernameFormat(newUsername);
  if (formatErr) throw new Error(formatErr);

  const cleanNew = newUsername.trim();
  const newNorm = normalizeUsername(cleanNew);
  const oldNorm = normalizeUsername(oldUsername);

  if (newNorm === oldNorm && cleanNew === oldUsername.trim()) {
    return cleanNew;
  }

  // Check if another player already owns this username
  const existing = await rtdbRestGet<{ uid?: string }>(`usernames/${newNorm}`, 2500);
  if (existing && existing.uid && existing.uid !== uid) {
    throw new Error(`Username "${cleanNew}" is already taken!`);
  }

  const { auth } = getFirebaseServices();
  const currentUser = auth?.currentUser;
  const authEmail =
    currentUser?.email ||
    (await resolveAuthEmailForUsername(oldNorm)).authEmail ||
    usernameToInternalAuthEmail(oldNorm);

  if (currentUser) {
    try {
      await Promise.race([
        updateProfile(currentUser, { displayName: cleanNew }),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {
      // ignore
    }
  }

  await Promise.all([
    rtdbRestWrite(
      `usernames/${newNorm}`,
      {
        uid,
        username: cleanNew,
        normalizedUsername: newNorm,
        authEmail,
        updatedAtMs: Date.now(),
      },
      'PUT'
    ),
    oldNorm && oldNorm !== newNorm
      ? rtdbRestWrite(
          `usernames/${oldNorm}`,
          {
            uid,
            username: cleanNew,
            normalizedUsername: newNorm,
            authEmail,
            redirectedTo: newNorm,
            updatedAtMs: Date.now(),
          },
          'PUT'
        )
      : Promise.resolve(true),
    rtdbRestWrite(
      `users/${uid}`,
      {
        username: cleanNew,
        updatedAtMs: Date.now(),
      },
      'PATCH'
    ),
    rtdbRestWrite(
      `leaderboards/${seasonId}/${uid}`,
      {
        uid,
        username: cleanNew,
        updatedAtMs: Date.now(),
      },
      'PATCH'
    ),
  ]);

  return cleanNew;
}

/**
 * Re-verifies a player's password (used to unlock Marshallb78's Dev Tools panel).
 */
export async function verifyAccountPassword(
  username: string,
  password: string
): Promise<boolean> {
  if (!password) return false;
  const { auth } = getFirebaseServices();
  if (!auth) return false;

  const normalized = normalizeUsername(username);
  const { authEmail } = await resolveAuthEmailForUsername(normalized);
  const currentEmail = auth.currentUser?.email || authEmail;

  try {
    await signInWithEmailAndPassword(auth, currentEmail, password);
    return true;
  } catch {
    if (currentEmail !== authEmail) {
      try {
        await signInWithEmailAndPassword(auth, authEmail, password);
        return true;
      } catch {
        return false;
      }
    }
    return false;
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

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (!user) {
      callback(null);
      return;
    }
    const emailPrefix = user.email ? user.email.split('@')[0] : 'player';
    let username = user.displayName || emailPrefix;
    try {
      const userDoc = await rtdbRestGet<{ username?: string }>(`users/${user.uid}`, 2000);
      if (userDoc && typeof userDoc.username === 'string' && userDoc.username.trim().length >= 3) {
        username = userDoc.username.trim();
      }
    } catch {
      // ignore
    }
    callback({
      uid: user.uid,
      username,
      normalizedUsername: normalizeUsername(username),
    });
  });
}
