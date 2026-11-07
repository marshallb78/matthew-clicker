import { PrestigeUpgrade } from '../types/game';

export const PRESTIGE_REQUIREMENT = 1000000; // 1M Coins to Ascend / Rebirth
export const ASCENSION_STEP = 0.05; // +0.05x per Rebirth tier

/**
 * Calculates how many +0.05x Ascension steps the player has earned from lifetime coins.
 * 1M coins -> 1 step (+0.05x), 4M coins -> 2 steps (+0.10x), 9M -> 3 steps (+0.15x).
 */
export function calculatePrestigeShards(lifetimeCoins: number): number {
  if (lifetimeCoins < PRESTIGE_REQUIREMENT) return 0;
  return Math.max(1, Math.floor(Math.sqrt(lifetimeCoins / PRESTIGE_REQUIREMENT)));
}

/**
 * Returns the player's active Ascension Multiplier (starts at 1.00x, increases by +0.05x per step).
 */
export function getAscensionMultiplier(prestigeShards: number): number {
  const steps = Math.max(0, Math.floor(prestigeShards || 0));
  return Number((1 + steps * ASCENSION_STEP).toFixed(2));
}

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [];
