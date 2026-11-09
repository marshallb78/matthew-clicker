import {
  firestoreRestGetDoc,
  firestoreRestSetDoc,
  isCloudWriteCoolingDown,
} from './config';
import { GameState } from '../types/game';
import {
  sanitizeAndValidateGameState,
  saveGame,
} from '../utils/storage';
import { getActiveSeason } from '../utils/scheduleEngine';
import { MATTHEW_STORM_SKINS, equipSkin, isValidSkinId } from '../data/skins';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import { updateLeaderboardEntry } from './leaderboard';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline_pending' | 'error';

// Track last written state per UID to avoid redundant Firestore writes and preserve daily quota
const lastSavedPermHashByUid = new Map<string, string>();
const lastSavedSeasonCoinsByUid = new Map<string, number>();

/**
 * Loads the player's permanent profile (`users/{uid}`) and current seasonal progress
 * (`users/{uid}/seasons/{seasonId}`) from Firestore via stateless REST, safely reconciling with local state.
 * - Never resets or overwrites progress with a lower save.
 * - Never hangs if Firestore daily write quota is in cooldown.
 */
export async function loadAndReconcileCloudSave(
  uid: string,
  username: string,
  localState: GameState
): Promise<GameState> {
  if (!uid) return localState;

  const activeSeason = getActiveSeason();
  let userSnap: { exists: boolean; id: string; data: Record<string, any> } = {
    exists: false,
    id: uid,
    data: {},
  };
  let seasonSnap: { exists: boolean; id: string; data: Record<string, any> } = {
    exists: false,
    id: activeSeason.seasonId,
    data: {},
  };

  try {
    const [uDoc, sDoc, lbDoc] = await Promise.all([
      firestoreRestGetDoc(`users/${uid}`, true, 3500),
      firestoreRestGetDoc(`users/${uid}/seasons/${activeSeason.seasonId}`, true, 3500),
      firestoreRestGetDoc(`leaderboards/${activeSeason.seasonId}/entries/${uid}`, false, 3500),
    ]);
    userSnap = uDoc;
    // Merge any newer fields from the 1-doc leaderboard snapshot into seasonSnap
    const lbData = lbDoc.exists ? lbDoc.data : {};
    const sData = sDoc.exists ? sDoc.data : {};
    const lbLifetime = typeof lbData.lifetimeCoins === 'number' ? lbData.lifetimeCoins : 0;
    const sLifetime = typeof sData.lifetimeCoins === 'number' ? sData.lifetimeCoins : 0;
    seasonSnap = {
      exists: sDoc.exists || lbDoc.exists,
      id: activeSeason.seasonId,
      data: lbLifetime > sLifetime ? { ...sData, ...lbData } : { ...lbData, ...sData },
    };
  } catch (err) {
    console.warn('Cloud profile read skipped/offline, keeping local state:', err);
    return localState;
  }

  // If this account has never saved to the cloud before, upload current local state non-blockingly
  if (!userSnap.exists && !seasonSnap.exists) {
    saveStateToCloud(uid, username, localState).catch(() => {});
    return localState;
  }

  const permData = userSnap.exists ? userSnap.data : {};
  const seasonData = seasonSnap.exists ? seasonSnap.data : {};

  // Merge permanent skin ownership (permanent across all seasons & devices)
  const cloudSkins: string[] = Array.isArray(permData.unlockedSkins) ? permData.unlockedSkins : [];
  const mergedSkins = Array.from(
    new Set(['classic_matthew', ...localState.unlockedSkins, ...cloudSkins])
  ).filter((id) => isValidSkinId(id));

  // Merge upgrades by taking the maximum count per upgrade ID between local and cloud
  const cloudUpgrades: Record<string, number> =
    seasonData.upgrades && typeof seasonData.upgrades === 'object' ? seasonData.upgrades : {};
  const mergedUpgrades: Record<string, number> = { ...localState.upgrades };
  for (const [upId, count] of Object.entries(cloudUpgrades)) {
    if (typeof count === 'number') {
      mergedUpgrades[upId] = Math.max(mergedUpgrades[upId] || 0, count);
    }
  }

  const cloudLifetimeCoins =
    typeof seasonData.lifetimeCoins === 'number' ? seasonData.lifetimeCoins : 0;
  const cloudCoins = typeof seasonData.coins === 'number' ? seasonData.coins : 0;
  const cloudSeasonalScore =
    typeof seasonData.seasonalScore === 'number' ? seasonData.seasonalScore : 0;
  const useCloudSeason = seasonSnap.exists && cloudLifetimeCoins >= localState.lifetimeCoins;

  const chosenEquippedSkin =
    useCloudSeason &&
    typeof permData.equippedSkin === 'string' &&
    mergedSkins.includes(permData.equippedSkin)
      ? permData.equippedSkin
      : mergedSkins.includes(localState.equippedSkin)
      ? localState.equippedSkin
      : typeof permData.equippedSkin === 'string' && mergedSkins.includes(permData.equippedSkin)
      ? permData.equippedSkin
      : 'classic_matthew';

  const mergedRaw: Partial<GameState> = {
    ...(useCloudSeason ? seasonData : localState),
    coins: Math.max(localState.coins || 0, cloudCoins),
    lifetimeCoins: Math.max(localState.lifetimeCoins || 0, cloudLifetimeCoins),
    seasonalScore: Math.max(
      localState.seasonalScore || 0,
      cloudSeasonalScore,
      Math.floor(Math.max(localState.lifetimeCoins || 0, cloudLifetimeCoins))
    ),
    clicks: Math.max(
      localState.clicks || 0,
      typeof seasonData.clicks === 'number' ? seasonData.clicks : 0
    ),
    criticalClicks: Math.max(
      localState.criticalClicks || 0,
      typeof seasonData.criticalClicks === 'number' ? seasonData.criticalClicks : 0
    ),
    prestigeCount: Math.max(
      localState.prestigeCount || 0,
      typeof seasonData.prestigeCount === 'number' ? seasonData.prestigeCount : 0
    ),
    prestigeShards: Math.max(
      localState.prestigeShards || 0,
      typeof seasonData.prestigeShards === 'number' ? seasonData.prestigeShards : 0
    ),
    lifetimePrestigeShards: Math.max(
      localState.lifetimePrestigeShards || 0,
      typeof seasonData.lifetimePrestigeShards === 'number' ? seasonData.lifetimePrestigeShards : 0
    ),
    upgrades: mergedUpgrades,
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
    unlockedAchievements: Array.from(
      new Set([
        ...(localState.unlockedAchievements || []),
        ...(Array.isArray(seasonData.unlockedAchievements) ? seasonData.unlockedAchievements : []),
      ])
    ),
    claimedQuests: Array.from(
      new Set([
        ...(localState.claimedQuests || []),
        ...(Array.isArray(seasonData.claimedQuests) ? seasonData.claimedQuests : []),
      ])
    ),
    seasonHistory: Array.isArray(permData.seasonHistory)
      ? permData.seasonHistory
      : localState.seasonHistory || [],
    lastDailyLoginClaimDate:
      permData.lastDailyLoginClaimDate || localState.lastDailyLoginClaimDate || null,
    currentSeasonId: activeSeason.seasonId,
    introCutsceneSeen: Boolean(permData.introCutsceneSeen || localState.introCutsceneSeen),
    lastBetaWipeId: permData.lastBetaWipeId || localState.lastBetaWipeId || null,
    settings: {
      ...localState.settings,
      ...(permData.settings && typeof permData.settings === 'object' ? permData.settings : {}),
    },
  };

  const reconciled = sanitizeAndValidateGameState(mergedRaw);
  saveGame(reconciled);

  // Sync reconciled state back to cloud non-blockingly so sign-in finishes immediately
  saveStateToCloud(uid, username, reconciled).catch(() => {});
  return reconciled;
}

