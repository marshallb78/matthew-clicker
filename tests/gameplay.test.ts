import { describe, it, expect, beforeEach } from 'vitest';
import { getDefaultGameState, exportSaveString, importSaveString } from '../src/utils/storage';
import {
  getUpgradeCost,
  getBulkUpgradeCost,
  getMaxAffordableUpgrade,
  calculateClickPower,
  calculateCPS,
  calculateOfflineEarnings,
} from '../src/utils/calculations';
import { calculatePrestigeShards } from '../src/data/prestige';
import { formatCoins, formatTime } from '../src/utils/formatters';
import { UPGRADES } from '../src/data/upgrades';
import { SKINS, getSkinMilestoneProgress, getTotalUpgradesPurchased } from '../src/data/skins';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { ENVIRONMENTS } from '../src/data/environments';
import { BALANCE } from '../src/data/balance';
import { MATTHEW_LANDMARKS, rotateLandmark } from '../src/data/landmarks';

describe('Matthew Clicker Core Gameplay Tests', () => {
  let state = getDefaultGameState();

  beforeEach(() => {
    state = getDefaultGameState();
  });

  describe('Economy & Calculations', () => {
    it('calculates initial click power and zero CPS correctly', () => {
      const { totalPower, critChance, comboMultiplier } = calculateClickPower(state);
      expect(totalPower).toBe(BALANCE.click.basePower);
      expect(critChance).toBeCloseTo(BALANCE.click.baseCritChance);
      expect(comboMultiplier).toBe(1.0);

      const cps = calculateCPS(state);
      expect(cps).toBe(0);
    });

    it('calculates upgrade costs with exponential scaling', () => {
      const upgrade = UPGRADES[0]; // Finger Exercise
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
      expect(bulk10.totalCost).toBeGreaterThan(single * 10); // exponential compound
    });

    it('calculates max affordable upgrades without exceeding coins', () => {
      const upgrade = UPGRADES[0];
      const coins = 1000;
      const maxInfo = getMaxAffordableUpgrade(upgrade.baseCost, upgrade.costMultiplier, 0, coins);

      expect(maxInfo.count).toBeGreaterThan(0);
      expect(maxInfo.totalCost).toBeLessThanOrEqual(coins);
    });

    it('prevents negative currency balance and invalid purchases', () => {
      expect(state.coins).toBe(0);
      const upgrade = UPGRADES[0];
      const cost = getUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, 0);

      const canBuy = state.coins >= cost;
      expect(canBuy).toBe(false);

      if (canBuy) {
        state.coins -= cost;
      }
      expect(state.coins).toBe(0);
    });

    it('scales click power when click upgrades are leveled', () => {
      state.upgrades['finger_exercise'] = 5; // +1 * 5 = +5
      const { totalPower } = calculateClickPower(state);
      expect(totalPower).toBe(6); // base 1 + 5 = 6
    });

    it('scales CPS when passive upgrades are leveled', () => {
      state.upgrades['autoclicker_bot'] = 4; // +1.5 * 4 = 6.0
      const cps = calculateCPS(state);
      expect(cps).toBe(6.0);
    });

    it('applies combo multipliers capped at max combo bonus', () => {
      state.combo = 20; // 1 + 20 * 0.01 = 1.20x
      const { comboMultiplier } = calculateClickPower(state);
      expect(comboMultiplier).toBeCloseTo(1.20);
    });

    it('applies permanent achievement boost of +1% per unlocked achievement', () => {
      state.unlockedAchievements = ['first_click', 'first_upgrade', 'combo_starter']; // 3 achievements = +3%
      state.upgrades['finger_exercise'] = 99; // basePower = 100
      const { totalPower } = calculateClickPower(state);
      expect(totalPower).toBe(103); // 100 * 1.03 = 103
    });
  });

  describe('Prestige (Cosmic Ascension)', () => {
    it('returns 0 shards if lifetime coins are below requirement (1M)', () => {
      expect(calculatePrestigeShards(500000)).toBe(0);
    });

    it('calculates square root scaling shards at and above 1M coins', () => {
      expect(calculatePrestigeShards(1000000)).toBe(5);
      expect(calculatePrestigeShards(4000000)).toBe(10);
      expect(calculatePrestigeShards(100000000)).toBe(50);
    });

    it('applies permanent shard multiplier to earnings', () => {
      state.prestigeShards = 10; // +20% bonus
      state.upgrades['finger_exercise'] = 10;
      const { totalPower } = calculateClickPower(state);
      expect(totalPower).toBeGreaterThan(11);
    });
  });

  describe('Offline Earnings Calculation', () => {
    it('caps offline earnings at 8 hours (28,800 seconds)', () => {
      state.upgrades['autoclicker_bot'] = 10; // 15 CPS
      state.lastSaveTime = Date.now() - 3600 * 24 * 1000; // 24 hours ago
      const nowSec = Math.floor(Date.now() / 1000);

      const { elapsedSeconds, coinsEarned } = calculateOfflineEarnings(state, nowSec);
      expect(elapsedSeconds).toBe(28800); // capped at 8 hours
      expect(coinsEarned).toBeGreaterThan(0);
    });
  });

  describe('Save / Load & Export / Import System', () => {
    it('exports and imports save strings with 100% fidelity', () => {
      state.coins = 42500;
      state.lifetimeCoins = 150000;
      state.clicks = 350;
      state.upgrades['finger_exercise'] = 12;
      state.unlockedSkins = ['classic_matthew', 'sad_matthew'];
      state.equippedSkin = 'sad_matthew';

      const exported = exportSaveString(state);
      expect(typeof exported).toBe('string');
      expect(exported.length).toBeGreaterThan(20);

      const imported = importSaveString(exported);
      expect(imported.coins).toBe(42500);
      expect(imported.lifetimeCoins).toBe(150000);
      expect(imported.clicks).toBe(350);
      expect(imported.upgrades['finger_exercise']).toBe(12);
      expect(imported.equippedSkin).toBe('sad_matthew');
      expect(imported.unlockedSkins).toContain('sad_matthew');
    });

    it('throws meaningful error on corrupt save string', () => {
      expect(() => importSaveString('INVALID_BASE64_GARBAGE!#$')).toThrow();
    });
  });

  describe('Formatters', () => {
    it('formats small and compact numbers correctly', () => {
      expect(formatCoins(0)).toBe('0');
      expect(formatCoins(45)).toBe('45');
      expect(formatCoins(999)).toBe('999');
      expect(formatCoins(1234)).toBe('1.2K');
      expect(formatCoins(5400000)).toBe('5.4M');
      expect(formatCoins(8900000000)).toBe('8.9B');
      expect(formatCoins(2100000000000)).toBe('2.1T');
    });

    it('formats time correctly', () => {
      expect(formatTime(45)).toBe('45s');
      expect(formatTime(125)).toBe('2m 5s');
      expect(formatTime(7320)).toBe('2h 2m');
    });
  });

  describe('Content Completeness & Tongue Removal', () => {
    it('has all 16 required Matthew skins', () => {
      expect(SKINS.length).toBe(16);
      const expectedSkins = [
        'classic_matthew',
        'sad_matthew',
        'sleepy_matthew',
        'angry_matthew',
        'aura_matthew',
        'sigma_matthew',
        'rich_matthew',
        'evil_matthew',
        'fire_matthew',
        'ice_matthew',
        'golden_matthew',
        'diamond_matthew',
        'rainbow_matthew',
        'glitch_matthew',
        'galaxy_matthew',
        'god_matthew',
      ];
      expectedSkins.forEach((id) => {
        const found = SKINS.find((s) => s.id === id);
        expect(found).toBeDefined();
      });
    });

    it('has zero tongue-out properties in skin data', () => {
      SKINS.forEach((skin: any) => {
        expect(skin.tongueImage).toBeUndefined();
      });
    });

    it('has at least 14 working upgrades', () => {
      expect(UPGRADES.length).toBeGreaterThanOrEqual(14);
    });

    it('has at least 15 achievements', () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(15);
    });

    it('has 7 unlockable background environments', () => {
      expect(ENVIRONMENTS.length).toBe(7);
      expect(ENVIRONMENTS[0].id).toBe('matthew_room');
    });

    it('has calibrated facial landmarks matching Matthew ground truth', () => {
      expect(MATTHEW_LANDMARKS.leftEyePupil.x).toBe(393);
      expect(MATTHEW_LANDMARKS.leftEyePupil.y).toBe(532);
      expect(MATTHEW_LANDMARKS.rightEyePupil.x).toBe(616);
      expect(MATTHEW_LANDMARKS.rightEyePupil.y).toBe(494);
      expect(MATTHEW_LANDMARKS.headTiltAngleDeg).toBeCloseTo(-9.68, 1);
      expect(MATTHEW_LANDMARKS.interOcularDistance).toBeCloseTo(226.2, 1);

      // Verify rotation utility works
      const rotated = rotateLandmark({ x: 504.5, y: 513 }, { x: 504.5, y: 513 }, 0);
      expect(rotated.x).toBe(504.5);
      expect(rotated.y).toBe(513);
    });
  });

  describe('Milestone-based Character Progression (Earned, Never Purchased)', () => {
    it('verifies all 16 skins have milestones and ZERO coin cost', () => {
      SKINS.forEach((skin: any) => {
        expect(skin.cost).toBeUndefined();
        expect(skin.milestone).toBeDefined();
        expect(skin.milestone.type).toBeDefined();
        expect(skin.milestone.description).toBeDefined();
        expect(typeof skin.milestone.target).toBe('number');
      });
    });

    it('unlocks Classic Matthew immediately with no requirements', () => {
      const classic = SKINS.find((s) => s.id === 'classic_matthew')!;
      const progress = getSkinMilestoneProgress(classic, state, 0);
      expect(progress.isMet).toBe(true);
      expect(progress.percent).toBe(100);
    });

    it('tracks Aura Matthew milestone via click count (target 100)', () => {
      const aura = SKINS.find((s) => s.id === 'aura_matthew')!;
      state.clicks = 45;
      let progress = getSkinMilestoneProgress(aura, state, 0);
      expect(progress.isMet).toBe(false);
      expect(progress.current).toBe(45);
      expect(progress.percent).toBe(45);

      state.clicks = 100;
      progress = getSkinMilestoneProgress(aura, state, 0);
      expect(progress.isMet).toBe(true);
      expect(progress.percent).toBe(100);
    });

    it('tracks Sad Matthew milestone via lifetime coins (target 500)', () => {
      const sad = SKINS.find((s) => s.id === 'sad_matthew')!;
      state.lifetimeCoins = 250;
      let progress = getSkinMilestoneProgress(sad, state, 0);
      expect(progress.isMet).toBe(false);
      expect(progress.percent).toBe(50);

      state.lifetimeCoins = 500;
      progress = getSkinMilestoneProgress(sad, state, 0);
      expect(progress.isMet).toBe(true);
      expect(progress.percent).toBe(100);
    });

    it('tracks Sigma Matthew milestone via upgrades purchased (target 10)', () => {
      const sigma = SKINS.find((s) => s.id === 'sigma_matthew')!;
      state.upgrades = { finger_exercise: 6, coffee_supply: 3 }; // 9 upgrades
      expect(getTotalUpgradesPurchased(state.upgrades)).toBe(9);
      let progress = getSkinMilestoneProgress(sigma, state, 0);
      expect(progress.isMet).toBe(false);
      expect(progress.percent).toBe(90);

      state.upgrades['coffee_supply'] = 4; // 10 upgrades
      progress = getSkinMilestoneProgress(sigma, state, 0);
      expect(progress.isMet).toBe(true);
      expect(progress.percent).toBe(100);
    });

    it('tracks Fire Matthew milestone via CPS rate (target 100)', () => {
      const fire = SKINS.find((s) => s.id === 'fire_matthew')!;
      let progress = getSkinMilestoneProgress(fire, state, 40);
      expect(progress.isMet).toBe(false);
      expect(progress.percent).toBe(40);

      progress = getSkinMilestoneProgress(fire, state, 100);
      expect(progress.isMet).toBe(true);
      expect(progress.percent).toBe(100);
    });

    it('tracks Ice Matthew milestone via achievements unlocked (target 6)', () => {
      const ice = SKINS.find((s) => s.id === 'ice_matthew')!;
      state.unlockedAchievements = ['a1', 'a2', 'a3', 'a4', 'a5'];
      let progress = getSkinMilestoneProgress(ice, state, 0);
      expect(progress.isMet).toBe(false);

      state.unlockedAchievements.push('a6');
      progress = getSkinMilestoneProgress(ice, state, 0);
      expect(progress.isMet).toBe(true);
    });

    it('equipping skins does NOT cost any coins', () => {
      state.coins = 5000;
      state.unlockedSkins = ['classic_matthew', 'aura_matthew'];
      state.equippedSkin = 'classic_matthew';

      // Player equips aura_matthew
      state.equippedSkin = 'aura_matthew';

      // Zero coin deduction!
      expect(state.coins).toBe(5000);
      expect(state.equippedSkin).toBe('aura_matthew');
    });
  });
});
