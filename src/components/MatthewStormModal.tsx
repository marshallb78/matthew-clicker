import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '../types/game';
import { MATTHEW_STORM_SKINS, equipSkin, Skin } from '../data/skins';
import { MatthewStormState } from '../utils/scheduleEngine';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import { formatCoins, formatTime } from '../utils/formatters';
import { saveGame } from '../utils/storage';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { Zap, Gem, Check, Lock, ShoppingBag, X, Sparkles, Award } from 'lucide-react';

interface MatthewStormModalProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  stormState: MatthewStormState;
  isOpenShop: boolean;
  onCloseShop: () => void;
  isOpenRecap: boolean;
  onCloseRecap: () => void;
  onNotify: (title: string, subtitle: string) => void;
}

export const MatthewStormModal: React.FC<MatthewStormModalProps> = ({
  state,
  setState,
  stormState,
  isOpenShop,
  onCloseShop,
  isOpenRecap,
  onCloseRecap,
  onNotify,
}) => {
  const lastCountdownSecRef = useRef<number>(-1);
  const [closingPhase, setClosingPhase] = useState<'collapsing' | 'summary'>('collapsing');

  useEffect(() => {
    if (stormState.status === 'fullscreen_10s_countdown') {
      const sec = stormState.secondsUntilStart;
      if (sec !== lastCountdownSecRef.current && sec > 0 && sec <= 10) {
        lastCountdownSecRef.current = sec;
        soundManager.playCountdownTick(sec);
        if (sec === 10 || sec === 5 || sec <= 3) {
          soundManager.playThunder();
        }
      }
    } else {
      lastCountdownSecRef.current = -1;
    }
  }, [stormState.status, stormState.secondsUntilStart]);

  // Dramatic Closing Live Event Animation before showing the Event Recap Summary
  useEffect(() => {
    if (!isOpenRecap) {
      setClosingPhase('collapsing');
      return;
    }
    setClosingPhase('collapsing');
    soundManager.playThunder();
    particleEngine.emitPrestige();

    const timer = setTimeout(() => {
      setClosingPhase('summary');
      soundManager.playSkinUnlock();
    }, 2600);

    return () => clearTimeout(timer);
  }, [isOpenRecap]);

  const handleBuyStormSkin = (skin: Skin) => {
    const price = skin.gemCost || GEM_ECONOMY_CONFIG.stormSkinCostGems;
    const isOwned = state.unlockedSkins.includes(skin.id);

    if (isOwned) {
      setState((prev) => {
        const next = equipSkin(prev, skin.id);
        saveGame(next);
        return next;
      });
      soundManager.playBuy();
      return;
    }

    if (!stormState.shopOpen) {
      onNotify(
        'EVENT SHOP LOCKED',
        'Secret Storm skins can only be purchased while Matthew Storm is active!'
      );
      return;
    }

    if (state.gems < price) {
      onNotify(
        'NOT ENOUGH GEMS',
        `You need ${price} Gems (${state.gems}/${price}). Keep playing actively!`
      );
      return;
    }

    soundManager.playSkinUnlock();
    particleEngine.emitPrestige();
    particleEngine.emitMatthewRain(45, [skin.image]);

    setState((prev) => {
      if (prev.gems < price || prev.unlockedSkins.includes(skin.id)) return prev;
      let nextState: GameState = {
        ...prev,
        gems: prev.gems - price,
        unlockedSkins: Array.from(new Set([...prev.unlockedSkins, skin.id])),
        lastActiveInputTimestamp: Date.now(),
        eventStats: {
          ...prev.eventStats,
          stormSkinsPurchased: Array.from(
            new Set([...prev.eventStats.stormSkinsPurchased, skin.id])
          ),
        },
      };
      nextState = equipSkin(nextState, skin.id);
      saveGame(nextState);
      return nextState;
    });

    onNotify(
      'SECRET STORM SKIN UNLOCKED & EQUIPPED!',
      `${skin.name} is permanently yours across all seasons!`
    );
  };

  const ownedStormSkinsCount = MATTHEW_STORM_SKINS.filter((s) =>
    state.unlockedSkins.includes(s.id)
  ).length;

  const countdownSec = Math.max(1, stormState.secondsUntilStart);
  const isFinalThree = countdownSec <= 3;

  return (
    <>
      {/* 1. UPGRADED 10-SECOND FULLSCREEN LIGHTNING COUNTDOWN OVERLAY */}
      {stormState.status === 'fullscreen_10s_countdown' && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-gradient-to-b from-[#240245] via-[#110124] to-black text-white select-none p-6 overflow-hidden font-chunky">
          <style>{`
            @keyframes countdownPulse {
              0% { transform: scale(0.75) rotate(-4deg); opacity: 0.4; }
              50% { transform: scale(1.18) rotate(2deg); opacity: 1; }
              100% { transform: scale(1.0) rotate(0deg); opacity: 0.95; }
            }
            @keyframes shockwaveExpand {
              0% { transform: translate(-50%, -50%) scale(0.4); opacity: 0.9; }
              100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
            }
          `}</style>

          {/* Expanding Shockwave Rings */}
          <div
            key={`ring-${countdownSec}`}
            className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full border-4 border-fuchsia-400 pointer-events-none"
            style={{ animation: 'shockwaveExpand 0.95s ease-out infinite' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] rounded-full border-2 border-dashed border-cyan-400/40 animate-spin pointer-events-none"
            style={{ animationDuration: isFinalThree ? '3s' : '7s' }}
          />

          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-150 ${
              isFinalThree ? 'bg-fuchsia-500/30 animate-pulse' : 'bg-purple-600/15'
            }`}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-3xl bg-fuchsia-500/20 border-2 border-yellow-300 flex items-center justify-center mb-4 shadow-[0_0_45px_rgba(250,204,21,0.85)] animate-bounce">
              <Zap className="w-14 h-14 text-yellow-300" />
            </div>

            <span className="px-4 py-1 rounded-full bg-fuchsia-500/30 border border-fuchsia-300 text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-fuchsia-200 mb-3">
              ⚡ WORLDWIDE LIVE EVENT IMMINENT ⚡
            </span>

            <h1 className="text-4xl sm:text-6xl font-black text-center text-white uppercase tracking-tight drop-shadow-[0_4px_25px_rgba(217,70,239,0.9)]">
              MATTHEW STORM LAUNCHING
            </h1>

            <div
              key={countdownSec}
              className={`my-6 text-8xl sm:text-9xl font-black font-mono drop-shadow-[0_0_55px_rgba(250,204,21,1)] ${
                isFinalThree ? 'text-rose-400' : 'text-yellow-300'
              }`}
              style={{ animation: 'countdownPulse 0.9s cubic-bezier(0.22, 1, 0.36, 1)' }}
            >
              {countdownSec}
            </div>

            <p className="text-sm sm:text-base font-bold text-purple-200 max-w-lg text-center">
              Get ready for <strong className="text-yellow-300">6×–15× Surge Multipliers</strong>,
              Raining Matthews, Giant Rare Matthew appearances, and the{' '}
              <strong className="text-fuchsia-300">Secret Storm Shop</strong>!
            </p>
          </div>
        </div>
      )}

      {/* 2. SECRET MATTHEW STORM EVENT SHOP MODAL (ONLY ACCESSIBLE DURING LIVE EVENT) */}
      {isOpenShop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#160829] border-2 border-fuchsia-400/70 rounded-3xl p-5 shadow-2xl font-chunky text-slate-100 overflow-hidden">
            <button
              onClick={onCloseShop}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-purple-900/80 text-slate-200 hover:text-white flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between pr-10 pb-3 border-b border-purple-800/70 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border-2 border-fuchsia-400 flex items-center justify-center text-fuchsia-300">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-fuchsia-200 uppercase">
                    Secret Matthew Storm Event Shop
                  </h2>
                  <p className="text-xs text-purple-300">
                    ⚡ Exclusive secret skins only viewable &amp; unlockable during the Matthew Storm live event!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-purple-950 border border-fuchsia-400/60">
                <Gem className="w-4 h-4 text-fuchsia-400" />
                <span className="text-sm font-black text-fuchsia-200">{state.gems} Gems</span>
              </div>
            </div>

            <div className="my-3 p-3 rounded-2xl bg-purple-950/60 border border-purple-700/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-black/30">
                <span className="text-fuchsia-300 font-black">⚡ Active Storm Play:</span>
                <p className="text-slate-300 font-bold">10 Gems per 10 mins</p>
              </div>
              <div className="p-2 rounded-xl bg-black/30">
                <span className="text-cyan-300 font-black">🎮 Normal Active Play:</span>
                <p className="text-slate-300 font-bold">3 Gems per 10 mins</p>
              </div>
              <div className="p-2 rounded-xl bg-black/30">
                <span className="text-amber-300 font-black">🎁 Daily &amp; Quests:</span>
                <p className="text-slate-300 font-bold">+5 Gems / day + Quest Gems</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1">
              {MATTHEW_STORM_SKINS.map((skin) => {
                const isOwned = state.unlockedSkins.includes(skin.id);
                const isEquipped = state.equippedSkin === skin.id;
                const price = skin.gemCost || GEM_ECONOMY_CONFIG.stormSkinCostGems;
                const canAfford = state.gems >= price && stormState.shopOpen;

                return (
                  <div
                    key={skin.id}
                    className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between transition ${
                      isEquipped
                        ? 'bg-purple-900/60 border-yellow-300 shadow-lg'
                        : isOwned
                        ? 'bg-purple-950/60 border-fuchsia-400/60'
                        : 'bg-slate-950/70 border-purple-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-black/60 border border-purple-600/50 p-1.5 flex items-center justify-center shrink-0">
                        <img
                          src={skin.image}
                          alt={skin.name}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              skin.fallbackImage ||
                              './images/skins/classic_matthew.png';
                          }}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/40">
                          Secret Event Skin
                        </span>
                        <h4 className="text-sm font-black text-white mt-1">{skin.name}</h4>
                        <p className="text-xs font-bold text-amber-300">{skin.perkDescription}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-purple-800/50 flex items-center justify-between">
                      <span className="text-xs font-black text-fuchsia-300 flex items-center gap-1">
                        <Gem className="w-3.5 h-3.5" />
                        {isOwned ? 'Permanently Owned' : `${price} Gems`}
                      </span>

                      {isEquipped ? (
                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-black text-xs flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Equipped
                        </span>
                      ) : isOwned ? (
                        <button
                          onClick={() => handleBuyStormSkin(skin)}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs cursor-pointer transition"
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={() => handleBuyStormSkin(skin)}
                          className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-1 transition ${
                            canAfford
                              ? 'bg-gradient-to-r from-fuchsia-500 to-amber-400 text-slate-950 cursor-pointer shadow-md hover:brightness-110'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          {!stormState.shopOpen ? (
                            <>
                              <Lock className="w-3 h-3" /> Event Inactive
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> Buy &amp; Equip ({price} 💎)
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. CLOSING LIVE EVENT ANIMATION + EVENT RECAP MODAL */}
      {isOpenRecap && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg font-chunky text-white overflow-hidden">
          {closingPhase === 'collapsing' ? (
            <div className="relative flex flex-col items-center justify-center text-center p-6 select-none">
              <style>{`
                @keyframes vortexImplode {
                  0% { transform: scale(2.2) rotate(0deg); opacity: 0.9; }
                  70% { transform: scale(0.3) rotate(540deg); opacity: 1; }
                  100% { transform: scale(3.5) rotate(720deg); opacity: 0; }
                }
              `}</style>
              <div
                className="w-72 h-72 rounded-full border-4 border-dashed border-fuchsia-400 flex items-center justify-center shadow-[0_0_90px_rgba(217,70,239,0.9)]"
                style={{ animation: 'vortexImplode 2.5s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
              >
                <Zap className="w-24 h-24 text-yellow-300 animate-ping" />
              </div>
              <h2 className="mt-8 text-3xl sm:text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-yellow-200 to-cyan-300 drop-shadow">
                ⚡ THE MATTHEW STORM IS CLEARING... ⚡
              </h2>
              <p className="text-sm text-purple-200 mt-2 font-bold">
                Sealing the Secret Storm Vault &amp; calculating your Live Event haul...
              </p>
            </div>
          ) : (
            <div className="relative w-full max-w-md bg-[#180a2e] border-2 border-fuchsia-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(217,70,239,0.5)] text-center animate-fade-in">
              <Award className="w-14 h-14 text-yellow-300 mx-auto mb-2 animate-bounce" />
              <h2 className="text-2xl font-black text-fuchsia-200 uppercase">
                Matthew Storm Complete!
              </h2>
              <p className="text-xs text-purple-200 mt-1">
                The lightning vortex has closed! Here is your official Live Event Summary:
              </p>

              <div className="my-5 space-y-2.5 text-left">
                <div className="p-3 rounded-2xl bg-purple-950/80 border border-purple-700 flex items-center justify-between">
                  <span className="text-xs text-purple-200 font-bold">Active Storm Time</span>
                  <span className="text-sm font-black text-cyan-300">
                    {formatTime(state.eventStats.activeSeconds)}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-950/80 border border-purple-700 flex items-center justify-between">
                  <span className="text-xs text-purple-200 font-bold">Storm Gems Earned</span>
                  <span className="text-sm font-black text-fuchsia-300">
                    {state.eventStats.gemsEarned} 💎
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-950/80 border border-purple-700 flex items-center justify-between">
                  <span className="text-xs text-purple-200 font-bold">Giant Matthew Coins</span>
                  <span className="text-sm font-black text-yellow-300">
                    +{formatCoins(state.eventStats.giantMatthewRewardsCoins)} (
                    {state.eventStats.giantMatthewsClicked} hits)
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-purple-950/80 border border-purple-700 flex items-center justify-between">
                  <span className="text-xs text-purple-200 font-bold">
                    Secret Storm Skins Owned
                  </span>
                  <span className="text-sm font-black text-emerald-300">
                    {ownedStormSkinsCount} / {MATTHEW_STORM_SKINS.length}
                  </span>
                </div>
              </div>

              <button
                onClick={onCloseRecap}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:brightness-110 transition"
              >
                Awesome! Continue Playing
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
