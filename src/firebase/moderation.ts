import { getFirebaseServices, rtdbRestGet, rtdbRestWrite, rtdbRestDelete } from './config';
import { getActiveSeason } from '../utils/scheduleEngine';

export const OFFICIAL_BAN_MESSAGE =
  'You have been banned because of suspicious behavior including cheating, using auto clickers, or hacking.';

export const TEMP_AUTO_BAN_MESSAGE =
  'You have been temporarily banned and removed from the leaderboard because of suspicious behavior including cheating, using auto clickers (>17 CPS or robotic click timing), or hacking.';

export const DEV_ADMIN_USERNAME = 'marshallb78';
export const DEV_ADMIN_UID = '89nsfff2YtaEVcNTHUBDq22V4FW2';

const LOCAL_BAN_STORAGE_PREFIX = 'matthew_clicker_ban_v2_';

export type BanStatus = 'banned' | 'temp_banned' | 'pardoned';

export interface BanRecord {
  uid: string;
  username: string;
  normalizedUsername: string;
  status: BanStatus;
  reason: string;
  detectedCps?: number;
  bannedBy: string;
  bannedAtMs: number;
}

export interface ResetRecord {
  uid: string;
  username: string;
  resetAtMs: number;
}

export interface ServerBroadcast {
  id: string;
  message: string;
  theme: 'gold' | 'red' | 'cyan' | 'purple';
  active: boolean;
  createdAtMs: number;
  author: string;
}

export interface AntiCheatConfig {
  maxCps: number;
  detectRoboticTiming: boolean;
}

interface AdminModerationDoc {
  uid: string;
  username: string;
  updatedAtMs: number;
  bansByUid?: Record<string, BanRecord>;
  bansByUsername?: Record<string, BanRecord>;
  resetsByUid?: Record<string, ResetRecord>;
  broadcast?: ServerBroadcast | null;
  antiCheatConfig?: AntiCheatConfig;
}

export function isDevAdminAccount(uid?: string | null, username?: string | null): boolean {
  if (uid === DEV_ADMIN_UID) return true;
  if (username && username.trim().toLowerCase() === DEV_ADMIN_USERNAME) return true;
  return false;
}

// Permanent default bans for the top 3 auto-clickers identified by Marshallb78
export const DEFAULT_BANNED_ACCOUNTS: Record<string, BanRecord> = {
  jIIqvA8aVzMUbFqh4I8Drq4M5FT2: {
    uid: 'jIIqvA8aVzMUbFqh4I8Drq4M5FT2',
    username: 'liamkd',
    normalizedUsername: 'liamkd',
    status: 'banned',
    reason: OFFICIAL_BAN_MESSAGE,
    bannedBy: 'Marshallb78',
    bannedAtMs: 1762905600000,
  },
  ZzqxlRHiRUNDNG3nkgvxfCLkD153: {
    uid: 'ZzqxlRHiRUNDNG3nkgvxfCLkD153',
    username: 'wessy',
    normalizedUsername: 'wessy',
    status: 'banned',
    reason: OFFICIAL_BAN_MESSAGE,
    bannedBy: 'Marshallb78',
    bannedAtMs: 1762905600000,
  },
  VUPutOtnAmOs6vgQYE8XAk0NdME3: {
    uid: 'VUPutOtnAmOs6vgQYE8XAk0NdME3',
    username: 'wessy',
    normalizedUsername: 'wessy',
    status: 'banned',
    reason: OFFICIAL_BAN_MESSAGE,
    bannedBy: 'Marshallb78',
    bannedAtMs: 1762905600000,
  },
  JFw0K4bgUHg3GpzcnWV44sUpFnj1: {
    uid: 'JFw0K4bgUHg3GpzcnWV44sUpFnj1',
    username: 'dryce',
    normalizedUsername: 'dryce',
    status: 'banned',
    reason: OFFICIAL_BAN_MESSAGE,
    bannedBy: 'Marshallb78',
    bannedAtMs: 1762905600000,
  },
};

