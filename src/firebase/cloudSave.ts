import {
  rtdbRestGet,
  rtdbRestWrite,
  firestoreRestGetDoc,
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

const lastSavedSignatureByUid = new Map<string, string>();

/**
 * Loads the player's profile and current seasonal progress from both
 * Firebase Realtime Database (primary, unlimited daily writes) AND legacy Firestore,
 * merging the highest progress across all sources and local state so zero data is ever lost.
 */
export async function loadAndReconcileCloudSave(
  uid: string,
  username: string,
  localState: GameState
): Promise<GameState> {
  if (!uid) return localState;

  const activeSeason = getActiveSeason();

  try {
    const [rtdbUser, rtdbLb, fsUser, fsSeason, fsLb] = await Promise.all([
      rtdbRestGet<Record<string, any>>(`users/${uid}`, 3500),
      rtdbRestGet<Record<string, any>>(`leaderboards/${activeSeason.seasonId}/${uid}`, 3500),
      firestoreRestGetDoc(`users/${uid}`, true, 3500).catch(() => ({
        exists: false,
        id: uid,
        data: {},
      })),
      firestoreRestGetDoc(`users/${uid}/seasons/${activeSeason.seasonId}`, true, 3500).catch(
        () => ({
          exists: false,
          id: activeSeason.seasonId,
          data: {},
        })
      ),
      firestoreRestGetDoc(`leaderboards/${activeSeason.seasonId}/entries/${uid}`, false, 3500).catch(
        () => ({
          exists: false,
          id: uid,
          data: {},
        })
      ),
    ]);

    const hasAnyCloudData =
      Boolean(rtdbUser) ||
      Boolean(rtdbLb) ||
      fsUser.exists ||
      fsSeason.exists ||
      fsLb.exists;

    if (!hasAnyCloudData) {
      saveStateToCloud(uid, username, localState, true).catch(() => {});
      return localState;
    }

    const sources: Record<string, any>[] = [
      fsLb.exists ? fsLb.data : {},
      fsSeason.exists ? fsSeason.data : {},
      fsUser.exists ? fsUser.data : {},
      rtdbLb || {},
      rtdbUser?.seasons?.[activeSeason.seasonId] || {},
      rtdbUser || {},
    ];

    // Pick the cloud source with the highest lifetimeCoins as base seasonal object
    let bestCloudSeason: Record<string, any> = {};
    let maxCloudLifetimeCoins = 0;
    let maxCloudCoins = 0;
    let maxCloudSeasonalScore = 0;
    let maxCloudClicks = 0;
    let maxCloudCritClicks = 0;
    let maxCloudPrestigeCount = 0;
    let maxCloudPrestigeShards = 0;
    let maxCloudLifetimeShards = 0;
    let maxCloudGems = 0;
    let maxCloudLifetimeGems = 0;

    const allSkins = new Set<string>(['classic_matthew', ...(localState.unlockedSkins || [])]);
    const allPermAch = new Set<string>(localState.permanentAchievements || []);
    const allUnlockedAch = new Set<string>(localState.unlockedAchievements || []);
    const allClaimedQuests = new Set<string>(localState.claimedQuests || []);
    const mergedUpgrades: Record<string, number> = { ...(localState.upgrades || {}) };

    let cloudEquippedSkin: string | null = null;

    for (const src of sources) {
      if (!src || typeof src !== 'object') continue;
      const lc = typeof src.lifetimeCoins === 'number' ? src.lifetimeCoins : 0;
      if (lc >= maxCloudLifetimeCoins) {
        maxCloudLifetimeCoins = lc;
        bestCloudSeason = { ...bestCloudSeason, ...src };
      }
      if (typeof src.coins === 'number') maxCloudCoins = Math.max(maxCloudCoins, src.coins);
      if (typeof src.seasonalScore === 'number') {
        maxCloudSeasonalScore = Math.max(maxCloudSeasonalScore, src.seasonalScore);
      }
      if (typeof src.clicks === 'number') maxCloudClicks = Math.max(maxCloudClicks, src.clicks);
      if (typeof src.criticalClicks === 'number') {
        maxCloudCritClicks = Math.max(maxCloudCritClicks, src.criticalClicks);
      }
      if (typeof src.prestigeCount === 'number') {
        maxCloudPrestigeCount = Math.max(maxCloudPrestigeCount, src.prestigeCount);
      }
      if (typeof src.rebirthCount === 'number') {
        maxCloudPrestigeCount = Math.max(maxCloudPrestigeCount, src.rebirthCount);
      }
      if (typeof src.prestigeShards === 'number') {
        maxCloudPrestigeShards = Math.max(maxCloudPrestigeShards, src.prestigeShards);
      }
      if (typeof src.lifetimePrestigeShards === 'number') {
        maxCloudLifetimeShards = Math.max(maxCloudLifetimeShards, src.lifetimePrestigeShards);
      }
      if (typeof src.gems === 'number') maxCloudGems = Math.max(maxCloudGems, src.gems);
      if (typeof src.lifetimeGems === 'number') {
        maxCloudLifetimeGems = Math.max(maxCloudLifetimeGems, src.lifetimeGems);
      }

      if (Array.isArray(src.unlockedSkins)) {
        src.unlockedSkins.forEach((id: string) => {
          if (isValidSkinId(id)) allSkins.add(id);
        });
      }
      if (typeof src.equippedSkin === 'string' && isValidSkinId(src.equippedSkin)) {
        cloudEquippedSkin = src.equippedSkin;
      }
      if (Array.isArray(src.permanentAchievements)) {
        src.permanentAchievements.forEach((a: string) => allPermAch.add(a));
      }
      if (Array.isArray(src.unlockedAchievements)) {
        src.unlockedAchievements.forEach((a: string) => allUnlockedAch.add(a));
      }
      if (Array.isArray(src.claimedQuests)) {
        src.claimedQuests.forEach((q: string) => allClaimedQuests.add(q));
      }
      if (src.upgrades && typeof src.upgrades === 'object') {
        for (const [upId, count] of Object.entries(src.upgrades)) {
          if (typeof count === 'number') {
            mergedUpgrades[upId] = Math.max(mergedUpgrades[upId] || 0, count);
          }
        }
      }
    }

    const mergedSkins = Array.from(allSkins);
    const useCloudBase = maxCloudLifetimeCoins >= (localState.lifetimeCoins || 0);

    const chosenEquippedSkin =
      useCloudBase && cloudEquippedSkin && mergedSkins.includes(cloudEquippedSkin)
        ? cloudEquippedSkin
        : mergedSkins.includes(localState.equippedSkin)
        ? localState.equippedSkin
        : cloudEquippedSkin && mergedSkins.includes(cloudEquippedSkin)
        ? cloudEquippedSkin
        : 'classic_matthew';

    const mergedRaw: Partial<GameState> = {
      ...(useCloudBase ? bestCloudSeason : localState),
      coins: Math.max(localState.coins || 0, maxCloudCoins),
      lifetimeCoins: Math.max(localState.lifetimeCoins || 0, maxCloudLifetimeCoins),
      seasonalScore: Math.max(
        localState.seasonalScore || 0,
        maxCloudSeasonalScore,
        Math.floor(Math.max(localState.lifetimeCoins || 0, maxCloudLifetimeCoins))
      ),
      clicks: Math.max(localState.clicks || 0, maxCloudClicks),
      criticalClicks: Math.max(localState.criticalClicks || 0, maxCloudCritClicks),
      prestigeCount: Math.max(localState.prestigeCount || 0, maxCloudPrestigeCount),
      prestigeShards: Math.max(localState.prestigeShards || 0, maxCloudPrestigeShards),
      lifetimePrestigeShards: Math.max(
        localState.lifetimePrestigeShards || 0,
        maxCloudLifetimeShards
      ),
      upgrades: mergedUpgrades,
      unlockedSkins: mergedSkins,
      equippedSkin: chosenEquippedSkin,
      gems: Math.max(localState.gems || 0, maxCloudGems),
      lifetimeGems: Math.max(localState.lifetimeGems || 0, maxCloudLifetimeGems),
      permanentAchievements: Array.from(allPermAch),
      unlockedAchievements: Array.from(allUnlockedAch),
      claimedQuests: Array.from(allClaimedQuests),
      currentSeasonId: activeSeason.seasonId,
      settings: {
        ...localState.settings,
      },
    };

    const reconciled = sanitizeAndValidateGameState(mergedRaw);
    saveGame(reconciled);

    // Immediately sync reconciled profile & leaderboard into Realtime Database
    saveStateToCloud(uid, username, reconciled, true).catch(() => {});
    return reconciled;
  } catch (err) {
    console.warn('Cloud reconciliation fallback to local state:', err);
    return localState;
  }
}

/**
 * Persists player profile and seasonal progression directly to Firebase Realtime Database (`users/{uid}`)
 * and updates the Realtime Database Worldwide Leaderboard (`leaderboards/{seasonId}/{uid}`).
 * - Unlimited daily writes on the Free Spark plan!
 */
export async function saveStateToCloud(
  uid: string,
  username: string,
  state: GameState,
  force = false
): Promise<boolean> {
  if (!uid || !username) return false;

  const activeSeason = getActiveSeason();
  const signature = `${Math.floor(state.lifetimeCoins)}_${Math.floor(state.coins)}_${state.prestigeCount}_${state.equippedSkin}_${state.unlockedSkins.length}_${state.gems}`;

  if (!force && lastSavedSignatureByUid.get(uid) === signature) {
    return true;
  }

  const userPayload = {
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
    updatedAtMs: Date.now(),
    seasons: {
      [activeSeason.seasonId]: {
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
      },
    },
  };

  const [userOk, lbOk] = await Promise.all([
    rtdbRestWrite(`users/${uid}`, userPayload, 'PUT'),
    updateLeaderboardEntry(uid, username, state, activeSeason.seasonId, force),
  ]);

  if (userOk || lbOk) {
    lastSavedSignatureByUid.set(uid, signature);
  }

  return userOk || lbOk;
}

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
