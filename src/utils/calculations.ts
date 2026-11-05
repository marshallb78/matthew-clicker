import { UPGRADES } from '../data/upgrades';
import { SKINS } from '../data/skins';
import { PRESTIGE_UPGRADES } from '../data/prestige';
import { GameState } from '../types/game';

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

  // Geometric series sum: a * (r^n - 1) / (r - 1)
  const a = getUpgradeCost(baseCost, multiplier, currentLevel);
  const r = multiplier;
  const totalCost = Math.floor(a * (Math.pow(r, count) - 1) / (r - 1));
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
  // coins >= a * (r^n - 1) / (r - 1)
  // (coins * (r - 1) / a) + 1 >= r^n
  // n = floor(log_r( ... ))
  const term = (currentCoins * (r - 1) / a) + 1;
  const count = Math.max(1, Math.floor(Math.log(term) / Math.log(r)));
  const { totalCost } = getBulkUpgradeCost(baseCost, multiplier, currentLevel, count);

  return { totalCost, count };
}

export function calculateClickPower(state: GameState): {
  basePower: number;
  totalPower: number;
  critChance: number;
  critMultiplier: number;
  comboMultiplier: number;
} {
  let basePower = 1;

  // Add upgrade power
  for (const upgrade of UPGRADES) {
    const level = state.upgrades[upgrade.id] || 0;
    if (level > 0 && upgrade.baseClickPower > 0) {
      basePower += level * upgrade.baseClickPower;
    }
  }

  // Equipped Skin
  const equippedSkin = SKINS.find((s) => s.id === state.equippedSkin) || SKINS[0];
  const skinClickMult = equippedSkin.clickBonusMultiplier || 1.0;
  let critChance = 0.05 + (equippedSkin.critBonusChance || 0);
  let critMultiplier = 5.0;

  // Prestige Multipliers
  const shardBonusMult = 1 + state.prestigeShards * 0.02; // +2% per unspent shard

  let prestigeClickMult = 1.0;
  for (const pUp of PRESTIGE_UPGRADES) {
    const lvl = state.prestigeUpgrades[pUp.id] || 0;
    if (lvl > 0) {
      const eff = pUp.effect(lvl);
      prestigeClickMult *= eff.clickMult;
      critChance += eff.critChance;
      critMultiplier *= eff.critMult;
    }
  }

  // Combo multiplier: decays unless clicked rapidly. Up to 3.0x at 40 combo
  const comboMultiplier = 1 + Math.min(state.combo * 0.05, 2.0);

  // Frenzy Multiplier (e.g. 7x during Golden Matthew event)
  const frenzyMult = state.frenzyTimer > 0 ? state.frenzyMultiplier : 1.0;

  const totalPower = Math.max(
    1,
    Math.floor(basePower * skinClickMult * prestigeClickMult * shardBonusMult * comboMultiplier * frenzyMult)
  );

  return {
    basePower,
    totalPower,
    critChance: Math.min(critChance, 0.75), // max 75% crit
    critMultiplier,
    comboMultiplier,
  };
}

export function calculateCPS(state: GameState): number {
  let rawCps = 0;

  for (const upgrade of UPGRADES) {
    const level = state.upgrades[upgrade.id] || 0;
    if (level > 0 && upgrade.baseCps > 0) {
      rawCps += level * upgrade.baseCps;
    }
  }

  if (rawCps <= 0) return 0;

  // Skin bonus
  const equippedSkin = SKINS.find((s) => s.id === state.equippedSkin) || SKINS[0];
  const skinCpsMult = equippedSkin.cpsBonusMultiplier || 1.0;

  // Prestige Shards
  const shardBonusMult = 1 + state.prestigeShards * 0.02;

  // Prestige Upgrades
  let prestigeCpsMult = 1.0;
  for (const pUp of PRESTIGE_UPGRADES) {
    const lvl = state.prestigeUpgrades[pUp.id] || 0;
    if (lvl > 0) {
      prestigeCpsMult *= pUp.effect(lvl).cpsMult;
    }
  }

  // Frenzy Multiplier
  const frenzyMult = state.frenzyTimer > 0 ? state.frenzyMultiplier : 1.0;

  return Math.max(0, rawCps * skinCpsMult * prestigeCpsMult * shardBonusMult * frenzyMult);
}

export function calculateOfflineEarnings(
  state: GameState,
  nowSeconds: number
): { elapsedSeconds: number; coinsEarned: number } {
  if (!state.lastSaveTime || state.lastSaveTime <= 0) {
    return { elapsedSeconds: 0, coinsEarned: 0 };
  }

  const lastSaveSec = Math.floor(state.lastSaveTime / 1000);
  const diffSec = Math.max(0, nowSeconds - lastSaveSec);

  // Offline earnings only trigger if gone for more than 15 seconds
  if (diffSec < 15) {
    return { elapsedSeconds: 0, coinsEarned: 0 };
  }

  // Base cap: 8 hours (28,800s). Quantum time perk extends up to 16h
  const quantumLvl = state.prestigeUpgrades['quantum_time'] || 0;
  const maxOfflineSeconds = 28800 + quantumLvl * 5760; // up to 16 hours

  const effectiveSeconds = Math.min(diffSec, maxOfflineSeconds);

  const cps = calculateCPS(state);
  // Base 60% offline efficiency, up to 100% with perk
  const efficiency = Math.min(1.0, 0.60 + quantumLvl * 0.08);

  const coinsEarned = Math.floor(cps * effectiveSeconds * efficiency);
  return { elapsedSeconds: effectiveSeconds, coinsEarned };
}
