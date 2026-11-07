import { Quest, GameState } from '../types/game';
import { getTotalUpgradesPurchased } from './skins';

export const QUESTS: Quest[] = [
  // Hard Daily Quests
  {
    id: 'daily_clicks_2500',
    title: 'Daily Carpal Tunnel Trial',
    description: 'Reach 2,500 manual clicks on Matthew.',
    scope: 'daily',
    type: 'clicks',
    target: 2500,
    rewardGems: 5,
    rewardCoins: 25000,
  },
  {
    id: 'daily_crits_200',
    title: 'Daily Critical Sniper',
    description: 'Land 200 Critical Hits on Matthew.',
    scope: 'daily',
    type: 'crit_clicks',
    target: 200,
    rewardGems: 6,
    rewardCoins: 75000,
  },
  {
    id: 'daily_upgrades_75',
    title: 'Daily Empire Builder',
    description: 'Own at least 75 total upgrade levels.',
    scope: 'daily',
    type: 'upgrades',
    target: 75,
    rewardGems: 6,
    rewardCoins: 250000,
  },
  {
    id: 'daily_coins_5m',
    title: 'Daily Multi-Millionaire',
    description: 'Accumulate 5,000,000 lifetime Matthew Coins.',
    scope: 'daily',
    type: 'coins',
    target: 5000000,
    rewardGems: 8,
    rewardCoins: 750000,
  },
  {
    id: 'daily_rebirth_2',
    title: 'Daily Ascension Hustle',
    description: 'Complete 2 Rebirths to boost your Ascension Multiplier.',
    scope: 'daily',
    type: 'rebirth',
    target: 2,
    rewardGems: 10,
    rewardCoins: 1500000,
  },

  // Hard Season Quests
  {
    id: 'season_clicks_25000',
    title: 'Season Click Marathon',
    description: 'Reach 25,000 manual clicks during the current season.',
    scope: 'seasonal',
    type: 'clicks',
    target: 25000,
    rewardGems: 20,
    rewardCoins: 10000000,
  },
  {
    id: 'season_crits_2500',
    title: 'Season Executioner',
    description: 'Land 2,500 Critical Hits during the current season.',
    scope: 'seasonal',
    type: 'crit_clicks',
    target: 2500,
    rewardGems: 25,
    rewardCoins: 50000000,
  },
  {
    id: 'season_upgrades_300',
    title: 'Season Monopoly Tycoon',
    description: 'Own 300 total upgrade levels simultaneously.',
    scope: 'seasonal',
    type: 'upgrades',
    target: 300,
    rewardGems: 30,
    rewardCoins: 500000000,
  },
  {
    id: 'season_rebirth_10',
    title: 'Season Ascension Grandmaster',
    description: 'Complete 10 Rebirths during the current season.',
    scope: 'seasonal',
    type: 'rebirth',
    target: 10,
    rewardGems: 35,
    rewardCoins: 2500000000,
  },
  {
    id: 'season_coins_1t',
    title: 'Season Trillionaire Titan',
    description: 'Generate 1,000,000,000,000 (1T) lifetime Matthew Coins.',
    scope: 'seasonal',
    type: 'coins',
    target: 1000000000000,
    rewardGems: 50,
    rewardCoins: 50000000000,
  },
  {
    id: 'season_coins_1qa',
    title: 'Season Quadrillionaire God',
    description: 'Generate 1,000,000,000,000,000 (1Qa) lifetime Matthew Coins.',
    scope: 'seasonal',
    type: 'coins',
    target: 1000000000000000,
    rewardGems: 100,
    rewardCoins: 10000000000000,
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
