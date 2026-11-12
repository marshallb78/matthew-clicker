import {
  TAB_SESSION_ID,
  rtdbRestGetWithStatus,
  rtdbRestWrite,
  rtdbRestWriteKeepalive,
  firestoreRestGetDoc,
} from './config';
import { GameState } from '../types/game';
import {
  getDefaultGameState,
  sanitizeAndValidateGameState,
  saveGame,
} from '../utils/storage';
import { getActiveSeason } from '../utils/scheduleEngine';
import { ALL_STORM_SKINS, equipSkin, isValidSkinId } from '../data/skins';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import {
  updateLeaderboardEntry,
  updateLeaderboardEntryKeepalive,
} from './leaderboard';
import { getCachedBanRecord, getCachedResetRecord, refreshCloudBans } from './moderation';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline_pending' | 'error';

export const MARSHALL_RECOVERY_UID = '89nsfff2YtaEVcNTHUBDq22V4FW2';
export const MARSHALL_RECOVERED_SCORE = 3.2223763084217282e35; // 322.2 Dc
export const MARSHALL_RECOVERED_COINS = 2.5e35; // 250 Dc spendable coins
export const MARSHALL_RECOVERED_CLICKS = 151114;

const lastSavedSignatureByUid = new Map<string, string>();
const verifiedInitialPullUids = new Set<string>();
const blockedOverwriteUids = new Set<string>();
const lastKnownCloudUpdatedAtByUid = new Map<string, number>();
const lastSessionCheckAtByUid = new Map<string, number>();
const reconcileInFlightByUid = new Map<string, Promise<GameState>>();

let foreignUpdateHandler: ((uid: string) => void) | null = null;

export function registerForeignCloudUpdateHandler(handler: ((uid: string) => void) | null): void {
  foreignUpdateHandler = handler;
}

export function clearCloudSaveSignature(uid: string): void {
  lastSavedSignatureByUid.delete(uid);
  verifiedInitialPullUids.delete(uid);
  blockedOverwriteUids.delete(uid);
  lastKnownCloudUpdatedAtByUid.delete(uid);
  lastSessionCheckAtByUid.delete(uid);
}

export function hasCompletedInitialCloudPull(uid?: string | null): boolean {
  if (!uid) return false;
  return verifiedInitialPullUids.has(uid);
}

export function isCloudOverwriteBlocked(uid?: string | null): boolean {
  if (!uid) return true;
  return blockedOverwriteUids.has(uid);
}

export interface ProgressSnapshot {
  lifetimeCoins: number;
  prestigeCount: number;
  saveTs: number;
}

/**
 * Compares two same-season snapshots deterministically:
 * - If lifetimeCoins differs by >1%, higher lifetimeCoins ALWAYS wins so an older/lower save
 *   with a stale prestigeCount or local timestamp can NEVER overwrite higher progress (e.g. 2 No overwriting 322 Dc).
 * - Within 1% (e.g. right after Rebirthing at the same lifetime score), higher prestigeCount wins first.
 * - Ties break cleanly by exact lifetimeCoins, then newest save timestamp.
 */
export function isProgressSnapshotBetter(
  candidate: ProgressSnapshot,
  baseline: ProgressSnapshot
): boolean {
  const candCoins = Math.max(0, candidate.lifetimeCoins || 0);
  const baseCoins = Math.max(0, baseline.lifetimeCoins || 0);
  const maxCoins = Math.max(candCoins, baseCoins);

  if (maxCoins > 0) {
    const relDiff = Math.abs(candCoins - baseCoins) / maxCoins;
    if (relDiff > 0.01) {
      return candCoins > baseCoins;
    }
  }

  const candPrestige = Math.max(0, candidate.prestigeCount || 0);
  const basePrestige = Math.max(0, baseline.prestigeCount || 0);
  if (candPrestige !== basePrestige) {
    return candPrestige > basePrestige;
  }

  if (candCoins !== baseCoins) {
    return candCoins > baseCoins;
  }

  return (candidate.saveTs || 0) > (baseline.saveTs || 0);
}

