import {
  rtdbRestGet,
  rtdbRestWrite,
  rtdbRestDelete,
  firestoreRestGetDoc,
  firestoreRestListDocs,
} from './config';
import { GameState } from '../types/game';
import { getActiveSeason } from '../utils/scheduleEngine';
import { getAscensionMultiplier } from '../data/prestige';
import { getCachedBanRecord, refreshCloudBans } from './moderation';

export interface LeaderboardEntry {
  uid: string;
  username: string;
  seasonalScore: number;
  lifetimeCoins: number;
  totalClicks: number;
  rebirthCount: number;
  ascensionMultiplier: number;
  equippedSkin: string;
  unlockedSkins: string[];
  updatedAtMs: number;
  totalPlaytimeSeconds?: number;
  coins?: number;
  prestigeShards?: number;
  lifetimePrestigeShards?: number;
  gems?: number;
  lifetimeGems?: number;
  upgrades?: Record<string, number>;
  claimedQuests?: string[];
  unlockedAchievements?: string[];
  isReset?: boolean;
}

const lastPublishedSnapshotByUid = new Map<
  string,
  {
    score: number;
    rebirths: number;
    skin: string;
    skinsCount: number;
    playtimeBucket: number;
    username: string;
    publishedAtMs: number;
  }
>();

// Cache legacy Firestore entries once per browser session so pre-existing Firestore players
// appear on the leaderboard without using ongoing Firestore read quota.
const legacyFirestoreMapBySeason = new Map<string, Map<string, LeaderboardEntry>>();

export function evictLeaderboardCacheForUid(uid: string): void {
  lastPublishedSnapshotByUid.delete(uid);
  for (const map of legacyFirestoreMapBySeason.values()) {
    map.delete(uid);
  }
}

function parseRawEntry(uid: string, d: Record<string, any>): LeaderboardEntry {
  const rebirths = typeof d.rebirthCount === 'number' ? d.rebirthCount : 0;
  const shards = typeof d.prestigeShards === 'number' ? d.prestigeShards : rebirths;
  return {
    uid: d.uid || uid,
    username: d.username || 'Anonymous Matthew',
    seasonalScore: typeof d.seasonalScore === 'number' ? d.seasonalScore : 0,
    lifetimeCoins:
      typeof d.lifetimeCoins === 'number'
        ? d.lifetimeCoins
        : typeof d.seasonalScore === 'number'
        ? d.seasonalScore
        : 0,
    totalClicks: typeof d.totalClicks === 'number' ? d.totalClicks : 0,
    rebirthCount: rebirths,
    ascensionMultiplier:
      typeof d.ascensionMultiplier === 'number'
        ? d.ascensionMultiplier
        : getAscensionMultiplier(shards),
    equippedSkin: d.equippedSkin || 'classic_matthew',
    unlockedSkins:
      Array.isArray(d.unlockedSkins) && d.unlockedSkins.length > 0
        ? d.unlockedSkins
        : [d.equippedSkin || 'classic_matthew'],
    updatedAtMs: typeof d.updatedAtMs === 'number' ? d.updatedAtMs : 0,
    totalPlaytimeSeconds:
      typeof d.totalPlaytimeSeconds === 'number' ? d.totalPlaytimeSeconds : undefined,
    coins: typeof d.coins === 'number' ? d.coins : undefined,
    prestigeShards: typeof d.prestigeShards === 'number' ? d.prestigeShards : undefined,
    lifetimePrestigeShards:
      typeof d.lifetimePrestigeShards === 'number' ? d.lifetimePrestigeShards : undefined,
    gems: typeof d.gems === 'number' ? d.gems : undefined,
    lifetimeGems: typeof d.lifetimeGems === 'number' ? d.lifetimeGems : undefined,
    upgrades: d.upgrades && typeof d.upgrades === 'object' ? d.upgrades : undefined,
    claimedQuests: Array.isArray(d.claimedQuests) ? d.claimedQuests : undefined,
    unlockedAchievements: Array.isArray(d.unlockedAchievements)
      ? d.unlockedAchievements
      : undefined,
    isReset: Boolean(d.isReset),
  };
}