/**
 * Persists separated permanent profile data and seasonal data to Firestore,
 * and updates the public worldwide season leaderboard.
 * Uses smart change detection + circuit breaker to conserve daily Firestore writes.
 */
export async function saveStateToCloud(
  uid: string,
  username: string,
  state: GameState,
  force = false
): Promise<boolean> {
  if (!uid || !username) return false;
  if (isCloudWriteCoolingDown()) return false;

  const activeSeason = getActiveSeason();

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
    lastBetaWipeId: state.lastBetaWipeId || null,
    settings: state.settings,
    updatedAt: new Date(),
  };

  const permHash = JSON.stringify({
    u: username,
    s: state.unlockedSkins,
    e: state.equippedSkin,
    g: state.gems,
    pa: state.permanentAchievements?.length || 0,
  });

  const seasonalPayload = {
    seasonId: activeSeason.seasonId,
    lastBetaWipeId: state.lastBetaWipeId || null,
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
    updatedAt: new Date(),
  };

  const tasks: Promise<boolean>[] = [];

  // Only write `users/{uid}` when permanent fields (skins, gems, username) actually changed!
  if (force || lastSavedPermHashByUid.get(uid) !== permHash) {
    tasks.push(
      firestoreRestSetDoc(`users/${uid}`, permanentPayload).then((ok) => {
        if (ok) lastSavedPermHashByUid.set(uid, permHash);
        return ok;
      })
    );
  }

  // Only write `users/{uid}/seasons/{seasonId}` when lifetimeCoins or prestige changed
  const prevSeasonCoins = lastSavedSeasonCoinsByUid.get(uid) ?? -1;
  const currentSignature = Math.floor(state.lifetimeCoins) + (state.prestigeCount || 0) * 17;
  if (force || prevSeasonCoins !== currentSignature) {
    tasks.push(
      firestoreRestSetDoc(`users/${uid}/seasons/${activeSeason.seasonId}`, seasonalPayload).then(
        (ok) => {
          if (ok) lastSavedSeasonCoinsByUid.set(uid, currentSignature);
          return ok;
        }
      )
    );
  }

  tasks.push(updateLeaderboardEntry(uid, username, state, activeSeason.seasonId, force));

  if (tasks.length === 0) return true;
  const results = await Promise.all(tasks);
  return results.some(Boolean);
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

  if (uid && username) {
    saveStateToCloud(uid, username, updatedState, true).catch(() => {});
  }

  return { nextState: updatedState, success: true };
}