/**
 * Lightweight check (~40 bytes) to detect whether another device or browser tab saved
 * more recently than this session's last synced cloud timestamp.
 */
export async function hasForeignDeviceSavedMoreRecently(uid: string): Promise<boolean> {
  if (!uid) return false;
  const [sessionRes, updatedRes] = await Promise.all([
    rtdbRestGetWithStatus<string>(`users/${uid}/activeSessionId`, 3500, 0),
    rtdbRestGetWithStatus<number>(`users/${uid}/updatedAtMs`, 3500, 0),
  ]);

  if (!sessionRes.ok || !updatedRes.ok) {
    return false;
  }

  lastSessionCheckAtByUid.set(uid, Date.now());
  const cloudSessionId = typeof sessionRes.data === 'string' ? sessionRes.data : null;
  const cloudUpdatedAt = typeof updatedRes.data === 'number' ? updatedRes.data : 0;
  const knownUpdatedAt = lastKnownCloudUpdatedAtByUid.get(uid) || 0;

  if (cloudSessionId && cloudSessionId !== TAB_SESSION_ID && cloudUpdatedAt > knownUpdatedAt) {
    return true;
  }
  return false;
}

function buildUserCloudPayload(
  uid: string,
  username: string,
  state: GameState,
  nowMs: number,
  activeSeasonId: string
): Record<string, any> {
  return {
    uid,
    username,
    activeSessionId: TAB_SESSION_ID,
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
      [activeSeasonId]: {
        seasonId: activeSeasonId,
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
}

/**
 * Pure reconciliation helper combining cloud sources (`users/${uid}`, season snapshot, leaderboard entry)
 * with a device's local state, guaranteeing higher progress never gets overwritten by stale devices.
 */
export function reconcileCloudAndLocalState(params: {
  uid: string;
  username: string;
  localState: GameState;
  rtdbUser: Record<string, any> | null;
  rtdbLb: Record<string, any> | null;
  legacySources?: Record<string, any>[];
  wasExplicitlyReset: boolean;
  resetAtMs: number;
  activeSeasonId: string;
  nowMs?: number;
}): {
  state: GameState;
  shouldPushToCloud: boolean;
  recoveredFromCareerLoss: boolean;
} {
  const {
    uid,
    localState: rawLocalState,
    rtdbUser,
    rtdbLb,
    legacySources = [],
    wasExplicitlyReset,
    resetAtMs,
    activeSeasonId,
    nowMs = Date.now(),
  } = params;

  // Never allow a different previous account's localStorage save to contaminate this account
  const localState =
    rawLocalState.lastOwnerUid && rawLocalState.lastOwnerUid !== uid
      ? getDefaultGameState()
      : rawLocalState;

  const rtdbSeason = rtdbUser?.seasons?.[activeSeasonId] || null;

  // Prefer RTDB sources whenever any RTDB record exists; only fall back to legacy Firestore otherwise
  const sources: Record<string, any>[] =
    rtdbUser || rtdbLb
      ? [rtdbLb || {}, rtdbSeason || {}, rtdbUser || {}]
      : legacySources;

  let bestCloudSeason: Record<string, any> = {};
  let bestCloudSnapshot: ProgressSnapshot = {
    lifetimeCoins: -1,
    prestigeCount: -1,
    saveTs: 0,
  };

  let maxCareerPlaytime = localState.totalPlaytimeSeconds || 0;
  let maxCareerClicks = Math.max(localState.lifetimeAllSeasonsClicks || 0, localState.clicks || 0);
  let maxCareerCoins = Math.max(
    localState.lifetimeAllSeasonsCoins || 0,
    localState.lifetimeCoins || 0
  );

  const allSkins = new Set<string>(['classic_matthew', ...(localState.unlockedSkins || [])]);
  const allPermAch = new Set<string>(localState.permanentAchievements || []);
  const allClaimedQuests = new Set<string>(localState.claimedQuests || []);
  const allUnlockedAchievements = new Set<string>(localState.unlockedAchievements || []);
  const allUnlockedRealms = new Set<string>(localState.unlockedRealms || ['earth']);

  let cloudEquippedSkin: string | null = null;
  let latestDailyLoginClaimDate: string | null = localState.lastDailyLoginClaimDate || null;
  let cloudMaxPrestigeCount = 0;
  let cloudMaxPrestigeShards = 0;
  let cloudMaxLifetimePrestigeShards = 0;
  let cloudMaxClicks = 0;
  let cloudMaxCritClicks = 0;
  let cloudMaxGoldenClicked = 0;
  let cloudMaxGiantClicked = 0;
  let cloudMaxComboReached = 0;

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
    if (Array.isArray(src.unlockedAchievements)) {
      src.unlockedAchievements.forEach((a: string) => allUnlockedAchievements.add(a));
    }
    if (Array.isArray(src.unlockedRealms)) {
      src.unlockedRealms.forEach((r: string) => allUnlockedRealms.add(r));
    }
    if (typeof src.totalPlaytimeSeconds === 'number') {
      maxCareerPlaytime = Math.max(maxCareerPlaytime, src.totalPlaytimeSeconds);
    }
    if (typeof src.lifetimeAllSeasonsClicks === 'number') {
      maxCareerClicks = Math.max(maxCareerClicks, src.lifetimeAllSeasonsClicks);
    }
    if (typeof src.clicks === 'number' && !wasExplicitlyReset) {
      maxCareerClicks = Math.max(maxCareerClicks, src.clicks);
      cloudMaxClicks = Math.max(cloudMaxClicks, src.clicks);
    }
    if (typeof src.totalClicks === 'number' && !wasExplicitlyReset) {
      maxCareerClicks = Math.max(maxCareerClicks, src.totalClicks);
      cloudMaxClicks = Math.max(cloudMaxClicks, src.totalClicks);
    }
    if (typeof src.lifetimeAllSeasonsCoins === 'number' && !wasExplicitlyReset) {
      maxCareerCoins = Math.max(maxCareerCoins, src.lifetimeAllSeasonsCoins);
    }
    if (typeof src.lastDailyLoginClaimDate === 'string' && src.lastDailyLoginClaimDate) {
      if (!latestDailyLoginClaimDate || src.lastDailyLoginClaimDate > latestDailyLoginClaimDate) {
        latestDailyLoginClaimDate = src.lastDailyLoginClaimDate;
      }
    }

    const srcSeasonId = src.seasonId || src.currentSeasonId || activeSeasonId;
    if (srcSeasonId !== activeSeasonId) {
      continue;
    }

    const pCount =
      typeof src.prestigeCount === 'number'
        ? src.prestigeCount
        : typeof src.rebirthCount === 'number'
        ? src.rebirthCount
        : 0;
    const pShards = typeof src.prestigeShards === 'number' ? src.prestigeShards : 0;
    const lpShards =
      typeof src.lifetimePrestigeShards === 'number' ? src.lifetimePrestigeShards : pShards;
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

    if (!wasExplicitlyReset) {
      cloudMaxPrestigeCount = Math.max(cloudMaxPrestigeCount, pCount);
      cloudMaxPrestigeShards = Math.max(cloudMaxPrestigeShards, pShards);
      cloudMaxLifetimePrestigeShards = Math.max(cloudMaxLifetimePrestigeShards, lpShards);
      cloudMaxCritClicks = Math.max(
        cloudMaxCritClicks,
        typeof src.criticalClicks === 'number' ? src.criticalClicks : 0
      );
      cloudMaxGoldenClicked = Math.max(
        cloudMaxGoldenClicked,
        typeof src.goldenMatthewsClicked === 'number' ? src.goldenMatthewsClicked : 0
      );
      cloudMaxGiantClicked = Math.max(
        cloudMaxGiantClicked,
        typeof src.giantMatthewsClicked === 'number' ? src.giantMatthewsClicked : 0
      );
      cloudMaxComboReached = Math.max(
        cloudMaxComboReached,
        typeof src.maxComboReached === 'number' ? src.maxComboReached : 0
      );
    }

    const candSnap: ProgressSnapshot = {
      lifetimeCoins: lCoins,
      prestigeCount: pCount,
      saveTs,
    };

    if (
      bestCloudSnapshot.lifetimeCoins < 0 ||
      isProgressSnapshotBetter(candSnap, bestCloudSnapshot)
    ) {
      bestCloudSnapshot = candSnap;
      // Preserve upgrades from a richer source if the new winner lacks an upgrades map
      const mergedUpgrades =
        src.upgrades && typeof src.upgrades === 'object'
          ? src.upgrades
          : bestCloudSeason.upgrades;
      bestCloudSeason = {
        ...bestCloudSeason,
        ...src,
        upgrades: mergedUpgrades,
      };
    } else {
      bestCloudSeason = { ...src, ...bestCloudSeason };
      if (saveTs > bestCloudSnapshot.saveTs) {
        bestCloudSnapshot.saveTs = saveTs;
      }
    }
  }

  const mergedSkins = Array.from(allSkins);
  const localInActiveSeason = localState.currentSeasonId === activeSeasonId;
  const localSnap: ProgressSnapshot = localInActiveSeason
    ? {
        lifetimeCoins: localState.lifetimeCoins || 0,
        prestigeCount: localState.prestigeCount || 0,
        saveTs: localState.lastSaveTime || 0,
      }
    : {
        lifetimeCoins: -1,
        prestigeCount: -1,
        saveTs: 0,
      };

  const forceCloudAfterReset =
    resetAtMs > 0 &&
    (bestCloudSnapshot.lifetimeCoins <= 0 || resetAtMs >= (bestCloudSnapshot.saveTs || 0));

  const useCloudBase =
    forceCloudAfterReset ||
    bestCloudSnapshot.lifetimeCoins >= 0 &&
      !isProgressSnapshotBetter(localSnap, bestCloudSnapshot);

  const authoritativeSeason: Record<string, any> = useCloudBase ? bestCloudSeason : localState;

  const chosenEquippedSkin =
    useCloudBase && cloudEquippedSkin && mergedSkins.includes(cloudEquippedSkin)
      ? cloudEquippedSkin
      : mergedSkins.includes(localState.equippedSkin)
      ? localState.equippedSkin
      : cloudEquippedSkin && mergedSkins.includes(cloudEquippedSkin)
      ? cloudEquippedSkin
      : 'classic_matthew';

  const newestCloudSaveTs = Math.max(
    bestCloudSnapshot.saveTs || 0,
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

  // Prevent stale offline earnings after a Rebirth or Admin Reset when switching devices
  let effectiveLastSaveTime =
    useCloudBase && newestCloudSaveTs > 0
      ? newestCloudSaveTs
      : localState.lastSaveTime || nowMs;

  if ((!hasAnyPassiveUpgrades && authCoins === 0) || forceCloudAfterReset) {
    effectiveLastSaveTime = nowMs;
  }

  const mergedPrestigeCount = forceCloudAfterReset
    ? 0
    : Math.max(
        typeof authoritativeSeason.prestigeCount === 'number'
          ? authoritativeSeason.prestigeCount
          : typeof authoritativeSeason.rebirthCount === 'number'
          ? authoritativeSeason.rebirthCount
          : 0,
        cloudMaxPrestigeCount,
        localInActiveSeason ? localState.prestigeCount || 0 : 0
      );

  const mergedPrestigeShards = forceCloudAfterReset
    ? 0
    : Math.max(
        typeof authoritativeSeason.prestigeShards === 'number'
          ? authoritativeSeason.prestigeShards
          : 0,
        cloudMaxPrestigeShards,
        localInActiveSeason ? localState.prestigeShards || 0 : 0
      );

  const mergedLifetimePrestigeShards = forceCloudAfterReset
    ? 0
    : Math.max(
        typeof authoritativeSeason.lifetimePrestigeShards === 'number'
          ? authoritativeSeason.lifetimePrestigeShards
          : mergedPrestigeShards,
        cloudMaxLifetimePrestigeShards,
        localInActiveSeason ? localState.lifetimePrestigeShards || 0 : 0
      );

  const mergedClicks = forceCloudAfterReset
    ? 0
    : Math.max(
        typeof authoritativeSeason.clicks === 'number' ? authoritativeSeason.clicks : 0,
        cloudMaxClicks,
        localInActiveSeason ? localState.clicks || 0 : 0
      );

  const mergedLifetimeCoins = forceCloudAfterReset
    ? 0
    : Math.max(
        typeof authoritativeSeason.lifetimeCoins === 'number'
          ? authoritativeSeason.lifetimeCoins
          : 0,
        typeof authoritativeSeason.seasonalScore === 'number'
          ? authoritativeSeason.seasonalScore
          : 0,
        localInActiveSeason ? localState.lifetimeCoins || 0 : 0
      );

  const mergedSeasonalScore = forceCloudAfterReset
    ? 0
    : Math.max(
        typeof authoritativeSeason.seasonalScore === 'number'
          ? authoritativeSeason.seasonalScore
          : 0,
        Math.floor(mergedLifetimeCoins),
        localInActiveSeason ? localState.seasonalScore || 0 : 0
      );

  const mergedRaw: Partial<GameState> = {
    ...localState,
    ...authoritativeSeason,
    coins: forceCloudAfterReset ? 0 : authCoins,
    lifetimeCoins: mergedLifetimeCoins,
    seasonalScore: mergedSeasonalScore,
    clicks: mergedClicks,
    criticalClicks: forceCloudAfterReset
      ? 0
      : Math.max(
          typeof authoritativeSeason.criticalClicks === 'number'
            ? authoritativeSeason.criticalClicks
            : 0,
          cloudMaxCritClicks,
          localInActiveSeason ? localState.criticalClicks || 0 : 0
        ),
    maxComboReached: forceCloudAfterReset
      ? 0
      : Math.max(
          typeof authoritativeSeason.maxComboReached === 'number'
            ? authoritativeSeason.maxComboReached
            : 0,
          cloudMaxComboReached,
          localState.maxComboReached || 0
        ),
    prestigeCount: mergedPrestigeCount,
    prestigeShards: mergedPrestigeShards,
    lifetimePrestigeShards: mergedLifetimePrestigeShards,
    upgrades: forceCloudAfterReset ? {} : authUpgrades,
    unlockedRealms: forceCloudAfterReset
      ? ['earth']
      : (Array.from(allUnlockedRealms) as GameState['unlockedRealms']),
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
    lifetimeAllSeasonsClicks: Math.max(maxCareerClicks, mergedClicks),
    lifetimeAllSeasonsCoins: Math.max(maxCareerCoins, mergedLifetimeCoins),
    goldenMatthewsClicked: forceCloudAfterReset
      ? 0
      : Math.max(
          typeof authoritativeSeason.goldenMatthewsClicked === 'number'
            ? authoritativeSeason.goldenMatthewsClicked
            : 0,
          cloudMaxGoldenClicked,
          localState.goldenMatthewsClicked || 0
        ),
    giantMatthewsClicked: forceCloudAfterReset
      ? 0
      : Math.max(
          typeof authoritativeSeason.giantMatthewsClicked === 'number'
            ? authoritativeSeason.giantMatthewsClicked
            : 0,
          cloudMaxGiantClicked,
          localState.giantMatthewsClicked || 0
        ),
    permanentAchievements: Array.from(allPermAch),
    unlockedAchievements: forceCloudAfterReset ? [] : Array.from(allUnlockedAchievements),
    claimedQuests: forceCloudAfterReset ? [] : Array.from(allClaimedQuests),
    currentSeasonId: activeSeasonId,
    lastOwnerUid: uid,
    lastSaveTime: effectiveLastSaveTime,
    settings: {
      ...localState.settings,
      ...(rtdbUser?.settings && typeof rtdbUser.settings === 'object' ? rtdbUser.settings : {}),
    },
  };

  let reconciled = sanitizeAndValidateGameState(mergedRaw);
  let recoveredFromCareerLoss = false;

  // One-time recovery for Marshallb78 (89nsfff2YtaEVcNTHUBDq22V4FW2) after the earlier
  // device-switch overwrite (322.2 Dc -> 2 No), using the higher career values preserved in RTDB.
  if (
    uid === MARSHALL_RECOVERY_UID &&
    activeSeasonId === 'season_1' &&
    !wasExplicitlyReset &&
    reconciled.lifetimeCoins < MARSHALL_RECOVERED_SCORE
  ) {
    const recoveredLifetime = Math.max(
      reconciled.lifetimeCoins,
      maxCareerCoins,
      MARSHALL_RECOVERED_SCORE
    );
    reconciled = sanitizeAndValidateGameState({
      ...reconciled,
      coins: Math.max(reconciled.coins, MARSHALL_RECOVERED_COINS),
      lifetimeCoins: recoveredLifetime,
      seasonalScore: Math.max(reconciled.seasonalScore, Math.floor(recoveredLifetime)),
      clicks: Math.max(reconciled.clicks, maxCareerClicks, MARSHALL_RECOVERED_CLICKS),
      lifetimeAllSeasonsCoins: Math.max(reconciled.lifetimeAllSeasonsCoins, recoveredLifetime),
      lifetimeAllSeasonsClicks: Math.max(
        reconciled.lifetimeAllSeasonsClicks,
        maxCareerClicks,
        MARSHALL_RECOVERED_CLICKS
      ),
      lastOwnerUid: uid,
      lastSaveTime: nowMs,
    });
    recoveredFromCareerLoss = true;
  }

  reconciled = {
    ...reconciled,
    lastOwnerUid: uid,
    lastSaveTime: recoveredFromCareerLoss ? nowMs : effectiveLastSaveTime,
  };

  // Only push back up if local state contributed newer gains or we recovered Marshallb78's score;
  // avoids redundant writes when cloud is already authoritative and unchanged.
  const shouldPushToCloud =
    recoveredFromCareerLoss ||
    !useCloudBase ||
    mergedSkins.length > (rtdbUser?.unlockedSkins?.length || 0);

  return {
    state: reconciled,
    shouldPushToCloud: !forceCloudAfterReset && shouldPushToCloud,
    recoveredFromCareerLoss,
  };
}

/**
 * Loads the player's profile and current seasonal progress from Firebase Realtime Database
 * BEFORE local state updates, offline earnings, or autosaves run.
 * - Deduplicates concurrent calls per UID.
 * - NEVER overwrites cloud if the RTDB network read failed/timed out.
 */
export async function loadAndReconcileCloudSave(
  uid: string,
  username: string,
  localState: GameState
): Promise<GameState> {
  if (!uid) return localState;

  const existingPromise = reconcileInFlightByUid.get(uid);
  if (existingPromise) {
    return existingPromise;
  }

  const work = (async (): Promise<GameState> => {
    const activeSeason = getActiveSeason();

    try {
      const [userRes, lbRes] = await Promise.all([
        rtdbRestGetWithStatus<Record<string, any>>(`users/${uid}`, 6500, 1),
        rtdbRestGetWithStatus<Record<string, any>>(
          `leaderboards/${activeSeason.seasonId}/${uid}`,
          6500,
          1
        ),
        refreshCloudBans(),
      ]);

      // If network read failed or timed out, NEVER treat as empty cloud and block overwriting cloud!
      if (!userRes.ok || !lbRes.ok) {
        blockedOverwriteUids.add(uid);
        return localState;
      }

      blockedOverwriteUids.delete(uid);
      verifiedInitialPullUids.add(uid);

      const rtdbUser = userRes.data;
      const rtdbLb = lbRes.data;

      const cloudUpdatedAt = Math.max(
        typeof rtdbUser?.updatedAtMs === 'number' ? rtdbUser.updatedAtMs : 0,
        typeof rtdbLb?.updatedAtMs === 'number' ? rtdbLb.updatedAtMs : 0
      );
      if (cloudUpdatedAt > 0) {
        lastKnownCloudUpdatedAtByUid.set(uid, cloudUpdatedAt);
      }

      const banRecord = getCachedBanRecord(uid, username);
      const resetRecord = getCachedResetRecord(uid);
      const wasExplicitlyReset =
        Boolean(rtdbUser?.resetAtMs) ||
        Boolean(rtdbLb?.isReset) ||
        Boolean(resetRecord) ||
        Boolean(banRecord);

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
        const cleanInitial =
          localState.lastOwnerUid && localState.lastOwnerUid !== uid
            ? getDefaultGameState()
            : localState;
        const taggedInitial: GameState = { ...cleanInitial, lastOwnerUid: uid };
        saveStateToCloud(uid, username, taggedInitial, true).catch(() => {});
        return taggedInitial;
      }

      if (banRecord) {
        const zeroedBannedState = sanitizeAndValidateGameState({
          ...localState,
          lastOwnerUid: uid,
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
        saveGame(zeroedBannedState, true);
        return zeroedBannedState;
      }

      const resetAtMs = Math.max(
        typeof rtdbUser?.resetAtMs === 'number' ? rtdbUser.resetAtMs : 0,
        resetRecord?.resetAtMs || 0
      );

      const { state: reconciled, shouldPushToCloud } = reconcileCloudAndLocalState({
        uid,
        username,
        localState,
        rtdbUser,
        rtdbLb,
        legacySources: [
          fsLb.exists ? fsLb.data : {},
          fsSeason.exists ? fsSeason.data : {},
          fsUser.exists ? fsUser.data : {},
        ],
        wasExplicitlyReset,
        resetAtMs,
        activeSeasonId: activeSeason.seasonId,
        nowMs: Date.now(),
      });

      saveGame(reconciled, true);

      if (shouldPushToCloud) {
        await saveStateToCloud(uid, username, reconciled, true).catch(() => {});
      }

      return reconciled;
    } catch (err) {
      console.warn('Cloud reconciliation fallback to local state:', err);
      blockedOverwriteUids.add(uid);
      return localState;
    } finally {
      reconcileInFlightByUid.delete(uid);
    }
  })();

  reconcileInFlightByUid.set(uid, work);
  return work;
}

/**
 * Synchronous keepalive flush when a tab/browser is closed or backgrounded.
 * Only executes if this session already completed a clean initial cloud pull.
 */
export function saveStateToCloudKeepalive(
  uid: string,
  username: string,
  state: GameState
): void {
  if (!uid || !username) return;
  if (!verifiedInitialPullUids.has(uid) || blockedOverwriteUids.has(uid)) return;
  if (getCachedBanRecord(uid, username)) return;

  const activeSeason = getActiveSeason();
  const nowMs = Date.now();
  const userPayload = buildUserCloudPayload(uid, username, state, nowMs, activeSeason.seasonId);
  rtdbRestWriteKeepalive(`users/${uid}`, userPayload, 'PUT');
  updateLeaderboardEntryKeepalive(uid, username, state, activeSeason.seasonId);
  lastKnownCloudUpdatedAtByUid.set(uid, nowMs);
}

/**
 * Persists player profile and seasonal progression directly to Firebase Realtime Database (`users/{uid}`)
 * and updates the Realtime Database Worldwide Leaderboard (`leaderboards/{seasonId}/{uid}`).
 * - Blocks writes if initial cloud pull hasn't completed yet or failed.
 * - Detects if another device saved more recently before overwriting cloud state.
 */
export async function saveStateToCloud(
  uid: string,
  username: string,
  state: GameState,
  force = false
): Promise<boolean> {
  if (!uid || !username) return false;
  if (getCachedBanRecord(uid, username)) return false;

  if (!verifiedInitialPullUids.has(uid) || blockedOverwriteUids.has(uid)) {
    return false;
  }

  const activeSeason = getActiveSeason();
  const playtimeBucket = Math.floor((state.totalPlaytimeSeconds || 0) / 20);
  const signature = `${Math.floor(state.lifetimeCoins)}_${Math.floor(state.coins)}_${Math.floor(state.clicks)}_${state.prestigeCount}_${state.equippedSkin}_${state.unlockedSkins.length}_${state.gems}_${state.lastDailyLoginClaimDate || ''}_${playtimeBucket}_${username}`;

  if (!force && lastSavedSignatureByUid.get(uid) === signature) {
    return true;
  }

  // Before doing a non-forced periodic overwrite, ensure another device hasn't jumped ahead!
  const lastCheck = lastSessionCheckAtByUid.get(uid) || 0;
  if (!force && Date.now() - lastCheck > 10000) {
    const foreignNewer = await hasForeignDeviceSavedMoreRecently(uid);
    if (foreignNewer) {
      if (foreignUpdateHandler) {
        foreignUpdateHandler(uid);
      }
      return false;
    }
  }

  const nowMs = Date.now();
  const userPayload = buildUserCloudPayload(uid, username, state, nowMs, activeSeason.seasonId);

  const [userOk, lbOk] = await Promise.all([
    rtdbRestWrite(`users/${uid}`, userPayload, 'PUT'),
    updateLeaderboardEntry(uid, username, state, activeSeason.seasonId, force),
  ]);

  if (userOk || lbOk) {
    lastSavedSignatureByUid.set(uid, signature);
    lastKnownCloudUpdatedAtByUid.set(uid, nowMs);
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

/**
 * Shared sign-in reconciliation helper used by AccountModal & EscMenuModal:
 * - Isolates any prior owner's localStorage save so signing into another account never leaks state.
 * - Pulls & merges cloud progress before pushing back to Firebase.
 */
export async function signInAndReconcileAccount(
  uid: string,
  username: string,
  currentState: GameState
): Promise<GameState> {
  const baseLocalState =
    currentState.lastOwnerUid && currentState.lastOwnerUid !== uid
      ? getDefaultGameState()
      : currentState;

  const merged = await loadAndReconcileCloudSave(uid, username, baseLocalState);
  const nextState: GameState = {
    ...merged,
    lastOwnerUid: uid,
    cloudAccount: {
      uid,
      username,
      displayUsername: username,
      lastCloudSync: Date.now(),
    },
  };
  saveGame(nextState, true);
  saveStateToCloud(uid, username, nextState, true).catch(() => {});
  return nextState;
}

/**
 * Shared bidirectional Sync helper used by Manual Sync buttons:
 * - Always retrieves & merges cloud progress FIRST so a stale device never overwrites newer progress.
 */
export async function syncAccountBidirectional(
  uid: string,
  username: string,
  currentState: GameState
): Promise<{ nextState: GameState; ok: boolean }> {
  const reconciled = await loadAndReconcileCloudSave(uid, username, currentState);
  const ok = await saveStateToCloud(uid, username, reconciled, true);
  const now = Date.now();
  const nextState: GameState = {
    ...reconciled,
    lastOwnerUid: uid,
    cloudAccount: currentState.cloudAccount
      ? {
          ...currentState.cloudAccount,
          uid,
          username,
          displayUsername: username,
          lastCloudSync: now,
        }
      : {
          uid,
          username,
          displayUsername: username,
          lastCloudSync: now,
        },
  };
  saveGame(nextState, true);
  return { nextState, ok };
}
