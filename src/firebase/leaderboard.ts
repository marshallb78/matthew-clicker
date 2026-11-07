import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from './config';
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

/**
 * Publishes the player's validated seasonal score, stats, and unlocked skins to the public season leaderboard
 * so other players can click their row to view their profile, stats, and unlocked skins!
 */
export async function updateLeaderboardEntry(
  uid: string,
  username: string,
  state: GameState,
  seasonId: string = getActiveSeason().seasonId
): Promise<void> {
  const { db } = getFirebaseServices();
  if (!db || !uid || !username) return;

  const validatedScore = Math.max(
    0,
    Math.floor(Math.max(state.seasonalScore || 0, state.lifetimeCoins || 0))
  );

  const entryRef = doc(db, 'leaderboards', seasonId, 'entries', uid);
  await setDoc(
    entryRef,
    {
      uid,
      username,
      seasonalScore: validatedScore,
      lifetimeCoins: Math.floor(state.lifetimeCoins || 0),
      totalClicks: Math.floor(state.clicks || 0),
      rebirthCount: state.prestigeCount || 0,
      ascensionMultiplier: getAscensionMultiplier(state.prestigeShards),
      equippedSkin: state.equippedSkin || 'classic_matthew',
      unlockedSkins:
        Array.isArray(state.unlockedSkins) && state.unlockedSkins.length > 0
          ? state.unlockedSkins
          : ['classic_matthew'],
      updatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Fetches the top worldwide leaderboard entries for a given season.
 */
export async function fetchWorldwideLeaderboard(
  seasonId: string = getActiveSeason().seasonId,
  maxEntries = 50
): Promise<LeaderboardEntry[]> {
  const { db } = getFirebaseServices();
  if (!db) return [];

  try {
    const entriesRef = collection(db, 'leaderboards', seasonId, 'entries');
    const q = query(entriesRef, orderBy('seasonalScore', 'desc'), limit(maxEntries));
    const snap = await getDocs(q);

    const list: LeaderboardEntry[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        uid: d.uid || docSnap.id,
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
            : 1 + (typeof d.rebirthCount === 'number' ? d.rebirthCount : 0),
        equippedSkin: d.equippedSkin || 'classic_matthew',
        unlockedSkins:
          Array.isArray(d.unlockedSkins) && d.unlockedSkins.length > 0
            ? d.unlockedSkins
            : [d.equippedSkin || 'classic_matthew'],
        updatedAtMs: typeof d.updatedAtMs === 'number' ? d.updatedAtMs : 0,
      });
    });

    return sortLeaderboardDeterministically(list);
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
  const { db } = getFirebaseServices();
  if (!db || !uid) return null;

  try {
    const ref = doc(db, 'leaderboards', seasonId, 'entries', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const d = snap.data();
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
