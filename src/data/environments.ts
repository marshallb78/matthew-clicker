export interface Environment {
  id: string;
  name: string;
  unlockDescription: string;
  unlockCoins?: number;
  rebirthRequired?: number;
  icon: string;
  tagline: string;
}

export const ENVIRONMENTS: Environment[] = [
  {
    id: 'matthew_room',
    name: "Matthew's Bedroom",
    unlockDescription: 'Starter cozy space',
    unlockCoins: 0,
    icon: '🏠',
    tagline: 'Warm desk lamp and cozy gaming atmosphere',
  },
  {
    id: 'neon_gaming',
    name: 'Neon Gaming Room',
    unlockDescription: 'Earn 1,000 Lifetime Coins',
    unlockCoins: 1000,
    icon: '⚡',
    tagline: 'Cyberpunk RGB LED strips & dual ultrawide glow',
  },
  {
    id: 'golden_palace',
    name: 'Golden Palace',
    unlockDescription: 'Earn 50,000 Lifetime Coins',
    unlockCoins: 50000,
    icon: '👑',
    tagline: 'Gilded marble pillars & 24K royal coin chandeliers',
  },
  {
    id: 'fire_dimension',
    name: 'Fire Dimension',
    unlockDescription: 'Earn 500,000 Lifetime Coins',
    unlockCoins: 500000,
    icon: '🔥',
    tagline: 'Molten volcanic magma fissures & glowing heat embers',
  },
  {
    id: 'ice_kingdom',
    name: 'Ice Kingdom',
    unlockDescription: 'Earn 5,000,000 Lifetime Coins',
    unlockCoins: 5000000,
    icon: '❄️',
    tagline: 'Glacial frost spires & shimmering polar auroras',
  },
  {
    id: 'galaxy_world',
    name: 'Galaxy World',
    unlockDescription: '1st Cosmic Rebirth or 50M Coins',
    unlockCoins: 50000000,
    rebirthRequired: 1,
    icon: '🌌',
    tagline: 'Deep cosmic nebulae & orbiting planetary rings',
  },
  {
    id: 'divine_realm',
    name: 'Divine Matthew Realm',
    unlockDescription: '3rd Cosmic Rebirth or 250M Coins',
    unlockCoins: 250000000,
    rebirthRequired: 3,
    icon: '☀️',
    tagline: 'Sacred golden sunbeams & transcendent celestial clouds',
  },
];

