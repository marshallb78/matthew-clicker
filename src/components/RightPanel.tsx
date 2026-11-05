import React, { useState } from 'react';
import { GameState } from '../types/game';
import { UPGRADES } from '../data/upgrades';
import { SKINS, Skin } from '../data/skins';
import { ACHIEVEMENTS } from '../data/achievements';
import { PRESTIGE_UPGRADES, PRESTIGE_REQUIREMENT, calculatePrestigeShards } from '../data/prestige';
import { getUpgradeCost, getBulkUpgradeCost, getMaxAffordableUpgrade } from '../utils/calculations';
import { formatCoins, formatNumber } from '../utils/formatters';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import {
  ShoppingBag,
  Infinity as InfinityIcon,
  Trophy,
  Check,
  Lock,
  Sparkles,
  Zap,
  Mouse,
  Keyboard,
  Cpu,
  Users,
  Factory,
  Dna,
  Crown,
  Orbit,
  Atom,
  BicepsFlexed,
  Flame,
  CheckCircle2,
  Coffee,
  Bot,
  Mic,
  Server,
  Satellite,
} from 'lucide-react';

export type RightTab = 'upgrades' | 'rebirth' | 'achievements';

interface RightPanelProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onOpenSkinQualityModal?: () => void;
}

const UPGRADE_ICONS: Record<string, React.ElementType> = {
  BicepsFlexed,
  Zap,
  Coffee,
  Bot,
  Mouse,
  Keyboard,
  Mic,
  Cpu,
  Users,
  Factory,
  Dna,
  Server,
  Satellite,
  Sparkles,
  Crown,
  Orbit,
  Atom,
};

type BuyMode = 1 | 10 | 'MAX';

