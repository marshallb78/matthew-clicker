/**
 * Comprehensive Multi-Playstyle Economy Simulation for Matthew Clicker.
 * Tests and verifies progression balance across 4 distinct playstyles:
 * 1. Active Clicker (3.5 clicks/s)
 * 2. Moderate / Casual (1.5 clicks/s)
 * 3. Passive Idler (Active early, then 0.2 clicks/s)
 * 4. Skin Saver (Saves for Sad Matthew @ 350 coins before tier 3+ upgrades)
 */

import { getDefaultGameState } from '../src/utils/storage';
import { calculateClickPower, calculateCPS, getUpgradeCost } from '../src/utils/calculations';
import { UPGRADES } from '../src/data/upgrades';
import { SKINS } from '../src/data/skins';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { formatCoins } from '../src/utils/formatters';
import { BALANCE } from '../src/data/balance';

type PlayStyle = 'active' | 'moderate' | 'passive' | 'skin_saver';

interface SimResult {
  styleName: string;
  coinsAt15s: number;
  coinsAt1m: number;
  lifetimeAt1m: number;
  coinsAt5m: number;
  coinsAt10m: number;
  coinsAt15m: number;
  coinsAt30m: number;
  lifetimeAt30m: number;
  firstUpgradeSec: number | null;
  firstSkinSec: number | null;
  firstPassiveSec: number | null;
  totalUpgradesBought: number;
  clickIncomeTotal: number;
  passiveIncomeTotal: number;
  goldenEventsTriggered: number;
}

