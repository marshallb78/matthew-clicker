import React, { useState } from 'react';
import { GameState } from '../types/game';
import { PRESTIGE_UPGRADES, PRESTIGE_REQUIREMENT, calculatePrestigeShards } from '../data/prestige';
import { formatCoins } from '../utils/formatters';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import {
  Infinity as InfinityIcon,
  Sparkles,
  Sword,
  Cpu,
  Moon,
  Crown,
  AlertTriangle,
  Flame,
} from 'lucide-react';

interface PrestigeModalProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Sword,
  Cpu,
  Sparkles,
  Moon,
  Crown,
};

export const PrestigeModal: React.FC<PrestigeModalProps> = ({ state, setState }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const potentialShards = calculatePrestigeShards(state.lifetimeCoins);
  const shardsToGain = Math.max(0, potentialShards - state.lifetimePrestigeShards);
  const canPrestige = state.lifetimeCoins >= PRESTIGE_REQUIREMENT && shardsToGain > 0;

  const handleAscend = () => {
    if (!canPrestige) return;

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

    setShowConfirm(false);
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
    <div className="w-full max-w-4xl mx-auto px-4 py-4 overflow-y-auto">
      {/* PRESTIGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 font-display">
            <InfinityIcon className="w-6 h-6 text-pink-400" />
            Cosmic Ascension (Prestige)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Reset current progress to harness eternal cosmic Matthew Shards
          </p>
        </div>

        {/* SHARDS BALANCE BADGE */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-950/80 to-pink-950/80 border border-pink-500/40 shadow-lg shadow-pink-500/20">
          <Sparkles className="w-5 h-5 text-pink-400 animate-spin" style={{ animationDuration: '6s' }} />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-pink-300 uppercase tracking-wider">Available Shards</span>
            <span className="text-lg font-black text-white">{state.prestigeShards.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ASCENSION HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 to-purple-950/40 border border-purple-500/30 p-6 mb-8 text-center shadow-2xl backdrop-blur-md">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-1 mb-3 shadow-lg shadow-purple-500/40 flex items-center justify-center">
            <Flame className="w-8 h-8 text-white" />
          </div>

          <h3 className="text-xl md:text-2xl font-black text-slate-100 font-display">
            Ascend to the Next Realm
          </h3>
          <p className="text-xs md:text-sm text-slate-300 mt-1.5 leading-relaxed">
            Ascension resets your coins and basic shop upgrades, but preserves all unlocked skins, achievements, and
            lifetime stats. Each Matthew Shard gives a permanent <span className="text-pink-400 font-bold">+2%</span> boost to all earnings.
          </p>

          {/* GAIN COUNTER */}
          <div className="my-5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-around w-full max-w-md">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Lifetime Coins</span>
              <p className="text-base font-extrabold text-amber-400">{formatCoins(state.lifetimeCoins)}</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-800" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Shards on Ascend</span>
              <p className="text-base font-extrabold text-pink-400">+{shardsToGain.toLocaleString()}</p>
            </div>
          </div>

          {/* ASCEND BUTTON */}
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!canPrestige}
            className={`px-8 py-3.5 rounded-2xl font-extrabold text-sm uppercase tracking-wider transition-all ${
              canPrestige
                ? 'bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-500 hover:brightness-110 active:scale-95 text-white shadow-xl shadow-purple-500/30 cursor-pointer animate-pulse'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/40'
            }`}
          >
            {canPrestige
              ? `Ascend Now (+${shardsToGain} Shards)`
              : `Requires 1M Coins (${formatCoins(state.lifetimeCoins)} / 1M)`}
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h4 className="text-xl font-bold text-slate-100 font-display">Confirm Cosmic Ascension?</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              You will reset your current coins and upgrade levels in exchange for{' '}
              <strong className="text-pink-400">+{shardsToGain} Matthew Shards</strong>.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAscend}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs hover:brightness-110 shadow-lg shadow-pink-500/30 transition"
              >
                Yes, Ascend!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT COSMIC PERKS TREE */}
      <div className="pb-20">
        <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2 font-display">
          <Sparkles className="w-5 h-5 text-pink-400" />
          Eternal Cosmic Upgrades
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESTIGE_UPGRADES.map((perk) => {
            const currentLevel = state.prestigeUpgrades[perk.id] || 0;
            const isMax = currentLevel >= perk.maxLevel;
            const cost = Math.floor(perk.baseCost * Math.pow(perk.costMultiplier, currentLevel));
            const canAfford = state.prestigeShards >= cost && !isMax;
            const IconComp = ICON_MAP[perk.icon] || Sparkles;

            return (
              <div
                key={perk.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-md backdrop-blur-md"
              >
                <div className="flex items-center gap-3.5 flex-1 pr-3">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center p-2.5">
                    <IconComp className="w-full h-full" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{perk.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-pink-950/60 text-pink-300 border border-pink-500/30">
                        {currentLevel} / {perk.maxLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{perk.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleBuyPerk(perk.id)}
                  disabled={!canAfford || isMax}
                  className={`px-3 py-2 rounded-xl font-bold text-xs min-w-[85px] transition ${
                    isMax
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/40 cursor-default'
                      : canAfford
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:brightness-110 shadow-md shadow-pink-500/20 cursor-pointer active:scale-95'
                      : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-700/40'
                  }`}
                >
                  {isMax ? 'MAXED' : `${cost} Shards`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
