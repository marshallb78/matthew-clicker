import { Skin, GameState } from '../types/game';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';

export type { Skin };

/**
 * Main Collectible Skins — Unlocked strictly by Points (Coins), purely cosmetic swag!
 */
export const SKINS: Skin[] = [
  {
    id: 'classic_matthew',
    name: 'Classic Matthew',
    rarity: 'Common',
    category: 'existing',
    description: 'The original Matthew. Pure baseline swag.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/classic_matthew.png',
    fallbackImage: './assets/skins/existing/classic_matthew.svg',
    milestone: {
      type: 'free',
      target: 0,
      description: 'Starter Matthew',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'broke_matthew',
    name: 'Broke Matthew',
    rarity: 'Common',
    category: 'existing',
    description: 'Down to his last crumpled dollar bills.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/broke_matthew.png',
    fallbackImage: './assets/skins/existing/classic_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 500,
      description: '500 Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'sad_matthew',
    name: 'Sad Matthew',
    rarity: 'Common',
    description: 'Dropped his snack. Pure collectible tears.',
    category: 'existing',
    perkDescription: 'Collectible Swag',
    image: './images/skins/sad_matthew.png',
    fallbackImage: './assets/skins/existing/sad_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 5000,
      description: '5,000 Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'sleepy_matthew',
    name: 'Sleepy Matthew',
    rarity: 'Common',
    category: 'existing',
    description: 'Yawning through the late-night grind.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/sleepy_matthew.png',
    fallbackImage: './assets/skins/existing/sleepy_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 75000,
      description: '75K Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'angry_matthew',
    name: 'Angry Matthew',
    rarity: 'Rare',
    category: 'existing',
    description: 'Fuming with pure competitive rage.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/angry_matthew.png',
    fallbackImage: './assets/skins/existing/angry_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 1500000,
      description: '1.5M Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'aura_matthew',
    name: 'Aura Matthew',
    rarity: 'Rare',
    category: 'existing',
    description: 'Crackling +999,999 electric lightning aura.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/aura_matthew.png',
    fallbackImage: './assets/skins/existing/aura_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 35000000,
      description: '35M Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'sigma_matthew',
    name: 'Sigma Matthew',
    rarity: 'Epic',
    category: 'existing',
    description: 'Locked-in shades and unstoppable mogging.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/sigma_matthew.png',
    fallbackImage: './assets/skins/existing/sigma_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 750000000,
      description: '750M Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'golden_matthew',
    name: 'Golden Matthew',
    rarity: 'Legendary',
    category: 'existing',
    description: 'Solid 24K gold flex.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/golden_matthew.png',
    fallbackImage: './assets/skins/existing/golden_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 20000000000,
      description: '20B Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'diamond_matthew',
    name: 'Diamond Matthew',
    rarity: 'Legendary',
    category: 'existing',
    description: 'Flawless crystalline diamond facets.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/diamond_matthew.png',
    fallbackImage: './assets/skins/existing/diamond_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 600000000000,
      description: '600B Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'galaxy_matthew',
    name: 'Galaxy Matthew',
    rarity: 'Mythic',
    category: 'existing',
    description: 'Cosmic nebula and starfield consciousness.',
    perkDescription: 'Collectible Swag',
    image: './images/skins/galaxy_matthew.png',
    fallbackImage: './assets/skins/existing/galaxy_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 25000000000000,
      description: '25T Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'god_matthew',
    name: 'God Matthew',
    rarity: 'Divine',
    category: 'existing',
    description: 'Sacred golden sun halo & royal crown deity.',
    perkDescription: 'Ultimate Bragging Rights',
    image: './images/skins/god_matthew.png',
    fallbackImage: './assets/skins/existing/god_matthew.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 1000000000000000,
      description: '1Qa Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
];

/**
 * Super-Super-Rare Secret/Endgame Character: Mathjew (Mathgoon removed!)
 */
export const CHARACTER_SKINS: Skin[] = [
  {
    id: 'mathjew',
    name: 'Mathjew',
    rarity: 'Divine',
    category: 'characters',
    description: 'SUPER SUPER RARE endgame character unlocked only by true quadrillionaires.',
    perkDescription: 'Ultra-Rare Flex',
    image: './images/skins/mathjew.png',
    fallbackImage: './assets/skins/characters/mathjew_normal.svg',
    milestone: {
      type: 'lifetime_coins',
      target: 50000000000000000,
      description: '50Qa Points (Super Rare)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
];

/**
 * Exclusive Season Champion Skin (#1 Leaderboard Winner)
 */
export const CHAMPION_SKIN: Skin = {
  id: 'champion_matthew',
  name: 'World Champion Matthew',
  rarity: 'Divine',
  category: 'champion',
  description: 'Awarded exclusively to the #1 Worldwide Season Leaderboard Winner.',
  perkDescription: '#1 World Champion Flex',
  image: './images/skins/champion_matthew.png',
  fallbackImage: './assets/skins/champion/champion_matthew.svg',
  milestone: {
    type: 'season_champion',
    target: 1,
    description: 'Finish #1 Worldwide at Season End',
  },
  clickBonusMultiplier: 1.0,
  cpsBonusMultiplier: 1.0,
  critBonusChance: 0,
};

/**
 * Five Secret Rare Matthew Storm Live Event Skins (50 Gems Each — Only viewable in Storm Shop during Live Event!)
 * 1. Verity
 * 2. Tung Tung Tung Sahur
 * 3. IShowSpeed Matthew
 * 4. MrBeast Matthew
 * 5. Donald Trump Matthew
 */
export const MATTHEW_STORM_SKINS: Skin[] = [
  {
    id: 'matthew_storm_skin_1',
    name: 'Verity',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'Uncanny golden grin from the depths of the Matthew Storm.',
    perkDescription: 'Live Event Exclusive',
    image: './images/skins/verity_matthew.png',
    fallbackImage: './assets/skins/events/matthew-storm/storm_skin_1.svg',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Matthew Storm Event Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'matthew_storm_skin_2',
    name: 'Tung Tung Tung Sahur',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'Ancient carved wooden log anomaly awakened by the storm.',
    perkDescription: 'Live Event Exclusive',
    image: './images/skins/tung_tung_sahur.png',
    fallbackImage: './assets/skins/events/matthew-storm/storm_skin_2.svg',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Matthew Storm Event Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'matthew_storm_skin_3',
    name: 'IShowSpeed Matthew',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'Maximum bark, maximum speed, unstoppable live-stream chaos.',
    perkDescription: 'Live Event Exclusive',
    image: './images/skins/ishowspeed_matthew.png',
    fallbackImage: './assets/skins/events/matthew-storm/storm_skin_3.svg',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Matthew Storm Event Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'matthew_storm_skin_4',
    name: 'MrBeast Matthew',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'I Just Bought Every Matthew In The World For 50 Gems!',
    perkDescription: 'Live Event Exclusive',
    image: './images/skins/mrbeast_matthew.png',
    fallbackImage: './assets/skins/events/matthew-storm/storm_skin_4.svg',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Matthew Storm Event Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'matthew_storm_skin_5',
    name: 'Donald Trump Matthew',
    rarity: 'Divine',
    category: 'matthew_storm',
    description: 'The biggest clicks, the best clicks, nobody clicks like this.',
    perkDescription: 'Live Event Exclusive',
    image: './images/skins/donald_trump_matthew.png',
    fallbackImage: './assets/skins/events/matthew-storm/storm_skin_5.svg',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Matthew Storm Event Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
];

/**
 * Publicly viewable skins in the "View All Skins" modal (excludes secret Storm Event skins!)
 */
export const PUBLIC_VIEWABLE_SKINS: Skin[] = [
  ...SKINS,
  ...CHARACTER_SKINS,
  CHAMPION_SKIN,
];

/**
 * Complete Master Registry of all skins (including secret Storm Event skins)
 */
export const ALL_SKINS: Skin[] = [
  ...SKINS,
  ...CHARACTER_SKINS,
  CHAMPION_SKIN,
  ...MATTHEW_STORM_SKINS,
];

export function getSkinById(skinId: string): Skin {
  return ALL_SKINS.find((s) => s.id === skinId) || SKINS[0];
}

export function getTotalUpgradesPurchased(upgrades: Record<string, number>): number {
  if (!upgrades || typeof upgrades !== 'object') return 0;
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
  _currentCps: number = 0
): MilestoneProgress {
  const { type, target } = skin.milestone;

  if (type === 'free') {
    return { current: 0, target: 0, percent: 100, isMet: true, progressLabel: 'Unlocked' };
  }

  if (type === 'storm_shop') {
    const owned = state.unlockedSkins?.includes(skin.id);
    return {
      current: owned ? target : 0,
      target,
      percent: owned ? 100 : 0,
      isMet: false,
      progressLabel: `${target} Gems (Storm Shop)`,
    };
  }

  if (type === 'season_champion') {
    const owned = state.unlockedSkins?.includes(skin.id);
    return {
      current: owned ? 1 : 0,
      target: 1,
      percent: owned ? 100 : 0,
      isMet: false,
      progressLabel: '#1 Season Winner',
    };
  }

  // Point-based unlock (uses max of current coins and lifetimeCoins)
  const current = Math.max(
    typeof state.coins === 'number' ? state.coins : 0,
    typeof state.lifetimeCoins === 'number' ? state.lifetimeCoins : 0
  );
  const isMet = current >= target;
  const percent = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
  const progressLabel = `${Math.floor(current).toLocaleString()} / ${target.toLocaleString()} Points`;

  return {
    current,
    target,
    percent,
    isMet,
    progressLabel,
  };
}

export function isValidSkinId(skinId: string): boolean {
  return Boolean(skinId) && ALL_SKINS.some((s) => s.id === skinId);
}

export function isSkinUnlocked(state: GameState, skinId: string): boolean {
  return Boolean(state.unlockedSkins && state.unlockedSkins.includes(skinId));
}

export function canEquipSkin(state: GameState, skinId: string): boolean {
  return isValidSkinId(skinId) && isSkinUnlocked(state, skinId);
}

export function equipSkin(state: GameState, skinId: string): GameState {
  if (!canEquipSkin(state, skinId)) {
    return state;
  }

  if (state.equippedSkin === skinId) {
    return state;
  }

  return {
    ...state,
    equippedSkin: skinId,
  };
}

export function checkAndApplyMilestoneUnlocks(
  currentState: GameState,
  currentCps: number = 0,
  autoEquip = true
): { state: GameState; newlyUnlocked: Skin[] } {
  let state = { ...currentState };
  const newlyUnlocked: Skin[] = [];

  const milestonePool = [...SKINS, ...CHARACTER_SKINS];

  for (const skin of milestonePool) {
    if (!state.unlockedSkins.includes(skin.id)) {
      const progress = getSkinMilestoneProgress(skin, state, currentCps);
      if (progress.isMet) {
        state = {
          ...state,
          unlockedSkins: [...state.unlockedSkins, skin.id],
        };
        newlyUnlocked.push(skin);
      }
    }
  }

  if (autoEquip && newlyUnlocked.length > 0) {
    const highestNewSkin = newlyUnlocked[newlyUnlocked.length - 1];
    state = equipSkin(state, highestNewSkin.id);
  }

  return { state, newlyUnlocked };
}
