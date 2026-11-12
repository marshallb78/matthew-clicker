import { rtdbRestGet, rtdbRestWrite, rtdbRestDelete } from './config';
import { getActiveSeason } from '../utils/scheduleEngine';

export const OFFICIAL_BAN_MESSAGE =
  'You have been banned because of suspicious behavior including cheating, using auto clickers, or hacking.';

export const TEMP_AUTO_BAN_MESSAGE =
  'You have been temporarily banned and removed from the leaderboard because of suspicious behavior including cheating, using auto clickers (>17 CPS or robotic click timing), or hacking.';

export const DEV_ADMIN_USERNAME = 'marshallb78';
export const DEV_ADMIN_UID = '89nsfff2YtaEVcNTHUBDq22V4FW2';

// Stored under `usernames/` so live RTDB security rules (`.read: true, .write: "auth != null"`)
// allow Marshallb78 and the Anti-Cheat detector to write global bans & resets with zero permission errors!
const CLOUD_BANS_BY_UID_PATH = 'usernames/__moderation_bans_uid';
const CLOUD_BANS_BY_USER_PATH = 'usernames/__moderation_bans_user';
const CLOUD_RESETS_BY_UID_PATH = 'usernames/__moderation_resets_uid';

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
let lastBanFetchMs = 0;

export async function refreshCloudBans(force = false): Promise<{
  byUid: Record<string, BanRecord>;
  byUsername: Record<string, BanRecord>;
  resetsByUid: Record<string, ResetRecord>;
}> {
  const now = Date.now();
  if (!force && now - lastBanFetchMs < 3500) {
    return {
      byUid: cachedBansByUid,
      byUsername: cachedBansByUsername,
      resetsByUid: cachedResetsByUid,
    };
  }

  try {
    const [rawByUid, rawByUser, rawResets] = await Promise.all([
      rtdbRestGet<Record<string, BanRecord>>(CLOUD_BANS_BY_UID_PATH, 2500),
      rtdbRestGet<Record<string, BanRecord>>(CLOUD_BANS_BY_USER_PATH, 2500),
      rtdbRestGet<Record<string, ResetRecord>>(CLOUD_RESETS_BY_UID_PATH, 2500),
    ]);

    const nextByUid: Record<string, BanRecord> = { ...DEFAULT_BANNED_ACCOUNTS };
    const nextByUser: Record<string, BanRecord> = {
      liamkd: DEFAULT_BANNED_ACCOUNTS['jIIqvA8aVzMUbFqh4I8Drq4M5FT2'],
      wessy: DEFAULT_BANNED_ACCOUNTS['ZzqxlRHiRUNDNG3nkgvxfCLkD153'],
      dryce: DEFAULT_BANNED_ACCOUNTS['JFw0K4bgUHg3GpzcnWV44sUpFnj1'],
    };

    if (rawByUid && typeof rawByUid === 'object') {
      for (const [uid, rec] of Object.entries(rawByUid)) {
        if (rec && typeof rec === 'object' && rec.status) {
          nextByUid[uid] = rec;
          if (rec.normalizedUsername) {
            nextByUser[rec.normalizedUsername.toLowerCase()] = rec;
          }
        }
      }
    }

    if (rawByUser && typeof rawByUser === 'object') {
      for (const [norm, rec] of Object.entries(rawByUser)) {
        if (rec && typeof rec === 'object' && rec.status) {
          nextByUser[norm.toLowerCase()] = rec;
          if (rec.uid) {
            nextByUid[rec.uid] = rec;
          }
        }
      }
    }

    if (rawResets && typeof rawResets === 'object') {
      cachedResetsByUid = rawResets;
    }

    cachedBansByUid = nextByUid;
    cachedBansByUsername = nextByUser;
    lastBanFetchMs = now;
  } catch {
    // keep cached
  }

  return {
    byUid: cachedBansByUid,
    byUsername: cachedBansByUsername,
    resetsByUid: cachedResetsByUid,
  };
}

export function getCachedResetRecord(uid?: string | null): ResetRecord | null {
  if (!uid) return null;
  return cachedResetsByUid[uid] || null;
}