/**
 * Publishes the player's validated seasonal score, stats, unlocked skins, and progress snapshot
 * directly to Firebase Realtime Database (`leaderboards/{seasonId}/{uid}`) via stateless REST!
 */
export async function updateLeaderboardEntry(
  uid: string,
  username: string,
  state: GameState,
  seasonId: string = getActiveSeason().seasonId,
  force = false
): Promise<boolean> {
  if (!uid || !username) return false;

  // Never allow banned or temp-banned accounts onto the leaderboard
  const ban = getCachedBanRecord(uid, username);
  if (ban) {
    rtdbRestDelete(`leaderboards/${seasonId}/${uid}`).catch(() => {});
    return false;
  }

  const validatedScore = Math.max(
    0,
    Math.floor(Math.max(state.seasonalScore || 0, state.lifetimeCoins || 0))
  );
  const rebirths = state.prestigeCount || 0;
  const skin = state.equippedSkin || 'classic_matthew';
  const unlockedSkins =
    Array.isArray(state.unlockedSkins) && state.unlockedSkins.length > 0
      ? state.unlockedSkins
      : ['classic_matthew'];
  const playtimeSeconds = Math.floor(state.totalPlaytimeSeconds || 0);
  const playtimeBucket = Math.floor(playtimeSeconds / 30);

  const prev = lastPublishedSnapshotByUid.get(uid);
  if (
    !force &&
    prev &&
    prev.score === validatedScore &&
    prev.rebirths === rebirths &&
    prev.skin === skin &&
    prev.skinsCount === unlockedSkins.length &&
    prev.playtimeBucket === playtimeBucket &&
    prev.username === username
  ) {
    return true;
  }

  const nowMs = Date.now();
  const payload = {
    uid,
    username,
    seasonalScore: validatedScore,
    lifetimeCoins: Math.floor(state.lifetimeCoins || 0),
    coins: Math.floor(state.coins || 0),
    totalClicks: Math.floor(state.clicks || 0),
    rebirthCount: rebirths,
    prestigeShards: state.prestigeShards || 0,
    lifetimePrestigeShards: state.lifetimePrestigeShards || 0,
    gems: state.gems || 0,
    lifetimeGems: state.lifetimeGems || 0,
    ascensionMultiplier: getAscensionMultiplier(state.prestigeShards),
    equippedSkin: skin,
    unlockedSkins,
    upgrades: state.upgrades || {},
    claimedQuests: state.claimedQuests || [],
    unlockedAchievements: state.unlockedAchievements || [],
    totalPlaytimeSeconds: playtimeSeconds,
    updatedAtMs: nowMs,
    isReset: false,
  };

  const ok = await rtdbRestWrite(`leaderboards/${seasonId}/${uid}`, payload, 'PUT');

  if (ok) {
    lastPublishedSnapshotByUid.set(uid, {
      score: validatedScore,
      rebirths,
      skin,
      skinsCount: unlockedSkins.length,
      playtimeBucket,
      username,
      publishedAtMs: nowMs,
    });
  }

  return ok;
}

/**
 * Fetches the top worldwide leaderboard entries for a given season:
 * 1. Refreshes cloud bans (`bans` & `bans_by_username`) and reads `leaderboards/{seasonId}` from RTDB.
 * 2. Ignores legacy Firestore data for any UID that exists in RTDB or has been reset/banned.
 * 3. Filters out all banned and temp-banned accounts automatically.
 */
