import React, { useState } from 'react';
import { GameState } from '../types/game';
import { UPGRADES } from '../data/upgrades';
import { ALL_SKINS, PUBLIC_VIEWABLE_SKINS, Skin, equipSkin } from '../data/skins';
import { QUESTS, getQuestProgress } from '../data/quests';
import {
  PRESTIGE_REQUIREMENT,
  calculatePrestigeShards,
  getAscensionMultiplier,
  getNextPrestigeRequirement,
} from '../data/prestige';
import {
  getUpgradeCost,
  getBulkUpgradeCost,
  getMaxAffordableUpgrade,
} from '../utils/calculations';
import { getAuthoritativeDateString } from '../utils/scheduleEngine';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import { saveGame } from '../utils/storage';
import { formatCoins } from '../utils/formatters';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { UpgradeArtwork } from './UpgradeArtwork';
import {
  ShoppingBag,
  Infinity as InfinityIcon,
  Trophy,
  Check,
  Zap,
  Gem,
  Gift,
  Eye,
} from 'lucide-react';

export type RightTab = 'upgrades' | 'rebirth' | 'quests';

interface RightPanelProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onOpenSkinQualityModal?: () => void;
  onNotify?: (title: string, subtitle: string) => void;
}

type BuyMode = 1 | 10 | 'MAX';

