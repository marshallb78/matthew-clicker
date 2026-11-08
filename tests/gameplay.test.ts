import { describe, it, expect, beforeEach } from 'vitest';
import {
  getDefaultGameState,
  performSeasonalRollover,
  performBetaWipeIfDue,
} from '../src/utils/storage';
import {
  getUpgradeCost,
  getBulkUpgradeCost,
  getMaxAffordableUpgrade,
  calculateClickPower,
  calculateCPS,
  calculateOfflineEarnings,
  calculateGiantMatthewClickReward,
} from '../src/utils/calculations';
import { calculatePrestigeShards, getAscensionMultiplier } from '../src/data/prestige';
import { UPGRADES } from '../src/data/upgrades';
import {
  SKINS,
  ALL_SKINS,
  PUBLIC_VIEWABLE_SKINS,
  MATTHEW_STORM_SKINS,
  CHARACTER_SKINS,
} from '../src/data/skins';
import { BALANCE } from '../src/data/balance';
import {
  GEM_ECONOMY_CONFIG,
  MATTHEW_STORM_CONFIG,
  FRIDAY_BONUS_CONFIG,
  BETA_RESET_CONFIG,
} from '../src/config/gameConfig';
import {
  isFridayBonusActive,
  evaluateMatthewStormState,
} from '../src/utils/scheduleEngine';
import { formatTime } from '../src/utils/formatters';
import { validateUsernameFormat } from '../src/firebase/auth';