export const DEFAULT_BANNED_USERNAMES = new Set<string>(['liamkd', 'wessy', 'dryce']);

let cachedBansByUid: Record<string, BanRecord> = { ...DEFAULT_BANNED_ACCOUNTS };
let cachedBansByUsername: Record<string, BanRecord> = {
  liamkd: DEFAULT_BANNED_ACCOUNTS['jIIqvA8aVzMUbFqh4I8Drq4M5FT2'],
  wessy: DEFAULT_BANNED_ACCOUNTS['ZzqxlRHiRUNDNG3nkgvxfCLkD153'],
  dryce: DEFAULT_BANNED_ACCOUNTS['JFw0K4bgUHg3GpzcnWV44sUpFnj1'],
};
let cachedResetsByUid: Record<string, ResetRecord> = {};
let cachedBroadcast: ServerBroadcast | null = null;
let cachedAntiCheatConfig: AntiCheatConfig = {
  maxCps: 17,
  detectRoboticTiming: true,
};
let lastBanFetchMs = 0;

function saveLocalBanRecord(record: BanRecord): void {
  if (typeof window === 'undefined') return;
  try {
    if (record.uid) {
      localStorage.setItem(`${LOCAL_BAN_STORAGE_PREFIX}uid_${record.uid}`, JSON.stringify(record));
    }
    if (record.normalizedUsername) {
      localStorage.setItem(
        `${LOCAL_BAN_STORAGE_PREFIX}user_${record.normalizedUsername.toLowerCase()}`,
        JSON.stringify(record)
      );
    }
  } catch {
    // ignore storage errors
  }
}

function clearLocalBanRecord(uid?: string | null, username?: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (uid) {
      localStorage.removeItem(`${LOCAL_BAN_STORAGE_PREFIX}uid_${uid}`);
    }
    const norm = (username || '').trim().toLowerCase();
    if (norm) {
      localStorage.removeItem(`${LOCAL_BAN_STORAGE_PREFIX}user_${norm}`);
    }
  } catch {
    // ignore
  }
}