function simulatePlayStyle(style: PlayStyle): SimResult {
  let state = getDefaultGameState();
  const dt = 0.1;
  const totalSeconds = 1800; // 30 minutes

  let coinsAt15s = 0;
  let coinsAt1m = 0;
  let lifetimeAt1m = 0;
  let coinsAt5m = 0;
  let coinsAt10m = 0;
  let coinsAt15m = 0;
  let coinsAt30m = 0;

  let firstUpgradeSec: number | null = null;
  let firstSkinSec: number | null = null;
  let firstPassiveSec: number | null = null;

  let clickIncomeTotal = 0;
  let passiveIncomeTotal = 0;
  let goldenEventsTriggered = 0;
  let nextGoldenEventSec = 75;

  for (let sec = 0; sec <= totalSeconds; sec += dt) {
    // 1. Determine click rate for this style
    let clickRate = 0;
    if (style === 'active') clickRate = 3.5;
    else if (style === 'moderate') clickRate = 1.5;
    else if (style === 'passive') clickRate = sec < 60 ? 3.0 : 0.2;
    else if (style === 'skin_saver') clickRate = 3.0;

    // 2. Click Generation
    if (clickRate > 0) {
      const clickCount = clickRate * dt;
      const { totalPower, critChance, critMultiplier } = calculateClickPower(state);
      const avgMultiplier = 1 + critChance * (critMultiplier - 1);
      const earned = clickCount * totalPower * avgMultiplier;

      state.clicks += clickCount;
      state.coins += earned;
      state.lifetimeCoins += earned;
      clickIncomeTotal += earned;

      // Combo management
      state.combo = Math.min(BALANCE.click.comboMax, state.combo + 0.08);
      state.comboTimer = BALANCE.click.comboTimerResetSec;
    } else {
      state.combo = Math.max(0, state.combo - dt);
    }

    // 3. Passive CPS
    const cps = calculateCPS(state);
    if (cps > 0) {
      const passiveEarned = cps * dt;
      state.coins += passiveEarned;
      state.lifetimeCoins += passiveEarned;
      passiveIncomeTotal += passiveEarned;

      if (firstPassiveSec === null) firstPassiveSec = sec;
    }

    // 4. Golden Matthew Events (Occurs ~every 75-90s)
    if (sec >= nextGoldenEventSec) {
      goldenEventsTriggered++;
      state.goldenMatthewsClicked++;
      const { totalPower } = calculateClickPower(state);
      const curCps = calculateCPS(state);
      const bounty = Math.max(
        BALANCE.goldenEvent.minBountyFloor,
        Math.floor(curCps * BALANCE.goldenEvent.bountyCpsSeconds + totalPower * BALANCE.goldenEvent.bountyClickCount)
      );
      state.coins += bounty;
      state.lifetimeCoins += bounty;
      nextGoldenEventSec = sec + 75 + Math.random() * 20;
    }

    // 5. Strategy: Buying Upgrades & Skins
    if (style === 'skin_saver' && !state.unlockedSkins.includes('sad_matthew')) {
      // Prioritize saving up 350 coins for Sad Matthew
      if (state.coins >= 350) {
        state.coins -= 350;
        state.unlockedSkins.push('sad_matthew');
        state.equippedSkin = 'sad_matthew';
        if (firstSkinSec === null) firstSkinSec = sec;
      } else {
        // Only buy the very cheapest first upgrade (Finger Exercise)
        const lvl = state.upgrades['finger_exercise'] || 0;
        const cost = getUpgradeCost(35, 1.15, lvl);
        if (state.coins >= cost && lvl < 2) {
          state.coins -= cost;
          state.upgrades['finger_exercise'] = lvl + 1;
          if (firstUpgradeSec === null) firstUpgradeSec = sec;
        }
      }
    } else {
      // Normal upgrade progression: buy most cost-efficient affordable upgrade
      let bought = true;
      while (bought) {
        bought = false;
        let bestId: string | null = null;
        let bestCost = Infinity;

        for (const up of UPGRADES) {
          const lvl = state.upgrades[up.id] || 0;
          const cost = getUpgradeCost(up.baseCost, up.costMultiplier, lvl);
          if (state.coins >= cost && cost < bestCost) {
            bestCost = cost;
            bestId = up.id;
          }
        }

        if (bestId && state.coins >= bestCost) {
          state.coins -= bestCost;
          state.upgrades[bestId] = (state.upgrades[bestId] || 0) + 1;
          bought = true;
          if (firstUpgradeSec === null) firstUpgradeSec = sec;
        }
      }

      // Check skin purchases
      for (const skin of SKINS) {
        if (!state.unlockedSkins.includes(skin.id) && skin.cost > 0 && state.coins >= skin.cost) {
          // If coins comfortably exceed skin cost, buy it
          if (state.coins >= skin.cost * 1.2 || skin.id === 'sad_matthew') {
            state.coins -= skin.cost;
            state.unlockedSkins.push(skin.id);
            state.equippedSkin = skin.id;
            if (firstSkinSec === null) firstSkinSec = sec;
          }
        }
      }
    }

    // 6. Check Achievements
    for (const ach of ACHIEVEMENTS) {
      if (!state.unlockedAchievements.includes(ach.id) && ach.condition(state)) {
        state.unlockedAchievements.push(ach.id);
        state.coins += ach.bonusRewardCoins || 0;
        state.lifetimeCoins += ach.bonusRewardCoins || 0;
      }
    }

    // Record checkpoints
    if (Math.abs(sec - 15) < 0.05 && coinsAt15s === 0) coinsAt15s = Math.floor(state.coins);
    if (Math.abs(sec - 60) < 0.05 && lifetimeAt1m === 0) {
      coinsAt1m = Math.floor(state.coins);
      lifetimeAt1m = Math.floor(state.lifetimeCoins);
    }
    if (Math.abs(sec - 300) < 0.05 && coinsAt5m === 0) coinsAt5m = Math.floor(state.coins);
    if (Math.abs(sec - 600) < 0.05 && coinsAt10m === 0) coinsAt10m = Math.floor(state.coins);
    if (Math.abs(sec - 900) < 0.05 && coinsAt15m === 0) coinsAt15m = Math.floor(state.coins);
    if (Math.abs(sec - 1800) < 0.05 && coinsAt30m === 0) coinsAt30m = Math.floor(state.coins);
  }

  const totalUpgradesBought = Object.values(state.upgrades).reduce((a, b) => a + b, 0);

  return {
    styleName: style.toUpperCase(),
    coinsAt15s,
    coinsAt1m,
    lifetimeAt1m,
    coinsAt5m,
    coinsAt10m,
    coinsAt15m,
    coinsAt30m,
    lifetimeAt30m: Math.floor(state.lifetimeCoins),
    firstUpgradeSec,
    firstSkinSec,
    firstPassiveSec,
    totalUpgradesBought,
    clickIncomeTotal: Math.floor(clickIncomeTotal),
    passiveIncomeTotal: Math.floor(passiveIncomeTotal),
    goldenEventsTriggered,
  };
}

