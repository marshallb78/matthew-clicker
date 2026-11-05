import React, { useState, useEffect } from 'react';
import { GameState } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { calculateCPS, calculateClickPower } from '../utils/calculations';
import { formatCoins } from '../utils/formatters';
import { BALANCE } from '../data/balance';

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
    const spawnDelay = Math.max(
      45000,
      (BALANCE.goldenEvent.baseDelayMs - resonanceLvl * 8000) +
        (Math.random() - 0.5) * BALANCE.goldenEvent.delayVarianceMs
    );

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

      // Flight duration
      const duration = BALANCE.goldenEvent.flightDurationMs + resonanceLvl * 2000;
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

    // Roll reward: 50% Frenzy, 50% Coin Bounty
    const isFrenzy = Math.random() > 0.45;
    const cps = calculateCPS(state);
    const { totalPower } = calculateClickPower(state);

    if (isFrenzy) {
      setState((prev) => ({
        ...prev,
        frenzyTimer: BALANCE.goldenEvent.frenzyDurationSec,
        frenzyMultiplier: BALANCE.goldenEvent.frenzyMultiplier,
        goldenMatthewsClicked: prev.goldenMatthewsClicked + 1,
      }));
      onSpawnBonus(`⚡ ${BALANCE.goldenEvent.frenzyMultiplier}X COIN FRENZY FOR ${BALANCE.goldenEvent.frenzyDurationSec}s! ⚡`);
    } else {
      const bounty = Math.max(
        BALANCE.goldenEvent.minBountyFloor,
        Math.floor(cps * BALANCE.goldenEvent.bountyCpsSeconds + totalPower * BALANCE.goldenEvent.bountyClickCount)
      );
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
          src="./images/skins/golden-normal.png"
          alt="Golden Matthew"
          className="relative w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(255,215,0,0.9)]"
        />
      </div>
    </div>
  );
};

