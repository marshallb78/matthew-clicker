import { Skin, GameState } from '../types/game';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import { formatCoins } from '../utils/formatters';

export type { Skin };

/**
 * Season 1 Main Collectible Skins — Unlocked strictly by Points (Coins), purely cosmetic swag!
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
    fallbackImage: './images/skins/classic_matthew.png',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 2500,
      description: '2,500 Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 100000,
      description: '100K Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 10000000,
      description: '10M Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1000000000,
      description: '1B Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 25000000000,
      description: '25B Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 5000000000000,
      description: '5T Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e16,
      description: '10Qa Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e20,
      description: '100Qi Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e24,
      description: '1Sp Points',
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
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e29,
      description: '100Oc Points',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
];

/**
 * Season 1 Super-Super-Rare Secret/Endgame Character: Mathjew
 */
export const CHARACTER_SKINS: Skin[] = [
  {
    id: 'mathjew',
    name: 'Mathjew',
    rarity: 'Divine',
    category: 'characters',
    description: 'SUPER SUPER RARE endgame character unlocked only by true decillionaires.',
    perkDescription: 'Ultra-Rare Flex',
    image: './images/skins/mathjew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e34,
      description: '10Dc Points (Super Rare)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
];

/**
 * Season 2 Collectible Progression Skin Lineup!
 * Includes Anime Matthew, Minecraft Matthew, Moaning Matthew, Balenciaga Matthew, Matthgoon, and high-tier Season 2 unlocks!
 */
export const SEASON_2_SKINS: Skin[] = [
  {
    id: 'anime_matthew',
    name: 'Anime Matthew',
    rarity: 'Common',
    category: 'existing',
    description: 'Shonen protagonist power-up with dramatic speedlines.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/anime_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 2500,
      description: '2,500 Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'minecraft_matthew',
    name: 'Minecraft Matthew',
    rarity: 'Common',
    category: 'existing',
    description: 'Blocky 16-bit voxel Matthew with an enchanted diamond pickaxe.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/minecraft_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 100000,
      description: '100K Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'moaning_matthew',
    name: 'Moaning Matthew',
    rarity: 'Common',
    category: 'existing',
    description: 'Cursed max-volume classroom audio energy.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/moaning_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 10000000,
      description: '10M Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'balenciaga_matthew',
    name: 'Balenciaga Matthew',
    rarity: 'Rare',
    category: 'existing',
    description: 'Oversized luxury runway puffer and untouchable high-fashion drip.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/balenciaga_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1000000000,
      description: '1B Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'matthgoon',
    name: 'Matthgoon',
    rarity: 'Rare',
    category: 'existing',
    description: 'The legendary Season 2 return of the midnight goon-cave commander.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/matthgoon.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 25000000000,
      description: '25B Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'cyberpunk_matthew',
    name: 'Cyberpunk Matthew',
    rarity: 'Epic',
    category: 'existing',
    description: 'Neon cyberware implants and 2077 chrome optics.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/cyberpunk_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 5000000000000,
      description: '5T Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'super_saiyan_matthew',
    name: 'Super Saiyan Matthew',
    rarity: 'Legendary',
    category: 'existing',
    description: 'Blazing golden ki aura over 9,000 Quadrillion!',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/super_saiyan_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e16,
      description: '10Qa Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'glitched_matthew',
    name: 'Glitched Matrix Matthew',
    rarity: 'Legendary',
    category: 'existing',
    description: 'Rewriting the binary code of the Matthew simulation.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/glitched_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e20,
      description: '100Qi Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'void_emperor_matthew',
    name: 'Void Emperor Matthew',
    rarity: 'Mythic',
    category: 'existing',
    description: 'Commands dark matter and singularity storms across space-time.',
    perkDescription: 'Season 2 Collectible Swag',
    image: './images/skins/season2/void_emperor_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e24,
      description: '1Sp Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'omnipotent_matthew',
    name: 'Omnipotent Matthew',
    rarity: 'Divine',
    category: 'existing',
    description: 'Transcendent Season 2 ruler of all parallel dimensions.',
    perkDescription: 'Season 2 Ultimate Flex',
    image: './images/skins/season2/omnipotent_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e29,
      description: '100Oc Points (Season 2)',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 'gigachad_matthew',
    name: 'Giga-Chad Matthew',
    rarity: 'Divine',
    category: 'characters',
    description: 'Season 2 SUPER-RARE Decillionaire Secret Character!',
    perkDescription: 'Season 2 Ultra-Rare Flex',
    image: './images/skins/season2/gigachad_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    milestone: {
      type: 'lifetime_coins',
      target: 1e34,
      description: '10Dc Points (Season 2 Super Rare)',
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
  fallbackImage: './images/skins/classic_matthew.png',
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
 * Season 1: Five Secret Rare Matthew Storm Live Event Skins (50 Gems Each)
 */
export const MATTHEW_STORM_SKINS: Skin[] = [
  {
    id: 'matthew_storm_skin_1',
    name: 'Verity',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'Uncanny golden grin from the depths of the Matthew Storm.',
    perkDescription: 'Season 1 Live Event Exclusive',
    image: './images/skins/verity_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Friday Storm Event Shop',
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
    perkDescription: 'Season 1 Live Event Exclusive',
    image: './images/skins/tung_tung_sahur.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Friday Storm Event Shop',
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
    perkDescription: 'Season 1 Live Event Exclusive',
    image: './images/skins/ishowspeed_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Friday Storm Event Shop',
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
    perkDescription: 'Season 1 Live Event Exclusive',
    image: './images/skins/mrbeast_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Friday Storm Event Shop',
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
    perkDescription: 'Season 1 Live Event Exclusive',
    image: './images/skins/donald_trump_matthew.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Friday Storm Event Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
];

/**
 * Season 2: Five Brand-New Secret Super-Rare Live Event Skins (50 Gems Each — Season 2 Friday Event!)
 */
export const SEASON_2_STORM_SKINS: Skin[] = [
  {
    id: 's2_storm_skin_1',
    name: 'Skibidi Matthew',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'Season 2 Live Event Exclusive anomaly straight from Ohio.',
    perkDescription: 'Season 2 Live Event Exclusive',
    image: './images/skins/season2/s2_storm_skin_1.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Season 2 Friday Storm Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 's2_storm_skin_2',
    name: 'CaseOh Matthew',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: '1x1 Lego piece gravity well that shakes the entire screen.',
    perkDescription: 'Season 2 Live Event Exclusive',
    image: './images/skins/season2/s2_storm_skin_2.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Season 2 Friday Storm Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 's2_storm_skin_3',
    name: 'Kai Cenat Matthew',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'Non-stop Mafiathon subathon energy and W stream aura.',
    perkDescription: 'Season 2 Live Event Exclusive',
    image: './images/skins/season2/s2_storm_skin_3.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Season 2 Friday Storm Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 's2_storm_skin_4',
    name: 'Rizzler Matthew',
    rarity: 'Mythic',
    category: 'matthew_storm',
    description: 'Chin-stroking supreme rizz that multiplies pure swagger.',
    perkDescription: 'Season 2 Live Event Exclusive',
    image: './images/skins/season2/s2_storm_skin_4.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Season 2 Friday Storm Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
  {
    id: 's2_storm_skin_5',
    name: 'LeBron Sunshine Matthew',
    rarity: 'Divine',
    category: 'matthew_storm',
    description: 'You Are My Sunshine radiant golden basketball halo.',
    perkDescription: 'Season 2 Live Event Exclusive',
    image: './images/skins/season2/s2_storm_skin_5.png',
    fallbackImage: './images/skins/classic_matthew.png',
    gemCost: GEM_ECONOMY_CONFIG.stormSkinCostGems,
    isEventLimited: true,
    milestone: {
      type: 'storm_shop',
      target: GEM_ECONOMY_CONFIG.stormSkinCostGems,
      description: '50 Gems in Season 2 Friday Storm Shop',
    },
    clickBonusMultiplier: 1.0,
    cpsBonusMultiplier: 1.0,
    critBonusChance: 0,
  },
];

export const ALL_STORM_SKINS: Skin[] = [
  ...MATTHEW_STORM_SKINS,
  ...SEASON_2_STORM_SKINS,
];

/**
 * Publicly viewable skins in the "View All Skins" modal (excludes secret Storm Event skins!)
 */
export const PUBLIC_VIEWABLE_SKINS: Skin[] = [
  ...SKINS,
  ...CHARACTER_SKINS,
  CHAMPION_SKIN,
];

export const SEASON_2_PUBLIC_VIEWABLE_SKINS: Skin[] = [
  SKINS[0], // Classic Matthew
  ...SEASON_2_SKINS,
  CHAMPION_SKIN,
];

/**
 * Complete Master Registry of all skins across Season 1 & Season 2
 */
export const ALL_SKINS: Skin[] = [
  ...SKINS,
  ...CHARACTER_SKINS,
  ...SEASON_2_SKINS,
  CHAMPION_SKIN,
  ...MATTHEW_STORM_SKINS,
  ...SEASON_2_STORM_SKINS,
];

export function isSeasonTwoOrLater(seasonId?: string): boolean {
  if (!seasonId) return false;
  const num = parseInt(seasonId.replace('season_', ''), 10);
  return Number.isFinite(num) && num >= 2;
}

export function getProgressionSkinsForSeason(seasonId?: string): Skin[] {
  if (isSeasonTwoOrLater(seasonId)) {
    return [SKINS[0], ...SEASON_2_SKINS];
  }
  return [...SKINS, ...CHARACTER_SKINS];
}

export function getStormSkinsForSeason(seasonId?: string): Skin[] {
  if (isSeasonTwoOrLater(seasonId)) {
    return SEASON_2_STORM_SKINS;
  }
  return MATTHEW_STORM_SKINS;
}

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

  const current = Math.max(
    typeof state.coins === 'number' ? state.coins : 0,
    typeof state.lifetimeCoins === 'number' ? state.lifetimeCoins : 0
  );
  const isMet = current >= target;
  const percent = target > 0 ? Math.min(100, Math.floor((current / target) * 100)) : 100;
  const progressLabel = `${formatCoins(Math.floor(current))} / ${formatCoins(target)} Points`;

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

  const milestonePool = getProgressionSkinsForSeason(state.currentSeasonId);

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
