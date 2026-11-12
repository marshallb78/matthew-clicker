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
import { ALL_STORM_SKINS, equipSkin, isValidSkinId } from '../data/skins';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import { updateLeaderboardEntry } from './leaderboard';
import { getCachedBanRecord, getCachedResetRecord, refreshCloudBans } from './moderation';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline_pending' | 'error';

const lastSavedSignatureByUid = new Map<string, string>();

export function clearCloudSaveSignature(uid: string): void {
  lastSavedSignatureByUid.delete(uid);
}

/**
 * Loads the player's profile and current seasonal progress from Firebase Realtime Database
 * (primary, unlimited daily writes), only falling back to legacy Firestore if the user has never
 * been saved in Realtime Database.
 * - Prevents reset accounts from ever pulling back old Firestore scores when signing out and in.
 * - Prevents rebirthed accounts from getting stale offline earnings on another device.
 * - Syncs `lastDailyLoginClaimDate` and `totalPlaytimeSeconds` across all devices.
 */
export async function loadAndReconcileCloudSave(
  uid: string,
  username: string,
  localState: GameState
): Promise<GameState> {
  if (!uid) return localState;

  const activeSeason = getActiveSeason();

  try {
    const [rtdbUser, rtdbLb] = await Promise.all([
      rtdbRestGet<Record<string, any>>(`users/${uid}`, 3500),
      rtdbRestGet<Record<string, any>>(`leaderboards/${activeSeason.seasonId}/${uid}`, 3500),
      refreshCloudBans(),
    ]);

    // Check if account is banned or was recently reset in RTDB
    const banRecord = getCachedBanRecord(uid, username);
    const resetRecord = getCachedResetRecord(uid);
    const wasExplicitlyReset =
      Boolean(rtdbUser?.resetAtMs) ||
      Boolean(rtdbLb?.isReset) ||
      Boolean(resetRecord) ||
      Boolean(banRecord);

    // Only consult legacy Firestore if the user has NO Realtime Database record at all and wasn't reset/banned
    let fsUser = { exists: false, id: uid, data: {} as Record<string, any> };
    let fsSeason = { exists: false, id: activeSeason.seasonId, data: {} as Record<string, any> };
    let fsLb = { exists: false, id: uid, data: {} as Record<string, any> };

    if (!rtdbUser && !rtdbLb && !wasExplicitlyReset) {
      [fsUser, fsSeason, fsLb] = await Promise.all([
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
    }

    const hasAnyCloudData =
      Boolean(rtdbUser) ||
      Boolean(rtdbLb) ||
      fsUser.exists ||
      fsSeason.exists ||
      fsLb.exists;

    if (!hasAnyCloudData && !banRecord) {
      saveStateToCloud(uid, username, localState, true).catch(() => {});
      return localState;
    }

    // If banned or temp_banned, return zeroed progression state immediately
    if (banRecord) {
      const zeroedBannedState = sanitizeAndValidateGameState({
        ...localState,
        coins: 0,
        lifetimeCoins: 0,
        seasonalScore: 0,
        clicks: 0,
        prestigeCount: 0,
        prestigeShards: 0,
        lifetimePrestigeShards: 0,
        upgrades: {},
        lastSaveTime: Date.now(),
      });
      saveGame(zeroedBannedState);
      return zeroedBannedState;
    }

    const rtdbSeason = rtdbUser?.seasons?.[activeSeason.seasonId] || null;

    // If RTDB data exists, use ONLY RTDB sources so legacy Firestore never resurrects reset scores or old timestamps
    const sources: Record<string, any>[] =
      rtdbUser || rtdbLb
        ? [rtdbLb || {}, rtdbSeason || {}, rtdbUser || {}]
        : [
            fsLb.exists ? fsLb.data : {},
            fsSeason.exists ? fsSeason.data : {},
            fsUser.exists ? fsUser.data : {},
          ];

    let bestCloudSeason: Record<string, any> = {};
    let bestCloudPrestige = -1;
    let bestCloudLifetimeCoins = -1;
    let bestCloudLastSaveTime = 0;

    let maxCareerPlaytime = localState.totalPlaytimeSeconds || 0;
    let maxCareerClicks = Math.max(localState.lifetimeAllSeasonsClicks || 0, localState.clicks || 0);
    let maxCareerCoins = Math.max(
      localState.lifetimeAllSeasonsCoins || 0,
      localState.lifetimeCoins || 0
    );

    const allSkins = new Set<string>(['classic_matthew', ...(localState.unlockedSkins || [])]);
    const allPermAch = new Set<string>(localState.permanentAchievements || []);
    const allClaimedQuests = new Set<string>(localState.claimedQuests || []);

    let cloudEquippedSkin: string | null = null;
    let latestDailyLoginClaimDate: string | null = localState.lastDailyLoginClaimDate || null;

    for (const src of sources) {
      if (!src || typeof src !== 'object') continue;

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
      if (Array.isArray(src.claimedQuests)) {
        src.claimedQuests.forEach((q: string) => allClaimedQuests.add(q));
      }
      if (typeof src.totalPlaytimeSeconds === 'number') {
        maxCareerPlaytime = Math.max(maxCareerPlaytime, src.totalPlaytimeSeconds);
      }
      if (typeof src.lifetimeAllSeasonsClicks === 'number') {
        maxCareerClicks = Math.max(maxCareerClicks, src.lifetimeAllSeasonsClicks);
      }
      if (typeof src.clicks === 'number' && !wasExplicitlyReset) {
        maxCareerClicks = Math.max(maxCareerClicks, src.clicks);
      }
      if (typeof src.lifetimeAllSeasonsCoins === 'number' && !wasExplicitlyReset) {
        maxCareerCoins = Math.max(maxCareerCoins, src.lifetimeAllSeasonsCoins);
      }
      if (typeof src.lastDailyLoginClaimDate === 'string' && src.lastDailyLoginClaimDate) {
        if (!latestDailyLoginClaimDate || src.lastDailyLoginClaimDate > latestDailyLoginClaimDate) {
          latestDailyLoginClaimDate = src.lastDailyLoginClaimDate;
        }
      }

      const srcSeasonId = src.seasonId || src.currentSeasonId || activeSeason.seasonId;
      if (srcSeasonId !== activeSeason.seasonId) {
        continue;
      }

      const pCount =
        typeof src.prestigeCount === 'number'
          ? src.prestigeCount
          : typeof src.rebirthCount === 'number'
          ? src.rebirthCount
          : 0;
      const lCoins =
        typeof src.lifetimeCoins === 'number'
          ? src.lifetimeCoins
          : typeof src.seasonalScore === 'number'
          ? src.seasonalScore
          : 0;
      const saveTs =
        typeof src.lastSaveTime === 'number'
          ? src.lastSaveTime
          : typeof src.updatedAtMs === 'number'
          ? src.updatedAtMs
          : 0;

      const isBetterCloud =
        pCount > bestCloudPrestige ||
        (pCount === bestCloudPrestige && lCoins > bestCloudLifetimeCoins) ||
        (pCount === bestCloudPrestige &&
          lCoins === bestCloudLifetimeCoins &&
          saveTs > bestCloudLastSaveTime);

      if (isBetterCloud) {
        bestCloudPrestige = pCount;
        bestCloudLifetimeCoins = lCoins;
        if (saveTs > 0) bestCloudLastSaveTime = saveTs;
        bestCloudSeason = { ...bestCloudSeason, ...src };
      } else {
        bestCloudSeason = { ...src, ...bestCloudSeason };
        if (saveTs > bestCloudLastSaveTime) {
          bestCloudLastSaveTime = saveTs;
        }
      }
    }

    const mergedSkins = Array.from(allSkins);
    const localInActiveSeason = localState.currentSeasonId === activeSeason.seasonId;
    const localPrestige = localInActiveSeason ? localState.prestigeCount || 0 : -1;
    const localLifetimeCoins = localInActiveSeason ? localState.lifetimeCoins || 0 : -1;

    // If the cloud account was explicitly reset more recently than the user's cloud save, reset wins
    const resetAtMs = Math.max(
      typeof rtdbUser?.resetAtMs === 'number' ? rtdbUser.resetAtMs : 0,
      resetRecord?.resetAtMs || 0
    );
    const forceCloudAfterReset =
      resetAtMs > 0 &&
      (bestCloudLifetimeCoins === 0 || resetAtMs >= (bestCloudLastSaveTime || 0));

    const useCloudBase =
      forceCloudAfterReset ||
      bestCloudPrestige > localPrestige ||
      (bestCloudPrestige === localPrestige && bestCloudLifetimeCoins >= localLifetimeCoins);

    const authoritativeSeason: Record<string, any> = useCloudBase ? bestCloudSeason : localState;

    const chosenEquippedSkin =
      useCloudBase && cloudEquippedSkin && mergedSkins.includes(cloudEquippedSkin)
        ? cloudEquippedSkin
        : mergedSkins.includes(localState.equippedSkin)
        ? localState.equippedSkin
        : cloudEquippedSkin && mergedSkins.includes(cloudEquippedSkin)
        ? cloudEquippedSkin
        : 'classic_matthew';

    // Always use the newest timestamp across RTDB season, user doc, and leaderboard so
    // a Rebirth on one device never uses an older timestamp from the day before on another device!
    const newestCloudSaveTs = Math.max(
      bestCloudLastSaveTime || 0,
      typeof rtdbSeason?.lastSaveTime === 'number' ? rtdbSeason.lastSaveTime : 0,
      typeof rtdbUser?.updatedAtMs === 'number' ? rtdbUser.updatedAtMs : 0,
      typeof rtdbLb?.updatedAtMs === 'number' ? rtdbLb.updatedAtMs : 0
    );

    const authUpgrades =
      authoritativeSeason.upgrades && typeof authoritativeSeason.upgrades === 'object'
        ? authoritativeSeason.upgrades
        : {};
    const hasAnyPassiveUpgrades = Object.values(authUpgrades).some(
      (cnt) => typeof cnt === 'number' && cnt > 0
    );
    const authCoins =
      typeof authoritativeSeason.coins === 'number'
        ? authoritativeSeason.coins
        : localState.coins || 0;

    // If the player just Rebirthed (coins === 0 and no upgrades owned) or was Reset,
    // reset lastSaveTime to Date.now() so they NEVER receive stale offline earnings on another device!
    let effectiveLastSaveTime =
      useCloudBase && newestCloudSaveTs > 0
        ? newestCloudSaveTs
        : localState.lastSaveTime || Date.now();

    if ((!hasAnyPassiveUpgrades && authCoins === 0) || forceCloudAfterReset) {
      effectiveLastSaveTime = Date.now();
    }

    const mergedRaw: Partial<GameState> = {
      ...localState,
      ...authoritativeSeason,
      coins: forceCloudAfterReset ? 0 : authCoins,
      lifetimeCoins: forceCloudAfterReset
        ? 0
        : Math.max(
            typeof authoritativeSeason.lifetimeCoins === 'number'
              ? authoritativeSeason.lifetimeCoins
              : 0,
            typeof authoritativeSeason.seasonalScore === 'number'
              ? authoritativeSeason.seasonalScore
              : 0
          ),
      seasonalScore: forceCloudAfterReset
        ? 0
        : Math.max(
            typeof authoritativeSeason.seasonalScore === 'number'
              ? authoritativeSeason.seasonalScore
              : 0,
            Math.floor(
              typeof authoritativeSeason.lifetimeCoins === 'number'
                ? authoritativeSeason.lifetimeCoins
                : 0
            )
          ),
      clicks: forceCloudAfterReset
        ? 0
        : typeof authoritativeSeason.clicks === 'number'
        ? authoritativeSeason.clicks
        : localState.clicks || 0,
      criticalClicks: forceCloudAfterReset
        ? 0
        : typeof authoritativeSeason.criticalClicks === 'number'
        ? authoritativeSeason.criticalClicks
        : localState.criticalClicks || 0,
      prestigeCount: forceCloudAfterReset
        ? 0
        : typeof authoritativeSeason.prestigeCount === 'number'
        ? authoritativeSeason.prestigeCount
        : typeof authoritativeSeason.rebirthCount === 'number'
        ? authoritativeSeason.rebirthCount
        : 0,
      prestigeShards: forceCloudAfterReset
        ? 0
        : typeof authoritativeSeason.prestigeShards === 'number'
        ? authoritativeSeason.prestigeShards
        : 0,
      lifetimePrestigeShards: forceCloudAfterReset
        ? 0
        : typeof authoritativeSeason.lifetimePrestigeShards === 'number'
        ? authoritativeSeason.lifetimePrestigeShards
        : 0,
      upgrades: forceCloudAfterReset ? {} : authUpgrades,
      unlockedSkins: mergedSkins,
      equippedSkin: chosenEquippedSkin,
      gems: Math.max(
        typeof authoritativeSeason.gems === 'number' ? authoritativeSeason.gems : 0,
        typeof rtdbUser?.gems === 'number' ? rtdbUser.gems : 0,
        localState.gems || 0
      ),
      lifetimeGems: Math.max(
        localState.lifetimeGems || 0,
        typeof rtdbUser?.lifetimeGems === 'number' ? rtdbUser.lifetimeGems : 0
      ),
      lastDailyLoginClaimDate: latestDailyLoginClaimDate,
      totalPlaytimeSeconds: maxCareerPlaytime,
      lifetimeAllSeasonsClicks: maxCareerClicks,
      lifetimeAllSeasonsCoins: maxCareerCoins,
      permanentAchievements: Array.from(allPermAch),
      claimedQuests: forceCloudAfterReset ? [] : Array.from(allClaimedQuests),
      currentSeasonId: activeSeason.seasonId,
      lastSaveTime: effectiveLastSaveTime,
      settings: {
        ...localState.settings,
      },
    };

    const reconciled = sanitizeAndValidateGameState(mergedRaw);
    const reconciledWithTimestamp: GameState = {
      ...reconciled,
      lastSaveTime: effectiveLastSaveTime,
    };
    saveGame(reconciled);

    // Sync reconciled profile & leaderboard back to Realtime Database unless it's a fresh 0-score reset
    if (!forceCloudAfterReset || reconciled.lifetimeCoins > 0) {
      saveStateToCloud(uid, username, reconciled, true).catch(() => {});
    }
    return reconciledWithTimestamp;
  } catch (err) {
    console.warn('Cloud reconciliation fallback to local state:', err);
    return localState;
  }
}

/**
 * Persists player profile and seasonal progression directly to Firebase Realtime Database (`users/{uid}`)
 * and updates the Realtime Database Worldwide Leaderboard (`leaderboards/{seasonId}/{uid}`).
 */
export async function saveStateToCloud(
  uid: string,
  username: string,
  state: GameState,
  force = false
): Promise<boolean> {
  if (!uid || !username) return false;

  // Never allow banned or temp-banned players to overwrite cloud state or leaderboard
  if (getCachedBanRecord(uid, username)) {
    return false;
  }

  const activeSeason = getActiveSeason();
  const playtimeBucket = Math.floor((state.totalPlaytimeSeconds || 0) / 30);
  const signature = `${Math.floor(state.lifetimeCoins)}_${Math.floor(state.coins)}_${state.prestigeCount}_${state.equippedSkin}_${state.unlockedSkins.length}_${state.gems}_${state.lastDailyLoginClaimDate || ''}_${playtimeBucket}_${username}`;

  if (!force && lastSavedSignatureByUid.get(uid) === signature) {
    return true;
  }

  const nowMs = Date.now();
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
    totalPlaytimeSeconds: Math.floor(state.totalPlaytimeSeconds || 0),
    lifetimeAllSeasonsCoins: Math.max(state.lifetimeAllSeasonsCoins || 0, state.lifetimeCoins),
    lifetimeAllSeasonsClicks: Math.max(state.lifetimeAllSeasonsClicks || 0, state.clicks),
    introCutsceneSeen: state.introCutsceneSeen,
    discoveredEasterEggs: state.discoveredEasterEggs || [],
    settings: state.settings,
    resetAtMs: null,
    updatedAtMs: nowMs,
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
        totalPlaytimeSeconds: Math.floor(state.totalPlaytimeSeconds || 0),
        goldenMatthewsClicked: state.goldenMatthewsClicked,
        giantMatthewsClicked: state.giantMatthewsClicked || 0,
        lastSaveTime: nowMs,
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
  const stormSkin = ALL_STORM_SKINS.find((s) => s.id === skinId);
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
