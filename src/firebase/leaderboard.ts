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
}

// In-memory deduplication cache so we never waste daily Firestore writes when stats haven't changed
const lastPublishedSnapshotByUid = new Map<
  string,
  { score: number; rebirths: number; skin: string; skinsCount: number; publishedAtMs: number }
>();

/**
 * Publishes the player's validated seasonal score, stats, and unlocked skins to the public season leaderboard.
 * Uses smart deduplication and our stateless REST circuit breaker so it never hangs or wastes write quota.
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

  const ok = await firestoreRestSetDoc(`leaderboards/${seasonId}/entries/${uid}`, {
    uid,
    username,
    seasonalScore: validatedScore,
    lifetimeCoins: Math.floor(state.lifetimeCoins || 0),
    totalClicks: Math.floor(state.clicks || 0),
    rebirthCount: rebirths,
    ascensionMultiplier: getAscensionMultiplier(state.prestigeShards),
    equippedSkin: skin,
    unlockedSkins,
    updatedAtMs: Date.now(),
    updatedAt: new Date(),
  });

  if (ok) {
    lastPublishedSnapshotByUid.set(uid, {
      score: validatedScore,
      rebirths,
      skin,
      skinsCount: unlockedSkins.length,
      publishedAtMs: Date.now(),
    });
  }

  return ok;
}

/**
 * Fetches the top worldwide leaderboard entries for a given season via stateless REST.
 * Never blocks on pending writes and preserves all players' scores.
 */
export async function fetchWorldwideLeaderboard(
  seasonId: string = getActiveSeason().seasonId,
  maxEntries = 50
): Promise<LeaderboardEntry[]> {
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
    }));

    return sortLeaderboardDeterministically(list).slice(0, maxEntries);
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
    };
  } catch {
    return null;
  }
}
