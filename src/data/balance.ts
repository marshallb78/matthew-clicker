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
    baseDelayMs: 80000, // Average 80 seconds between appearances
    delayVarianceMs: 20000,
    flightDurationMs: 12000, // 12 seconds on screen
    frenzyDurationSec: 10,
    frenzyMultiplier: 2.5, // 2.5x during frenzy
    bountyCpsSeconds: 20, // awards 20 seconds of passive production
    bountyClickCount: 15, // plus 15 clicks of power
    minBountyFloor: 20, // Prevents early game inflation
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

