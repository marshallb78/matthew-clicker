import React, { useState, useRef, useEffect } from 'react';
import { GameState, FloatingNumber } from '../types/game';
import { SKINS } from '../data/skins';
import { formatCoins } from '../utils/formatters';
import { calculateClickPower, calculateCPS } from '../utils/calculations';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { Zap, Sparkles, TrendingUp, Flame } from 'lucide-react';

interface ClickerAreaProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onEarnCoins: (amount: number, isClick: boolean, isCrit: boolean) => void;
}

export const ClickerArea: React.FC<ClickerAreaProps> = ({ state, setState, onEarnCoins }) => {
  const [isPressed, setIsPressed] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const characterRef = useRef<HTMLDivElement | null>(null);

  const equippedSkin = SKINS.find((s) => s.id === state.equippedSkin) || SKINS[0];
  const { totalPower, critChance, critMultiplier, comboMultiplier } = calculateClickPower(state);
  const cps = calculateCPS(state);

  const handleClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Determine position for ripple and particle burst
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

    // Critical roll
    const isCrit = Math.random() < critChance;
    const earned = isCrit ? Math.floor(totalPower * critMultiplier) : totalPower;

    // Trigger audio
    if (isCrit) {
      soundManager.playCrit();
    } else {
      soundManager.playClick(state.combo);
    }

    // Trigger particle engine
    particleEngine.emitClick(clientX, clientY, isCrit, 12);

    // Trigger visual ripple
    if (rect) {
      const rx = clientX - rect.left;
      const ry = clientY - rect.top;
      const rippleId = Date.now() + Math.random();
      setRipples((prev) => [...prev.slice(-4), { id: rippleId, x: rx, y: ry }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== rippleId));
      }, 600);
    }

    // Character squash animation
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 90);

    // Floating text
    const floatId = Date.now() + Math.random();
    const floatX = clientX + (Math.random() - 0.5) * 40;
    const floatY = clientY - 30;
    const floatValue = isCrit ? `CRIT! +${formatCoins(earned)}` : `+${formatCoins(earned)}`;

    setFloatingNumbers((prev) => [
      ...prev.slice(-12),
      { id: floatId, x: floatX, y: floatY, value: floatValue, isCrit },
    ]);

    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((f) => f.id !== floatId));
    }, 900);

    // Update state via parent handler
    onEarnCoins(earned, true, isCrit);
  };

  // Combo meter bar percentage (0 to 100% based on 40 max combo)
  const comboPercent = Math.min(100, (state.combo / 40) * 100);

  return (
    <div className="relative flex flex-col items-center justify-between w-full h-full max-w-2xl mx-auto px-4 py-4 select-none">
      {/* COIN COUNTER DISPLAY */}
      <div className="flex flex-col items-center z-10 w-full pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 p-0.5 shadow-lg shadow-yellow-500/30 flex items-center justify-center font-bold text-dark text-xl">
            M
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-500 bg-clip-text text-transparent font-display drop-shadow-[0_4px_12px_rgba(255,200,0,0.3)]">
            {formatCoins(state.coins)}
          </h1>
        </div>

        {/* STATS ROW */}
        <div className="flex items-center gap-4 mt-2 text-xs md:text-sm font-semibold">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-cyan-400 backdrop-blur-md">
            <Zap className="w-3.5 h-3.5" />
            <span>+{formatCoins(totalPower)} / click</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-purple-500/30 text-purple-400 backdrop-blur-md">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{formatCoins(cps)} / sec</span>
          </div>

          {state.frenzyTimer > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-red-500 text-white animate-pulse font-bold shadow-lg shadow-red-500/40">
              <Flame className="w-3.5 h-3.5" />
              <span>{state.frenzyMultiplier}X FRENZY ({Math.ceil(state.frenzyTimer)}s)</span>
            </div>
          )}
        </div>

        {/* COMBO METER */}
        <div className="w-full max-w-xs mt-3 flex flex-col items-center">
          <div className="flex justify-between w-full text-[11px] font-bold text-slate-400 px-1 mb-1">
            <span className="flex items-center gap-1 text-cyan-300">
              <Sparkles className="w-3 h-3" />
              Combo {state.combo}x
            </span>
            <span className="text-amber-400">
              {comboMultiplier > 1 ? `${comboMultiplier.toFixed(2)}x Multiplier` : 'Click to build'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden border border-slate-700/50 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 transition-all duration-100 ease-out shadow-[0_0_8px_rgba(0,240,255,0.6)]"
              style={{ width: `${comboPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* HERO CHARACTER MATTHEW */}
      <div className="relative my-auto flex items-center justify-center py-6 w-full">
        {/* Dynamic Aura Glow behind Character */}
        <div
          className={`absolute w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl pointer-events-none transition-all duration-300 ${
            state.combo > 15
              ? 'bg-gradient-to-tr from-pink-600/40 to-cyan-500/50 scale-125'
              : 'bg-gradient-to-tr from-cyan-600/25 via-purple-600/20 to-blue-600/20'
          }`}
        />

        {/* Character Click Container */}
        <div
          ref={characterRef}
          onMouseDown={handleClick}
          onTouchStart={handleClick}
          className={`relative cursor-pointer select-none transition-transform duration-75 active:scale-95 ${
            isPressed ? 'scale-90 rotate-1' : 'scale-100 hover:scale-[1.02]'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Ripple rings */}
          {ripples.map((r) => (
            <span
              key={r.id}
              className="absolute rounded-full border-2 border-cyan-400/80 pointer-events-none animate-ping"
              style={{
                left: r.x,
                top: r.y,
                width: 60,
                height: 60,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}

          {/* Matthew Character Image */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]">
            <img
              src={equippedSkin.image}
              alt={equippedSkin.name}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none drop-shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            />
          </div>
        </div>
      </div>

      {/* EQUIPPED SKIN BADGE */}
      <div className="z-10 flex flex-col items-center pb-2">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/60 shadow-lg text-xs font-semibold backdrop-blur-md">
          <span className="text-slate-400">Equipped:</span>
          <span className="text-cyan-300 font-bold">{equippedSkin.name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {equippedSkin.rarity}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 mt-1 font-medium">{equippedSkin.perkDescription}</span>
      </div>

      {/* FLOATING DAMAGE/COIN NUMBERS */}
      {floatingNumbers.map((f) => (
        <div
          key={f.id}
          className={`fixed pointer-events-none font-extrabold z-40 transition-all duration-700 animate-float-up ${
            f.isCrit
              ? 'text-yellow-300 text-2xl md:text-3xl drop-shadow-[0_0_10px_rgba(255,215,0,0.8)]'
              : 'text-cyan-300 text-lg md:text-xl drop-shadow-[0_0_6px_rgba(0,240,255,0.6)]'
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
