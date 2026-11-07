import { useEffect, useRef } from 'react';
import { GameState } from '../types/game';
import { calculateCPS } from '../utils/calculations';
import { checkAndApplyMilestoneUnlocks, equipSkin } from '../data/skins';
import { saveGame, performSeasonalRollover } from '../utils/storage';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from '../components/ParticleCanvas';
import { GEM_ECONOMY_CONFIG } from '../config/gameConfig';
import { getActiveSeason } from '../utils/scheduleEngine';

export interface LiveMultiplierContext {
  fridayBonusActive: boolean;
  stormWaveMultiplier: number;
  isStormActive: boolean;
}

interface UseGameLoopProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onNotify: (title: string, subtitle: string) => void;
  liveContext?: LiveMultiplierContext;
}

export function useGameLoop({ state, setState, onNotify, liveContext }: UseGameLoopProps) {
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const onNotifyRef = useRef(onNotify);
  onNotifyRef.current = onNotify;

  const liveContextRef = useRef<LiveMultiplierContext>(
    liveContext || {
      fridayBonusActive: false,
      stormWaveMultiplier: 1,
      isStormActive: false,
    }
  );
  if (liveContext) {
    liveContextRef.current = liveContext;
  }

  // TICK INTERVAL (Passive income, timers, combo decay, active gem accrual)
  useEffect(() => {
    let lastTime = performance.now();

    const interval = setInterval(() => {
      const now = performance.now();
      const dt = Math.min(1, (now - lastTime) / 1000);
      lastTime = now;
      const wallNowMs = Date.now();
      const ctx = liveContextRef.current;

      setState((prev) => {
        const cps = calculateCPS(prev, {
          fridayBonusActive: ctx.fridayBonusActive,
          stormWaveMultiplier: ctx.stormWaveMultiplier,
        });
        const coinsToAdd = cps * dt;

        let newCombo = prev.combo;
        let newComboTimer = prev.comboTimer - dt;
        if (newComboTimer <= 0 && newCombo > 0) {
          newCombo = Math.max(0, newCombo - 1);
          newComboTimer = 0.25;
        }

        const newFrenzyTimer = Math.max(0, prev.frenzyTimer - dt);
        const newFrenzyMult = newFrenzyTimer > 0 ? prev.frenzyMultiplier : 1;

        const isActivelyPlaying =
          (wallNowMs - (prev.lastActiveInputTimestamp || wallNowMs)) / 1000 <=
          GEM_ECONOMY_CONFIG.activeInputWindowSeconds;

        let nextGems = prev.gems;
        let nextLifetimeGems = prev.lifetimeGems;
        let nextNormalAcc = prev.activePlaySecondsAccumulated;
        let nextStormAcc = prev.stormActiveSecondsAccumulated;
        let nextEventStats = prev.eventStats;

        if (isActivelyPlaying) {
          if (ctx.isStormActive) {
            nextStormAcc += dt;
            nextEventStats = {
              ...prev.eventStats,
              activeSeconds: prev.eventStats.activeSeconds + dt,
            };
            if (nextStormAcc >= GEM_ECONOMY_CONFIG.stormIntervalSeconds) {
              const intervalsEarned = Math.floor(
                nextStormAcc / GEM_ECONOMY_CONFIG.stormIntervalSeconds
              );
              const gemsAwarded = intervalsEarned * GEM_ECONOMY_CONFIG.stormGemsPerInterval;
              nextStormAcc -= intervalsEarned * GEM_ECONOMY_CONFIG.stormIntervalSeconds;
              nextGems += gemsAwarded;
              nextLifetimeGems += gemsAwarded;
              nextEventStats = {
                ...nextEventStats,
                gemsEarned: nextEventStats.gemsEarned + gemsAwarded,
              };
            }
          } else {
            nextNormalAcc += dt;
            if (nextNormalAcc >= GEM_ECONOMY_CONFIG.normalIntervalSeconds) {
              const intervalsEarned = Math.floor(
                nextNormalAcc / GEM_ECONOMY_CONFIG.normalIntervalSeconds
              );
              const gemsAwarded = intervalsEarned * GEM_ECONOMY_CONFIG.normalGemsPerInterval;
              nextNormalAcc -= intervalsEarned * GEM_ECONOMY_CONFIG.normalIntervalSeconds;
              nextGems += gemsAwarded;
              nextLifetimeGems += gemsAwarded;
            }
          }
        }

        const updatedBase: GameState = {
          ...prev,
          coins: prev.coins + coinsToAdd,
          lifetimeCoins: prev.lifetimeCoins + coinsToAdd,
          seasonalScore: prev.seasonalScore + coinsToAdd,
          combo: newCombo,
          comboTimer: newComboTimer,
          frenzyTimer: newFrenzyTimer,
          frenzyMultiplier: newFrenzyMult,
          totalPlaytimeSeconds: prev.totalPlaytimeSeconds + dt,
          gems: nextGems,
          lifetimeGems: nextLifetimeGems,
          activePlaySecondsAccumulated: nextNormalAcc,
          stormActiveSecondsAccumulated: nextStormAcc,
          eventStats: nextEventStats,
        };

        // Check skin milestone unlocks immediately on every passive income tick!
        const { state: reconciledState, newlyUnlocked } = checkAndApplyMilestoneUnlocks(
          updatedBase,
          cps
        );
        if (newlyUnlocked.length > 0) {
          soundManager.playSkinUnlock();
          particleEngine.emitPrestige();
          particleEngine.emitMatthewRain(
            18,
            newlyUnlocked.map((s) => s.image)
          );
          newlyUnlocked.forEach((skin) => {
            onNotifyRef.current(
              'NEW MATTHEW SKIN UNLOCKED!',
              `${skin.name} unlocked & equipped! (${skin.milestone.description})`
            );
          });
          let nextState: GameState = {
            ...updatedBase,
            unlockedSkins: Array.from(
              new Set([...updatedBase.unlockedSkins, ...reconciledState.unlockedSkins])
            ),
          };
          nextState = equipSkin(nextState, reconciledState.equippedSkin);
          saveGame(nextState);
          return nextState;
        }

        return updatedBase;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [setState]);

  // SEASON BOUNDARY & BACKUP SKIN CHECKER (Every 250ms — stable dependency array!)
  useEffect(() => {
    const checker = setInterval(() => {
      const current = stateRef.current;

      const activeSeason = getActiveSeason(Date.now());
      if (current.currentSeasonId && current.currentSeasonId !== activeSeason.seasonId) {
        onNotifyRef.current(
          'NEW SEASON STARTED!',
          `Season #${activeSeason.seasonNumber} is live! Your skins & gems carry over permanently.`
        );
        setState((prev) => {
          const rolled = performSeasonalRollover(prev, activeSeason.seasonId);
          saveGame(rolled);
          return rolled;
        });
      }
    }, 500);

    return () => clearInterval(checker);
  }, [setState]);

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