export async function fetchWorldwideLeaderboard(
  seasonId: string = getActiveSeason().seasonId,
  maxEntries = 50
): Promise<LeaderboardEntry[]> {
  try {
    let legacyPromise: Promise<void> = Promise.resolve();
    if (!legacyFirestoreMapBySeason.has(seasonId)) {
      legacyPromise = firestoreRestListDocs(`leaderboards/${seasonId}/entries`, 100, 3500)
        .then((docs) => {
          const map = new Map<string, LeaderboardEntry>();
          for (const { id, data } of docs) {
            const entry = parseRawEntry(id, data);
            map.set(entry.uid, entry);
          }
          legacyFirestoreMapBySeason.set(seasonId, map);
        })
        .catch(() => {});
    }

    const [rtdbObj] = await Promise.all([
      rtdbRestGet<Record<string, Record<string, any>>>(`leaderboards/${seasonId}`, 3500),
      refreshCloudBans(),
      legacyPromise,
    ]);

    const mergedByUid = new Map<string, LeaderboardEntry>();

    // 1. Seed with legacy Firestore entries ONLY for UIDs not present in Realtime Database
    const legacyMap = legacyFirestoreMapBySeason.get(seasonId);
    if (legacyMap) {
      for (const [uid, entry] of legacyMap.entries()) {
        if (rtdbObj && uid in rtdbObj) continue;
        if (getCachedBanRecord(entry.uid, entry.username)) continue;
        mergedByUid.set(uid, entry);
      }
    }

    // 2. Overlay live Realtime Database entries (authoritative over legacy Firestore)
    if (rtdbObj && typeof rtdbObj === 'object') {
      for (const [uid, raw] of Object.entries(rtdbObj)) {
        if (!raw || typeof raw !== 'object') continue;
        const rtdbEntry = parseRawEntry(uid, raw);

        // If this player is banned or temp-banned, purge from RTDB and skip
        if (getCachedBanRecord(rtdbEntry.uid, rtdbEntry.username)) {
          rtdbRestDelete(`leaderboards/${seasonId}/${uid}`).catch(() => {});
          mergedByUid.delete(rtdbEntry.uid);
          continue;
        }

        // If this account was explicitly reset and still has 0 score, keep them off the board
        if (rtdbEntry.isReset && rtdbEntry.seasonalScore <= 0) {
          mergedByUid.delete(rtdbEntry.uid);
          continue;
        }

        mergedByUid.set(rtdbEntry.uid, rtdbEntry);
      }
    }

    // 3. Final filter against banned usernames/UIDs (in case multiple UIDs share a banned username)
    const cleanEntries = Array.from(mergedByUid.values()).filter(
      (entry) => !getCachedBanRecord(entry.uid, entry.username)
    );

    return sortLeaderboardDeterministically(cleanEntries).slice(0, maxEntries);
  } catch (err) {
    console.warn('Could not fetch worldwide leaderboard:', err);
    return [];
  }
}

export function sortLeaderboardDeterministically(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (b.seasonalScore !== a.seasonalScore) {
      return b.seasonalScore - a.seasonalScore;
    }
    if (b.rebirthCount !== a.rebirthCount) {
      return b.rebirthCount - a.rebirthCount;
    }
    if (a.updatedAtMs !== b.updatedAtMs) {
      return a.updatedAtMs - b.updatedAtMs;
    }
    return a.uid.localeCompare(b.uid);
  });
}

export async function fetchPlayerLeaderboardEntry(
  uid: string,
  seasonId: string = getActiveSeason().seasonId
): Promise<LeaderboardEntry | null> {
  if (!uid) return null;

  try {
    const rtdbRaw = await rtdbRestGet<Record<string, any>>(
      `leaderboards/${seasonId}/${uid}`,
      3000
    );
    if (rtdbRaw && typeof rtdbRaw === 'object') {
      const parsed = parseRawEntry(uid, rtdbRaw);
      if (getCachedBanRecord(parsed.uid, parsed.username)) return null;
      if (parsed.isReset && parsed.seasonalScore <= 0) return null;
      return parsed;
    }

    const legacyMap = legacyFirestoreMapBySeason.get(seasonId);
    if (legacyMap?.has(uid)) {
      const entry = legacyMap.get(uid) || null;
      if (entry && getCachedBanRecord(entry.uid, entry.username)) return null;
      return entry;
    }

    const snap = await firestoreRestGetDoc(`leaderboards/${seasonId}/entries/${uid}`, false, 3000);
    if (!snap.exists) return null;
    const entry = parseRawEntry(uid, snap.data);
    if (getCachedBanRecord(entry.uid, entry.username)) return null;
    return entry;
  } catch {
    return null;
  }
}
