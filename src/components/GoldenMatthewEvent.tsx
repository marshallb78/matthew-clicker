import React, { useState, useEffect } from 'react';
import { GameState } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { calculateCPS, calculateClickPower } from '../utils/calculations';
import { formatCoins } from '../utils/formatters';

interface GoldenMatthewEventProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onSpawnBonus: (text: string) => void;
}

export const GoldenMatthewEvent: React.FC<GoldenMatthewEventProps> = ({ state, setState, onSpawnBonus }) => {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 10, y: 30 });
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Interval timer for spawning event
  useEffect(() => {
    const resonanceLvl = state.prestigeUpgrades['golden_resonance'] || 0;
    // Base 90s, down to 45s with prestige
    const spawnDelay = Math.max(35000, (90000 - resonanceLvl * 10000) + (Math.random() - 0.5) * 20000);

    const timer = setTimeout(() => {
      // Spawn golden matthew
      const startLeft = Math.random() > 0.5;
      setDirection(startLeft ? 'right' : 'left');
      setPosition({
        x: startLeft ? -80 : window.innerWidth + 80,
        y: 100 + Math.random() * (window.innerHeight - 300),
      });
      setIsActive(true);
      soundManager.playGoldenSpawn();

      // Duration: 10s base + 3s with resonance
      const duration = 10000 + resonanceLvl * 3000;
      setTimeout(() => {
        setIsActive(false);
      }, duration);
    }, spawnDelay);

    return () => clearTimeout(timer);
  }, [isActive, state.prestigeUpgrades]);

  // Movement animation loop when active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setPosition((prev) => {
        const speed = direction === 'right' ? 3.5 : -3.5;
        const newX = prev.x + speed;
        // gentle sine wave oscillation
        const newY = prev.y + Math.sin(newX * 0.04) * 2.5;

        // Auto-despawn when leaving screen
        if ((direction === 'right' && newX > window.innerWidth + 90) || (direction === 'left' && newX < -90)) {
          setIsActive(false);
        }

        return { x: newX, y: newY };
      });
    }, 25);

    return () => clearInterval(interval);
  }, [isActive, direction]);

  const handleCatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsActive(false);

    soundManager.playCrit();
    particleEngine.emitClick(e.clientX, e.clientY, true, 25);

    // Roll reward: 50% 7x Frenzy for 15s, 50% Huge Coin Bounty
    const isFrenzy = Math.random() > 0.4;
    const cps = calculateCPS(state);
    const { totalPower } = calculateClickPower(state);

    if (isFrenzy) {
      setState((prev) => ({
        ...prev,
        frenzyTimer: 15,
        frenzyMultiplier: 7,
        goldenMatthewsClicked: prev.goldenMatthewsClicked + 1,
      }));
      onSpawnBonus('⚡ 7X COIN FRENZY ACTIVATED FOR 15s! ⚡');
    } else {
      // Coin bounty: either 120 seconds of CPS or 50 clicks
      const bounty = Math.max(500, Math.floor(cps * 120 + totalPower * 50));
      setState((prev) => ({
        ...prev,
        coins: prev.coins + bounty,
        lifetimeCoins: prev.lifetimeCoins + bounty,
        goldenMatthewsClicked: prev.goldenMatthewsClicked + 1,
      }));
      onSpawnBonus(`🌟 GOLDEN BOUNTY! +${formatCoins(bounty)} COINS! 🌟`);
    }
  };

  if (!isActive) return null;

  return (
    <div
      onClick={handleCatch}
      className="fixed z-50 cursor-pointer select-none transition-transform hover:scale-110 active:scale-95 animate-pulse"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Glowing Aura Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-300 to-yellow-100 blur-md opacity-80 animate-spin" style={{ animationDuration: '4s' }} />
        <img
          src="./images/skins/golden_matthew.png"
          alt="Golden Matthew"
          className="relative w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]"
        />
      </div>
    </div>
  );
};

