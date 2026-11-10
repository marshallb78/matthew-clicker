import React, { useEffect, useRef, useState } from 'react';
import { GameState } from '../types/game';
import { getStormSkinsForSeason, equipSkin, Skin } from '../data/skins';
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

  // Only show the current active season's 5 secret storm skins — no future season spoilers!
  const currentSeasonStormSkins = getStormSkinsForSeason(state.currentSeasonId);

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
      onNotify('EVENT SHOP LOCKED', 'Only open during Friday Matthew Storm!');
      return;
    }

    if (state.gems < price) {
      onNotify('NOT ENOUGH GEMS', `Need ${price} Gems (${state.gems}/${price}).`);
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

    onNotify('STORM SKIN UNLOCKED!', `${skin.name} equipped!`);
  };

  const ownedStormSkinsCount = currentSeasonStormSkins.filter((s) =>
    state.unlockedSkins.includes(s.id)
  ).length;

  const countdownSec = Math.max(1, stormState.secondsUntilStart);
  const isFinalThree = countdownSec <= 3;

  return (
    <>
      {/* 1. 10-SECOND FULLSCREEN LIGHTNING COUNTDOWN OVERLAY */}
      {stormState.status === 'fullscreen_10s_countdown' && (
        <div className="fixed inset-0 z-[90] w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-b from-[#240245] via-[#110124] to-black text-white select-none p-6 overflow-hidden font-chunky">
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

          <div
            key={`ring-${countdownSec}`}
            className="absolute top-1/2 left-1/2 w-80 h-80 rounded-full border-4 border-fuchsia-400 pointer-events-none"
            style={{ animation: 'shockwaveExpand 0.95s ease-out infinite' }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] rounded-full border-2 border-dashed border-cyan-400/40 animate-spin pointer-events-none"
            style={{ animationDuration: isFinalThree ? '3s' : '7s' }}
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 rounded-3xl bg-fuchsia-500/20 border-2 border-yellow-300 flex items-center justify-center mb-4 shadow-[0_0_45px_rgba(250,204,21,0.85)] animate-bounce">
              <Zap className="w-14 h-14 text-yellow-300" />
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-center text-white uppercase tracking-tight drop-shadow-[0_4px_25px_rgba(217,70,239,0.9)]">
              MATTHEW STORM
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

            <span className="px-4 py-1.5 rounded-full bg-fuchsia-500/30 border border-fuchsia-300 text-sm font-black uppercase tracking-widest text-yellow-300">
              ⚡ 4× CLICKS &amp; SECRET STORM VAULT ⚡
            </span>
          </div>
        </div>
      )}

      {/* 2. FULL-SCREEN, IMAGE-FIRST SECRET STORM SHOP */}
      {isOpenShop && (
        <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-gradient-to-b from-[#1a0733] via-[#110422] to-[#080212] font-chunky text-slate-100 select-none overflow-hidden animate-fade-in">
          {/* TOP BAR */}
          <div className="flex items-center justify-between px-5 sm:px-8 py-4 bg-[#220a42]/90 border-b-2 border-fuchsia-400/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/25 border-2 border-fuchsia-400 flex items-center justify-center text-fuchsia-300 shadow-[0_0_25px_rgba(217,70,239,0.5)]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-200 via-yellow-200 to-cyan-300 uppercase tracking-wide">
                  Storm Event Vault
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/50 text-[11px] font-black text-fuchsia-200">
                    {ownedStormSkinsCount} / {currentSeasonStormSkins.length} Owned
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[11px] font-black text-amber-300">
                    ⚡ +10 💎 / 10m Active
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-950/95 border-2 border-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.4)]">
                <Gem className="w-5 h-5 text-fuchsia-300" />
                <span className="text-base sm:text-lg font-black text-white">{state.gems}</span>
              </div>

              <button
                onClick={onCloseShop}
                className="px-4 py-2.5 rounded-2xl bg-purple-900/80 hover:bg-purple-800 border-2 border-purple-500/60 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition shadow-lg"
              >
                <X className="w-5 h-5" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>
          </div>

          {/* HUGE VISUAL ARTWORK GRID (MINIMAL TEXT, MORE GRAPHICS) */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex items-center">
            <div className="w-full max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {currentSeasonStormSkins.map((skin) => {
                const isOwned = state.unlockedSkins.includes(skin.id);
                const isEquipped = state.equippedSkin === skin.id;
                const price = skin.gemCost || GEM_ECONOMY_CONFIG.stormSkinCostGems;
                const canAfford = state.gems >= price && stormState.shopOpen;

                return (
                  <div
                    key={skin.id}
                    onClick={() => {
                      if (isOwned || canAfford) {
                        handleBuyStormSkin(skin);
                      }
                    }}
                    className={`group relative rounded-3xl p-4 border-2 flex flex-col items-center justify-between transition-all duration-200 hover:-translate-y-1.5 shadow-2xl ${
                      isEquipped
                        ? 'bg-gradient-to-b from-purple-900/90 to-[#140529] border-yellow-300 ring-2 ring-yellow-300/60 shadow-[0_0_35px_rgba(253,224,71,0.4)]'
                        : isOwned
                        ? 'bg-gradient-to-b from-purple-950/80 to-[#100421] border-fuchsia-400/80 cursor-pointer'
                        : canAfford
                        ? 'bg-gradient-to-b from-[#1e0a3b] to-[#0e031d] border-fuchsia-400/70 hover:border-yellow-300 cursor-pointer'
                        : 'bg-[#0e041d]/90 border-purple-900/70 opacity-85'
                    }`}
                  >
                    {/* HUGE CHARACTER ARTWORK */}
                    <div className="relative w-full aspect-square rounded-2xl bg-black/65 border border-purple-700/50 p-4 flex items-center justify-center overflow-hidden">
                      <div
                        className="absolute inset-0 opacity-35 pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle at 50% 50%, rgba(217, 70, 239, 0.45), transparent 70%)',
                        }}
                      />
                      <img
                        src={skin.image}
                        alt={skin.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            skin.fallbackImage || './images/skins/classic_matthew.png';
                        }}
                        className="relative z-10 w-full h-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.85)] transition-transform duration-200 group-hover:scale-110"
                      />

                      <span className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-lg bg-fuchsia-500/25 border border-fuchsia-400/50 text-[10px] font-black uppercase text-fuchsia-200">
                        Event Exclusive
                      </span>
                    </div>

                    {/* CLEAN NAME + BIG GRAPHICAL ACTION BUTTON */}
                    <div className="w-full mt-4 text-center space-y-2.5">
                      <h4 className="text-base font-black text-white truncate">{skin.name}</h4>

                      {isEquipped ? (
                        <div className="w-full py-2.5 rounded-2xl bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg">
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Equipped</span>
                        </div>
                      ) : isOwned ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyStormSkin(skin);
                          }}
                          className="w-full py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase cursor-pointer transition btn-chunky"
                        >
                          Equip
                        </button>
                      ) : (
                        <button
                          disabled={!canAfford}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyStormSkin(skin);
                          }}
                          className={`w-full py-2.5 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-1.5 transition btn-chunky ${
                            canAfford
                              ? 'bg-gradient-to-r from-fuchsia-500 via-pink-500 to-amber-400 text-slate-950 cursor-pointer shadow-lg hover:brightness-110'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 cursor-not-allowed'
                          }`}
                        >
                          {!stormState.shopOpen ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Locked</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{price} 💎</span>
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

      {/* 3. FULL-SCREEN CLOSING LIVE EVENT ANIMATION + EVENT RECAP */}
      {isOpenRecap && (
        <div className="fixed inset-0 z-[85] w-screen h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#180730] via-[#0c031a] to-black font-chunky text-white overflow-hidden">
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
                ⚡ STORM COMPLETE ⚡
              </h2>
            </div>
          ) : (
            <div className="relative w-full max-w-2xl bg-[#180a2e]/95 border-2 border-fuchsia-400 rounded-3xl p-8 shadow-[0_0_70px_rgba(217,70,239,0.5)] text-center animate-fade-in">
              <Award className="w-16 h-16 text-yellow-300 mx-auto mb-3 animate-bounce" />
              <h2 className="text-3xl font-black text-fuchsia-200 uppercase">
                Matthew Storm Complete!
              </h2>

              <div className="my-6 grid grid-cols-2 gap-3.5 text-center">
                <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-700">
                  <span className="text-[11px] text-purple-300 font-black uppercase">Storm Time</span>
                  <p className="text-xl font-black text-cyan-300 mt-1">
                    {formatTime(state.eventStats.activeSeconds)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-700">
                  <span className="text-[11px] text-purple-300 font-black uppercase">Storm Gems</span>
                  <p className="text-xl font-black text-fuchsia-300 mt-1">
                    +{state.eventStats.gemsEarned} 💎
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-700">
                  <span className="text-[11px] text-purple-300 font-black uppercase">Giant Matthew Coins</span>
                  <p className="text-xl font-black text-yellow-300 mt-1">
                    +{formatCoins(state.eventStats.giantMatthewRewardsCoins)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-purple-950/80 border border-purple-700">
                  <span className="text-[11px] text-purple-300 font-black uppercase">Storm Skins</span>
                  <p className="text-xl font-black text-emerald-300 mt-1">
                    {ownedStormSkinsCount} / {currentSeasonStormSkins.length}
                  </p>
                </div>
              </div>

              <button
                onClick={onCloseRecap}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider cursor-pointer shadow-lg hover:brightness-110 transition btn-chunky"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};