function loadLocalBanRecord(uid?: string | null, username?: string | null): BanRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    if (uid) {
      const raw = localStorage.getItem(`${LOCAL_BAN_STORAGE_PREFIX}uid_${uid}`);
      if (raw) {
        const parsed = JSON.parse(raw) as BanRecord;
        if (parsed && parsed.status && parsed.status !== 'pardoned') return parsed;
      }
    }
    const norm = (username || '').trim().toLowerCase();
    if (norm) {
      const raw = localStorage.getItem(`${LOCAL_BAN_STORAGE_PREFIX}user_${norm}`);
      if (raw) {
        const parsed = JSON.parse(raw) as BanRecord;
        if (parsed && parsed.status && parsed.status !== 'pardoned') return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function mergeBanRecordIntoMaps(
  byUid: Record<string, BanRecord>,
  byUser: Record<string, BanRecord>,
  rec: BanRecord
): void {
  if (!rec || typeof rec !== 'object' || !rec.status) return;
  const uidKey = rec.uid || '';
  const norm = (rec.normalizedUsername || rec.username || '').trim().toLowerCase();
  const recTime = typeof rec.bannedAtMs === 'number' ? rec.bannedAtMs : 0;

  if (uidKey) {
    const existing = byUid[uidKey];
    const existingTime = existing?.bannedAtMs || 0;
    if (!existing || recTime >= existingTime) {
      byUid[uidKey] = rec;
    }
  }

  if (norm) {
    const existing = byUser[norm];
    const existingTime = existing?.bannedAtMs || 0;
    if (!existing || recTime >= existingTime) {
      byUser[norm] = rec;
    }
  }
}

export async function refreshCloudBans(force = false): Promise<{
  byUid: Record<string, BanRecord>;
  byUsername: Record<string, BanRecord>;
  resetsByUid: Record<string, ResetRecord>;
  broadcast: ServerBroadcast | null;
  antiCheatConfig: AntiCheatConfig;
}> {
  const now = Date.now();
  if (!force && now - lastBanFetchMs < 3500) {
    return {
      byUid: cachedBansByUid,
      byUsername: cachedBansByUsername,
      resetsByUid: cachedResetsByUid,
      broadcast: cachedBroadcast,
      antiCheatConfig: cachedAntiCheatConfig,
    };
  }

  try {
    // Read `usernames.json` (lightweight ~3KB map with `.read: true`) which holds:
    // - `usernames/__admin_*` (owned by Marshallb78's UID, so Marshallb78 has 100% write permission)
    // - `usernames/__autoban_*` (owned by each flagged player's UID, so their client has 100% write permission)
    const allUsernamesObj = await rtdbRestGet<Record<string, any>>('usernames', 3000);

    const nextByUid: Record<string, BanRecord> = { ...DEFAULT_BANNED_ACCOUNTS };
    const nextByUser: Record<string, BanRecord> = {
      liamkd: DEFAULT_BANNED_ACCOUNTS['jIIqvA8aVzMUbFqh4I8Drq4M5FT2'],
      wessy: DEFAULT_BANNED_ACCOUNTS['ZzqxlRHiRUNDNG3nkgvxfCLkD153'],
      dryce: DEFAULT_BANNED_ACCOUNTS['JFw0K4bgUHg3GpzcnWV44sUpFnj1'],
    };
    const nextResets: Record<string, ResetRecord> = { ...cachedResetsByUid };
    let newestAdminDocTime = 0;
    let nextBroadcast: ServerBroadcast | null = cachedBroadcast;
    let nextAntiCheat: AntiCheatConfig = cachedAntiCheatConfig;

    // 1. Preserve any in-memory records that were just written locally so polling never drops a fresh ban/unban
    for (const rec of Object.values(cachedBansByUid)) {
      mergeBanRecordIntoMaps(nextByUid, nextByUser, rec);
    }
    for (const rec of Object.values(cachedBansByUsername)) {
      mergeBanRecordIntoMaps(nextByUid, nextByUser, rec);
    }

    if (allUsernamesObj && typeof allUsernamesObj === 'object') {
      // 2. First merge all player self-reported auto-clicker bans (`__autoban_${uid}`)
      for (const [key, val] of Object.entries(allUsernamesObj)) {
        if (!key.startsWith('__autoban_') || !val || typeof val !== 'object') continue;
        mergeBanRecordIntoMaps(nextByUid, nextByUser, val as BanRecord);
      }

      // 3. Next merge legacy `__moderation_bans_*` if present
      if (allUsernamesObj.__moderation_bans_uid && typeof allUsernamesObj.__moderation_bans_uid === 'object') {
        for (const rec of Object.values(allUsernamesObj.__moderation_bans_uid)) {
          mergeBanRecordIntoMaps(nextByUid, nextByUser, rec as BanRecord);
        }
      }
      if (allUsernamesObj.__moderation_bans_user && typeof allUsernamesObj.__moderation_bans_user === 'object') {
        for (const rec of Object.values(allUsernamesObj.__moderation_bans_user)) {
          mergeBanRecordIntoMaps(nextByUid, nextByUser, rec as BanRecord);
        }
      }

      // 4. Overlay Marshallb78's authoritative `__admin_*` documents
      for (const [key, val] of Object.entries(allUsernamesObj)) {
        if (!key.startsWith('__admin_') || !val || typeof val !== 'object') continue;
        const adminDoc = val as AdminModerationDoc;
        if (adminDoc.bansByUid && typeof adminDoc.bansByUid === 'object') {
          for (const rec of Object.values(adminDoc.bansByUid)) {
            mergeBanRecordIntoMaps(nextByUid, nextByUser, rec);
          }
        }
        if (adminDoc.bansByUsername && typeof adminDoc.bansByUsername === 'object') {
          for (const rec of Object.values(adminDoc.bansByUsername)) {
            mergeBanRecordIntoMaps(nextByUid, nextByUser, rec);
          }
        }
        if (adminDoc.resetsByUid && typeof adminDoc.resetsByUid === 'object') {
          for (const [rUid, rRec] of Object.entries(adminDoc.resetsByUid)) {
            if (rRec && typeof rRec.resetAtMs === 'number') {
              const prev = nextResets[rUid];
              if (!prev || rRec.resetAtMs >= prev.resetAtMs) {
                nextResets[rUid] = rRec;
              }
            }
          }
        }
        const docTime = typeof adminDoc.updatedAtMs === 'number' ? adminDoc.updatedAtMs : 0;
        if (docTime >= newestAdminDocTime) {
          newestAdminDocTime = docTime;
          if ('broadcast' in adminDoc) {
            nextBroadcast = adminDoc.broadcast && adminDoc.broadcast.active ? adminDoc.broadcast : null;
          }
          if (adminDoc.antiCheatConfig) {
            nextAntiCheat = adminDoc.antiCheatConfig;
          }
        }
      }
    }

    cachedBansByUid = nextByUid;
    cachedBansByUsername = nextByUser;
    cachedResetsByUid = nextResets;
    cachedBroadcast = nextBroadcast;
    cachedAntiCheatConfig = nextAntiCheat;
    lastBanFetchMs = now;
  } catch {
    // keep cached
  }

  return {
    byUid: cachedBansByUid,
    byUsername: cachedBansByUsername,
    resetsByUid: cachedResetsByUid,
    broadcast: cachedBroadcast,
    antiCheatConfig: cachedAntiCheatConfig,
  };
}

export function getCachedResetRecord(uid?: string | null): ResetRecord | null {
  if (!uid) return null;
  return cachedResetsByUid[uid] || null;
}

export function getCachedServerBroadcast(): ServerBroadcast | null {
  return cachedBroadcast;
}

export function getCachedAntiCheatConfig(): AntiCheatConfig {
  return cachedAntiCheatConfig;
}

export function getCachedBanRecord(
  uid?: string | null,
  username?: string | null
): BanRecord | null {
  if (isDevAdminAccount(uid, username)) return null;

  const norm = (username || '').trim().toLowerCase();

  // Check both byUid and byUsername and pick whichever has the newest timestamp
  const uidRec = uid ? cachedBansByUid[uid] : undefined;
  const userRec = norm ? cachedBansByUsername[norm] : undefined;

  let chosen: BanRecord | undefined = uidRec;
  if (userRec) {
    if (!chosen || (userRec.bannedAtMs || 0) >= (chosen.bannedAtMs || 0)) {
      chosen = userRec;
    }
  }

  if (chosen) {
    if (chosen.status === 'pardoned') return null;
    return chosen;
  }

  // Also check localStorage fallback so a banned player on this device never escapes before sync
  const localRec = loadLocalBanRecord(uid, username);
  if (localRec) {
    return localRec;
  }

  if (norm && DEFAULT_BANNED_USERNAMES.has(norm)) {
    return {
      uid: uid || norm,
      username: username || norm,
      normalizedUsername: norm,
      status: 'banned',
      reason: OFFICIAL_BAN_MESSAGE,
      bannedBy: 'Marshallb78',
      bannedAtMs: 1762905600000,
    };
  }

  return null;
}

/**
 * Checks whether the current account is banned or temp-banned:
 * 1. Refreshes global cloud bans (`usernames/__admin_*` and `usernames/__autoban_*`).
 * 2. Also checks the player's own `users/{uid}` document (`banStatus`) so an account that was
 *    flagged in `users/{uid}` NEVER gets un-banned after a few seconds!
 * 3. If Marshallb78 pardoned the player (`status === 'pardoned'` with newer timestamp),
 *    clears the player's local ban and `users/{uid}` banStatus automatically!
 */
export async function checkAccountBanStatus(
  uid?: string | null,
  username?: string | null,
  forceRefresh = false
): Promise<BanRecord | null> {
  if (isDevAdminAccount(uid, username)) return null;

  const norm = (username || '').trim().toLowerCase();

  const [, userDoc] = await Promise.all([
    refreshCloudBans(forceRefresh),
    uid && !uid.startsWith('local_') && !uid.startsWith('user_')
      ? rtdbRestGet<Record<string, any>>(`users/${uid}`, 2500).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Check if Marshallb78 explicitly pardoned this account
  const adminUidRec = uid ? cachedBansByUid[uid] : undefined;
  const adminUserRec = norm ? cachedBansByUsername[norm] : undefined;
  const newestAdminRec =
    adminUidRec && adminUserRec
      ? (adminUserRec.bannedAtMs || 0) >= (adminUidRec.bannedAtMs || 0)
        ? adminUserRec
        : adminUidRec
      : adminUidRec || adminUserRec;

  // Also inspect the player's own `users/{uid}` document for `banStatus`
  if (
    userDoc &&
    (userDoc.banStatus === 'banned' || userDoc.banStatus === 'temp_banned')
  ) {
    const userDocBanTime =
      typeof userDoc.resetAtMs === 'number'
        ? userDoc.resetAtMs
        : typeof userDoc.updatedAtMs === 'number'
        ? userDoc.updatedAtMs
        : 1762905600000;

    // If Marshallb78 pardoned them AFTER their ban timestamp, clear the ban on their user doc & local storage!
    if (
      newestAdminRec &&
      newestAdminRec.status === 'pardoned' &&
      (newestAdminRec.bannedAtMs || 0) >= userDocBanTime
    ) {
      clearLocalBanRecord(uid, username);
      if (uid) {
        rtdbRestWrite(
          `users/${uid}`,
          { banStatus: 'pardoned', banReason: null, updatedAtMs: Date.now() },
          'PATCH'
        ).catch(() => {});
        rtdbRestWrite(
          `usernames/__autoban_${uid}`,
          {
            uid,
            username: username || userDoc.username || 'Player',
            normalizedUsername: norm || 'player',
            status: 'pardoned',
            reason: 'Pardoned by Marshallb78',
            bannedBy: 'Marshallb78',
            bannedAtMs: newestAdminRec.bannedAtMs,
          },
          'PUT'
        ).catch(() => {});
      }
      return null;
    }

    // Otherwise, this user's own `users/{uid}` doc says they are banned/temp_banned!
    // Merge it into our cache and also ensure `usernames/__autoban_${uid}` is published so Marshallb78 sees it in Dev Tools!
    const userBanRec: BanRecord = {
      uid: uid!,
      username: username || userDoc.username || 'Unknown Player',
      normalizedUsername: norm || (userDoc.username || 'unknown').toLowerCase(),
      status: userDoc.banStatus as BanStatus,
      reason: userDoc.banReason || OFFICIAL_BAN_MESSAGE,
      detectedCps: typeof userDoc.detectedCps === 'number' ? userDoc.detectedCps : 19,
      bannedBy: userDoc.banStatus === 'temp_banned' ? 'AutoClickerDetector' : 'Marshallb78',
      bannedAtMs: userDocBanTime,
    };
    mergeBanRecordIntoMaps(cachedBansByUid, cachedBansByUsername, userBanRec);
    saveLocalBanRecord(userBanRec);

    if (uid && !newestAdminRec) {
      rtdbRestWrite(`usernames/__autoban_${uid}`, userBanRec, 'PUT').catch(() => {});
    }
  } else if (newestAdminRec && newestAdminRec.status === 'pardoned') {
    clearLocalBanRecord(uid, username);
    return null;
  }

  const finalBan = getCachedBanRecord(uid, username);

  // If banned, ensure the player's own client keeps its leaderboard entry deleted & user doc zeroed
  if (finalBan && uid && !uid.startsWith('local_') && !uid.startsWith('user_')) {
    saveLocalBanRecord(finalBan);
    wipePlayerProgressAndLeaderboard(
      uid,
      username || finalBan.username,
      finalBan.status,
      finalBan.reason,
      finalBan.bannedAtMs
    ).catch(() => {});
  }

  return finalBan;
}

/**
 * Resets a player's seasonal data in RTDB `users/{uid}` and deletes them from `leaderboards/{seasonId}/{uid}`
 * without deleting their account.
 */
export async function wipePlayerProgressAndLeaderboard(
  targetUid: string,
  targetUsername: string,
  banStatus: BanStatus,
  reason: string,
  banTimestampMs: number = Date.now(),
  seasonId: string = getActiveSeason().seasonId
): Promise<void> {
  await Promise.all([
    rtdbRestDelete(`leaderboards/${seasonId}/${targetUid}`).catch(() => false),
    rtdbRestWrite(
      `users/${targetUid}`,
      {
        uid: targetUid,
        username: targetUsername,
        banStatus,
        banReason: reason,
        resetAtMs: banTimestampMs,
        updatedAtMs: banTimestampMs,
        seasons: {
          [seasonId]: {
            seasonId,
            coins: 0,
            lifetimeCoins: 0,
            seasonalScore: 0,
            clicks: 0,
            criticalClicks: 0,
            upgrades: {},
            prestigeCount: 0,
            prestigeShards: 0,
            lifetimePrestigeShards: 0,
            lastSaveTime: banTimestampMs,
            resetAtMs: banTimestampMs,
          },
        },
      },
      'PATCH'
    ).catch(() => false),
  ]);
}

/**
 * Triggered automatically by the Anti-Cheat detector when >17 CPS or robotic click timing is detected.
 * Temporarily bans the player, saves to localStorage + `usernames/__autoban_${uid}` + `users/${uid}`,
 * removes them from the leaderboard, and places them in Marshallb78's Dev Tools queue.
 */
export async function triggerAutoTempBan(
  uid: string,
  username: string,
  reason: string = TEMP_AUTO_BAN_MESSAGE,
  detectedCps = 18
): Promise<BanRecord | null> {
  if (isDevAdminAccount(uid, username)) return null;

  const now = Date.now();
  const norm = username.trim().toLowerCase();
  const record: BanRecord = {
    uid: uid || `local_${norm || 'guest'}`,
    username: username || 'Unknown Player',
    normalizedUsername: norm || 'unknown',
    status: 'temp_banned',
    reason,
    detectedCps: Math.round(detectedCps * 10) / 10,
    bannedBy: 'AutoClickerDetector',
    bannedAtMs: now,
  };

  mergeBanRecordIntoMaps(cachedBansByUid, cachedBansByUsername, record);
  saveLocalBanRecord(record);

  if (uid && !uid.startsWith('local_')) {
    await Promise.all([
      // `usernames/__autoban_${uid}` has top-level `uid === auth.uid`, so RTDB rules allow PUT 100% of the time!
      rtdbRestWrite(`usernames/__autoban_${uid}`, record, 'PUT'),
      wipePlayerProgressAndLeaderboard(uid, username, 'temp_banned', reason, now),
    ]);
  }

  return record;
}

/**
 * Helper for Marshallb78 to write updates to his own admin moderation document
 * (`usernames/__admin_${adminUid}` where top-level `uid === auth.uid`, guaranteed allowed by RTDB rules!).
 */
async function updateAdminModerationDoc(
  mutator: (doc: AdminModerationDoc) => AdminModerationDoc
): Promise<boolean> {
  const { auth } = getFirebaseServices();
  const adminUid = auth?.currentUser?.uid || DEV_ADMIN_UID;
  const path = `usernames/__admin_${adminUid}`;

  const existing = await rtdbRestGet<AdminModerationDoc>(path, 3000);
  const baseDoc: AdminModerationDoc = {
    uid: adminUid,
    username: 'Marshallb78',
    updatedAtMs: Date.now(),
    bansByUid: {
      ...DEFAULT_BANNED_ACCOUNTS,
      ...(existing?.bansByUid || {}),
    },
    bansByUsername: {
      liamkd: DEFAULT_BANNED_ACCOUNTS['jIIqvA8aVzMUbFqh4I8Drq4M5FT2'],
      wessy: DEFAULT_BANNED_ACCOUNTS['ZzqxlRHiRUNDNG3nkgvxfCLkD153'],
      dryce: DEFAULT_BANNED_ACCOUNTS['JFw0K4bgUHg3GpzcnWV44sUpFnj1'],
      ...(existing?.bansByUsername || {}),
    },
    resetsByUid: {
      ...(existing?.resetsByUid || {}),
    },
    broadcast: existing?.broadcast || cachedBroadcast || null,
    antiCheatConfig: existing?.antiCheatConfig || cachedAntiCheatConfig,
  };

  const nextDoc = mutator(baseDoc);
  nextDoc.uid = adminUid; // Must match auth.uid for RTDB security rule `data.child('uid').val() === auth.uid`
  nextDoc.updatedAtMs = Date.now();

  const ok = await rtdbRestWrite(path, nextDoc, 'PUT');
  await refreshCloudBans(true);
  return ok;
}

/**
 * Called by Marshallb78 from the Dev Tools panel to officially & permanently ban (or temp-ban) a player.
 */
export async function adminBanPlayer(
  targetUid: string,
  targetUsername: string,
  reason: string = OFFICIAL_BAN_MESSAGE,
  status: 'banned' | 'temp_banned' = 'banned'
): Promise<boolean> {
  if (isDevAdminAccount(targetUid, targetUsername)) return false;

  const cleanUser = targetUsername.trim() || targetUid;
  const norm = cleanUser.toLowerCase();
  const uidKey = targetUid || `user_${norm}`;
  const now = Date.now();

  const record: BanRecord = {
    uid: uidKey,
    username: cleanUser,
    normalizedUsername: norm,
    status,
    reason,
    bannedBy: 'Marshallb78',
    bannedAtMs: now,
  };

  cachedBansByUid[uidKey] = record;
  cachedBansByUsername[norm] = record;

  return updateAdminModerationDoc((doc) => {
    doc.bansByUid = { ...(doc.bansByUid || {}), [uidKey]: record };
    doc.bansByUsername = { ...(doc.bansByUsername || {}), [norm]: record };
    return doc;
  });
}

/**
 * Called by Marshallb78 from the Dev Tools panel to unban / pardon a player.
 */
export async function adminUnbanPlayer(
  targetUid: string,
  targetUsername: string
): Promise<boolean> {
  const cleanUser = targetUsername.trim() || targetUid;
  const norm = cleanUser.toLowerCase();
  const uidKey = targetUid || `user_${norm}`;
  const now = Date.now();

  const record: BanRecord = {
    uid: uidKey,
    username: cleanUser,
    normalizedUsername: norm,
    status: 'pardoned',
    reason: 'Pardoned by Marshallb78',
    bannedBy: 'Marshallb78',
    bannedAtMs: now,
  };

  // Update in-memory caches immediately for both UID and username
  cachedBansByUid[uidKey] = record;
  cachedBansByUsername[norm] = record;
  // Also pardon any other UIDs that share the same normalizedUsername (e.g. wessy had 2 UIDs)
  for (const [k, v] of Object.entries(cachedBansByUid)) {
    if (v && (v.normalizedUsername || v.username || '').toLowerCase() === norm) {
      cachedBansByUid[k] = { ...record, uid: k };
    }
  }
  clearLocalBanRecord(uidKey, cleanUser);

  return updateAdminModerationDoc((doc) => {
    const nextByUid = { ...(doc.bansByUid || {}), [uidKey]: record };
    for (const [k, v] of Object.entries(nextByUid)) {
      if (v && (v.normalizedUsername || v.username || '').toLowerCase() === norm) {
        nextByUid[k] = { ...record, uid: k };
      }
    }
    doc.bansByUid = nextByUid;
    doc.bansByUsername = { ...(doc.bansByUsername || {}), [norm]: record };
    return doc;
  });
}

/**
 * Called by Marshallb78 from Dev Tools (or by a player resetting their own progress)
 * to reset a player's score/coins/rebirths to 0 without banning them.
 */
export async function adminResetPlayerScore(
  targetUid: string,
  targetUsername: string,
  seasonId: string = getActiveSeason().seasonId
): Promise<boolean> {
  if (!targetUid) return false;
  const now = Date.now();
  const resetRec: ResetRecord = {
    uid: targetUid,
    username: targetUsername || 'Reset Player',
    resetAtMs: now,
  };
  cachedResetsByUid[targetUid] = resetRec;

  const { auth } = getFirebaseServices();
  const currentUid = auth?.currentUser?.uid;

  // If the user is resetting their own account, they own `leaderboards/.../${targetUid}` and `users/${targetUid}`
  if (currentUid === targetUid) {
    await Promise.all([
      rtdbRestWrite(
        `leaderboards/${seasonId}/${targetUid}`,
        {
          uid: targetUid,
          username: targetUsername || 'Reset Player',
          seasonalScore: 0,
          lifetimeCoins: 0,
          coins: 0,
          totalClicks: 0,
          rebirthCount: 0,
          ascensionMultiplier: 1,
          equippedSkin: 'classic_matthew',
          unlockedSkins: ['classic_matthew'],
          updatedAtMs: now,
          isReset: true,
        },
        'PUT'
      ).catch(() => false),
      rtdbRestWrite(
        `users/${targetUid}`,
        {
          resetAtMs: now,
          updatedAtMs: now,
          seasons: {
            [seasonId]: {
              seasonId,
              coins: 0,
              lifetimeCoins: 0,
              seasonalScore: 0,
              clicks: 0,
              criticalClicks: 0,
              upgrades: {},
              prestigeCount: 0,
              prestigeShards: 0,
              lifetimePrestigeShards: 0,
              lastSaveTime: now,
              resetAtMs: now,
            },
          },
        },
        'PATCH'
      ).catch(() => false),
    ]);
  }

  // If Marshallb78 is resetting another player from Dev Tools, store in Marshallb78's admin doc
  if (isDevAdminAccount(currentUid, auth?.currentUser?.displayName)) {
    await updateAdminModerationDoc((doc) => {
      doc.resetsByUid = { ...(doc.resetsByUid || {}), [targetUid]: resetRec };
      return doc;
    });
  }

  return true;
}

/**
 * Called by Marshallb78 from Dev Tools to publish or clear a live global server announcement banner.
 */
export async function adminSetServerBroadcast(
  message: string | null,
  theme: 'gold' | 'red' | 'cyan' | 'purple' = 'gold'
): Promise<boolean> {
  const clean = (message || '').trim();
  const broadcast: ServerBroadcast | null = clean
    ? {
        id: `bc_${Date.now()}`,
        message: clean,
        theme,
        active: true,
        createdAtMs: Date.now(),
        author: 'Marshallb78',
      }
    : null;

  cachedBroadcast = broadcast;
  return updateAdminModerationDoc((doc) => {
    doc.broadcast = broadcast;
    return doc;
  });
}

/**
 * Called by Marshallb78 from Dev Tools to update the live Anti-Cheat configuration.
 */
export async function adminUpdateAntiCheatConfig(
  config: AntiCheatConfig
): Promise<boolean> {
  cachedAntiCheatConfig = config;
  return updateAdminModerationDoc((doc) => {
    doc.antiCheatConfig = config;
    return doc;
  });
}