describe('Matthew Clicker v1.1 Core & Mega Build Gameplay Tests', () => {
  let state = getDefaultGameState();

  beforeEach(() => {
    state = getDefaultGameState();
  });

  describe('Economy, Ascension Multiplier & Calculations', () => {
    it('calculates initial click power and zero CPS correctly', () => {
      const { totalPower, critChance, comboMultiplier, ascensionMultiplier } =
        calculateClickPower(state);
      expect(totalPower).toBe(BALANCE.click.basePower);
      expect(critChance).toBeCloseTo(BALANCE.click.baseCritChance);
      expect(comboMultiplier).toBe(1.0);
      expect(ascensionMultiplier).toBe(1);

      const cps = calculateCPS(state);
      expect(cps).toBe(0);
    });

    it('calculates upgrade costs with exponential scaling', () => {
      const upgrade = UPGRADES[0];
      const cost0 = getUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, 0);
      const cost1 = getUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, 1);
      const cost2 = getUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, 2);

      expect(cost0).toBe(upgrade.baseCost);
      expect(cost1).toBeGreaterThan(cost0);
      expect(cost2).toBeGreaterThan(cost1);
    });

    it('calculates bulk upgrade costs accurately', () => {
      const upgrade = UPGRADES[0];
      const single = getUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, 0);
      const bulk10 = getBulkUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, 0, 10);

      expect(bulk10.actualCount).toBe(10);
      expect(bulk10.totalCost).toBeGreaterThan(single * 10);
    });

    it('calculates max affordable upgrades without exceeding coins', () => {
      const upgrade = UPGRADES[0];
      const coins = 1000;
      const maxInfo = getMaxAffordableUpgrade(upgrade.baseCost, upgrade.costMultiplier, 0, coins);

      expect(maxInfo.count).toBeGreaterThan(0);
      expect(maxInfo.totalCost).toBeLessThanOrEqual(coins);
    });

    it('scales click power and CPS with Capybara-style Ascension Multiplier (+0.05 per step), Friday 2x, and Storm Wave multipliers', () => {
      state.upgrades['finger_exercise'] = 3; // base click = 1 + 3*3 = 10, base CPS = 3*0.5 = 1.5
      state.upgrades['energy_coffee'] = 5; // base CPS = 1.5 + 5*3 = 16.5, +5*12 = 60 click power -> total base click = 70
      state.prestigeShards = 40; // Ascension Multiplier = 1 + 40 * 0.05 = 3.0x

      const normalClick = calculateClickPower(state);
      const normalCps = calculateCPS(state);
      expect(normalClick.ascensionMultiplier).toBe(3);
      expect(normalClick.totalPower).toBe(210); // 70 * 3x
      expect(normalCps).toBeCloseTo(49.5); // 16.5 * 3x

      // Stack Friday 2x + 10x Storm Wave = 20x live multiplier on top of 3x Ascension Multiplier
      const liveOpts = { fridayBonusActive: true, stormWaveMultiplier: 10 };
      const boostedClick = calculateClickPower(state, liveOpts);
      const boostedCps = calculateCPS(state, liveOpts);

      expect(boostedClick.totalPower).toBe(4200); // 210 * 2 * 10
      expect(boostedCps).toBeCloseTo(990.0); // 49.5 * 2 * 10

      const giantReward = calculateGiantMatthewClickReward(state, liveOpts);
      expect(giantReward).toBeGreaterThan(boostedClick.totalPower);
    });
  });

  describe('Rebirth (Capybara Clicker Style Ascension Multiplier: +0.05 per step)', () => {
    it('returns 0 bonus if lifetime coins are below requirement (1M)', () => {
      expect(calculatePrestigeShards(500000)).toBe(0);
      expect(getAscensionMultiplier(0)).toBe(1);
    });

    it('calculates Ascension Multiplier bonus in +0.05 steps at 1M and prevents runaway scaling at 1T/1Qa', () => {
      expect(calculatePrestigeShards(1000000)).toBe(1);
      expect(calculatePrestigeShards(4000000)).toBe(2);
      expect(getAscensionMultiplier(1)).toBe(1.05);
      expect(getAscensionMultiplier(2)).toBe(1.1);
      // Even at 1 Quadrillion (1e15) lifetime coins, multiplier stays controlled (< 5.0x)
      const qaShards = calculatePrestigeShards(1e15);
      expect(getAscensionMultiplier(qaShards)).toBeLessThan(5.0);
    });
  });

  describe('Day-Based Countdown Formatting', () => {
    it('formats durations >= 24 hours into days (Xd Xh Xm)', () => {
      const hours160 = 160 * 3600;
      expect(formatTime(hours160)).toBe('6d 16h 0m');
      expect(formatTime(3665)).toBe('1h 1m');
    });
  });

  describe('Uncapped Offline Earnings & Zero Offline Gems', () => {
    it('calculates uncapped offline coins even past 24 hours and awards 0 gems', () => {
      state.upgrades['autoclicker_bot'] = 10;
      state.lastSaveTime = Date.now() - 3600 * 24 * 1000;
      const nowSec = Math.floor(Date.now() / 1000);

      const { elapsedSeconds, coinsEarned, gemsEarned } = calculateOfflineEarnings(state, nowSec);
      expect(elapsedSeconds).toBeGreaterThanOrEqual(86399);
      expect(coinsEarned).toBeGreaterThan(0);
      expect(gemsEarned).toBe(0);
    });

    it('discards offline coin carryover across a season boundary', () => {
      state.upgrades['autoclicker_bot'] = 10;
      state.currentSeasonId = 'season_1';
      state.lastSaveTime = Date.now() - 3600 * 5 * 1000;
      const nowSec = Math.floor(Date.now() / 1000);

      const { elapsedSeconds, coinsEarned, gemsEarned } = calculateOfflineEarnings(
        state,
        nowSec,
        'season_2'
      );
      expect(elapsedSeconds).toBe(0);
      expect(coinsEarned).toBe(0);
      expect(gemsEarned).toBe(0);
    });
  });

  describe('Gem Economy, Friday 2x & Matthew Storm Schedule', () => {
    it('configures exact gem economy rates and 7s Giant Matthew duration', () => {
      expect(GEM_ECONOMY_CONFIG.normalGemsPerInterval).toBe(3);
      expect(GEM_ECONOMY_CONFIG.normalIntervalSeconds).toBe(600);
      expect(GEM_ECONOMY_CONFIG.stormGemsPerInterval).toBe(10);
      expect(GEM_ECONOMY_CONFIG.stormIntervalSeconds).toBe(600);
      expect(GEM_ECONOMY_CONFIG.dailyLoginGems).toBe(5);
      expect(GEM_ECONOMY_CONFIG.offlineGems).toBe(0);
      expect(GEM_ECONOMY_CONFIG.stormSkinCostGems).toBe(50);
      expect(MATTHEW_STORM_CONFIG.giantMatthewDurationSeconds).toBeGreaterThanOrEqual(5);
      expect(MATTHEW_STORM_CONFIG.giantMatthewDurationSeconds).toBeLessThanOrEqual(10);
      expect(MATTHEW_STORM_SKINS.length).toBe(5);
    });

    it('detects Friday 2x points bonus on Friday in America/New_York including Nov 13, 2026', () => {
      expect(FRIDAY_BONUS_CONFIG.multiplier).toBe(2);
      const fridayNov13 = Date.parse('2026-11-13T12:00:00-05:00');
      const thursdayNov12 = Date.parse('2026-11-12T12:00:00-05:00');
      expect(isFridayBonusActive(fridayNov13)).toBe(true);
      expect(isFridayBonusActive(thursdayNov12)).toBe(false);
    });

    it('evaluates Matthew Storm schedule for Nov 13, 2026 1:50 PM – 2:00 PM EST and test simulation', () => {
      expect(MATTHEW_STORM_CONFIG.startIso).toBe('2026-11-13T13:50:00-05:00');
      expect(MATTHEW_STORM_CONFIG.endIso).toBe('2026-11-13T14:00:00-05:00');
      expect(UPGRADES.length).toBe(14);
      // Every upgrade prioritizes Click Power over passive CPS
      UPGRADES.forEach((u) => {
        expect(u.baseClickPower).toBeGreaterThan(u.baseCps);
      });

      const startMs = Date.parse(MATTHEW_STORM_CONFIG.startIso);
      const endMs = Date.parse(MATTHEW_STORM_CONFIG.endIso);

      const pre5s = evaluateMatthewStormState(startMs - 5000, null);
      expect(pre5s.status).toBe('fullscreen_10s_countdown');
      expect(pre5s.secondsUntilStart).toBe(5);

      const during = evaluateMatthewStormState(startMs + 60_000, null);
      expect(during.status).toBe('active');
      expect(during.shopOpen).toBe(true);

      const after = evaluateMatthewStormState(endMs + 10_000, null);
      expect(after.status).toBe('ended');
      expect(after.shopOpen).toBe(false);
    });
  });

  describe('30-Day Seasonal Rollover & Permanent Ownership', () => {
    it('resets seasonal coins, upgrades, and rebirths while preserving all skins and gems', () => {
      state.coins = 999999;
      state.lifetimeCoins = 5000000;
      state.seasonalScore = 5000000;
      state.prestigeCount = 4;
      state.prestigeShards = 50;
      state.unlockedSkins = ['classic_matthew', 'god_matthew', 'matthew_storm_skin_1', 'mathjew'];
      state.equippedSkin = 'matthew_storm_skin_1';
      state.gems = 135;

      const rolled = performSeasonalRollover(state, 'season_2');
      expect(rolled.currentSeasonId).toBe('season_2');
      expect(rolled.coins).toBe(0);
      expect(rolled.seasonalScore).toBe(0);
      expect(rolled.prestigeCount).toBe(0);

      expect(rolled.unlockedSkins).toEqual([
        'classic_matthew',
        'god_matthew',
        'matthew_storm_skin_1',
        'mathjew',
      ]);
      expect(rolled.equippedSkin).toBe('matthew_storm_skin_1');
      expect(rolled.gems).toBe(135);
      expect(rolled.seasonHistory.length).toBe(1);
    });
  });

  describe('Account Username Validation', () => {
    it('validates 3-20 alphanumeric/underscore usernames and rejects invalid ones', () => {
      expect(validateUsernameFormat('Matthew_99')).toBeNull();
      expect(validateUsernameFormat('ab')).not.toBeNull();
      expect(validateUsernameFormat('bad space')).not.toBeNull();
    });
  });

  describe('Main Point Skins, Super-Rare Mathjew (Mathgoon Removed) & 5 Secret Storm Skins', () => {
    it('has 11 main point-based skins, cosmetic-only stats, super-rare Mathjew, no Mathgoon, and 5 secret Storm skins', () => {
      expect(SKINS.length).toBe(11);
      expect(ALL_SKINS.length).toBe(18);
      // PUBLIC_VIEWABLE_SKINS hides the 5 secret Storm Event skins
      expect(PUBLIC_VIEWABLE_SKINS.length).toBe(13);
      MATTHEW_STORM_SKINS.forEach((stormSkin) => {
        expect(PUBLIC_VIEWABLE_SKINS.some((s) => s.id === stormSkin.id)).toBe(false);
      });

      // Every skin is purely cosmetic swag (no stat boost) and uses transparent .png
      ALL_SKINS.forEach((skin) => {
        expect(skin.clickBonusMultiplier).toBe(1.0);
        expect(skin.cpsBonusMultiplier).toBe(1.0);
        expect(skin.critBonusChance).toBe(0);
        expect(skin.bruisedImage).toBeUndefined();
        expect(skin.image.endsWith('.png')).toBe(true);
      });

      const mathjew = CHARACTER_SKINS.find((s) => s.id === 'mathjew');
      const mathgoon = CHARACTER_SKINS.find((s) => s.id === 'mathgoon');
      expect(mathjew).toBeDefined();
      expect(mathjew?.milestone.target).toBeGreaterThanOrEqual(1e15);
      expect(mathgoon).toBeUndefined();
    });
  });

  describe('Monday 1:00 AM Beta Reset Enforcement', () => {
    it('wipes all progress (including guests and accounts) once Monday 1:00 AM hits and only wipes once', () => {
      state.coins = 500000000;
      state.lifetimeCoins = 500000000;
      state.unlockedSkins = ['classic_matthew', 'sigma_matthew', 'god_matthew'];
      state.equippedSkin = 'god_matthew';
      state.gems = 95;
      state.prestigeCount = 8;
      state.prestigeShards = 15;
      state.lastBetaWipeId = null;

      // Before Monday 1:00 AM: no wipe
      const preWipe = performBetaWipeIfDue(state, BETA_RESET_CONFIG.resetTimeMs - 60000);
      expect(preWipe.wiped).toBe(false);
      expect(preWipe.state.coins).toBe(500000000);

      // At/After Monday 1:00 AM: full progress wipe
      const postWipe = performBetaWipeIfDue(state, BETA_RESET_CONFIG.resetTimeMs + 1000);
      expect(postWipe.wiped).toBe(true);
      expect(postWipe.state.coins).toBe(0);
      expect(postWipe.state.lifetimeCoins).toBe(0);
      expect(postWipe.state.gems).toBe(0);
      expect(postWipe.state.prestigeCount).toBe(0);
      expect(postWipe.state.unlockedSkins).toEqual(['classic_matthew']);
      expect(postWipe.state.equippedSkin).toBe('classic_matthew');
      expect(postWipe.state.lastBetaWipeId).toBe(BETA_RESET_CONFIG.wipeId);

      // Subsequent logins after wipe do not wipe new post-1AM progress
      postWipe.state.coins = 12345;
      const secondCheck = performBetaWipeIfDue(postWipe.state, BETA_RESET_CONFIG.resetTimeMs + 90000);
      expect(secondCheck.wiped).toBe(false);
      expect(secondCheck.state.coins).toBe(12345);
    });
  });
});
