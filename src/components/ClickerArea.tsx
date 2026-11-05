import React, { useState, useRef, useEffect } from 'react';
import { GameState, FloatingNumber } from '../types/game';
import { SKINS } from '../data/skins';
import { ENVIRONMENTS } from '../data/environments';
import { formatCoins } from '../utils/formatters';
import { calculateClickPower, calculateCPS } from '../utils/calculations';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { EnvironmentBackground } from './EnvironmentBackground';
import { Volume2, VolumeX, Settings as SettingsIcon, Flame, Target } from 'lucide-react';

interface ClickerAreaProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onEarnCoins: (amount: number, isClick: boolean, isCrit: boolean) => void;
  onOpenSettings: () => void;
}

export const ClickerArea: React.FC<ClickerAreaProps> = ({
  state,
  setState,
  onEarnCoins,
  onOpenSettings,
}) => {
  const [isSquashing, setIsSquashing] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const characterRef = useRef<HTMLDivElement | null>(null);
  const squashTimeoutRef = useRef<number | null>(null);

  const equippedSkin = SKINS.find((s) => s.id === state.equippedSkin) || SKINS[0];
  const { totalPower, critChance, critMultiplier } = calculateClickPower(state);
  const cps = calculateCPS(state);

  // Preload current skin image for immediate texture availability
  useEffect(() => {
    const img = new Image();
    img.src = equippedSkin.image;
  }, [equippedSkin]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (squashTimeoutRef.current) window.clearTimeout(squashTimeoutRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();

    const rect = characterRef.current?.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent<HTMLDivElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLDivElement>).clientY;
    }

    if ((!clientX || !clientY) && rect) {
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    const isCrit = Math.random() < critChance;
    const earned = isCrit ? Math.floor(totalPower * critMultiplier) : totalPower;

    if (isCrit) {
      soundManager.playCrit();
    } else {
      soundManager.playClick(state.combo);
    }

    particleEngine.emitClick(clientX, clientY, isCrit, 8);

    // Responsive squash-and-stretch bounce
    setIsSquashing(true);
    if (squashTimeoutRef.current) window.clearTimeout(squashTimeoutRef.current);
    squashTimeoutRef.current = window.setTimeout(() => setIsSquashing(false), 130);

    // Floating coin text
    const floatId = Date.now() + Math.random();
    const floatX = clientX + (Math.random() - 0.5) * 50;
    const floatY = clientY - 40;
    const floatValue = isCrit ? `CRIT! +${formatCoins(earned)}` : `+${formatCoins(earned)}`;

    setFloatingNumbers((prev) => [
      ...prev.slice(-10),
      { id: floatId, x: floatX, y: floatY, value: floatValue, isCrit },
    ]);

    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((f) => f.id !== floatId));
    }, 850);

    onEarnCoins(earned, true, isCrit);
  };

  const toggleMute = () => {
    const isMuted = soundManager.toggleMute();
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, isMuted },
    }));
  };

  // --- MILESTONE PROGRESS TRACKING ---
  // Determine next worthwhile unlock goal (Next skin or next environment)
  const nextLockedSkin = SKINS.find((s) => !state.unlockedSkins.includes(s.id) && s.cost > 0);
  const nextLockedEnv = ENVIRONMENTS.find(
    (e) => e.unlockCoins && state.lifetimeCoins < e.unlockCoins
  );

  let nextGoalTitle = 'Cosmic Mastery';
  let nextGoalTarget = 1;
  let nextGoalCurrent = 1;
  let nextGoalIcon = '👑';

  if (nextLockedSkin && (!nextLockedEnv || nextLockedSkin.cost <= (nextLockedEnv.unlockCoins || Infinity))) {
    nextGoalTitle = nextLockedSkin.name;
    nextGoalTarget = nextLockedSkin.cost;
    nextGoalCurrent = state.coins;
    nextGoalIcon = '✨';
  } else if (nextLockedEnv && nextLockedEnv.unlockCoins) {
    nextGoalTitle = nextLockedEnv.name;
    nextGoalTarget = nextLockedEnv.unlockCoins;
    nextGoalCurrent = state.lifetimeCoins;
    nextGoalIcon = nextLockedEnv.icon;
  }

  const goalPercent = Math.min(100, Math.floor((nextGoalCurrent / nextGoalTarget) * 100));

  return (
    <div className="relative flex-1 flex flex-col items-center justify-between h-full p-4 select-none overflow-hidden">
      {/* 1. DYNAMIC UNLOCKABLE ENVIRONMENT BACKGROUND */}
      <EnvironmentBackground
        state={state}
        onSelectEnvironment={(id) => setState((prev) => ({ ...prev, selectedEnvironment: id }))}
      />

      {/* 2. TOP BAR: CONTROLS & FRENZY */}
      <div className="w-full flex items-center justify-between pt-2 px-2 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-2xl bg-slate-900/80 backdrop-blur-md border-2 border-slate-700/80 hover:border-amber-400/80 flex items-center justify-center text-slate-300 hover:text-white transition shadow-md active:scale-90"
            title={state.settings.isMuted ? 'Unmute' : 'Mute'}
          >
            {state.settings.isMuted ? (
              <VolumeX className="w-5 h-5 text-red-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-amber-400" />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-2xl bg-slate-900/80 backdrop-blur-md border-2 border-slate-700/80 hover:border-cyan-400/80 flex items-center justify-center text-slate-300 hover:text-white transition shadow-md active:scale-90"
            title="Settings & Stats"
          >
            <SettingsIcon className="w-5 h-5 text-cyan-400" />
          </button>
        </div>

        {/* FRENZY NOTIFICATION */}
        {state.frenzyTimer > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-amber-500/40 animate-pulse">
            <Flame className="w-4 h-4" />
            <span>{state.frenzyMultiplier}X FRENZY ({Math.ceil(state.frenzyTimer)}s)</span>
          </div>
        )}
      </div>

      {/* 3. BIG CHUNKY COIN COUNTER */}
      <div className="flex flex-col items-center z-20 my-auto sm:my-2">
        <div className="flex items-center gap-2 drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-white flex items-center justify-center text-slate-950 font-black text-xl sm:text-2xl shadow-lg shadow-yellow-500/40">
            M
          </div>
          <span className="text-4xl sm:text-6xl font-black text-yellow-300 tracking-tight font-chunky drop-shadow-[0_4px_0_#92400e]">
            {formatCoins(state.coins)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-1 text-xs sm:text-sm font-bold text-slate-300/90 bg-slate-950/70 backdrop-blur-md px-3.5 py-0.5 rounded-full border border-slate-800">
          <span>{formatCoins(cps)}</span>
          <span className="text-slate-400 font-semibold">per second</span>
        </div>

        {/* NEXT GOAL MILESTONE PROGRESS BAR */}
        <div className="mt-2.5 flex flex-col items-center gap-1 bg-slate-950/70 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800/80 shadow-md max-w-xs w-full">
          <div className="flex items-center justify-between w-full text-[11px] font-black">
            <span className="flex items-center gap-1 text-slate-300">
              <Target className="w-3 h-3 text-amber-400" />
              <span>Next: {nextGoalIcon} {nextGoalTitle}</span>
            </span>
            <span className="text-amber-300 font-mono">{goalPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300 shadow-sm shadow-yellow-400/50"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4. CENTRAL HERO MATTHEW CHARACTER */}
      <div className="relative flex-1 flex items-center justify-center w-full z-10 py-2">
        <div
          ref={characterRef}
          onMouseDown={handleClick}
          onTouchStart={handleClick}
          className={`relative cursor-pointer transition-transform duration-75 select-none ${
            isSquashing ? 'animate-squash' : 'hover:scale-[1.03] active:scale-95'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div className="relative w-60 h-60 sm:w-80 sm:h-80 md:w-96 md:h-96 max-w-[85vw] max-h-[50vh] flex items-center justify-center">
            <img
              src={equippedSkin.image}
              alt={equippedSkin.name}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>
      </div>

      {/* 5. COMPACT EQUIPPED SKIN LABEL */}
      <div className="z-10 pb-2">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3.5 py-1 rounded-full text-xs font-bold shadow-md">
          <span className="text-slate-400">Character:</span>
          <span className="text-amber-300">{equippedSkin.name}</span>
          <span className="text-[10px] text-cyan-400 font-semibold">({equippedSkin.perkDescription})</span>
        </div>
      </div>

      {/* 6. FLOATING COIN DAMAGE POPUPS */}
      {floatingNumbers.map((f) => (
        <div
          key={f.id}
          className={`fixed pointer-events-none font-black z-50 animate-float-coin select-none font-chunky ${
            f.isCrit
              ? 'text-yellow-200 text-3xl sm:text-4xl drop-shadow-[0_3px_0_#b45309]'
              : 'text-amber-300 text-2xl sm:text-3xl drop-shadow-[0_2px_0_#78350f]'
          }`}
          style={{
            left: f.x,
            top: f.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {f.value}
        </div>
      ))}
    </div>
  );
};
