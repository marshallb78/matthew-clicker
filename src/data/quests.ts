import { Quest, GameState } from '../types/game';
import { getTotalUpgradesPurchased } from './skins';

export const QUESTS: Quest[] = [
  // Hard Daily Quests (Tuned for Click-Power Mastery)
  {
    id: 'daily_clicks_7500',
    title: 'Daily Carpal Tunnel Gauntlet',
    description: 'Land 7,500 manual clicks on Matthew.',
    scope: 'daily',
    type: 'clicks',
    target: 7500,
    rewardGems: 5,
    rewardCoins: 25000,
  },
  {
    id: 'daily_crits_600',
    title: 'Daily Critical Deadeye',
    description: 'Land 600 Critical Hits on Matthew.',
    scope: 'daily',
    type: 'crit_clicks',
    target: 600,
    rewardGems: 6,
    rewardCoins: 75000,
  },
  {
    id: 'daily_upgrades_150',
    title: 'Daily Empire Architect',
    description: 'Own at least 150 total upgrade levels simultaneously.',
    scope: 'daily',
    type: 'upgrades',
    target: 150,
    rewardGems: 7,
    rewardCoins: 250000,
  },
  {
    id: 'daily_coins_250m',
    title: 'Daily Centi-Millionaire',
    description: 'Accumulate 250,000,000 (250M) lifetime Matthew Coins.',
    scope: 'daily',
    type: 'coins',
    target: 250000000,
    rewardGems: 8,
    rewardCoins: 5000000,
  },
  {
    id: 'daily_rebirth_5',
    title: 'Daily Ascension Grinder',
    description: 'Complete 5 Rebirths to boost your Ascension Multiplier.',
    scope: 'daily',
    type: 'rebirth',
    target: 5,
    rewardGems: 10,
    rewardCoins: 15000000,
  },

  // Brutal Season Quests (Long-Term Seasonal Milestones)
  {
    id: 'season_clicks_100000',
    title: 'Season Click Ultramarathon',
    description: 'Reach 100,000 manual clicks during the current season.',
    scope: 'seasonal',
    type: 'clicks',
    target: 100000,
    rewardGems: 25,
    rewardCoins: 5000000,
  },
  {
    id: 'season_crits_10000',
    title: 'Season Critical Overlord',
    description: 'Land 10,000 Critical Hits during the current season.',
    scope: 'seasonal',
    type: 'crit_clicks',
    target: 10000,
    rewardGems: 30,
    rewardCoins: 25000000,
  },
  {
    id: 'season_upgrades_450',
    title: 'Season Monopoly Sovereign',
    description: 'Own 450 total upgrade levels simultaneously.',
    scope: 'seasonal',
    type: 'upgrades',
    target: 450,
    rewardGems: 35,
    rewardCoins: 500000000,
  },
  {
    id: 'season_rebirth_25',
    title: 'Season Ascension Immortal',
    description: 'Complete 25 Rebirths during the current season.',
    scope: 'seasonal',
    type: 'rebirth',
    target: 25,
    rewardGems: 45,
    rewardCoins: 5000000000,
  },
  {
    id: 'season_coins_100t',
    title: 'Season Centi-Trillionaire Titan',
    description: 'Generate 100,000,000,000,000 (100T) lifetime Matthew Coins.',
    scope: 'seasonal',
    type: 'coins',
    target: 100000000000000,
    rewardGems: 60,
    rewardCoins: 2500000000000,
  },
  {
    id: 'season_coins_50qa',
    title: 'Season 50-Quadrillionaire Deity',
    description: 'Generate 50,000,000,000,000,000 (50Qa) lifetime Matthew Coins.',
    scope: 'seasonal',
    type: 'coins',
    target: 50000000000000000,
    rewardGems: 100,
    rewardCoins: 1000000000000000,
  },
];

export function getQuestProgress(
  quest: Quest,
  state: GameState
): { current: number; target: number; percent: number; isComplete: boolean } {
  let current = 0;
  switch (quest.type) {
    case 'clicks':
      current = state.clicks;
      break;
    case 'coins':
      current = state.lifetimeCoins;
      break;
    case 'crit_clicks':
      current = state.criticalClicks;
      break;
    case 'upgrades':
      current = getTotalUpgradesPurchased(state.upgrades);
      break;
    case 'rebirth':
      current = state.prestigeCount;
      break;
    default:
      current = 0;
      break;
  }

  const isComplete = current >= quest.target;
  const percent = quest.target > 0 ? Math.min(100, Math.floor((current / quest.target) * 100)) : 100;
  return { current, target: quest.target, percent, isComplete };
}
