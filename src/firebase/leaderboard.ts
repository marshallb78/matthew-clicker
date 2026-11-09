import {
  rtdbRestGet,
  rtdbRestWrite,
  firestoreRestGetDoc,
  firestoreRestListDocs,
} from './config';
import { GameState } from '../types/game';
import { getActiveSeason } from '../utils/scheduleEngine';
import { getAscensionMultiplier } from '../data/prestige';

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
  coins?: number;
  prestigeShards?: number;
  lifetimePrestigeShards?: number;
  gems?: number;
  lifetimeGems?: number;
  upgrades?: Record<string, number>;
  claimedQuests?: string[];
  unlockedAchievements?: string[];
}

const lastPublishedSnapshotByUid = new Map<
  string,
  {
    score: number;
    rebirths: number;
    skin: string;
    skinsCount: number;
    publishedAtMs: number;
  }
>();

// Cache legacy Firestore entries once per browser session so all 20 pre-existing Firestore players
// always appear on the leaderboard without using ongoing Firestore read quota!
const legacyFirestoreMapBySeason = new Map<string, Map<string, LeaderboardEntry>>();

function parseRawEntry(uid: string, d: Record<string, any>): LeaderboardEntry {
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
    rebirthCount: typeof d.rebirthCount === 'number' ? d.rebirthCount : 0,
    ascensionMultiplier:
      typeof d.ascensionMultiplier === 'number'
        ? d.ascensionMultiplier
        : 1 + (typeof d.rebirthCount === 'number' ? d.rebirthCount : 0) * 0.05,
    equippedSkin: d.equippedSkin || 'classic_matthew',
    unlockedSkins:
      Array.isArray(d.unlockedSkins) && d.unlockedSkins.length > 0
        ? d.unlockedSkins
        : [d.equippedSkin || 'classic_matthew'],
    updatedAtMs: typeof d.updatedAtMs === 'number' ? d.updatedAtMs : 0,
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
  };
}

/**
 * Publishes the player's validated seasonal score, stats, unlocked skins, and progress snapshot
 * directly to Firebase Realtime Database (`leaderboards/{seasonId}/{uid}`) via stateless REST!
 * - Unlimited daily writes on the Free Spark plan!
 */
export async function updateLeaderboardEntry(
  uid: string,
  username: string,
  state: GameState,
  seasonId: string = getActiveSeason().seasonId,
  force = false
): Promise<boolean> {
  if (!uid || !username) return false;

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

  const prev = lastPublishedSnapshotByUid.get(uid);
  if (
    !force &&
    prev &&
    prev.score === validatedScore &&
    prev.rebirths === rebirths &&
    prev.skin === skin &&
    prev.skinsCount === unlockedSkins.length
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
    updatedAtMs: nowMs,
  };

  const ok = await rtdbRestWrite(`leaderboards/${seasonId}/${uid}`, payload, 'PUT');

  if (ok) {
    lastPublishedSnapshotByUid.set(uid, {
      score: validatedScore,
      rebirths,
      skin,
      skinsCount: unlockedSkins.length,
      publishedAtMs: nowMs,
    });
  }

  return ok;
}

/**
 * Fetches the top worldwide leaderboard entries for a given season:
 * 1. Reads live Realtime Database (`leaderboards/{seasonId}`) in ~40ms.
 * 2. Merges with existing Firestore entries (cached once per session) so all 20 existing players
 *    and all new Realtime Database updates appear seamlessly together!
 */
export async function fetchWorldwideLeaderboard(
  seasonId: string = getActiveSeason().seasonId,
  maxEntries = 50
): Promise<LeaderboardEntry[]> {
  try {
    // Load legacy Firestore entries once per session if not yet cached
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
      legacyPromise,
    ]);

    const mergedByUid = new Map<string, LeaderboardEntry>();

    // 1. Seed with legacy Firestore entries
    const legacyMap = legacyFirestoreMapBySeason.get(seasonId);
    if (legacyMap) {
      for (const [uid, entry] of legacyMap.entries()) {
        mergedByUid.set(uid, entry);
      }
    }

    // 2. Overlay live Realtime Database entries (taking whichever has the higher score / newer update)
    if (rtdbObj && typeof rtdbObj === 'object') {
      for (const [uid, raw] of Object.entries(rtdbObj)) {
        if (!raw || typeof raw !== 'object') continue;
        const rtdbEntry = parseRawEntry(uid, raw);
        const existing = mergedByUid.get(rtdbEntry.uid);
        if (
          !existing ||
          rtdbEntry.seasonalScore >= existing.seasonalScore ||
          rtdbEntry.updatedAtMs >= existing.updatedAtMs
        ) {
          mergedByUid.set(rtdbEntry.uid, rtdbEntry);
        }
      }
    }

    return sortLeaderboardDeterministically(Array.from(mergedByUid.values())).slice(0, maxEntries);
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
      return parseRawEntry(uid, rtdbRaw);
    }

    const legacyMap = legacyFirestoreMapBySeason.get(seasonId);
    if (legacyMap?.has(uid)) {
      return legacyMap.get(uid) || null;
    }

    const snap = await firestoreRestGetDoc(`leaderboards/${seasonId}/entries/${uid}`, false, 3000);
    if (!snap.exists) return null;
    return parseRawEntry(uid, snap.data);
  } catch {
    return null;
  }
}