export const RightPanel: React.FC<RightPanelProps> = ({ state, setState, onOpenSkinQualityModal }) => {
  const [activeTab, setActiveTab] = useState<RightTab>('upgrades');
  const [upgradeSubTab, setUpgradeSubTab] = useState<'items' | 'skins'>('items');
  const [buyMode, setBuyMode] = useState<BuyMode>(1);

  // --- UPGRADE PURCHASE ---
  const handleBuyUpgrade = (upgradeId: string) => {
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

    if (state.coins < totalCost) return;

    setState((prev) => ({
      ...prev,
      coins: prev.coins - totalCost,
      upgrades: {
        ...prev.upgrades,
        [upgradeId]: (prev.upgrades[upgradeId] || 0) + countToBuy,
      },
    }));

    soundManager.playBuy();
  };

  // --- SKIN UNLOCK & EQUIP ---
  const handleUnlockSkin = (skin: Skin) => {
    if (state.unlockedSkins.includes(skin.id)) {
      // Already unlocked, equip it
      setState((prev) => ({ ...prev, equippedSkin: skin.id }));
      soundManager.playBuy();
      return;
    }

    // Check rebirth requirement
    if (skin.rebirthRequired && state.prestigeCount < skin.rebirthRequired) {
      return;
    }

    // Check coin cost
    if (state.coins < skin.cost) return;

    setState((prev) => ({
      ...prev,
      coins: prev.coins - skin.cost,
      unlockedSkins: [...prev.unlockedSkins, skin.id],
      equippedSkin: skin.id, // auto equip on purchase
    }));

    soundManager.playSkinUnlock();
    particleEngine.emitPrestige();
  };

  // --- REBIRTH ---
  const potentialShards = calculatePrestigeShards(state.lifetimeCoins);
  const shardsToGain = Math.max(0, potentialShards - state.lifetimePrestigeShards);
  const canRebirth = state.lifetimeCoins >= PRESTIGE_REQUIREMENT && shardsToGain > 0;

  const handleRebirth = () => {
    if (!canRebirth) return;

    soundManager.playPrestige();
    particleEngine.emitPrestige();

    setState((prev) => ({
      ...prev,
      coins: 0,
      upgrades: {},
      combo: 0,
      comboTimer: 0,
      frenzyTimer: 0,
      prestigeCount: prev.prestigeCount + 1,
      prestigeShards: prev.prestigeShards + shardsToGain,
      lifetimePrestigeShards: prev.lifetimePrestigeShards + shardsToGain,
    }));
  };

  const handleBuyPerk = (perkId: string) => {
    const perk = PRESTIGE_UPGRADES.find((p) => p.id === perkId);
    if (!perk) return;

    const currentLevel = state.prestigeUpgrades[perkId] || 0;
    if (currentLevel >= perk.maxLevel) return;

    const cost = Math.floor(perk.baseCost * Math.pow(perk.costMultiplier, currentLevel));
    if (state.prestigeShards < cost) return;

    setState((prev) => ({
      ...prev,
      prestigeShards: prev.prestigeShards - cost,
      prestigeUpgrades: {
        ...prev.prestigeUpgrades,
        [perkId]: (prev.prestigeUpgrades[perkId] || 0) + 1,
      },
    }));

    soundManager.playBuy();
  };

  return (
    <div className="flex h-full w-full bg-[#13172b]/95 border-l-2 border-slate-800/80 shadow-2xl backdrop-blur-md overflow-hidden font-chunky">
      {/* VERTICAL SIDEBAR TABS (Along the side of the screen) */}
      <div className="flex flex-col items-center py-3 px-1.5 bg-[#0a0d18] border-r-2 border-slate-800/80 gap-3 z-30 select-none">
        <button
          onClick={() => setActiveTab('upgrades')}
          title="Upgrades & Matthews"
          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === 'upgrades'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Shop</span>
        </button>

        <button
          onClick={() => setActiveTab('rebirth')}
          title="Rebirth (Cosmic Ascension)"
          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === 'rebirth'
              ? 'bg-purple-600 text-white font-black shadow-lg shadow-purple-600/30 scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <InfinityIcon className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Rebirth</span>
        </button>

        <button
          onClick={() => setActiveTab('achievements')}
          title="Achievements"
          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === 'achievements'
              ? 'bg-yellow-400 text-slate-950 font-black shadow-lg shadow-yellow-400/30 scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Badges</span>
        </button>
      </div>

      {/* PANEL CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* ================= UPGRADES TAB ================= */}
        {activeTab === 'upgrades' && (
          <div className="flex flex-col h-full">
            {/* SUB-TAB TOGGLE & BULK SELECTOR */}
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-[#101426]/80">
              {/* Items vs Matthews Sub-tab */}
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-750">
                <button
                  onClick={() => setUpgradeSubTab('items')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                    upgradeSubTab === 'items'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Upgrades
                </button>
                <button
                  onClick={() => setUpgradeSubTab('skins')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 ${
                    upgradeSubTab === 'skins'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Matthews
                  <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-950/40 font-bold">
                    {state.unlockedSkins.length}/16
                  </span>
                </button>
              </div>

              {/* Bulk Buy Toggle (only on items) */}
              {upgradeSubTab === 'items' && (
                <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-750">
                  {([1, 10, 'MAX'] as BuyMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBuyMode(mode)}
                      className={`px-2 py-0.5 text-[11px] font-black rounded-md transition-all ${
                        buyMode === mode ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode === 'MAX' ? 'MAX' : `${mode}x`}
                    </button>
                  ))}
                </div>
              )}

              {/* Skins Quality Inspector Button */}
              {upgradeSubTab === 'skins' && onOpenSkinQualityModal && (
                <button
                  onClick={onOpenSkinQualityModal}
                  className="px-2.5 py-1 text-[11px] font-black rounded-xl bg-slate-900 border border-slate-750 text-amber-300 hover:text-white hover:border-amber-400 transition flex items-center gap-1 shadow-sm"
                  title="Inspect all 16 skins side-by-side with calibrated landmarks"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inspect All 16</span>
                </button>
              )}
            </div>

            {/* LIST: ITEMS */}
            {upgradeSubTab === 'items' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {UPGRADES.map((upgrade) => {
                  const currentLevel = state.upgrades[upgrade.id] || 0;
                  const IconComp = UPGRADE_ICONS[upgrade.icon] || Sparkles;

                  let cost = 0;
                  let countToDisplay = 1;
                  let canAfford = false;

                  if (buyMode === 'MAX') {
                    const maxInfo = getMaxAffordableUpgrade(
                      upgrade.baseCost,
                      upgrade.costMultiplier,
                      currentLevel,
                      state.coins
                    );
                    countToDisplay = maxInfo.count > 0 ? maxInfo.count : 1;
                    cost =
                      maxInfo.count > 0
                        ? maxInfo.totalCost
                        : getUpgradeCost(upgrade.baseCost, upgrade.costMultiplier, currentLevel);
                    canAfford = maxInfo.count > 0;
                  } else {
                    countToDisplay = buyMode;
                    const bulkInfo = getBulkUpgradeCost(
                      upgrade.baseCost,
                      upgrade.costMultiplier,
                      currentLevel,
                      countToDisplay
                    );
                    cost = bulkInfo.totalCost;
                    canAfford = state.coins >= cost;
                  }

                  return (
                    <div
                      key={upgrade.id}
                      onClick={() => canAfford && handleBuyUpgrade(upgrade.id)}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border-2 transition-all cursor-pointer ${
                        canAfford
                          ? 'bg-[#1a2038] border-amber-500/40 hover:border-amber-400 hover:bg-[#202744] active:scale-[0.98]'
                          : 'bg-[#111526] border-slate-800/80 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {/* ICON & NAME */}
                      <div className="flex items-center gap-2.5 flex-1 pr-2">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center p-2.5 ${
                            canAfford ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800/60 text-slate-500'
                          }`}
                        >
                          <IconComp className="w-full h-full" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-slate-100">{upgrade.name}</span>
                            <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 border border-slate-750">
                              Lvl {currentLevel}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mt-0.5">
                            {upgrade.baseClickPower > 0 && (
                              <span className="text-cyan-400">+{formatCoins(upgrade.baseClickPower * countToDisplay)}/click</span>
                            )}
                            {upgrade.baseCps > 0 && (
                              <span className="text-amber-400">+{formatCoins(upgrade.baseCps * countToDisplay)}/s</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* PRICE BUTTON */}
                      <button
                        disabled={!canAfford}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs min-w-[70px] btn-chunky ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border border-yellow-200'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        {formatCoins(cost)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* LIST: MATTHEWS (SKINS) */}
            {upgradeSubTab === 'skins' && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {SKINS.map((skin) => {
                  const isUnlocked = state.unlockedSkins.includes(skin.id);
                  const isEquipped = state.equippedSkin === skin.id;

                  let canUnlock = false;
                  let requirementText = '';

                  if (skin.rebirthRequired) {
                    canUnlock = state.prestigeCount >= skin.rebirthRequired;
                    requirementText = `Rebirth ${skin.rebirthRequired}`;
                  } else {
                    canUnlock = state.coins >= skin.cost;
                    requirementText = `${formatCoins(skin.cost)} Coins`;
                  }

                  return (
                    <div
                      key={skin.id}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border-2 transition-all ${
                        isEquipped
                          ? 'bg-[#1b254b] border-cyan-400 shadow-md shadow-cyan-500/20'
                          : isUnlocked
                          ? 'bg-[#1a2038] border-slate-700/80 hover:border-slate-600'
                          : 'bg-[#111526] border-slate-850 opacity-70'
                      }`}
                    >
                      {/* PORTRAIT & INFO */}
                      <div className="flex items-center gap-2.5 flex-1 pr-2">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-750 flex items-center justify-center p-1 overflow-hidden relative">
                          <img
                            src={skin.image}
                            alt={skin.name}
                            className={`w-full h-full object-contain ${!isUnlocked ? 'filter grayscale brightness-50' : ''}`}
                          />
                          {!isUnlocked && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="font-black text-sm text-slate-100">{skin.name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-bold text-amber-300">{skin.perkDescription}</span>
                          </div>
                        </div>
                      </div>

                      {/* ACTION BUTTON */}
                      {isEquipped ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 font-black text-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          Equipped
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleUnlockSkin(skin)}
                          className="px-3.5 py-1.5 rounded-xl font-black text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 btn-chunky cursor-pointer"
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnlockSkin(skin)}
                          disabled={!canUnlock}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs btn-chunky ${
                            canUnlock
                              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border border-yellow-200 cursor-pointer'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          {requirementText}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= REBIRTH TAB ================= */}
        {activeTab === 'rebirth' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
            <div>
              <div className="text-center pb-4 border-b border-slate-800">
                <div className="w-14 h-14 rounded-full bg-purple-600/20 border-2 border-purple-500 p-2 mx-auto mb-2 flex items-center justify-center text-purple-400">
                  <InfinityIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-100 font-chunky">Cosmic Rebirth</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Reset coins & upgrades for permanent <strong className="text-purple-400">Matthew Shards</strong> (+2%
                  boost each)!
                </p>

                {/* STATS */}
                <div className="my-4 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Shards Available</span>
                    <p className="text-lg font-black text-purple-300">{state.prestigeShards}</p>
                  </div>
                  <div className="h-6 w-[1px] bg-slate-800" />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black">Gain on Rebirth</span>
                    <p className="text-lg font-black text-yellow-300">+{shardsToGain}</p>
                  </div>
                </div>

                <button
                  onClick={handleRebirth}
                  disabled={!canRebirth}
                  className={`w-full py-3 rounded-2xl font-black text-sm uppercase tracking-wide btn-chunky ${
                    canRebirth
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 hover:brightness-110 text-white cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {canRebirth ? `Rebirth Now (+${shardsToGain} Shards)` : `Requires 1M Coins (${formatCoins(state.lifetimeCoins)} / 1M)`}
                </button>
              </div>

              {/* PERMANENT REBIRTH PERKS */}
              <div className="mt-4 space-y-2 pb-6">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Permanent Perks</h4>
                {PRESTIGE_UPGRADES.map((perk) => {
                  const currentLevel = state.prestigeUpgrades[perk.id] || 0;
                  const isMax = currentLevel >= perk.maxLevel;
                  const cost = Math.floor(perk.baseCost * Math.pow(perk.costMultiplier, currentLevel));
                  const canAfford = state.prestigeShards >= cost && !isMax;

                  return (
                    <div
                      key={perk.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-slate-100">{perk.name}</span>
                          <span className="text-[10px] text-purple-400 font-bold">
                            {currentLevel}/{perk.maxLevel}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">{perk.description}</p>
                      </div>

                      <button
                        onClick={() => handleBuyPerk(perk.id)}
                        disabled={!canAfford || isMax}
                        className={`px-3 py-1 text-xs font-black rounded-lg ${
                          isMax
                            ? 'bg-slate-800 text-slate-500'
                            : canAfford
                            ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isMax ? 'MAX' : `${cost} Shards`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================= ACHIEVEMENTS TAB ================= */}
        {activeTab === 'achievements' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div>
                <h3 className="text-base font-black text-slate-100">Achievements</h3>
                <span className="text-xs text-slate-400">
                  {state.unlockedAchievements.length} / {ACHIEVEMENTS.length} unlocked
                </span>
              </div>
            </div>

            <div className="space-y-2 pb-6">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = state.unlockedAchievements.includes(ach.id);

                return (
                  <div
                    key={ach.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border ${
                      isUnlocked
                        ? 'bg-[#1a2038] border-yellow-500/40'
                        : 'bg-slate-950/60 border-slate-850 opacity-50'
                    }`}
                  >
                    <div>
                      <span className="font-black text-xs text-slate-100">{ach.name}</span>
                      <p className="text-[11px] text-slate-400">{ach.description}</p>
                    </div>
                    {isUnlocked ? (
                      <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