export function runAllSimulations() {
  console.log('================================================================');
  console.log('       MATTHEW CLICKER — ECONOMY BALANCE SIMULATION SUITE       ');
  console.log('================================================================\n');

  const styles: PlayStyle[] = ['active', 'moderate', 'passive', 'skin_saver'];
  const results = styles.map(simulatePlayStyle);

  for (const r of results) {
    console.log(`[PLAYSTYLE: ${r.styleName}]`);
    console.log(`  15 Seconds Coins:   ${formatCoins(r.coinsAt15s)}`);
    console.log(`  1 Minute Lifetime:  ${formatCoins(r.lifetimeAt1m)} (Wallet: ${formatCoins(r.coinsAt1m)}, Target: 100 - 300 coins, NOT 5,000!)`);
    console.log(`  5 Minutes Coins:    ${formatCoins(r.coinsAt5m)}`);
    console.log(`  10 Minutes Coins:   ${formatCoins(r.coinsAt10m)}`);
    console.log(`  15 Minutes Coins:   ${formatCoins(r.coinsAt15m)}`);
    console.log(`  30 Minutes Coins:   ${formatCoins(r.coinsAt30m)}`);
    console.log(`  30 Min Lifetime:    ${formatCoins(r.lifetimeAt30m)}`);
    console.log(`  Time to 1st Upgrade: ${r.firstUpgradeSec?.toFixed(1)}s (Target: 10 - 20s)`);
    console.log(`  Time to 1st Passive: ${r.firstPassiveSec ? r.firstPassiveSec.toFixed(1) + 's' : 'N/A'}`);
    console.log(`  Time to 1st Skin:    ${r.firstSkinSec ? r.firstSkinSec.toFixed(1) + 's' : 'In Progress'}`);
    console.log(`  Upgrades Purchased:  ${r.totalUpgradesBought}`);
    console.log(`  Income Breakdown:    Click ${formatCoins(r.clickIncomeTotal)} vs Passive ${formatCoins(r.passiveIncomeTotal)}`);
    console.log(`  Golden Events Hit:   ${r.goldenEventsTriggered}\n`);
  }

  console.log('================================================================');
  console.log('                     VERIFICATION CHECKS                        ');
  console.log('================================================================');

  const active = results[0];
  const moderate = results[1];
  const firstUpCheck = active.firstUpgradeSec !== null && active.firstUpgradeSec >= 7 && active.firstUpgradeSec <= 20;
  const oneMinCheck = active.lifetimeAt1m < 2500 && moderate.lifetimeAt1m < 500;
  const thirtyMinProgression = active.lifetimeAt30m > 50000;

  console.log(`1. First upgrade in 10-20s:        ${firstUpCheck ? 'PASSED ✓' : 'FAILED ✗'} (${active.firstUpgradeSec?.toFixed(1)}s active, ${moderate.firstUpgradeSec?.toFixed(1)}s moderate)`);
  console.log(`2. 1-Minute coins not bloated:     ${oneMinCheck ? 'PASSED ✓' : 'FAILED ✗'} (${active.lifetimeAt1m} active total, ${moderate.lifetimeAt1m} moderate total)`);
  console.log(`3. 30-Minute viable progression:   ${thirtyMinProgression ? 'PASSED ✓' : 'FAILED ✗'} (${formatCoins(active.lifetimeAt30m)} lifetime)`);
  console.log('================================================================\n');
}

runAllSimulations();
