import React, { useMemo } from 'react';
import { GameState } from '../types/game';
import { getSkinById } from '../data/skins';

interface EnvironmentBackgroundProps {
  state: GameState;
  onSelectEnvironment?: (envId: string) => void;
  isStormActive?: boolean;
  stormWaveActive?: boolean;
}

export const EnvironmentBackground: React.FC<EnvironmentBackgroundProps> = ({
  state,
  isStormActive = false,
  stormWaveActive = false,
}) => {
  // Unlocked skin images for raining Matthews during the live event
  const unlockedSkinImages = useMemo(() => {
    const ids = state.unlockedSkins?.length ? state.unlockedSkins : ['classic_matthew'];
    return ids.map((id) => getSkinById(id).image);
  }, [state.unlockedSkins]);

  // Chromebook-optimized rain columns: 8 hardware-accelerated sprites using translate3d & no heavy shadows
  const rainDrops = useMemo(() => {
    return Array.from({ length: 8 }, (_, idx) => ({
      id: idx,
      leftPct: (idx * 12 + 5) % 92,
      delaySec: (idx * 0.55) % 4.0,
      durationSec: 3.4 + (idx % 3) * 0.7,
      sizePx: 40 + (idx % 2) * 10,
      skinImg: unlockedSkinImages[idx % unlockedSkinImages.length],
    }));
  }, [unlockedSkinImages]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Clean Atmospheric Base (Zero-blur radial gradients for Chromebook 60fps smoothness) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 15%, rgba(6, 182, 212, 0.12), transparent 45%), radial-gradient(circle at 75% 85%, rgba(245, 158, 11, 0.10), transparent 45%), linear-gradient(to bottom, #0b1325, #090d1a, #05070f)',
        }}
      />

      {/* MATTHEW STORM LIVE EVENT — CHROMEBOOK-OPTIMIZED VORTEX + RAINING UNLOCKED SKINS */}
      {isStormActive && (
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <style>{`
            @keyframes matthewStormFallFast {
              0% {
                transform: translate3d(0, -90px, 0) rotate(0deg);
                opacity: 0;
              }
              12% {
                opacity: 0.85;
              }
              88% {
                opacity: 0.85;
              }
              100% {
                transform: translate3d(0, 105vh, 0) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>

          {/* Deep Chaotic Electric Storm Sky using pure GPU-friendly gradients */}
          <div
            className="absolute inset-0"
            style={{
              background: stormWaveActive
                ? 'radial-gradient(circle at 50% 25%, rgba(217, 70, 239, 0.32), transparent 55%), radial-gradient(circle at 50% 80%, rgba(34, 211, 238, 0.25), transparent 55%), linear-gradient(to bottom, #240347, #140229, #060012)'
                : 'radial-gradient(circle at 50% 25%, rgba(147, 51, 234, 0.24), transparent 55%), linear-gradient(to bottom, #1e023d, #110224, #05000f)',
            }}
          />

          {/* Lightweight Spinning Chaos Energy Vortex Ring */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full border-2 border-dashed border-fuchsia-400/25 animate-spin will-change-transform"
            style={{ animationDuration: stormWaveActive ? '8s' : '16s' }}
          />

          {/* Continuous Raining Random Unlocked Matthew Skins (Chromebook-optimized) */}
          {!state.settings.reducedMotion && (
            <div className="absolute inset-0 overflow-hidden">
              {rainDrops.map((drop) => (
                <img
                  key={drop.id}
                  src={drop.skinImg}
                  alt=""
                  decoding="async"
                  className="absolute top-0 rounded-full object-cover border-2 border-fuchsia-400/70 pointer-events-none select-none will-change-transform"
                  style={{
                    left: `${drop.leftPct}%`,
                    width: `${drop.sizePx}px`,
                    height: `${drop.sizePx}px`,
                    animation: `matthewStormFallFast ${drop.durationSec}s linear ${drop.delaySec}s infinite`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
