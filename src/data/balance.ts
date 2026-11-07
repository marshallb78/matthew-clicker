/**
 * Centralized Economy and Balance Configuration for Matthew Clicker.
 * Defines progression formulas, pacing targets, multipliers, and scaling curves.
 */

export const BALANCE = {
  // --- CLICK DYNAMICS ---
  click: {
    basePower: 1,
    baseCritChance: 0.03, // 3% base crit chance
    baseCritMultiplier: 2.0, // 2x base damage on crit
    comboMax: 20, // Max combo count
    comboBonusPerStack: 0.01, // +1% per combo (up to +20% at 20 combo)
    comboTimerResetSec: 1.5, // Window between clicks to maintain combo
  },

  // --- PASSIVE INCOME & TIMERS ---
  passive: {
    tickIntervalMs: 50, // 20 ticks per second
  },

  // --- GOLDEN MATTHEW BONUS EVENT ---
  goldenEvent: {
    baseDelayMs: 180000, // Average 3 minutes between appearances
    delayVarianceMs: 45000,
    flightDurationMs: 10000, // 10 seconds on screen
    frenzyDurationSec: 10,
    frenzyMultiplier: 2.0, // 2.0x during frenzy
    bountyCpsSeconds: 30, // awards 30 seconds of passive production
    bountyClickCount: 25, // plus 25 clicks of power
    minBountyFloor: 25, // Prevents early game inflation
  },

  // --- ACHIEVEMENTS ---
  achievements: {
    // Each achievement unlocked grants a permanent global +1% production boost
    perAchievementBonusMultiplier: 0.01,
  },

  // --- OFFLINE EARNINGS ---
  offline: {
    maxHours: 8,
    efficiency: 0.5, // 50% production rate while offline
  },

  // --- PRESTIGE (COSMIC ASCENSION) ---
  prestige: {
    baseShardRequirement: 1000000, // 1 Million lifetime coins for 1st shard
    unspentShardBonus: 0.02, // +2% all production per unspent cosmic shard
  },
} as const;

