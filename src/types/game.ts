export type SkinRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Divine';

export interface Skin {
  id: string;
  name: string;
  rarity: SkinRarity;
  description: string;
  perkDescription: string;
  image: string;
  unlockRequirementText: string;
  unlockCondition: (stats: GameState) => boolean;
  clickBonusMultiplier: number; // e.g. 1.1 = +10% click power
  cpsBonusMultiplier: number;   // e.g. 1.05 = +5% passive CPS
  critBonusChance: number;      // e.g. 0.02 = +2% crit chance
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  baseCps: number;
  baseClickPower: number;
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
  effect: (level: number) => {
    clickMult: number;
    cpsMult: number;
    critChance: number;
    critMult: number;
    offlineMult: number;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rewardText: string;
  condition: (stats: GameState) => boolean;
  bonusRewardCoins?: number;
  bonusRewardShards?: number;
}

export interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: string;
  isCrit: boolean;
  color?: string;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  isMuted: boolean;
  isMusicPlaying: boolean;
  reducedMotion: boolean;
  showParticles: boolean;
  theme: 'cyber' | 'dark' | 'neon';
}

export interface GameState {
  coins: number;
  lifetimeCoins: number;
  clicks: number;
  criticalClicks: number;
  combo: number;
  comboTimer: number;
  frenzyTimer: number;
  frenzyMultiplier: number;

  upgrades: Record<string, number>; // upgradeId -> level
  equippedSkin: string;
  unlockedSkins: string[];
  unlockedAchievements: string[];

  prestigeCount: number;
  prestigeShards: number;
  lifetimePrestigeShards: number;
  prestigeUpgrades: Record<string, number>;

  lastSaveTime: number;
  totalPlaytimeSeconds: number;
  goldenMatthewsClicked: number;
  settings: GameSettings;
}
