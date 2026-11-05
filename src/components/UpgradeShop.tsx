import React, { useState } from 'react';
import { GameState } from '../types/game';
import { UPGRADES } from '../data/upgrades';
import { getUpgradeCost, getBulkUpgradeCost, getMaxAffordableUpgrade } from '../utils/calculations';
import { formatCoins } from '../utils/formatters';
import { soundManager } from '../audio/soundManager';
import {
  BicepsFlexed,
  Zap,
  Mouse,
  Keyboard,
  Cpu,
  Users,
  Factory,
  Dna,
  Sparkles,
  Crown,
  Orbit,
  Atom,
  ShoppingBag,
} from 'lucide-react';

interface UpgradeShopProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

const ICON_MAP: Record<string, React.ElementType> = {
  BicepsFlexed,
  Zap,
  Mouse,
  Keyboard,
  Cpu,
  Users,
  Factory,
  Dna,
  Sparkles,
  Crown,
  Orbit,
  Atom,
};

type BuyMode = 1 | 10 | 100 | 'MAX';

export const UpgradeShop: React.FC<UpgradeShopProps> = ({ state, setState }) => {
  const [buyMode, setBuyMode] = useState<BuyMode>(1);
  const [purchasedId, setPurchasedId] = useState<string | null>(null);

  const handleBuy = (upgradeId: string) => {
    const upgrade = UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return;

    const currentLevel = state.upgrades[upgradeId] || 0;
    let countToBuy = 1;
    let totalCost = 0;

    if (buyMode === 'MAX') {
      const maxInfo = getMaxAffordableUpgrade(upgrade.baseCost, upgrade.costMultiplier, currentLevel, state.coins);
      if (maxInfo.count <= 0) return;
      countToBuy = maxInfo.count;
      totalCost = maxInfo.totalCost;
    } else {
      countToBuy = buyMode;
      const bulkInfo = getBulkUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, currentLevel, countToBuy);
      totalCost = bulkInfo.totalCost;
      if (state.coins < totalCost) return;
    }

    // Safety check against negative balances
    if (state.coins < totalCost || totalCost <= 0) return;

    // Deduct coins & update level
    setState((prev) => ({
      ...prev,
      coins: prev.coins - totalCost,
      upgrades: {
        ...prev.upgrades,
        [upgradeId]: (prev.upgrades[upgradeId] || 0) + countToBuy,
      },
    }));

    soundManager.playBuy();

    setPurchasedId(upgradeId);
    setTimeout(() => setPurchasedId(null), 300);
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 overflow-y-auto">
      {/* SHOP HEADER & BULK SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 font-display">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
            Upgrade Emporium
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Scale your clicking power and automated Matthew empire</p>
        </div>

        {/* BULK BUY BUTTONS */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          {( [1, 10, 100, 'MAX'] as BuyMode[] ).map((mode) => (
            <button
              key={mode}
              onClick={() => setBuyMode(mode)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                buyMode === mode
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {mode === 'MAX' ? 'MAX' : `${mode}x`}
            </button>
          ))}
        </div>
      </div>

      {/* UPGRADE CARDS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-20">
        {UPGRADES.map((upgrade) => {
          const currentLevel = state.upgrades[upgrade.id] || 0;
          const IconComp = ICON_MAP[upgrade.icon] || Sparkles;

          let cost = 0;
          let countToDisplay = 1;
          let canAfford = false;

          if (buyMode === 'MAX') {
            const maxInfo = getMaxAffordableUpgrade(upgrade.baseCost, upgrade.costMultiplier, currentLevel, state.coins);
            countToDisplay = maxInfo.count > 0 ? maxInfo.count : 1;
            cost = maxInfo.count > 0 ? maxInfo.totalCost : getUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, currentLevel);
            canAfford = maxInfo.count > 0;
          } else {
            countToDisplay = buyMode;
            const bulkInfo = getBulkUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, currentLevel, countToDisplay);
            cost = bulkInfo.totalCost;
            canAfford = state.coins >= cost;
          }

          const isJustBought = purchasedId === upgrade.id;

          return (
            <div
              key={upgrade.id}
              className={`relative flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-150 ${
                isJustBought ? 'scale-[1.02] border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20' : ''
              } ${
                canAfford
                  ? 'bg-slate-900/80 border-slate-700/60 hover:border-cyan-500/40 hover:bg-slate-800/80'
                  : 'bg-slate-950/60 border-slate-850 opacity-75'
              }`}
            >
              {/* LEFT: ICON & DETAILS */}
              <div className="flex items-center gap-3.5 flex-1 pr-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center p-2.5 transition-colors ${
                    canAfford
                      ? 'bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
                  }`}
                >
                  <IconComp className="w-full h-full" />
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{upgrade.name}</span>
                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                      lvl {currentLevel}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{upgrade.description}</p>

                  {/* BENEFIT TAGS */}
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold">
                    {upgrade.baseClickPower > 0 && (
                      <span className="text-cyan-400">+{formatCoins(upgrade.baseClickPower * countToDisplay)} Click</span>
                    )}
                    {upgrade.baseCps > 0 && (
                      <span className="text-purple-400">+{formatCoins(upgrade.baseCps * countToDisplay)}/sec</span>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: BUY BUTTON */}
              <button
                onClick={() => handleBuy(upgrade.id)}
                disabled={!canAfford}
                className={`flex flex-col items-center justify-center px-4 py-2.5 rounded-xl font-bold transition-all min-w-[90px] ${
                  canAfford
                    ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-slate-950 hover:brightness-110 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer'
                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/40'
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90">
                  Buy {buyMode === 'MAX' ? `+${countToDisplay}` : `+${countToDisplay}`}
                </span>
                <span className="text-xs font-black tracking-tight mt-0.5">{formatCoins(cost)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
