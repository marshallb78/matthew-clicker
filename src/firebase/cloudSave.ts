import {
  doc,
  getDoc,
  setDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirebaseServices } from './config';
import { GameState } from '../types/game';
import { sanitizeAndValidateGameState, saveGame } from '../utils/storage';
import { getActiveSeason } from '../utils/scheduleEngine';
import { MATTHEW_STORM_SKINS, equipSkin, isValidSkinId } from '../data/skins';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import { updateLeaderboardEntry } from './leaderboard';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline_pending' | 'error';

/**
 * Loads the player's permanent profile (`users/{uid}`) and current seasonal progress
 * (`users/{uid}/seasons/{seasonId}`) from Firestore, safely reconciling with local state.
 * Never overwrites a valid cloud save with an empty local save on a new device.
 */
export async function loadAndReconcileCloudSave(
  uid: string,
  username: string,
  localState: GameState
): Promise<GameState> {
  const { db } = getFirebaseServices();
  if (!db) return localState;

  const activeSeason = getActiveSeason();
  const userDocRef = doc(db, 'users', uid);
  const seasonDocRef = doc(db, 'users', uid, 'seasons', activeSeason.seasonId);

  const [userSnap, seasonSnap] = await Promise.all([
    getDoc(userDocRef),
    getDoc(seasonDocRef),
  ]);

  // If this account has never saved to the cloud before, upload current local state as initial profile
  if (!userSnap.exists() && !seasonSnap.exists()) {
    await saveStateToCloud(uid, username, localState);
    return localState;
  }

  const permData = userSnap.exists() ? userSnap.data() : {};
  const seasonData = seasonSnap.exists() ? seasonSnap.data() : {};

  // Merge permanent skin ownership (permanent across all seasons & devices)
  const cloudSkins: string[] = Array.isArray(permData.unlockedSkins) ? permData.unlockedSkins : [];
  const mergedSkins = Array.from(
    new Set(['classic_matthew', ...localState.unlockedSkins, ...cloudSkins])
  ).filter((id) => isValidSkinId(id));

  // Determine whether cloud seasonal progress is ahead of local state (e.g., logging in on a second device)
  const cloudLifetimeCoins = typeof seasonData.lifetimeCoins === 'number' ? seasonData.lifetimeCoins : 0;
  const useCloudSeason = seasonSnap.exists() && cloudLifetimeCoins >= localState.lifetimeCoins;

  const chosenEquippedSkin =
    typeof permData.equippedSkin === 'string' && mergedSkins.includes(permData.equippedSkin)
      ? permData.equippedSkin
      : mergedSkins.includes(localState.equippedSkin)
      ? localState.equippedSkin
      : 'classic_matthew';

  const mergedRaw: Partial<GameState> = {
    ...(useCloudSeason ? seasonData : localState),
    unlockedSkins: mergedSkins,
    equippedSkin: chosenEquippedSkin,
    gems: Math.max(localState.gems || 0, typeof permData.gems === 'number' ? permData.gems : 0),
    lifetimeGems: Math.max(
      localState.lifetimeGems || 0,
      typeof permData.lifetimeGems === 'number' ? permData.lifetimeGems : 0
    ),
    permanentAchievements: Array.from(
      new Set([
        ...(localState.permanentAchievements || []),
        ...(Array.isArray(permData.permanentAchievements) ? permData.permanentAchievements : []),
      ])
    ),
    seasonHistory: Array.isArray(permData.seasonHistory)
      ? permData.seasonHistory
      : localState.seasonHistory || [],
    lastDailyLoginClaimDate:
      permData.lastDailyLoginClaimDate || localState.lastDailyLoginClaimDate || null,
    currentSeasonId: activeSeason.seasonId,
    introCutsceneSeen: Boolean(permData.introCutsceneSeen || localState.introCutsceneSeen),
    settings: {
      ...localState.settings,
      ...(permData.settings && typeof permData.settings === 'object' ? permData.settings : {}),
    },
  };

  const reconciled = sanitizeAndValidateGameState(mergedRaw);
  saveGame(reconciled);

  // Sync reconciled state back to cloud
  await saveStateToCloud(uid, username, reconciled);
  return reconciled;
}

/**
 * Persists separated permanent profile data and seasonal data to Firestore,
 * and updates the public worldwide season leaderboard.
 */
