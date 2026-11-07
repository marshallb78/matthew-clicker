import { GameState, RealmId } from '../types/game';
import { calculateCPS } from './calculations';
import { isValidSkinId, checkAndApplyMilestoneUnlocks } from '../data/skins';
import { getActiveSeason, getAuthoritativeDateString } from './scheduleEngine';
import { MATTHEW_STORM_CONFIG } from '../config/gameConfig';

const SAVE_KEY = 'matthew_clicker_save_v1';

const VALID_REALMS: RealmId[] = ['earth', 'under', 'ocean', 'space', 'uper'];

export function getDefaultGameState(): GameState {
  const activeSeason = getActiveSeason();
  return {
    coins: 0,
    lifetimeCoins: 0,
    seasonalScore: 0,
    clicks: 0,
    criticalClicks: 0,
    combo: 0,
    comboTimer: 0,
    frenzyTimer: 0,
    frenzyMultiplier: 1,
    maxComboReached: 0,

    upgrades: {},
    currentRealm: 'earth',
    unlockedRealms: ['earth'],
    uperCompleted: false,
    uperCompletionModalDismissed: false,

    equippedSkin: 'classic_matthew',
    unlockedSkins: ['classic_matthew'],

    unlockedAchievements: [],
    permanentAchievements: [],
    claimedQuests: [],
    lastDailyQuestResetDate: getAuthoritativeDateString(),

    prestigeCount: 0,
    prestigeShards: 0,
    lifetimePrestigeShards: 0,
    prestigeUpgrades: {},

    gems: 0,
    lifetimeGems: 0,
    activePlaySecondsAccumulated: 0,
    stormActiveSecondsAccumulated: 0,
    lastActiveInputTimestamp: Date.now(),
    lastDailyLoginClaimDate: null,

    currentSeasonId: activeSeason.seasonId,
    seasonHistory: [],
    eventStats: {
      eventId: MATTHEW_STORM_CONFIG.eventId,
      activeSeconds: 0,
      gemsEarned: 0,
      giantMatthewsClicked: 0,
      giantMatthewRewardsCoins: 0,
      stormSkinsPurchased: [],
    },

    lastSaveTime: Date.now(),
    totalPlaytimeSeconds: 0,
    lifetimeAllSeasonsCoins: 0,
    lifetimeAllSeasonsClicks: 0,
    goldenMatthewsClicked: 0,
    giantMatthewsClicked: 0,
    introCutsceneSeen: false,
    discoveredEasterEggs: [],
    cloudAccount: null,

    settings: {
      masterVolume: 0.8,
      sfxVolume: 0.9,
      musicVolume: 0.45,
      isMuted: false,
      isMusicPlaying: true,
      reducedMotion: false,
      showParticles: true,
      theme: 'cyber',
    },
  };
}

/**
 * Resets seasonal progression at a 30-day season boundary while preserving
 * permanent skins, gems, lifetime stats, permanent achievements, and season history.
 */
export function performSeasonalRollover(
  state: GameState,
  newSeasonId: string,
  wasChampion = false
): GameState {
  const unlockedRealms = state.unlockedRealms || ['earth'];
  const realmPriority: RealmId[] = ['uper', 'space', 'ocean', 'under', 'earth'];
  const highestRealm = realmPriority.find((r) => unlockedRealms.includes(r)) || 'earth';
  const prevSeasonNum = parseInt((state.currentSeasonId || 'season_1').replace('season_', ''), 10) || 1;

  const nextUnlockedSkins = wasChampion && !state.unlockedSkins.includes('champion_matthew')
    ? [...state.unlockedSkins, 'champion_matthew']
    : state.unlockedSkins;

  return {
    ...state,
    coins: 0,
    lifetimeCoins: 0,
    seasonalScore: 0,
    clicks: 0,
    criticalClicks: 0,
    combo: 0,
    comboTimer: 0,
    frenzyTimer: 0,
    frenzyMultiplier: 1,
    maxComboReached: 0,

    upgrades: {},
    currentRealm: 'earth',
    unlockedRealms: ['earth'],
    uperCompleted: false,
    uperCompletionModalDismissed: false,

    unlockedSkins: nextUnlockedSkins,
    equippedSkin: wasChampion ? 'champion_matthew' : state.equippedSkin,

    unlockedAchievements: [],
    claimedQuests: [],

    prestigeCount: 0,
    prestigeShards: 0,
    lifetimePrestigeShards: 0,
    prestigeUpgrades: {},

    currentSeasonId: newSeasonId,
    seasonHistory: [
      ...(state.seasonHistory || []),
      {
        seasonId: state.currentSeasonId || 'season_1',
        seasonNumber: prevSeasonNum,
        finalScore: Math.max(state.seasonalScore || 0, Math.floor(state.lifetimeCoins || 0)),
        finalRebirths: state.prestigeCount || 0,
        highestRealm,
        endedAt: Date.now(),
        wasChampion,
      },
    ],
    // Discard uncollected previous-season offline earnings
    lastSaveTime: Date.now(),
  };
}

