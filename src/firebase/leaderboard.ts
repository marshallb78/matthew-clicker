import {
  firestoreRestGetDoc,
  firestoreRestListDocs,
  firestoreRestSetDoc,
  isCloudWriteCoolingDown,
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
  // Optional embedded cloud save fields so a single 1-doc leaderboard write also backs up player progress!
  coins?: number;
  prestigeShards?: number;
  lifetimePrestigeShards?: number;
  gems?: number;
  lifetimeGems?: number;
  upgrades?: Record<string, number>;
  claimedQuests?: string[];
  unlockedAchievements?: string[];
}

// In-memory deduplication cache so we never waste daily Firestore writes when stats haven't meaningfully changed
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

// 15-second read cache for fetchWorldwideLeaderboard so spamming Refresh never exhausts the 50,000 daily read quota
let cachedLeaderboardSeasonId = '';
let cachedLeaderboardList: LeaderboardEntry[] | null = null;
let cachedLeaderboardFetchedAtMs = 0;
const LEADERBOARD_READ_CACHE_TTL_MS = 15000; // 15s cache

/**
 * Publishes the player's validated seasonal score, stats, unlocked skins, AND embedded progress snapshot
 * to the public season leaderboard in a SINGLE 1-document Firestore write!
 * - Skips writing if score increased by < 1% (and < 50 coins) and skin/rebirths haven't changed,
 *   unless `force = true`.
 */
export async function updateLeaderboardEntry(
  uid: string,
  username: string,
  state: GameState,
  seasonId: string = getActiveSeason().seasonId,
  force = false
): Promise<boolean> {
  if (!uid || !username) return false;
  if (isCloudWriteCoolingDown()) return false;

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
  if (!force && prev) {
    const scoreDelta = validatedScore - prev.score;
    const relativeGain = prev.score > 0 ? scoreDelta / prev.score : scoreDelta;
    const meaningfulScoreChange = scoreDelta >= 50 && relativeGain >= 0.01;
    const metaChanged =
      prev.rebirths !== rebirths ||
      prev.skin !== skin ||
      prev.skinsCount !== unlockedSkins.length;

    if (!meaningfulScoreChange && !metaChanged) {
      return true;
    }
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
    updatedAt: new Date(),
  };

  const ok = await firestoreRestSetDoc(`leaderboards/${seasonId}/entries/${uid}`, payload);

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
 * Fetches the top worldwide leaderboard entries for a given season via stateless REST.
 * Includes a 15-second read cache so rapid modal opens/refreshes never waste daily read quota.
 */
export async function fetchWorldwideLeaderboard(
  seasonId: string = getActiveSeason().seasonId,
  maxEntries = 50,
  bypassCache = false
): Promise<LeaderboardEntry[]> {
  const nowMs = Date.now();
  if (
    !bypassCache &&
    cachedLeaderboardList &&
    cachedLeaderboardSeasonId === seasonId &&
    nowMs - cachedLeaderboardFetchedAtMs < LEADERBOARD_READ_CACHE_TTL_MS
  ) {
    return cachedLeaderboardList.map((entry) => ({ ...entry })).slice(0, maxEntries);
  }

  try {
    const docs = await firestoreRestListDocs(`leaderboards/${seasonId}/entries`, 100, 4500);
    const list: LeaderboardEntry[] = docs.map(({ id, data: d }) => ({
      uid: d.uid || id,
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
    }));

    const sorted = sortLeaderboardDeterministically(list);
    cachedLeaderboardSeasonId = seasonId;
    cachedLeaderboardList = sorted;
    cachedLeaderboardFetchedAtMs = nowMs;

    return sorted.slice(0, maxEntries);
  } catch (err) {
    console.warn('Could not fetch worldwide leaderboard:', err);
    return cachedLeaderboardList ? cachedLeaderboardList.slice(0, maxEntries) : [];
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

  if (cachedLeaderboardList && cachedLeaderboardSeasonId === seasonId) {
    const cached = cachedLeaderboardList.find((e) => e.uid === uid);
    if (cached) return { ...cached };
  }

  try {
    const snap = await firestoreRestGetDoc(`leaderboards/${seasonId}/entries/${uid}`, false, 3500);
    if (!snap.exists) return null;
    const d = snap.data;
    return {
      uid: d.uid || uid,
      username: d.username || 'Player',
      seasonalScore: typeof d.seasonalScore === 'number' ? d.seasonalScore : 0,
      lifetimeCoins: typeof d.lifetimeCoins === 'number' ? d.lifetimeCoins : 0,
      totalClicks: typeof d.totalClicks === 'number' ? d.totalClicks : 0,
      rebirthCount: typeof d.rebirthCount === 'number' ? d.rebirthCount : 0,
      ascensionMultiplier:
        typeof d.ascensionMultiplier === 'number' ? d.ascensionMultiplier : 1,
      equippedSkin: d.equippedSkin || 'classic_matthew',
      unlockedSkins:
        Array.isArray(d.unlockedSkins) && d.unlockedSkins.length > 0
          ? d.unlockedSkins
          : ['classic_matthew'],
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
  } catch {
    return null;
  }
}
