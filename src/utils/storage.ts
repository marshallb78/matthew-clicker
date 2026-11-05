import { GameState } from '../types/game';

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
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
    return true;
  } catch (err) {
    console.error('Failed to save game state to localStorage:', err);
    return false;
  }
}

export function loadGame(): GameState {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return getDefaultGameState();
    }
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return getDefaultGameState();

    const parsed = JSON.parse(raw);
    const def = getDefaultGameState();

    // Sanitize and migrate numbers to prevent NaN or negative balances
    const sanitized: GameState = {
      coins: Math.max(0, typeof parsed.coins === 'number' && !isNaN(parsed.coins) ? parsed.coins : def.coins),
      lifetimeCoins: Math.max(0, typeof parsed.lifetimeCoins === 'number' && !isNaN(parsed.lifetimeCoins) ? parsed.lifetimeCoins : def.lifetimeCoins),
      clicks: Math.max(0, typeof parsed.clicks === 'number' && !isNaN(parsed.clicks) ? parsed.clicks : def.clicks),
      criticalClicks: Math.max(0, typeof parsed.criticalClicks === 'number' && !isNaN(parsed.criticalClicks) ? parsed.criticalClicks : def.criticalClicks),
      combo: 0,
      comboTimer: 0,
      frenzyTimer: 0,
      frenzyMultiplier: 1,

      upgrades: parsed.upgrades && typeof parsed.upgrades === 'object' ? parsed.upgrades : def.upgrades,
      equippedSkin: typeof parsed.equippedSkin === 'string' ? parsed.equippedSkin : def.equippedSkin,
      unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0 ? parsed.unlockedSkins : def.unlockedSkins,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : def.unlockedAchievements,

      prestigeCount: Math.max(0, typeof parsed.prestigeCount === 'number' ? parsed.prestigeCount : def.prestigeCount),
      prestigeShards: Math.max(0, typeof parsed.prestigeShards === 'number' ? parsed.prestigeShards : def.prestigeShards),
      lifetimePrestigeShards: Math.max(0, typeof parsed.lifetimePrestigeShards === 'number' ? parsed.lifetimePrestigeShards : def.lifetimePrestigeShards),
      prestigeUpgrades: parsed.prestigeUpgrades && typeof parsed.prestigeUpgrades === 'object' ? parsed.prestigeUpgrades : def.prestigeUpgrades,

      lastSaveTime: typeof parsed.lastSaveTime === 'number' && !isNaN(parsed.lastSaveTime) ? parsed.lastSaveTime : Date.now(),
      totalPlaytimeSeconds: Math.max(0, typeof parsed.totalPlaytimeSeconds === 'number' ? parsed.totalPlaytimeSeconds : def.totalPlaytimeSeconds),
      goldenMatthewsClicked: Math.max(0, typeof parsed.goldenMatthewsClicked === 'number' ? parsed.goldenMatthewsClicked : def.goldenMatthewsClicked),

      settings: {
        ...def.settings,
        ...(parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : {}),
      },
    };

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

    const def = getDefaultGameState();
    const imported: GameState = {
      coins: Math.max(0, typeof parsed.coins === 'number' && !isNaN(parsed.coins) ? parsed.coins : 0),
      lifetimeCoins: Math.max(0, typeof parsed.lifetimeCoins === 'number' ? parsed.lifetimeCoins : 0),
      clicks: Math.max(0, typeof parsed.clicks === 'number' ? parsed.clicks : 0),
      criticalClicks: Math.max(0, typeof parsed.criticalClicks === 'number' ? parsed.criticalClicks : 0),
      combo: 0,
      comboTimer: 0,
      frenzyTimer: 0,
      frenzyMultiplier: 1,

      upgrades: parsed.upgrades && typeof parsed.upgrades === 'object' ? parsed.upgrades : {},
      equippedSkin: typeof parsed.equippedSkin === 'string' ? parsed.equippedSkin : def.equippedSkin,
      unlockedSkins: Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0 ? parsed.unlockedSkins : def.unlockedSkins,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],

      prestigeCount: Math.max(0, typeof parsed.prestigeCount === 'number' ? parsed.prestigeCount : 0),
      prestigeShards: Math.max(0, typeof parsed.prestigeShards === 'number' ? parsed.prestigeShards : 0),
      lifetimePrestigeShards: Math.max(0, typeof parsed.lifetimePrestigeShards === 'number' ? parsed.lifetimePrestigeShards : 0),
      prestigeUpgrades: parsed.prestigeUpgrades && typeof parsed.prestigeUpgrades === 'object' ? parsed.prestigeUpgrades : {},

      lastSaveTime: Date.now(),
      totalPlaytimeSeconds: Math.max(0, typeof parsed.totalPlaytimeSeconds === 'number' ? parsed.totalPlaytimeSeconds : 0),
      goldenMatthewsClicked: Math.max(0, typeof parsed.goldenMatthewsClicked === 'number' ? parsed.goldenMatthewsClicked : 0),
      settings: def.settings,
    };

    saveGame(imported);
    return imported;
  } catch (err) {
    throw new Error('Failed to import save code. Please ensure the code is valid.');
  }
}

export function clearSavedGame(): GameState {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    localStorage.removeItem(SAVE_KEY);
  }
  return getDefaultGameState();
}
