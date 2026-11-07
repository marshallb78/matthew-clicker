import { UPGRADES } from '../data/upgrades';
import { getAscensionMultiplier } from '../data/prestige';
import { BALANCE } from '../data/balance';
import { FRIDAY_BONUS_CONFIG } from '../config/gameConfig';
import { GameState } from '../types/game';

export interface LiveMultiplierOptions {
  fridayBonusActive?: boolean;
  stormWaveMultiplier?: number;
}

export function getCombinedLiveMultiplier(options?: LiveMultiplierOptions): {
  fridayMult: number;
  stormWaveMult: number;
  combinedMult: number;
} {
  const fridayMult = options?.fridayBonusActive ? FRIDAY_BONUS_CONFIG.multiplier : 1.0;
  const stormWaveMult =
    options?.stormWaveMultiplier && options.stormWaveMultiplier > 1
      ? options.stormWaveMultiplier
      : 1.0;
  return {
    fridayMult,
    stormWaveMult,
    combinedMult: fridayMult * stormWaveMult,
  };
}

export function getUpgradeCost(baseCost: number, multiplier: number, currentLevel: number): number {
  return Math.floor(baseCost * Math.pow(multiplier, currentLevel));
}

export function getBulkUpgradeCost(
  baseCost: number,
  multiplier: number,
  currentLevel: number,
  count: number
): { totalCost: number; actualCount: number } {
  if (count <= 1) {
    return { totalCost: getUpgradeCost(baseCost, multiplier, currentLevel), actualCount: 1 };
  }

  const a = getUpgradeCost(baseCost, multiplier, currentLevel);
  const r = multiplier;
  const totalCost = Math.floor((a * (Math.pow(r, count) - 1)) / (r - 1));
  return { totalCost, actualCount: count };
}

export function getMaxAffordableUpgrade(
  baseCost: number,
  multiplier: number,
  currentLevel: number,
  currentCoins: number
): { totalCost: number; count: number } {
  const nextCost = getUpgradeCost(baseCost, multiplier, currentLevel);
  if (currentCoins < nextCost) return { totalCost: 0, count: 0 };

  const a = nextCost;
  const r = multiplier;
  const term = (currentCoins * (r - 1)) / a + 1;
  const count = Math.max(1, Math.floor(Math.log(term) / Math.log(r)));
  const { totalCost } = getBulkUpgradeCost(baseCost, multiplier, currentLevel, count);

  return { totalCost, count };
}

export function calculateClickPower(
  state: GameState,
  liveOptions?: LiveMultiplierOptions
): {
  basePower: number;
  totalPower: number;
  critChance: number;
  critMultiplier: number;
  comboMultiplier: number;
  ascensionMultiplier: number;
  liveMultiplier: number;
} {
  let basePower = BALANCE.click.basePower;

  // Add upgrade power
  for (const upgrade of UPGRADES) {
    const level = state.upgrades[upgrade.id] || 0;
    if (level > 0 && upgrade.baseClickPower > 0) {
      basePower += level * upgrade.baseClickPower;
    }
  }

  // Skins are 100% cosmetic swag/collectibles — zero stat boosts
  const critChance = BALANCE.click.baseCritChance;
  const critMultiplier = BALANCE.click.baseCritMultiplier;

  // Capybara Clicker style Ascension Multiplier: multiplies EVERYTHING
  const ascensionMultiplier = getAscensionMultiplier(state.prestigeShards);

  // Combo multiplier
  const effectiveCombo = Math.min(state.combo, BALANCE.click.comboMax);
  const comboMultiplier = 1 + effectiveCombo * BALANCE.click.comboBonusPerStack;

  // Frenzy Multiplier
  const frenzyMult = state.frenzyTimer > 0 ? state.frenzyMultiplier : 1.0;

  // Multiplicative Live Event & Friday 2x Stacking
  const { combinedMult: liveMultiplier } = getCombinedLiveMultiplier(liveOptions);

  const totalPower = Math.max(
    1,
    Number(
      (
        basePower *
        ascensionMultiplier *
        comboMultiplier *
        frenzyMult *
        liveMultiplier
      ).toFixed(2)
    )
  );

  return {
    basePower,
    totalPower,
    critChance: Math.min(critChance, 0.75),
    critMultiplier,
    comboMultiplier,
    ascensionMultiplier,
    liveMultiplier,
  };
}

export function calculateCPS(state: GameState, liveOptions?: LiveMultiplierOptions): number {
  let rawCps = 0;

  for (const upgrade of UPGRADES) {
    const level = state.upgrades[upgrade.id] || 0;
    if (level > 0 && upgrade.baseCps > 0) {
      rawCps += level * upgrade.baseCps;
    }
  }

  if (rawCps <= 0) return 0;

  // Capybara Clicker style Ascension Multiplier: multiplies EVERYTHING
  const ascensionMultiplier = getAscensionMultiplier(state.prestigeShards);

  // Frenzy Multiplier
  const frenzyMult = state.frenzyTimer > 0 ? state.frenzyMultiplier : 1.0;

  // Multiplicative Live Event & Friday 2x Stacking
  const { combinedMult: liveMultiplier } = getCombinedLiveMultiplier(liveOptions);

  return Math.max(
    0,
    rawCps *
      ascensionMultiplier *
      frenzyMult *
      liveMultiplier
  );
}

/**
 * Calculates balanced Giant Matthew click reward during a Matthew Storm wave (active for 7 seconds).
 */
export function calculateGiantMatthewClickReward(
  state: GameState,
  liveOptions?: LiveMultiplierOptions
): number {
  const { totalPower } = calculateClickPower(state, liveOptions);
  const cps = calculateCPS(state, liveOptions);
  return Math.max(15, Math.floor(totalPower * 1.5 + cps * 0.15));
}

/**
 * Uncapped Offline Coin Earnings:
 * - Generates Matthew Coins ONLY (gemsEarned is strictly 0).
 * - NO time cap on eligible offline earnings.
 * - Discards uncollected offline earnings if a season transition occurred.
 */
export function calculateOfflineEarnings(
  state: GameState,
  nowSeconds: number,
  activeSeasonId?: string
): { elapsedSeconds: number; coinsEarned: number; gemsEarned: 0 } {
  if (!state.lastSaveTime || state.lastSaveTime <= 0) {
    return { elapsedSeconds: 0, coinsEarned: 0, gemsEarned: 0 };
  }

  // Discard uncollected previous-season offline earnings on season transition
  if (activeSeasonId && state.currentSeasonId && state.currentSeasonId !== activeSeasonId) {
    return { elapsedSeconds: 0, coinsEarned: 0, gemsEarned: 0 };
  }

  const lastSaveSec = Math.floor(state.lastSaveTime / 1000);
  const diffSec = Math.max(0, nowSeconds - lastSaveSec);

  // Offline earnings only trigger if gone for more than 15 seconds
  if (diffSec < 15) {
    return { elapsedSeconds: 0, coinsEarned: 0, gemsEarned: 0 };
  }

  const effectiveSeconds = diffSec;
  const cps = calculateCPS(state);
  const efficiency = BALANCE.offline.efficiency;

  const coinsEarned = Math.floor(cps * effectiveSeconds * efficiency);
  return { elapsedSeconds: effectiveSeconds, coinsEarned, gemsEarned: 0 };
}
