import { GameState } from '../types/game';
import { calculateCPS } from './calculations';
import { isValidSkinId, checkAndApplyMilestoneUnlocks } from '../data/skins';

const SAVE_KEY = 'matthew_clicker_save_v1';

export function getDefaultGameState(): GameState {
  return {
    coins: 0,
    lifetimeCoins: 0,
    clicks: 0,
    criticalClicks: 0,
    combo: 0,
    comboTimer: 0,
    frenzyTimer: 0,
    frenzyMultiplier: 1,

    upgrades: {},
    equippedSkin: 'classic_matthew',
    unlockedSkins: ['classic_matthew'],
    unlockedAchievements: [],

    prestigeCount: 0,
    prestigeShards: 0,
    lifetimePrestigeShards: 0,
    prestigeUpgrades: {},

    lastSaveTime: Date.now(),
    totalPlaytimeSeconds: 0,
    goldenMatthewsClicked: 0,

    settings: {
      masterVolume: 0.8,
      sfxVolume: 0.9,
      musicVolume: 0.4,
      isMuted: false,
      isMusicPlaying: false,
      reducedMotion: false,
      showParticles: true,
      theme: 'cyber',
    },
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
 * - Preserves legitimate unlocked skins.
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
  const clicks = Math.max(0, typeof parsed.clicks === 'number' && !isNaN(parsed.clicks) ? parsed.clicks : def.clicks);
  const criticalClicks = Math.max(
    0,
    typeof parsed.criticalClicks === 'number' && !isNaN(parsed.criticalClicks) ? parsed.criticalClicks : def.criticalClicks
  );
  const upgrades = parsed.upgrades && typeof parsed.upgrades === 'object' ? parsed.upgrades : def.upgrades;
  const unlockedAchievements = Array.isArray(parsed.unlockedAchievements)
    ? parsed.unlockedAchievements
    : def.unlockedAchievements;

  const prestigeCount = Math.max(
    0,
    typeof parsed.prestigeCount === 'number' && !isNaN(parsed.prestigeCount) ? parsed.prestigeCount : def.prestigeCount
  );
  const prestigeShards = Math.max(
    0,
    typeof parsed.prestigeShards === 'number' && !isNaN(parsed.prestigeShards) ? parsed.prestigeShards : def.prestigeShards
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
  const settings = {
    ...def.settings,
    ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
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
  // If the equipped skin is locked, missing, or invalid, safely fall back to Classic Matthew.
  const hasValidEquippedSkin =
    typeof parsed.equippedSkin === 'string' &&
    isValidSkinId(parsed.equippedSkin) &&
    validUnlockedSkins.includes(parsed.equippedSkin);

  const initialEquippedSkin = hasValidEquippedSkin ? parsed.equippedSkin : 'classic_matthew';

  const baseState: GameState = {
    coins,
    lifetimeCoins,
    clicks,
    criticalClicks,
    combo: 0,
    comboTimer: 0,
    frenzyTimer: 0,
    frenzyMultiplier: 1,

    upgrades,
    equippedSkin: initialEquippedSkin,
    unlockedSkins: validUnlockedSkins,
    unlockedAchievements,

    prestigeCount,
    prestigeShards,
    lifetimePrestigeShards,
    prestigeUpgrades,

    lastSaveTime,
    totalPlaytimeSeconds,
    goldenMatthewsClicked,
    settings,
  };

  // 4. Recalculate milestone eligibility using existing progression rules.
  // Automatically unlock newly earned skins.
  // Only auto-equip on load if the save did not already have a valid equipped skin
  // (e.g. if the equipped skin was missing/invalid/locked, or newly migrating).
  // If the player already had a legitimate equipped skin, preserve their choice across refreshes.
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

    // Persist sanitized state so corrections are saved
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
    version: '1.0',
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
