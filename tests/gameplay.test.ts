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
  SEASON_2_SKINS,
  SEASON_2_STORM_SKINS,
  MATTHEW_STORM_SKINS,
  CHARACTER_SKINS,
} from '../src/data/skins';
import { checkAndAutoClaimQuests } from '../src/data/quests';
import { BALANCE } from '../src/data/balance';
import {
  GEM_ECONOMY_CONFIG,
  MATTHEW_STORM_CONFIG,
  SEASON_CONFIG,
} from '../src/config/gameConfig';
import {
  encodeFirestoreDocument,
  decodeFirestoreFields,
  isCloudWriteCoolingDown,
  markCloudWriteQuotaExceeded,
} from '../src/firebase/config';
import {
  getActiveSeason,
  evaluateMatthewStormState,
} from '../src/utils/scheduleEngine';
import { formatTime } from '../src/utils/formatters';
import { validateUsernameFormat } from '../src/firebase/auth';
import { AutoClickerDetector } from '../src/utils/antiCheat';
import { getCachedBanRecord, isDevAdminAccount } from '../src/firebase/moderation';
import {
  MARSHALL_RECOVERY_UID,
  MARSHALL_RECOVERED_SCORE,
  MARSHALL_RECOVERED_COINS,
  isProgressSnapshotBetter,
  reconcileCloudAndLocalState,
} from '../src/firebase/cloudSave';

