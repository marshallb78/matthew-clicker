import { PrestigeUpgrade } from '../types/game';

export const PRESTIGE_REQUIREMENT = 1000000; // 1M Coins to Ascend

export function calculatePrestigeShards(lifetimeCoins: number): number {
  if (lifetimeCoins < PRESTIGE_REQUIREMENT) return 0;
  // 1M -> 5 shards, 4M -> 10 shards, 100M -> 50 shards, 1B -> 158 shards
  return Math.floor(Math.sqrt(lifetimeCoins / PRESTIGE_REQUIREMENT) * 5);
}

export const PRESTIGE_UPGRADES: PrestigeUpgrade[] = [
  {
    id: 'transcendent_power',
    name: 'Transcendent Force',
    description: 'Permanently amplifies click impact across all lifetimes.',
    icon: 'Sword',
    baseCost: 2,
    costMultiplier: 1.5,
    maxLevel: 10,
    effect: (lvl) => ({
      clickMult: 1 + lvl * 0.20,
      cpsMult: 1,
      critChance: 0,
      critMult: 1,
      offlineMult: 1,
    }),
  },
  {
    id: 'celestial_automation',
    name: 'Celestial Machinery',
    description: 'Permanently supercharges passive income across all lifetimes.',
    icon: 'Cpu',
    baseCost: 3,
    costMultiplier: 1.6,
    maxLevel: 10,
    effect: (lvl) => ({
      clickMult: 1,
      cpsMult: 1 + lvl * 0.20,
      critChance: 0,
      critMult: 1,
      offlineMult: 1,
    }),
  },
  {
    id: 'lucky_stars',
    name: 'Cosmic Fortune',
    description: 'Increases critical strike frequency and critical coin yield.',
    icon: 'Sparkles',
    baseCost: 5,
    costMultiplier: 1.8,
    maxLevel: 5,
    effect: (lvl) => ({
      clickMult: 1,
      cpsMult: 1,
      critChance: lvl * 0.02,
      critMult: 1 + lvl * 0.5,
      offlineMult: 1,
    }),
  },
  {
    id: 'quantum_time',
    name: 'Quantum Slumber',
    description: 'Multiplies offline earnings rate when away from the screen.',
    icon: 'Moon',
    baseCost: 4,
    costMultiplier: 1.7,
    maxLevel: 5,
    effect: (lvl) => ({
      clickMult: 1,
      cpsMult: 1,
      critChance: 0,
      critMult: 1,
      offlineMult: 1 + lvl * 0.30,
    }),
  },
  {
    id: 'golden_resonance',
    name: 'Golden Resonance',
    description: 'Attracts rare floating Golden Matthew events more frequently.',
    icon: 'Crown',
    baseCost: 8,
    costMultiplier: 2.0,
    maxLevel: 5,
    effect: (lvl) => ({
      clickMult: 1,
      cpsMult: 1,
      critChance: 0,
      critMult: 1,
      offlineMult: 1,
    }),
  },
];