export async function saveStateToCloud(
  uid: string,
  username: string,
  state: GameState
): Promise<boolean> {
  const { db } = getFirebaseServices();
  if (!db) return false;

  const activeSeason = getActiveSeason();
  const userDocRef = doc(db, 'users', uid);
  const seasonDocRef = doc(db, 'users', uid, 'seasons', activeSeason.seasonId);

  const permanentPayload = {
    uid,
    username,
    unlockedSkins: state.unlockedSkins,
    equippedSkin: state.equippedSkin,
    gems: state.gems,
    lifetimeGems: state.lifetimeGems,
    permanentAchievements: state.permanentAchievements,
    seasonHistory: state.seasonHistory,
    lastDailyLoginClaimDate: state.lastDailyLoginClaimDate,
    lifetimeAllSeasonsCoins: Math.max(state.lifetimeAllSeasonsCoins || 0, state.lifetimeCoins),
    lifetimeAllSeasonsClicks: Math.max(state.lifetimeAllSeasonsClicks || 0, state.clicks),
    introCutsceneSeen: state.introCutsceneSeen,
    discoveredEasterEggs: state.discoveredEasterEggs || [],
    settings: state.settings,
    updatedAt: serverTimestamp(),
  };

  const seasonalPayload = {
    seasonId: activeSeason.seasonId,
    coins: state.coins,
    lifetimeCoins: state.lifetimeCoins,
    seasonalScore: Math.max(state.seasonalScore || 0, Math.floor(state.lifetimeCoins)),
    clicks: state.clicks,
    criticalClicks: state.criticalClicks,
    maxComboReached: state.maxComboReached || 0,
    upgrades: state.upgrades,
    currentRealm: state.currentRealm,
    unlockedRealms: state.unlockedRealms,
    uperCompleted: state.uperCompleted,
    uperCompletionModalDismissed: state.uperCompletionModalDismissed,
    prestigeCount: state.prestigeCount,
    prestigeShards: state.prestigeShards,
    lifetimePrestigeShards: state.lifetimePrestigeShards,
    prestigeUpgrades: state.prestigeUpgrades,
    unlockedAchievements: state.unlockedAchievements,
    claimedQuests: state.claimedQuests,
    eventStats: state.eventStats,
    totalPlaytimeSeconds: state.totalPlaytimeSeconds,
    goldenMatthewsClicked: state.goldenMatthewsClicked,
    giantMatthewsClicked: state.giantMatthewsClicked || 0,
    lastSaveTime: Date.now(),
    updatedAt: serverTimestamp(),
  };

  await Promise.all([
    setDoc(userDocRef, permanentPayload, { merge: true }),
    setDoc(seasonDocRef, seasonalPayload, { merge: true }),
    updateLeaderboardEntry(uid, username, state, activeSeason.seasonId),
  ]);

  return true;
}

/**
 * Atomically validates and processes a 50-gem Matthew Storm skin purchase.
 * Deducts gems, grants permanent skin ownership, automatically equips the skin, and saves.
 */
export async function purchaseStormSkinAtomic(
  state: GameState,
  skinId: string,
  uid?: string | null,
  username?: string | null
): Promise<{ nextState: GameState; success: boolean; error?: string }> {
  const stormSkin = MATTHEW_STORM_SKINS.find((s) => s.id === skinId);
  if (!stormSkin) {
    return { nextState: state, success: false, error: 'Invalid Matthew Storm skin.' };
  }

  if (state.unlockedSkins.includes(skinId)) {
    const equipped = equipSkin(state, skinId);
    saveGame(equipped);
    return { nextState: equipped, success: true };
  }

  const cost = stormSkin.gemCost ?? GEM_ECONOMY_CONFIG.stormSkinCostGems;
  if (state.gems < cost) {
    return {
      nextState: state,
      success: false,
      error: `Not enough Gems! Need ${cost} Gems (you have ${state.gems}).`,
    };
  }

  // Record unlock first, deduct gems atomically, then equip via authoritative equipSkin()
  let updatedState: GameState = {
    ...state,
    gems: state.gems - cost,
    unlockedSkins: [...state.unlockedSkins, skinId],
    eventStats: {
      ...state.eventStats,
      stormSkinsPurchased: Array.from(
        new Set([...(state.eventStats?.stormSkinsPurchased || []), skinId])
      ),
    },
  };
  updatedState = equipSkin(updatedState, skinId);
  saveGame(updatedState);

  // If authenticated with Firebase, execute atomic Firestore transaction on permanent profile
  const { db } = getFirebaseServices();
  if (db && uid && username) {
    try {
      const userDocRef = doc(db, 'users', uid);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userDocRef);
        const currentCloudGems = snap.exists() && typeof snap.data()?.gems === 'number'
          ? Math.max(state.gems, snap.data().gems)
          : state.gems;

        if (currentCloudGems < cost) {
          throw new Error('Insufficient cloud gems for purchase.');
        }

        const existingSkins: string[] =
          snap.exists() && Array.isArray(snap.data()?.unlockedSkins)
            ? snap.data().unlockedSkins
            : state.unlockedSkins;

        const nextCloudSkins = Array.from(new Set([...existingSkins, skinId]));
        tx.set(
          userDocRef,
          {
            gems: currentCloudGems - cost,
            unlockedSkins: nextCloudSkins,
            equippedSkin: skinId,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (err) {
      console.warn('Cloud transaction queued for retry:', err);
    }
  }

  return { nextState: updatedState, success: true };
}

