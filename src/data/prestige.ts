import { PrestigeUpgrade } from '../types/game';

export const PRESTIGE_REQUIREMENT = 1000000; // 1M Coins to Ascend / Rebirth
export const ASCENSION_STEP = 0.05; // +0.05x per Rebirth tier

/**
 * Calculates how many +0.05x Ascension steps the player has earned from lifetime coins.
 * Controlled logarithmic curve across all 35 upgrade tiers (up to Decillions)
 * so early Rebirths feel great (1M -> +0.05x, 3M -> +0.10x, 9M -> +0.15x)
 * without ever spiraling out of control in the late game!
 */
export function calculatePrestigeShards(lifetimeCoins: number): number {
  if (lifetimeCoins < PRESTIGE_REQUIREMENT) return 0;
  const logRatio = Math.log10(lifetimeCoins / PRESTIGE_REQUIREMENT);
  return Math.max(1, 1 + Math.floor(logRatio * 2.1));
}

/**
 * Returns the lifetime coins required to unlock the next +0.05x Ascension step.
 */
export function getNextPrestigeRequirement(currentLifetimeSteps: number): number {
  const nextStep = Math.max(1, Math.floor(currentLifetimeSteps || 0) + 1);
  if (nextStep <= 1) return PRESTIGE_REQUIREMENT;
  return Math.ceil(PRESTIGE_REQUIREMENT * Math.pow(10, (nextStep - 1) / 2.1));
}

/**
 * Returns the player's active Ascension Multiplier (starts at 1.00x, increases by +0.05x per step).
 */
export function getAscensionMultiplier(prestigeShards: number): number {
  const steps = Math.max(0, Math.floor(prestigeShards || 0));
  return Number((1 + steps * ASCENSION_STEP).toFixed(2));
}

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [];