describe('Matthew Clicker Weekly Seasons & Live Event Gameplay Tests', () => {
  let state = getDefaultGameState();

  beforeEach(() => {
    state = getDefaultGameState();
  });

  describe('Economy, Ascension Multiplier (+0.08 per step) & Calculations', () => {
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

    it('scales click power and CPS with faster Ascension Multiplier (+0.15 per step) and Friday 4x Live Event', () => {
      state.upgrades['finger_exercise'] = 10; // base click = 1 + 10*0.5 = 6, base CPS = 10*0.2 = 2
      state.upgrades['energy_coffee'] = 10; // base CPS = 2 + 10*0.5 = 7, +10*1.5 = 15 click power -> total base click = 21
      state.prestigeShards = 20; // Ascension Multiplier = 1 + 20 * 0.15 = 4.0x

      const normalClick = calculateClickPower(state);
      const normalCps = calculateCPS(state);
      expect(normalClick.ascensionMultiplier).toBe(4);
      expect(normalClick.totalPower).toBe(84); // 21 * 4x
      expect(normalCps).toBeCloseTo(28); // 7 * 4x

      // Friday All-Day Live Event = 4x multiplier
      const liveOpts = { fridayBonusActive: false, stormWaveMultiplier: 4 };
      const boostedClick = calculateClickPower(state, liveOpts);
      const boostedCps = calculateCPS(state, liveOpts);

      expect(boostedClick.totalPower).toBe(336); // 84 * 4
      expect(boostedCps).toBeCloseTo(112.0); // 28 * 4

      const giantReward = calculateGiantMatthewClickReward(state, liveOpts);
      expect(giantReward).toBeGreaterThan(boostedClick.totalPower);
    });
  });

  describe('Rebirth (Faster Ascension Multiplier: +0.15 per step)', () => {
    it('returns 0 bonus if lifetime coins are below requirement (1M)', () => {
      expect(calculatePrestigeShards(500000)).toBe(0);
      expect(getAscensionMultiplier(0)).toBe(1);
    });

    it('calculates Ascension Multiplier bonus in +0.15 steps at 1M and scales faster', () => {
      expect(calculatePrestigeShards(1000000)).toBe(1);
      expect(calculatePrestigeShards(4000000)).toBe(3);
      expect(getAscensionMultiplier(1)).toBe(1.15);
      expect(getAscensionMultiplier(2)).toBe(1.3);
      const qaShards = calculatePrestigeShards(1e15);
      expect(getAscensionMultiplier(qaShards)).toBeGreaterThan(5.0);
    });
  });

  describe('Anti-Cheat Auto-Clicker Detector & Moderation Bans', () => {
    it('flags >17 CPS clicking and robotic perfect-timing clicks, and enforces bans on liamkd, wessy, and dryce', () => {
      const detector = new AutoClickerDetector();
      let flagged = false;
      for (let i = 0; i < 19; i++) {
        const res = detector.recordClick(1000 + i * 50); // 19 clicks within 900ms (>17 CPS)
        if (res.flagged) flagged = true;
      }
      expect(flagged).toBe(true);

      // Robotic timing test (12.5 CPS with exact 80ms interval for 25 clicks)
      const robotDetector = new AutoClickerDetector();
      let robotFlagged = false;
      for (let i = 0; i < 26; i++) {
        const res = robotDetector.recordClick(5000 + i * 80);
        if (res.flagged) robotFlagged = true;
      }
      expect(robotFlagged).toBe(true);

      // Default banned accounts
      expect(getCachedBanRecord(null, 'liamkd')?.status).toBe('banned');
      expect(getCachedBanRecord(null, 'wessy')?.status).toBe('banned');
      expect(getCachedBanRecord(null, 'dryce')?.status).toBe('banned');
      expect(getCachedBanRecord('89nsfff2YtaEVcNTHUBDq22V4FW2', 'Marshallb78')).toBeNull();
      expect(isDevAdminAccount('89nsfff2YtaEVcNTHUBDq22V4FW2', 'Marshallb78')).toBe(true);
    });
  });

  describe('Auto-Claim Quests (Rebirth Glitch Prevention)', () => {
    it('automatically claims completed quests immediately and awards gems & coins', () => {
      state.clicks = 8000; // completes daily_clicks_7500
      const { state: afterAuto, newlyClaimed } = checkAndAutoClaimQuests(state);
      expect(newlyClaimed.some((q) => q.id === 'daily_clicks_7500')).toBe(true);
      expect(afterAuto.claimedQuests).toContain('daily_clicks_7500');
      expect(afterAuto.gems).toBeGreaterThanOrEqual(5);
      expect(afterAuto.coins).toBeGreaterThanOrEqual(25000);
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

  describe('Weekly 7-Day Seasons, All-Day Friday 4x Live Event & Weekend Downtime', () => {
    it('configures 7-day weekly seasons, 4x Friday Storm, and Saturday-Sunday Weekend Downtime', () => {
      expect(SEASON_CONFIG.durationDays).toBe(7);
      expect(SEASON_CONFIG.activePlayDurationMs).toBe(5 * 24 * 60 * 60 * 1000);
      expect(MATTHEW_STORM_CONFIG.baseStormMultiplier).toBe(4);
      expect(GEM_ECONOMY_CONFIG.stormSkinCostGems).toBe(50);

      // Friday Nov 13, 2026 at 2:00 PM EST -> Active Season 1, Live Event ON (4x), Downtime OFF
      const fridayNov13 = Date.parse('2026-11-13T14:00:00-05:00');
      const s1Friday = getActiveSeason(fridayNov13);
      const stormFriday = evaluateMatthewStormState(fridayNov13, null);
      expect(s1Friday.seasonId).toBe('season_1');
      expect(s1Friday.isDowntime).toBe(false);
      expect(stormFriday.status).toBe('active');
      expect(stormFriday.shopOpen).toBe(true);

      // Saturday Nov 14, 2026 at 12:00 PM EST -> Season 1 Weekend Downtime ON!
      const saturdayNov14 = Date.parse('2026-11-14T12:00:00-05:00');
      const s1Saturday = getActiveSeason(saturdayNov14);
      const stormSaturday = evaluateMatthewStormState(saturdayNov14, null);
      expect(s1Saturday.seasonId).toBe('season_1');
      expect(s1Saturday.isDowntime).toBe(true);
      expect(s1Saturday.downtimeRemainingSeconds).toBeGreaterThan(0);
      expect(stormSaturday.status).toBe('ended');

      // Monday Nov 16, 2026 at 10:00 AM EST -> Season 2 Active, Downtime OFF!
      const mondayNov16 = Date.parse('2026-11-16T10:00:00-05:00');
      const s2Monday = getActiveSeason(mondayNov16);
      expect(s2Monday.seasonId).toBe('season_2');
      expect(s2Monday.isDowntime).toBe(false);
    });
  });

  describe('Weekly Seasonal Rollover & Permanent Ownership', () => {
    it('resets seasonal coins, upgrades, rebirths, and gems while preserving all skins, playtime, and lifetime clicks', () => {
      state.coins = 999999;
      state.lifetimeCoins = 5000000;
      state.seasonalScore = 5000000;
      state.clicks = 12500;
      state.lifetimeAllSeasonsClicks = 10000;
      state.totalPlaytimeSeconds = 7200;
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
      expect(rolled.gems).toBe(0);

      expect(rolled.unlockedSkins).toEqual([
        'classic_matthew',
        'god_matthew',
        'matthew_storm_skin_1',
        'mathjew',
      ]);
      expect(rolled.equippedSkin).toBe('matthew_storm_skin_1');
      expect(rolled.totalPlaytimeSeconds).toBe(7200);
      expect(rolled.lifetimeAllSeasonsClicks).toBeGreaterThanOrEqual(22500);
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

  describe('Season 1 & Season 2 Skin Lineups + 5 Season 2 Super-Rare Live Event Skins', () => {
    it('includes Season 1 skins, Season 2 progression skins (Anime, Matthgoon, Minecraft, Moaning, Balenciaga), and 5 Season 2 Storm skins', () => {
      expect(SKINS.length).toBe(11);
      expect(PUBLIC_VIEWABLE_SKINS.length).toBe(13);
      expect(MATTHEW_STORM_SKINS.length).toBe(5);
      expect(SEASON_2_SKINS.length).toBe(11);
      expect(SEASON_2_STORM_SKINS.length).toBe(5);

      const s2Ids = SEASON_2_SKINS.map((s) => s.id);
      expect(s2Ids).toContain('anime_matthew');
      expect(s2Ids).toContain('matthgoon');
      expect(s2Ids).toContain('minecraft_matthew');
      expect(s2Ids).toContain('moaning_matthew');
      expect(s2Ids).toContain('balenciaga_matthew');

      ALL_SKINS.forEach((skin) => {
        expect(skin.clickBonusMultiplier).toBe(1.0);
        expect(skin.cpsBonusMultiplier).toBe(1.0);
        expect(skin.critBonusChance).toBe(0);
        expect(skin.image.endsWith('.png')).toBe(true);
      });

      const mathjew = CHARACTER_SKINS.find((s) => s.id === 'mathjew');
      expect(mathjew).toBeDefined();
    });
  });

  describe('Data Preservation & Non-Hanging Firestore REST Serialization', () => {
    it('never resets player progress or accounts and encodes/decodes Firestore documents accurately up to Decillions', () => {
      state.coins = 500000000;
      state.lifetimeCoins = 500000000;
      state.unlockedSkins = ['classic_matthew', 'sigma_matthew', 'god_matthew'];
      state.equippedSkin = 'god_matthew';
      state.gems = 95;
      state.prestigeCount = 8;
      state.prestigeShards = 15;
      state.lastBetaWipeId = null;

      const checkResult = performBetaWipeIfDue(state, Date.now() + 99999999);
      expect(checkResult.wiped).toBe(false);
      expect(checkResult.state.coins).toBe(500000000);
      expect(checkResult.state.unlockedSkins).toContain('god_matthew');

      const sampleDoc = {
        uid: 'test_uid_123',
        username: 'Marshallb78',
        seasonalScore: 5e35,
        rebirthCount: 12,
        unlockedSkins: ['classic_matthew', 'aura_matthew'],
        upgrades: { finger_exercise: 25, energy_coffee: 10 },
      };
      const encoded = encodeFirestoreDocument(sampleDoc);
      const decoded = decodeFirestoreFields(encoded.fields);
      expect(decoded.uid).toBe('test_uid_123');
      expect(decoded.username).toBe('Marshallb78');
      expect(decoded.seasonalScore).toBe(5e35);

      expect(isCloudWriteCoolingDown()).toBe(false);
      markCloudWriteQuotaExceeded();
      expect(isCloudWriteCoolingDown()).toBe(true);
    });
  });

  describe('Multi-Device Cloud Save Reconciliation & Score Protection', () => {
    it('prevents an older 2 No save with stale prestigeCount from overwriting 322 Dc cloud progress', () => {
      const cloud322Dc = {
        lifetimeCoins: 3.22e35,
        prestigeCount: 2,
        saveTs: 1000,
      };
      const staleDevice2No = {
        lifetimeCoins: 2.6e30,
        prestigeCount: 3,
        saveTs: Date.now(), // newer local clock shouldn't override massive coin progress
      };
      expect(isProgressSnapshotBetter(staleDevice2No, cloud322Dc)).toBe(false);
      expect(isProgressSnapshotBetter(cloud322Dc, staleDevice2No)).toBe(true);

      // Even if one device just Rebirthed at ~the same lifetimeCoins (within 1%), higher prestige wins
      const preRebirth = { lifetimeCoins: 5e20, prestigeCount: 3, saveTs: 1000 };
      const postRebirth = { lifetimeCoins: 5.01e20, prestigeCount: 4, saveTs: 1200 };
      expect(isProgressSnapshotBetter(postRebirth, preRebirth)).toBe(true);
    });

    it('prefers newer cloud save when switching to a stale device and isolates different owners', () => {
      const staleLocal = getDefaultGameState();
      staleLocal.currentSeasonId = 'season_1';
      staleLocal.coins = 2.1e30;
      staleLocal.lifetimeCoins = 2.6e30;
      staleLocal.seasonalScore = 2.6e30;
      staleLocal.prestigeCount = 3;
      staleLocal.lastOwnerUid = 'player_1';
      staleLocal.lastSaveTime = Date.now();

      const rtdbUser = {
        uid: 'player_1',
        username: 'Tester',
        totalPlaytimeSeconds: 5000,
        seasons: {
          season_1: {
            seasonId: 'season_1',
            coins: 1.5e35,
            lifetimeCoins: 2.0e35,
            seasonalScore: 2.0e35,
            prestigeCount: 2,
            lastSaveTime: Date.now() - 30000,
          },
        },
      };

      const res = reconcileCloudAndLocalState({
        uid: 'player_1',
        username: 'Tester',
        localState: staleLocal,
        rtdbUser,
        rtdbLb: null,
        wasExplicitlyReset: false,
        resetAtMs: 0,
        activeSeasonId: 'season_1',
      });

      expect(res.state.coins).toBe(1.5e35);
      expect(res.state.lifetimeCoins).toBe(2.0e35);
      expect(res.state.prestigeCount).toBe(3); // Preserved monotonic prestige
      expect(res.state.lastOwnerUid).toBe('player_1');

      // Switching to a different account on same browser must NOT inherit player_1's coins
      const otherAcctRes = reconcileCloudAndLocalState({
        uid: 'player_2',
        username: 'OtherUser',
        localState: staleLocal,
        rtdbUser: { uid: 'player_2', username: 'OtherUser', seasons: { season_1: { seasonId: 'season_1', coins: 50, lifetimeCoins: 50 } } },
        rtdbLb: null,
        wasExplicitlyReset: false,
        resetAtMs: 0,
        activeSeasonId: 'season_1',
      });
      expect(otherAcctRes.state.coins).toBe(50);
      expect(otherAcctRes.state.lifetimeCoins).toBe(50);
    });

    it('recovers Marshallb78 lost 322.2 Dc score once in season_1 and does not overwrite coins after rebirth', () => {
      const staleMarshall = getDefaultGameState();
      staleMarshall.currentSeasonId = 'season_1';
      staleMarshall.coins = 2.1e30;
      staleMarshall.lifetimeCoins = 2.6e30;
      staleMarshall.seasonalScore = 2.6e30;

      const recovered = reconcileCloudAndLocalState({
        uid: MARSHALL_RECOVERY_UID,
        username: 'Marshallb78',
        localState: staleMarshall,
        rtdbUser: {
          uid: MARSHALL_RECOVERY_UID,
          username: 'Marshallb78',
          lifetimeAllSeasonsCoins: MARSHALL_RECOVERED_SCORE,
          lifetimeAllSeasonsClicks: 151114,
          seasons: {
            season_1: {
              seasonId: 'season_1',
              coins: 2.118e30,
              lifetimeCoins: 2.619e30,
              seasonalScore: 2.619e30,
              clicks: 143463,
              prestigeCount: 3,
              prestigeShards: 44,
            },
          },
        },
        rtdbLb: null,
        wasExplicitlyReset: false,
        resetAtMs: 0,
        activeSeasonId: 'season_1',
      });

      expect(recovered.recoveredFromCareerLoss).toBe(true);
      expect(recovered.shouldPushToCloud).toBe(true);
      expect(recovered.state.lifetimeCoins).toBe(MARSHALL_RECOVERED_SCORE);
      expect(recovered.state.seasonalScore).toBe(Math.floor(MARSHALL_RECOVERED_SCORE));
      expect(recovered.state.coins).toBeGreaterThanOrEqual(MARSHALL_RECOVERED_COINS);
      expect(recovered.state.clicks).toBe(151114);

      // Once recovered (>= MARSHALL_RECOVERED_SCORE), Rebirthing to 0 coins must stay 0 coins!
      const afterRebirth = reconcileCloudAndLocalState({
        uid: MARSHALL_RECOVERY_UID,
        username: 'Marshallb78',
        localState: { ...recovered.state, coins: 0, prestigeCount: 4 },
        rtdbUser: {
          uid: MARSHALL_RECOVERY_UID,
          username: 'Marshallb78',
          lifetimeAllSeasonsCoins: MARSHALL_RECOVERED_SCORE,
          seasons: {
            season_1: {
              seasonId: 'season_1',
              coins: 0,
              lifetimeCoins: MARSHALL_RECOVERED_SCORE,
              seasonalScore: Math.floor(MARSHALL_RECOVERED_SCORE),
              prestigeCount: 4,
            },
          },
        },
        rtdbLb: null,
        wasExplicitlyReset: false,
        resetAtMs: 0,
        activeSeasonId: 'season_1',
      });
      expect(afterRebirth.recoveredFromCareerLoss).toBe(false);
      expect(afterRebirth.state.coins).toBe(0);
    });
  });
});