export function saveGame(state: GameState): boolean {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return false;
    }
    const toSave: GameState = {
      ...state,
      lastSaveTime: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
    return true;
  } catch (err) {
    console.error('Failed to save game state to localStorage:', err);
    return false;
  }
}

/**
 * Safely sanitizes, migrates, and validates a parsed save object.
 * - Preserves legitimate unlocked skins and permanent currencies (Gems).
 * - Validates equipped skin against the unlocked collection; falls back to Classic Matthew if invalid/locked.
 * - NEVER grants a skin solely because an old save claims it is equipped.
 * - Recalculates milestone eligibility and unlocks/equips newly earned skins.
 * - Leaves coins, upgrades, achievements, and prestige stats intact without data loss.
 */
export function sanitizeAndValidateGameState(parsed: any): GameState {
  const def = getDefaultGameState();
  if (!parsed || typeof parsed !== 'object') {
    return def;
  }

  // 1. Sanitize raw numeric and object stats safely
  const coins = Math.max(0, typeof parsed.coins === 'number' && !isNaN(parsed.coins) ? parsed.coins : def.coins);
  const lifetimeCoins = Math.max(
    0,
    typeof parsed.lifetimeCoins === 'number' && !isNaN(parsed.lifetimeCoins)
      ? parsed.lifetimeCoins
      : Math.max(coins, def.lifetimeCoins)
  );
  const seasonalScore = Math.max(
    Math.floor(lifetimeCoins),
    typeof parsed.seasonalScore === 'number' && !isNaN(parsed.seasonalScore) ? Math.floor(parsed.seasonalScore) : 0
  );
  const clicks = Math.max(0, typeof parsed.clicks === 'number' && !isNaN(parsed.clicks) ? parsed.clicks : def.clicks);
  const criticalClicks = Math.max(
    0,
    typeof parsed.criticalClicks === 'number' && !isNaN(parsed.criticalClicks)
      ? parsed.criticalClicks
      : def.criticalClicks
  );
  const maxComboReached = Math.max(
    0,
    typeof parsed.maxComboReached === 'number' && !isNaN(parsed.maxComboReached) ? parsed.maxComboReached : 0
  );
  const upgrades = parsed.upgrades && typeof parsed.upgrades === 'object' ? parsed.upgrades : def.upgrades;
  const unlockedAchievements = Array.isArray(parsed.unlockedAchievements)
    ? parsed.unlockedAchievements
    : def.unlockedAchievements;
  const permanentAchievements = Array.isArray(parsed.permanentAchievements)
    ? parsed.permanentAchievements
    : def.permanentAchievements;
  const claimedQuests = Array.isArray(parsed.claimedQuests) ? parsed.claimedQuests : [];

  const prestigeCount = Math.max(
    0,
    typeof parsed.prestigeCount === 'number' && !isNaN(parsed.prestigeCount) ? parsed.prestigeCount : def.prestigeCount
  );
  const prestigeShards = Math.max(
    0,
    typeof parsed.prestigeShards === 'number' && !isNaN(parsed.prestigeShards)
      ? parsed.prestigeShards
      : def.prestigeShards
  );
  const lifetimePrestigeShards = Math.max(
    0,
    typeof parsed.lifetimePrestigeShards === 'number' && !isNaN(parsed.lifetimePrestigeShards)
      ? parsed.lifetimePrestigeShards
      : def.lifetimePrestigeShards
  );
  const prestigeUpgrades =
    parsed.prestigeUpgrades && typeof parsed.prestigeUpgrades === 'object'
      ? parsed.prestigeUpgrades
      : def.prestigeUpgrades;

  // Realms
  let unlockedRealms: RealmId[] = ['earth'];
  if (Array.isArray(parsed.unlockedRealms)) {
    const validR = parsed.unlockedRealms.filter((r: unknown): r is RealmId =>
      typeof r === 'string' && VALID_REALMS.includes(r as RealmId)
    );
    unlockedRealms = Array.from(new Set<RealmId>(['earth', ...validR]));
  }
  const currentRealm: RealmId =
    typeof parsed.currentRealm === 'string' && unlockedRealms.includes(parsed.currentRealm as RealmId)
      ? (parsed.currentRealm as RealmId)
      : 'earth';

  // Gems & Active Play
  const gems = Math.max(0, typeof parsed.gems === 'number' && !isNaN(parsed.gems) ? Math.floor(parsed.gems) : 0);
  const lifetimeGems = Math.max(
    gems,
    typeof parsed.lifetimeGems === 'number' && !isNaN(parsed.lifetimeGems) ? Math.floor(parsed.lifetimeGems) : gems
  );
  const activePlaySecondsAccumulated = Math.max(
    0,
    typeof parsed.activePlaySecondsAccumulated === 'number' && !isNaN(parsed.activePlaySecondsAccumulated)
      ? parsed.activePlaySecondsAccumulated
      : 0
  );
  const stormActiveSecondsAccumulated = Math.max(
    0,
    typeof parsed.stormActiveSecondsAccumulated === 'number' && !isNaN(parsed.stormActiveSecondsAccumulated)
      ? parsed.stormActiveSecondsAccumulated
      : 0
  );

  const lastSaveTime =
    typeof parsed.lastSaveTime === 'number' && !isNaN(parsed.lastSaveTime) ? parsed.lastSaveTime : Date.now();
  const totalPlaytimeSeconds = Math.max(
    0,
    typeof parsed.totalPlaytimeSeconds === 'number' && !isNaN(parsed.totalPlaytimeSeconds)
      ? parsed.totalPlaytimeSeconds
      : def.totalPlaytimeSeconds
  );
  const goldenMatthewsClicked = Math.max(
    0,
    typeof parsed.goldenMatthewsClicked === 'number' && !isNaN(parsed.goldenMatthewsClicked)
      ? parsed.goldenMatthewsClicked
      : def.goldenMatthewsClicked
  );
  const giantMatthewsClicked = Math.max(
    0,
    typeof parsed.giantMatthewsClicked === 'number' && !isNaN(parsed.giantMatthewsClicked)
      ? parsed.giantMatthewsClicked
      : 0
  );

  const settings = {
    ...def.settings,
    ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
    isMusicPlaying: true,
  };

  // 2. Preserve legitimate unlocked skins, strictly discarding non-existent IDs.
  // Classic Matthew is always unlocked.
  let validUnlockedSkins: string[] = ['classic_matthew'];
  if (Array.isArray(parsed.unlockedSkins)) {
    const legitimate = parsed.unlockedSkins.filter(
      (id: unknown): id is string => typeof id === 'string' && isValidSkinId(id)
    );
    validUnlockedSkins = Array.from(new Set(['classic_matthew', ...legitimate]));
  }

  // 3. Validate equipped skin against legitimate unlocked collection.
  // NEVER grant a skin solely because an old save claims it was equipped.
  const hasValidEquippedSkin =
    typeof parsed.equippedSkin === 'string' &&
    isValidSkinId(parsed.equippedSkin) &&
    validUnlockedSkins.includes(parsed.equippedSkin);

  const initialEquippedSkin = hasValidEquippedSkin ? parsed.equippedSkin : 'classic_matthew';

  const baseState: GameState = {
    coins,
    lifetimeCoins,
    seasonalScore,
    clicks,
    criticalClicks,
    combo: 0,
    comboTimer: 0,
    frenzyTimer: 0,
    frenzyMultiplier: 1,
    maxComboReached,

    upgrades,
    currentRealm,
    unlockedRealms,
    uperCompleted: Boolean(parsed.uperCompleted || unlockedRealms.includes('uper')),
    uperCompletionModalDismissed: Boolean(parsed.uperCompletionModalDismissed),

    equippedSkin: initialEquippedSkin,
    unlockedSkins: validUnlockedSkins,

    unlockedAchievements,
    permanentAchievements,
    claimedQuests,
    lastDailyQuestResetDate:
      typeof parsed.lastDailyQuestResetDate === 'string'
        ? parsed.lastDailyQuestResetDate
        : getAuthoritativeDateString(),

    prestigeCount,
    prestigeShards,
    lifetimePrestigeShards,
    prestigeUpgrades,

    gems,
    lifetimeGems,
    activePlaySecondsAccumulated,
    stormActiveSecondsAccumulated,
    lastActiveInputTimestamp: Date.now(),
    lastDailyLoginClaimDate:
      typeof parsed.lastDailyLoginClaimDate === 'string' ? parsed.lastDailyLoginClaimDate : null,

    currentSeasonId:
      typeof parsed.currentSeasonId === 'string' ? parsed.currentSeasonId : def.currentSeasonId,
    seasonHistory: Array.isArray(parsed.seasonHistory) ? parsed.seasonHistory : [],
    eventStats:
      parsed.eventStats && typeof parsed.eventStats === 'object'
        ? { ...def.eventStats, ...parsed.eventStats }
        : def.eventStats,

    lastSaveTime,
    totalPlaytimeSeconds,
    lifetimeAllSeasonsCoins: Math.max(
      lifetimeCoins,
      typeof parsed.lifetimeAllSeasonsCoins === 'number' ? parsed.lifetimeAllSeasonsCoins : 0
    ),
    lifetimeAllSeasonsClicks: Math.max(
      clicks,
      typeof parsed.lifetimeAllSeasonsClicks === 'number' ? parsed.lifetimeAllSeasonsClicks : 0
    ),
    goldenMatthewsClicked,
    giantMatthewsClicked,
    selectedEnvironment: parsed.selectedEnvironment,
    introCutsceneSeen: Boolean(parsed.introCutsceneSeen),
    discoveredEasterEggs: Array.isArray(parsed.discoveredEasterEggs) ? parsed.discoveredEasterEggs : [],
    cloudAccount: parsed.cloudAccount && typeof parsed.cloudAccount === 'object' ? parsed.cloudAccount : null,
    settings,
  };

  // 4. Recalculate milestone eligibility using existing progression rules.
  const currentCps = calculateCPS(baseState);
  const shouldAutoEquip = !hasValidEquippedSkin;
  const { state: reconciledState } = checkAndApplyMilestoneUnlocks(baseState, currentCps, shouldAutoEquip);

  return reconciledState;
}

export function loadGame(): GameState {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return getDefaultGameState();
    }
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return getDefaultGameState();

    const parsed = JSON.parse(raw);
    const sanitized = sanitizeAndValidateGameState(parsed);

    saveGame(sanitized);
    return sanitized;
  } catch (err) {
    console.error('Save file corrupted, recovering default game state:', err);
    return getDefaultGameState();
  }
}

export function exportSaveString(state: GameState): string {
  const json = JSON.stringify({
    ...state,
    exportTimestamp: Date.now(),
    version: '1.1',
  });
  return btoa(encodeURIComponent(json));
}

export function importSaveString(encoded: string): GameState {
  try {
    const json = decodeURIComponent(atob(encoded.trim()));
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Invalid save data format.');
    }

    const imported = sanitizeAndValidateGameState(parsed);
    saveGame(imported);
    return imported;
  } catch (err: unknown) {
    if ((err as Error)?.message === 'Invalid save data format.') {
      throw err;
    }
    throw new Error('Failed to import save code. Please ensure the code is valid.');
  }
}

export function clearSavedGame(): GameState {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    window.localStorage.removeItem(SAVE_KEY);
  }
  return getDefaultGameState();
}
