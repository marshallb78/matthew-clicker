import { Skin, GameState } from '../types/game';

export type { Skin };

export const SKINS: Skin[] = [
  {
    id: 'classic_matthew',
    name: 'Classic Matthew',
    rarity: 'Common',
    description: 'The real Matthew with his authentic look.',
    perkDescription: 'Default baseline',
    image: './images/skins/classic-normal.png',
    milestone: {
      type: 'free',
      target: 0,
      description: 'Available immediately',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'aura_matthew',
    name: 'Aura Matthew',
    rarity: 'Rare',
    description: 'Crackling electric energy.',
    perkDescription: '+12% Per Second',
    image: './images/skins/aura-normal.png',
    milestone: {
      type: 'clicks',
      target: 100,
      description: '100 Total Clicks',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.12,
    critBonusChance: 0.01,
  },
  {
    id: 'sad_matthew',
    name: 'Sad Matthew',
    rarity: 'Common',
    description: 'Dropped his snack. Pure tears.',
    perkDescription: '+5% Per Click',
    image: './images/skins/sad-normal.png',
    milestone: {
      type: 'lifetime_coins',
      target: 500,
      description: '500 Lifetime Coins',
    },
    clickBonusMultiplier: 1.05,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'angry_matthew',
    name: 'Angry Matthew',
    rarity: 'Common',
    description: 'Fuming with steam.',
    perkDescription: '+10% Per Click',
    image: './images/skins/angry-normal.png',
    milestone: {
      type: 'clicks',
      target: 1000,
      description: '1,000 Total Clicks',
    },
    clickBonusMultiplier: 1.10,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0.01,
  },
  {
    id: 'sigma_matthew',
    name: 'Sigma Matthew',
    rarity: 'Rare',
    description: 'Cool shades & grinding.',
    perkDescription: '+15% Crit Power',
    image: './images/skins/sigma-normal.png',
    milestone: {
      type: 'upgrades',
      target: 10,
      description: '10 Regular Upgrades Purchased',
    },
    clickBonusMultiplier: 1.08,
    cpsBonusMultiplier: 1.05,
    critBonusChance: 0.02,
  },
  {
    id: 'golden_matthew',
    name: 'Golden Matthew',
    rarity: 'Legendary',
    description: 'Pure 24K solid gold royalty.',
    perkDescription: '+35% All Coins',
    image: './images/skins/golden-normal.png',
    milestone: {
      type: 'lifetime_coins',
      target: 10000,
      description: '10,000 Lifetime Coins',
    },
    clickBonusMultiplier: 1.35,
    cpsBonusMultiplier: 1.35,
    critBonusChance: 0.03,
  },
  {
    id: 'diamond_matthew',
    name: 'Diamond Matthew',
    rarity: 'Legendary',
    description: 'Sparkling diamond gemstone.',
    perkDescription: '+40% Click, +4% Crit',
    image: './images/skins/diamond-normal.png',
    milestone: {
      type: 'lifetime_coins',
      target: 50000,
      description: '50,000 Lifetime Coins',
    },
    clickBonusMultiplier: 1.40,
    cpsBonusMultiplier: 1.20,
    critBonusChance: 0.04,
  },
  {
    id: 'fire_matthew',
    name: 'Fire Matthew',
    rarity: 'Epic',
    description: 'Surrounded by roaring flames.',
    perkDescription: '+25% Per Second',
    image: './images/skins/fire-normal.png',
    milestone: {
      type: 'cps',
      target: 100,
      description: '100 Coins Per Second',
    },
    clickBonusMultiplier: 1.08,
    cpsBonusMultiplier: 1.25,
    critBonusChance: 0.02,
  },
  {
    id: 'ice_matthew',
    name: 'Ice Matthew',
    rarity: 'Epic',
    description: 'Sub-zero crystal frost.',
    perkDescription: '+20% Offline, +15% CPS',
    image: './images/skins/ice-normal.png',
    milestone: {
      type: 'achievements',
      target: 6,
      description: '6 Achievements Unlocked',
    },
    clickBonusMultiplier: 1.10,
    cpsBonusMultiplier: 1.15,
    critBonusChance: 0.02,
  },
  {
    id: 'galaxy_matthew',
    name: 'Galaxy Matthew',
    rarity: 'Mythic',
    description: 'Cosmic nebula & planetary rings.',
    perkDescription: '+100% All Earnings',
    image: './images/skins/galaxy-normal.png',
    milestone: {
      type: 'rebirth',
      target: 1,
      description: '1st Cosmic Rebirth',
    },
    clickBonusMultiplier: 2.00,
    cpsBonusMultiplier: 2.00,
    critBonusChance: 0.06,
  },
  {
    id: 'evil_matthew',
    name: 'Evil Matthew',
    rarity: 'Epic',
    description: 'Demon horns & mischievous grin.',
    perkDescription: '+20% Crit Multiplier',
    image: './images/skins/evil-normal.png',
    milestone: {
      type: 'lifetime_coins',
      target: 250000,
      description: '250,000 Lifetime Coins',
    },
    clickBonusMultiplier: 1.15,
    cpsBonusMultiplier: 1.10,
    critBonusChance: 0.03,
  },
  {
    id: 'sleepy_matthew',
    name: 'Sleepy Matthew',
    rarity: 'Common',
    description: 'Cozy nightcap & snoozing.',
    perkDescription: '+5% Per Second',
    image: './images/skins/sleepy-normal.png',
    milestone: {
      type: 'upgrades',
      target: 50,
      description: '50 Regular Upgrades Purchased',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.05,
    critBonusChance: 0,
  },
  {
    id: 'rich_matthew',
    name: 'Rich Matthew',
    rarity: 'Epic',
    description: 'Top hat & golden monocle.',
    perkDescription: '+15% Click, +10% CPS',
    image: './images/skins/rich-normal.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1000000,
      description: '1,000,000 Lifetime Coins',
    },
    clickBonusMultiplier: 1.15,
    cpsBonusMultiplier: 1.10,
    critBonusChance: 0.02,
  },
  {
    id: 'glitch_matthew',
    name: 'Glitch Matthew',
    rarity: 'Mythic',
    description: 'Digital cyber matrix split.',
    perkDescription: '+60% Click Power',
    image: './images/skins/glitch-normal.png',
    milestone: {
      type: 'rebirth',
      target: 2,
      description: '2 Cosmic Rebirths',
    },
    clickBonusMultiplier: 1.60,
    cpsBonusMultiplier: 1.30,
    critBonusChance: 0.05,
  },
  {
    id: 'rainbow_matthew',
    name: 'Rainbow Matthew',
    rarity: 'Mythic',
    description: 'Flowing rainbow spectrum joy.',
    perkDescription: '+50% All Earnings',
    image: './images/skins/rainbow-normal.png',
    milestone: {
      type: 'skins_unlocked',
      target: 12,
      description: '12 Matthew Forms Unlocked',
    },
    clickBonusMultiplier: 1.50,
    cpsBonusMultiplier: 1.50,
    critBonusChance: 0.04,
  },
  {
    id: 'god_matthew',
    name: 'God Matthew',
    rarity: 'Divine',
    description: 'Sacred golden sun halo deity.',
    perkDescription: '+200% All Earnings',
    image: './images/skins/god-normal.png',
    milestone: {
      type: 'lifetime_coins',
      target: 10000000,
      description: '10,000,000 Lifetime Coins',
    },
    clickBonusMultiplier: 3.0,
    cpsBonusMultiplier: 3.0,
    critBonusChance: 0.10,
  },
];

export function getTotalUpgradesPurchased(upgrades: Record<string, number>): number {
  return Object.values(upgrades).reduce((sum, lvl) => sum + (lvl || 0), 0);
}

export interface MilestoneProgress {
  current: number;
  target: number;
  percent: number;
  isMet: boolean;
  progressLabel: string;
}

export function getSkinMilestoneProgress(
  skin: Skin,
  state: GameState,
  currentCps: number
): MilestoneProgress {
  const { type, target } = skin.milestone;

  let current = 0;
  let progressLabel = '';

  switch (type) {
    case 'free':
      return { current: 0, target: 0, percent: 100, isMet: true, progressLabel: 'Unlocked' };
    case 'clicks':
      current = state.clicks;
      progressLabel = `${current.toLocaleString()} / ${target.toLocaleString()} Clicks`;
      break;
    case 'lifetime_coins':
      current = state.lifetimeCoins;
      progressLabel = `${Math.floor(current).toLocaleString()} / ${target.toLocaleString()} Coins`;
      break;
    case 'upgrades':
      current = getTotalUpgradesPurchased(state.upgrades);
      progressLabel = `${current} / ${target} Upgrades`;
      break;
    case 'cps':
      current = currentCps;
      progressLabel = `${Math.floor(current).toLocaleString()} / ${target.toLocaleString()} CPS`;
      break;
    case 'achievements':
      current = state.unlockedAchievements.length;
      progressLabel = `${current} / ${target} Achievements`;
      break;
    case 'rebirth':
      current = state.prestigeCount;
      progressLabel = `${current} / ${target} Rebirths`;
      break;
    case 'skins_unlocked':
      current = state.unlockedSkins.length;
      progressLabel = `${current} / ${target} Forms`;
      break;
  }

  const isMet = current >= target;
  const percent = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;

  return {
    current,
    target,
    percent,
    isMet,
    progressLabel,
  };
}