export function getCachedBanRecord(
  uid?: string | null,
  username?: string | null
): BanRecord | null {
  if (isDevAdminAccount(uid, username)) return null;

  if (uid && cachedBansByUid[uid]) {
    const rec = cachedBansByUid[uid];
    if (rec.status === 'pardoned') return null;
    return rec;
  }

  const norm = (username || '').trim().toLowerCase();
  if (norm && cachedBansByUsername[norm]) {
    const rec = cachedBansByUsername[norm];
    if (rec.status === 'pardoned') return null;
    return rec;
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

export async function checkAccountBanStatus(
  uid?: string | null,
  username?: string | null,
  forceRefresh = false
): Promise<BanRecord | null> {
  if (isDevAdminAccount(uid, username)) return null;
  await refreshCloudBans(forceRefresh);
  const ban = getCachedBanRecord(uid, username);

  // If this signed-in client is banned, use its own auth token to self-delete from leaderboards & zero its user doc
  if (ban && uid && !uid.startsWith('local_') && !uid.startsWith('user_')) {
    wipePlayerProgressAndLeaderboard(uid, username || ban.username, ban.status, ban.reason).catch(
      () => {}
    );
  }

  return ban;
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
  seasonId: string = getActiveSeason().seasonId
): Promise<void> {
  const now = Date.now();
  await Promise.all([
    rtdbRestDelete(`leaderboards/${seasonId}/${targetUid}`).catch(() => false),
    rtdbRestWrite(
      `users/${targetUid}`,
      {
        uid: targetUid,
        username: targetUsername,
        banStatus,
        banReason: reason,
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

/**
 * Triggered automatically by the Anti-Cheat detector when >17 CPS or robotic click timing is detected.
 * Temporarily bans the player, removes them from the leaderboard, resets their score, and places them
 * in Marshallb78's Dev Tools queue for official confirmation or pardon.
 */
export async function triggerAutoTempBan(
  uid: string,
  username: string,
  reason: string = TEMP_AUTO_BAN_MESSAGE,
  detectedCps = 18
): Promise<BanRecord | null> {
  if (isDevAdminAccount(uid, username)) return null;

  const norm = username.trim().toLowerCase();
  const record: BanRecord = {
    uid: uid || `local_${norm || 'guest'}`,
    username: username || 'Unknown Player',
    normalizedUsername: norm || 'unknown',
    status: 'temp_banned',
    reason,
    detectedCps: Math.round(detectedCps * 10) / 10,
    bannedBy: 'AutoClickerDetector',
    bannedAtMs: Date.now(),
  };

  cachedBansByUid[record.uid] = record;
  if (norm) cachedBansByUsername[norm] = record;

  if (uid) {
    await Promise.all([
      rtdbRestWrite(CLOUD_BANS_BY_UID_PATH, { [uid]: record }, 'PATCH'),
      norm
        ? rtdbRestWrite(CLOUD_BANS_BY_USER_PATH, { [norm]: record }, 'PATCH')
        : Promise.resolve(true),
      wipePlayerProgressAndLeaderboard(uid, username, 'temp_banned', reason),
    ]);
  }

  return record;
}

/**
 * Called by Marshallb78 from the Dev Tools panel to officially & permanently ban a player.
 */
export async function adminBanPlayer(
  targetUid: string,
  targetUsername: string,
  reason: string = OFFICIAL_BAN_MESSAGE
): Promise<boolean> {
  if (isDevAdminAccount(targetUid, targetUsername)) return false;

  const cleanUser = targetUsername.trim() || targetUid;
  const norm = cleanUser.toLowerCase();
  const uidKey = targetUid || `user_${norm}`;

  const record: BanRecord = {
    uid: uidKey,
    username: cleanUser,
    normalizedUsername: norm,
    status: 'banned',
    reason,
    bannedBy: 'Marshallb78',
    bannedAtMs: Date.now(),
  };

  cachedBansByUid[uidKey] = record;
  cachedBansByUsername[norm] = record;

  await Promise.all([
    rtdbRestWrite(CLOUD_BANS_BY_UID_PATH, { [uidKey]: record }, 'PATCH'),
    rtdbRestWrite(CLOUD_BANS_BY_USER_PATH, { [norm]: record }, 'PATCH'),
    wipePlayerProgressAndLeaderboard(uidKey, cleanUser, 'banned', reason),
  ]);

  return true;
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

  cachedBansByUid[uidKey] = record;
  cachedBansByUsername[norm] = record;
  cachedResetsByUid[uidKey] = { uid: uidKey, username: cleanUser, resetAtMs: now };

  await Promise.all([
    rtdbRestWrite(CLOUD_BANS_BY_UID_PATH, { [uidKey]: record }, 'PATCH'),
    rtdbRestWrite(CLOUD_BANS_BY_USER_PATH, { [norm]: record }, 'PATCH'),
    rtdbRestWrite(
      CLOUD_RESETS_BY_UID_PATH,
      { [uidKey]: { uid: uidKey, username: cleanUser, resetAtMs: now } },
      'PATCH'
    ),
  ]);

  return true;
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

  await Promise.all([
    rtdbRestWrite(CLOUD_RESETS_BY_UID_PATH, { [targetUid]: resetRec }, 'PATCH'),
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
  return true;
}
