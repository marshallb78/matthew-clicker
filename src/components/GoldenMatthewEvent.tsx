import React, { useState, useEffect } from 'react';
import { GameState } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { formatCoins } from '../utils/formatters';
import { BALANCE } from '../data/balance';
import { calculateCPS, calculateClickPower } from '../utils/calculations';

interface GoldenMatthewEventProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onSpawnBonus: (text: string) => void;
}

export const GoldenMatthewEvent: React.FC<GoldenMatthewEventProps> = ({
  state,
  setState,
  onSpawnBonus,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 10, y: 30 });
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  // Interval timer for spawning Golden Matthew
  useEffect(() => {
    const spawnDelay = Math.max(
      45000,
      BALANCE.goldenEvent.baseDelayMs + (Math.random() - 0.5) * BALANCE.goldenEvent.delayVarianceMs
    );

    const timer = setTimeout(() => {
      const startLeft = Math.random() > 0.5;
      setDirection(startLeft ? 'right' : 'left');
      setPosition({
        x: startLeft ? -80 : window.innerWidth + 80,
        y: 100 + Math.random() * (window.innerHeight - 300),
      });
      setIsActive(true);
      soundManager.playGoldenSpawn();

      const duration = BALANCE.goldenEvent.flightDurationMs;
      setTimeout(() => {
        setIsActive(false);
      }, duration);
    }, spawnDelay);

    return () => clearTimeout(timer);
  }, [isActive]);

  // Movement animation loop when active
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setPosition((prev) => {
        const speed = direction === 'right' ? 3.5 : -3.5;
        const newX = prev.x + speed;
        const newY = prev.y + Math.sin(newX * 0.04) * 2.5;

        if (
          (direction === 'right' && newX > window.innerWidth + 90) ||
          (direction === 'left' && newX < -90)
        ) {
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

    // Scales meaningfully with the player's current production and score without bank-doubling exploits
    const cps = calculateCPS(state);
    const { totalPower } = calculateClickPower(state);
    const productionBounty = Math.floor(
      cps * BALANCE.goldenEvent.bountyCpsSeconds + totalPower * BALANCE.goldenEvent.bountyClickCount
    );
    const scoreScaledBounty = Math.floor(Math.min(state.coins * 0.08, productionBounty * 2.5));
    const bounty = Math.max(BALANCE.goldenEvent.minBountyFloor, productionBounty, scoreScaledBounty);

    setState((prev) => ({
      ...prev,
      coins: prev.coins + bounty,
      lifetimeCoins: prev.lifetimeCoins + bounty,
      seasonalScore: prev.seasonalScore + bounty,
      goldenMatthewsClicked: prev.goldenMatthewsClicked + 1,
    }));
    onSpawnBonus(`🌟 GOLDEN MATTHEW! +${formatCoins(bounty)} COINS! 🌟`);
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
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Glowing Aura Ring */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-yellow-500 via-amber-300 to-yellow-100 blur-md opacity-80 animate-spin"
          style={{ animationDuration: '4s' }}
        />
        <img
          src="./images/skins/golden_matthew.png"
          alt="Golden Matthew"
          className="relative w-20 h-20 object-contain drop-shadow-[0_0_16px_rgba(255,215,0,0.95)]"
        />
      </div>
    </div>
  );
};