export const RightPanel: React.FC<RightPanelProps> = ({
  state,
  setState,
  onOpenSkinQualityModal,
  onNotify,
}) => {
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
      const maxInfo = getMaxAffordableUpgrade(
        upgrade.baseCost,
        upgrade.costMultiplier,
        currentLevel,
        state.coins
      );
      if (maxInfo.count <= 0) return;
      countToBuy = maxInfo.count;
      totalCost = maxInfo.totalCost;
    } else {
      countToBuy = buyMode;
      const bulkInfo = getBulkUpgradeCost(
        upgrade.baseCost,
        upgrade.costMultiplier,
        currentLevel,
        countToBuy
      );
      totalCost = bulkInfo.totalCost;
      if (state.coins < totalCost) return;
    }

    if (state.coins < totalCost) return;

    setState((prev) => ({
      ...prev,
      coins: prev.coins - totalCost,
      lastActiveInputTimestamp: Date.now(),
      upgrades: {
        ...prev.upgrades,
        [upgradeId]: (prev.upgrades[upgradeId] || 0) + countToBuy,
      },
    }));

    soundManager.playBuy();
  };

  // --- SKIN EQUIP (Authoritatively validated - only unlocked skins can be equipped) ---
  const handleEquipSkin = (skin: Skin) => {
    setState((prev) => {
      const next = equipSkin(prev, skin.id);
      if (next !== prev) {
        saveGame(next);
        soundManager.playBuy();
      }
      return next;
    });
  };

  // --- REBIRTH (CAPYBARA CLICKER STYLE ASCENSION MULTIPLIER: +0.08× PER STEP) ---
  const currentAscensionMult = getAscensionMultiplier(state.prestigeShards);
  const potentialBonus = calculatePrestigeShards(state.lifetimeCoins);
  const multGain = Math.max(0, potentialBonus - state.lifetimePrestigeShards);
  const nextAscensionMult = getAscensionMultiplier(state.prestigeShards + multGain);
  const multDeltaDisplay = (nextAscensionMult - currentAscensionMult).toFixed(2);
  const nextRebirthReqCoins = getNextPrestigeRequirement(state.lifetimePrestigeShards);
  const canRebirth = state.lifetimeCoins >= PRESTIGE_REQUIREMENT && multGain > 0;

  const handleRebirth = () => {
    if (!canRebirth) return;

    soundManager.playPrestige();
    particleEngine.emitPrestige();

    setState((prev) => {
      const next: GameState = {
        ...prev,
        coins: 0,
        upgrades: {},
        combo: 0,
        comboTimer: 0,
        frenzyTimer: 0,
        prestigeCount: prev.prestigeCount + 1,
        prestigeShards: prev.prestigeShards + multGain,
        lifetimePrestigeShards: prev.lifetimePrestigeShards + multGain,
        lastActiveInputTimestamp: Date.now(),
      };
      saveGame(next);
      return next;
    });

    if (onNotify) {
      onNotify(
        'ASCENSION COMPLETE!',
        `Your global Ascension Multiplier is now ${nextAscensionMult.toFixed(2)}×!`
      );
    }
  };

  // --- DAILY LOGIN BONUS (+5 Gems once per day) ---
  const todayDateStr = getAuthoritativeDateString();
  const canClaimDailyLogin = state.lastDailyLoginClaimDate !== todayDateStr;

  const handleClaimDailyLogin = () => {
    if (!canClaimDailyLogin) return;
    soundManager.playBuy();
    particleEngine.emitPrestige();

    setState((prev) => {
      const bonus = GEM_ECONOMY_CONFIG.dailyLoginGems;
      const next: GameState = {
        ...prev,
        gems: prev.gems + bonus,
        lifetimeGems: prev.lifetimeGems + bonus,
        lastDailyLoginClaimDate: todayDateStr,
        lastActiveInputTimestamp: Date.now(),
      };
      saveGame(next);
      return next;
    });

    if (onNotify) {
      onNotify(
        'DAILY LOGIN CLAIMED!',
        `+${GEM_ECONOMY_CONFIG.dailyLoginGems} Gems added to your permanent vault!`
      );
    }
  };

  // --- QUEST CLAIM ---
  const handleClaimQuest = (questId: string) => {
    const quest = QUESTS.find((q) => q.id === questId);
    if (!quest || state.claimedQuests.includes(questId)) return;

    const progress = getQuestProgress(quest, state);
    if (!progress.isComplete) return;

    soundManager.playBuy();
    particleEngine.emitPrestige();

    setState((prev) => {
      const next: GameState = {
        ...prev,
        claimedQuests: [...prev.claimedQuests, questId],
        coins: prev.coins + (quest.rewardCoins || 0),
        lifetimeCoins: prev.lifetimeCoins + (quest.rewardCoins || 0),
        seasonalScore: prev.seasonalScore + (quest.rewardCoins || 0),
        gems: prev.gems + (quest.rewardGems || 0),
        lifetimeGems: prev.lifetimeGems + (quest.rewardGems || 0),
        lastActiveInputTimestamp: Date.now(),
      };
      saveGame(next);
      return next;
    });

    if (onNotify) {
      onNotify('QUEST COMPLETE!', `${quest.title} (+${quest.rewardGems} Gems) claimed!`);
    }
  };

  const unlockedSkinsList = ALL_SKINS.filter((s) => state.unlockedSkins.includes(s.id));
  const dailyQuests = QUESTS.filter((q) => q.scope === 'daily');
  const seasonalQuests = QUESTS.filter((q) => q.scope === 'seasonal');

  return (
    <div className="flex h-full w-full bg-[#13172b]/95 border-l-2 border-slate-800/80 shadow-2xl backdrop-blur-md overflow-hidden font-chunky">
      {/* VERTICAL SIDEBAR TABS (SHOP, REBIRTH, QUESTS) */}
      <div className="flex flex-col items-center py-3 px-1.5 bg-[#0a0d18] border-r-2 border-slate-800/80 gap-3 z-30 select-none">
        <button
          onClick={() => setActiveTab('upgrades')}
          title="Upgrades & Unlocked Matthews"
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
          title="Rebirth (Ascension Multiplier)"
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
          onClick={() => setActiveTab('quests')}
          title="Daily & Season Quests"
          className={`relative w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
            activeTab === 'quests'
              ? 'bg-yellow-400 text-slate-950 font-black shadow-lg shadow-yellow-400/30 scale-105'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-0.5">Quests</span>
          {canClaimDailyLogin && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-fuchsia-500 border border-white animate-ping" />
          )}
        </button>
      </div>

      {/* PANEL CONTENT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* ================= UPGRADES & MATTHEWS TAB ================= */}
        {activeTab === 'upgrades' && (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2 bg-[#101426]/80">
              <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-750">
                <button
                  onClick={() => setUpgradeSubTab('items')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    upgradeSubTab === 'items'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Upgrades
                </button>
                <button
                  onClick={() => setUpgradeSubTab('skins')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                    upgradeSubTab === 'skins'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Matthews
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-950/40 font-bold">
                    {unlockedSkinsList.length}
                  </span>
                </button>
              </div>

              {upgradeSubTab === 'items' && (
                <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-750">
                  {([1, 10, 'MAX'] as BuyMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBuyMode(mode)}
                      className={`px-2 py-0.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                        buyMode === mode
                          ? 'bg-cyan-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode === 'MAX' ? 'MAX' : `${mode}x`}
                    </button>
                  ))}
                </div>
              )}

              {upgradeSubTab === 'skins' && onOpenSkinQualityModal && (
                <button
                  onClick={onOpenSkinQualityModal}
                  className="px-3 py-1.5 text-[11px] font-black rounded-xl bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border border-amber-400/60 text-amber-300 hover:text-white hover:border-amber-300 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  title="View all public skins in the game"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  <span>View All Skins</span>
                </button>
              )}
            </div>

            {upgradeSubTab === 'items' && (
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {UPGRADES.map((upgrade) => {
                  const currentLevel = state.upgrades[upgrade.id] || 0;

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

                  const affordProgressPct = Math.min(
                    100,
                    cost > 0 ? Math.floor((state.coins / cost) * 100) : 100
                  );

                  return (
                    <div
                      key={upgrade.id}
                      onClick={() => canAfford && handleBuyUpgrade(upgrade.id)}
                      className={`relative overflow-hidden flex items-center justify-between p-2.5 rounded-2xl border-2 transition-all select-none ${
                        canAfford
                          ? 'bg-gradient-to-r from-[#19203a] to-[#1f2849] border-amber-400/70 hover:border-yellow-300 hover:scale-[1.01] active:scale-[0.98] cursor-pointer shadow-lg shadow-amber-500/10'
                          : 'bg-[#101424] border-slate-800/90 opacity-75 cursor-not-allowed'
                      }`}
                    >
                      {/* Subtle Affordability Progress Fill Bar */}
                      {!canAfford && affordProgressPct > 2 && (
                        <div
                          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-cyan-500/60 to-amber-400/60 transition-all duration-200"
                          style={{ width: `${affordProgressPct}%` }}
                        />
                      )}

                      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                        {/* BIG VISUAL ILLUSTRATED ARTWORK TILE + FLOATING LEVEL BADGE */}
                        <div className="relative shrink-0">
                          <UpgradeArtwork
                            iconKey={upgrade.icon}
                            tier={upgrade.tier || 1}
                            className={`w-14 h-14 transition-transform ${
                              canAfford ? 'scale-100' : 'grayscale-[30%]'
                            }`}
                          />
                          <span
                            className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-lg text-[10px] font-black border shadow ${
                              currentLevel > 0
                                ? 'bg-amber-400 text-slate-950 border-white'
                                : 'bg-slate-900 text-slate-400 border-slate-700'
                            }`}
                          >
                            Lv.{currentLevel}
                          </span>
                        </div>

                        {/* MINIMAL TEXT: BOLD TITLE + COMPACT STAT PILLS */}
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-sm text-white truncate leading-tight">
                            {upgrade.name}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {upgrade.baseClickPower > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gradient-to-r from-cyan-500/25 to-sky-500/20 border border-cyan-400/60 text-[11px] font-black text-cyan-200 shadow-sm">
                                <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                                +{formatCoins(upgrade.baseClickPower * countToDisplay)} Click
                              </span>
                            )}
                            {upgrade.baseCps > 0 && (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 border border-amber-400/35 text-[10px] font-bold text-amber-300/90">
                                +{formatCoins(upgrade.baseCps * countToDisplay)}/s
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* CHUNKY BUY BUTTON */}
                      <button
                        disabled={!canAfford}
                        className={`px-3.5 py-2.5 rounded-xl font-black text-xs min-w-[78px] btn-chunky shrink-0 transition-transform ${
                          canAfford
                            ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-slate-950 border-2 border-yellow-100 shadow-[0_0_16px_rgba(251,191,36,0.4)]'
                            : 'bg-slate-800/90 text-slate-400 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        {formatCoins(cost)}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* MATTHEWS SUB-TAB: ONLY IMAGES OF UNLOCKED SKINS */}
            {upgradeSubTab === 'skins' && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-3 gap-2.5">
                  {unlockedSkinsList.map((skin) => {
                    const isEquipped = state.equippedSkin === skin.id;
                    return (
                      <button
                        key={skin.id}
                        onClick={() => handleEquipSkin(skin)}
                        title={skin.name}
                        className={`relative aspect-square rounded-2xl p-2 bg-slate-950/90 border-2 flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95 ${
                          isEquipped
                            ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.35)]'
                            : 'border-slate-800 hover:border-cyan-400/60'
                        }`}
                      >
                        <img
                          src={skin.image}
                          alt={skin.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              skin.fallbackImage || './images/skins/classic_matthew.png';
                          }}
                          className="w-full h-full object-contain pointer-events-none drop-shadow-md"
                        />
                        {isEquipped && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= REBIRTH TAB (VISUAL ASCENSION MULTIPLIER) ================= */}
        {activeTab === 'rebirth' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-center">
            <div className="text-center p-5 rounded-3xl bg-slate-900/90 border-2 border-purple-500/40 shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border-2 border-purple-400 p-3 mx-auto mb-3 flex items-center justify-center text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                <InfinityIcon className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-wide">
                Ascension Rebirth
              </h3>
              <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-[11px] font-black text-purple-200 uppercase">
                Multiplies All Clicks &amp; CPS • Skins Stay Forever
              </span>

              <div className="my-5 grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black">
                    Current
                  </span>
                  <p className="text-2xl font-black text-purple-300 mt-1">
                    {currentAscensionMult.toFixed(2)}×
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border-2 border-yellow-400/50">
                  <span className="text-[10px] text-yellow-300 uppercase font-black">
                    Next Rebirth
                  </span>
                  <p className="text-2xl font-black text-yellow-300 mt-1">
                    {nextAscensionMult.toFixed(2)}×{' '}
                    <span className="text-xs text-emerald-400">(+{multDeltaDisplay}×)</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleRebirth}
                disabled={!canRebirth}
                className={`w-full py-3.5 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider btn-chunky transition ${
                  canRebirth
                    ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-400 hover:brightness-110 text-slate-950 cursor-pointer shadow-lg shadow-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {canRebirth
                  ? `Rebirth → ${nextAscensionMult.toFixed(2)}×`
                  : `${formatCoins(state.lifetimeCoins)} / ${formatCoins(nextRebirthReqCoins)}`}
              </button>
            </div>
          </div>
        )}

        {/* ================= QUESTS TAB (DAILY LOGIN, HARD DAILY QUESTS & HARD SEASON QUESTS) ================= */}
        {activeTab === 'quests' && (
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-950/80 via-purple-950/80 to-slate-900 border-2 border-fuchsia-500/50 shadow-lg">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/50 flex items-center justify-center text-fuchsia-300">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase">Daily Login Bonus</h4>
                    <p className="text-[11px] font-bold text-fuchsia-300">
                      +{GEM_ECONOMY_CONFIG.dailyLoginGems} Permanent Gems every day!
                    </p>
                  </div>
                </div>

                <button
                  disabled={!canClaimDailyLogin}
                  onClick={handleClaimDailyLogin}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs transition ${
                    canClaimDailyLogin
                      ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-md cursor-pointer hover:brightness-110'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {canClaimDailyLogin ? 'Claim +5 Gems' : 'Claimed Today'}
                </button>
              </div>
            </div>

            {/* DAILY QUESTS */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Daily Quests</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300 uppercase">
                  ⚡ Auto-Claims at 100%
                </span>
              </div>
              <div className="space-y-2">
                {dailyQuests.map((quest) => {
                  const isClaimed = state.claimedQuests.includes(quest.id);
                  const prog = getQuestProgress(quest, state);

                  return (
                    <div
                      key={quest.id}
                      className={`p-3 rounded-2xl border ${
                        isClaimed
                          ? 'bg-slate-900/50 border-emerald-500/30 opacity-75'
                          : prog.isComplete
                          ? 'bg-[#1a2442] border-amber-400'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-black text-xs text-white truncate block">{quest.title}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 text-[10px] font-black text-fuchsia-300">
                              +{quest.rewardGems} 💎
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-300">
                              +{formatCoins(quest.rewardCoins || 0)}
                            </span>
                          </div>
                        </div>

                        {isClaimed ? (
                          <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 shrink-0 bg-emerald-950/70 px-2.5 py-1 rounded-xl border border-emerald-500/40">
                            <Check className="w-3.5 h-3.5" /> Auto-Claimed
                          </span>
                        ) : (
                          <button
                            disabled={!prog.isComplete}
                            onClick={() => handleClaimQuest(quest.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition shrink-0 ${
                              prog.isComplete
                                ? 'bg-amber-400 text-slate-950 cursor-pointer shadow'
                                : 'bg-slate-800 text-slate-400 cursor-default'
                            }`}
                          >
                            {prog.isComplete ? `Claim (+${quest.rewardGems}💎)` : `Auto • ${prog.percent}%`}
                          </button>
                        )}
                      </div>
                      {!isClaimed && (
                        <div className="w-full h-1.5 rounded-full bg-slate-950 mt-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300"
                            style={{ width: `${prog.percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEASON QUESTS */}
            <div className="pb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Gem className="w-4 h-4 text-cyan-400" />
                  <span>Season Quests</span>
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/50 text-[10px] font-black text-cyan-300 uppercase">
                  ⚡ Auto-Claims at 100%
                </span>
              </div>
              <div className="space-y-2">
                {seasonalQuests.map((quest) => {
                  const isClaimed = state.claimedQuests.includes(quest.id);
                  const prog = getQuestProgress(quest, state);

                  return (
                    <div
                      key={quest.id}
                      className={`p-3 rounded-2xl border ${
                        isClaimed
                          ? 'bg-slate-900/50 border-emerald-500/30 opacity-75'
                          : prog.isComplete
                          ? 'bg-[#1a2442] border-cyan-400'
                          : 'bg-slate-900/90 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-black text-xs text-white truncate block">{quest.title}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-2 py-0.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 text-[10px] font-black text-fuchsia-300">
                              +{quest.rewardGems} 💎
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-black text-cyan-300">
                              +{formatCoins(quest.rewardCoins || 0)}
                            </span>
                          </div>
                        </div>

                        {isClaimed ? (
                          <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1 shrink-0 bg-emerald-950/70 px-2.5 py-1 rounded-xl border border-emerald-500/40">
                            <Check className="w-3.5 h-3.5" /> Auto-Claimed
                          </span>
                        ) : (
                          <button
                            disabled={!prog.isComplete}
                            onClick={() => handleClaimQuest(quest.id)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition shrink-0 ${
                              prog.isComplete
                                ? 'bg-cyan-400 text-slate-950 cursor-pointer shadow'
                                : 'bg-slate-800 text-slate-400 cursor-default'
                            }`}
                          >
                            {prog.isComplete ? `Claim (+${quest.rewardGems}💎)` : `Auto • ${prog.percent}%`}
                          </button>
                        )}
                      </div>
                      {!isClaimed && (
                        <div className="w-full h-1.5 rounded-full bg-slate-950 mt-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-400 transition-all duration-300"
                            style={{ width: `${prog.percent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
