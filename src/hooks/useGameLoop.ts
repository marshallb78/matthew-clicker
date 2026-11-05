import { useEffect, useRef } from 'react';
import { GameState } from '../types/game';
import { calculateCPS } from '../utils/calculations';
import { ACHIEVEMENTS } from '../data/achievements';
import { saveGame } from '../utils/storage';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from '../components/ParticleCanvas';

interface UseGameLoopProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onNotify: (title: string, subtitle: string) => void;
}

export function useGameLoop({ state, setState, onNotify }: UseGameLoopProps) {
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  // TICK INTERVAL (Passive income, timers, combo decay)
  useEffect(() => {
    let lastTime = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setState((prev) => {
        const cps = calculateCPS(prev);
        const coinsToAdd = cps * dt;

        let newCombo = prev.combo;
        let newComboTimer = prev.comboTimer - dt;
        if (newComboTimer <= 0 && newCombo > 0) {
          newCombo = Math.max(0, newCombo - 1);
          newComboTimer = 0.25;
        }

        let newFrenzyTimer = Math.max(0, prev.frenzyTimer - dt);
        let newFrenzyMult = newFrenzyTimer > 0 ? prev.frenzyMultiplier : 1;

        return {
          ...prev,
          coins: prev.coins + coinsToAdd,
          lifetimeCoins: prev.lifetimeCoins + coinsToAdd,
          combo: newCombo,
          comboTimer: newComboTimer,
          frenzyTimer: newFrenzyTimer,
          frenzyMultiplier: newFrenzyMult,
          totalPlaytimeSeconds: prev.totalPlaytimeSeconds + dt,
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, [setState]);

  // ACHIEVEMENT CHECKER (Every 1000ms)
  useEffect(() => {
    const checker = setInterval(() => {
      const current = stateRef.current;

      for (const ach of ACHIEVEMENTS) {
        if (!current.unlockedAchievements.includes(ach.id)) {
          if (ach.condition(current)) {
            soundManager.playBuy();
            particleEngine.emitPrestige();
            onNotify(`ACHIEVEMENT UNLOCKED!`, `${ach.name}: ${ach.rewardText}`);

            setState((prev) => ({
              ...prev,
              unlockedAchievements: [...prev.unlockedAchievements, ach.id],
              coins: prev.coins + (ach.bonusRewardCoins || 0),
              lifetimeCoins: prev.lifetimeCoins + (ach.bonusRewardCoins || 0),
              prestigeShards: prev.prestigeShards + (ach.bonusRewardShards || 0),
              lifetimePrestigeShards: prev.lifetimePrestigeShards + (ach.bonusRewardShards || 0),
            }));
            break;
          }
        }
      }
    }, 1000);

    return () => clearInterval(checker);
  }, [setState, onNotify]);

  // AUTOSAVE (Every 5 seconds & on beforeunload)
  useEffect(() => {
    const saveInterval = setInterval(() => {
      saveGame(stateRef.current);
    }, 5000);

    const handleBeforeUnload = () => {
      saveGame(stateRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
}
