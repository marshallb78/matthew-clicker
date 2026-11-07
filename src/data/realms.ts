import { RealmDefinition, RealmId, GameState } from '../types/game';
import { getTotalUpgradesPurchased } from './skins';

export const REALMS: RealmDefinition[] = [
  {
    id: 'earth',
    order: 1,
    name: 'Earth',
    tagline: 'The terrestrial birthplace of Matthew Chaos',
    description: 'Lush continents, humming servers, and the classic bedroom studio where the clicking madness began.',
    atmosphere: 'emerald-sky',
    accentColor: '#22c55e',
    coinMultiplier: 1.0,
    skinRewardId: 'earth_matthew',
    requirements: {
      lifetimeCoins: 0,
      upgradesPurchased: 0,
      clicks: 0,
      rebirths: 0,
    },
  },
  {
    id: 'under',
    order: 2,
    name: 'Under',
    tagline: 'A terrifying, pitch-black subterranean dread realm',
    description: 'Flickering blood-crimson embers, whispering shadows, and ancient obsidian monoliths beneath the crust.',
    atmosphere: 'crimson-abyss',
    accentColor: '#ef4444',
    coinMultiplier: 2.5,
    skinRewardId: 'under_matthew',
    requirements: {
      lifetimeCoins: 25000,
      upgradesPurchased: 15,
      clicks: 250,
      rebirths: 0,
    },
  },
  {
    id: 'ocean',
    order: 3,
    name: 'Ocean',
    tagline: 'Crushing pressure in the bioluminescent trench',
    description: 'Colossal leviathan currents, neon jellyfish blooms, and sunken golden vaults at 11,000 meters depth.',
    atmosphere: 'abyssal-trench',
    accentColor: '#06b6d4',
    coinMultiplier: 6.0,
    skinRewardId: 'ocean_matthew',
    requirements: {
      lifetimeCoins: 500000,
      upgradesPurchased: 40,
      clicks: 1000,
      rebirths: 0,
    },
  },
  {
    id: 'space',
    order: 4,
    name: 'Space',
    tagline: 'Zero-gravity orbital arrays & supernova nebulae',
    description: 'Dyson swarms harvesting pure Matthew energy across swirling violet galaxies and event horizons.',
    atmosphere: 'cosmic-void',
    accentColor: '#a855f7',
    coinMultiplier: 16.0,
    skinRewardId: 'space_matthew',
    requirements: {
      lifetimeCoins: 10000000,
      upgradesPurchased: 80,
      clicks: 2500,
      rebirths: 1,
    },
  },
  {
    id: 'uper',
    order: 5,
    name: 'Uper',
    tagline: 'The Final Realm beyond reality itself',
    description: 'Transcendent golden geometry where time folds, numbers shatter, and only true legends claim the gt3 seal.',
    atmosphere: 'omniversal-apex',
    accentColor: '#facc15',
    coinMultiplier: 50.0,
    skinRewardId: 'uper_matthew',
    requirements: {
      lifetimeCoins: 250000000,
      upgradesPurchased: 140,
      clicks: 5000,
      rebirths: 3,
    },
  },
];

export function getRealmById(id: RealmId): RealmDefinition {
  return REALMS.find((r) => r.id === id) || REALMS[0];
}

export interface RealmRequirementCheck {
  isMet: boolean;
  coinsPercent: number;
  upgradesPercent: number;
  clicksPercent: number;
  rebirthsPercent: number;
  overallPercent: number;
  currentUpgrades: number;
}

export function checkRealmRequirements(realm: RealmDefinition, state: GameState): RealmRequirementCheck {
  const req = realm.requirements;
  const currentUpgrades = getTotalUpgradesPurchased(state.upgrades);

  const coinsPercent = req.lifetimeCoins > 0 ? Math.min(100, Math.floor((state.lifetimeCoins / req.lifetimeCoins) * 100)) : 100;
  const upgradesPercent = req.upgradesPurchased > 0 ? Math.min(100, Math.floor((currentUpgrades / req.upgradesPurchased) * 100)) : 100;
  const clicksPercent = req.clicks > 0 ? Math.min(100, Math.floor((state.clicks / req.clicks) * 100)) : 100;
  const rebirthsPercent = req.rebirths > 0 ? Math.min(100, Math.floor((state.prestigeCount / req.rebirths) * 100)) : 100;

  const isMet =
    state.lifetimeCoins >= req.lifetimeCoins &&
    currentUpgrades >= req.upgradesPurchased &&
    state.clicks >= req.clicks &&
    state.prestigeCount >= req.rebirths;

  const overallPercent = Math.floor((coinsPercent + upgradesPercent + clicksPercent + rebirthsPercent) / 4);

  return {
    isMet,
    coinsPercent,
    upgradesPercent,
    clicksPercent,
    rebirthsPercent,
    overallPercent,
    currentUpgrades,
  };
}

