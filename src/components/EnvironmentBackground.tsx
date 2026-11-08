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

  // Chromebook-optimized rain columns: 8 hardware-accelerated sprites using translate3d
  const rainDrops = useMemo(() => {
    return Array.from({ length: 8 }, (_, idx) => ({
      id: idx,
      leftPct: (idx * 12 + 5) % 92,
      delaySec: (idx * 0.55) % 4.0,
      durationSec: 3.4 + (idx % 3) * 0.7,
      sizePx: 42 + (idx % 2) * 10,
      skinImg: unlockedSkinImages[idx % unlockedSkinImages.length],
    }));
  }, [unlockedSkinImages]);

  // Floating ambient neon stars (GPU-accelerated)
  const ambientStars = useMemo(() => {
    return Array.from({ length: 14 }, (_, idx) => ({
      id: idx,
      leftPct: (idx * 17 + 7) % 94,
      topPct: (idx * 23 + 9) % 86,
      sizePx: 3 + (idx % 3) * 2,
      delaySec: (idx * 0.4) % 3,
      color: idx % 3 === 0 ? '#22d3ee' : idx % 3 === 1 ? '#fbbf24' : '#e879f9',
    }));
  }, []);

  const comboRatio = Math.min(1, (state.combo || 0) / 30);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      <style>{`
        @keyframes bgGridScroll {
          0% { transform: perspective(360px) rotateX(62deg) translateY(0px); }
          100% { transform: perspective(360px) rotateX(62deg) translateY(48px); }
        }
        @keyframes starTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 0.85; transform: scale(1.25); }
        }
      `}</style>

      {/* Dynamic Combo-Reactive Deep Arcade Atmosphere */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          background:
            comboRatio > 0.5
              ? 'radial-gradient(circle at 50% 48%, rgba(251, 191, 36, 0.20), rgba(6, 182, 212, 0.14) 38%, transparent 68%), radial-gradient(circle at 20% 15%, rgba(217, 70, 239, 0.14), transparent 45%), linear-gradient(to bottom, #0a1124, #070b18, #04060d)'
              : 'radial-gradient(circle at 50% 48%, rgba(6, 182, 212, 0.15), rgba(245, 158, 11, 0.08) 42%, transparent 68%), radial-gradient(circle at 80% 15%, rgba(139, 92, 246, 0.12), transparent 45%), linear-gradient(to bottom, #091022, #070b16, #04060c)',
        }}
      />

      {/* Animated Cyber-Grid Horizon Floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-[42%] opacity-30"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 45%, black 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 45%, black 100%)',
        }}
      >
        <div
          className="w-full h-[140%] origin-bottom will-change-transform"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(34, 211, 238, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(251, 191, 36, 0.18) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            animation: state.settings.reducedMotion ? undefined : 'bgGridScroll 2.8s linear infinite',
          }}
        />
      </div>

      {/* Ambient Twinkling Neon Stars */}
      {!state.settings.reducedMotion && (
        <div className="absolute inset-0">
          {ambientStars.map((s) => (
            <div
              key={s.id}
              className="absolute rounded-full"
              style={{
                left: `${s.leftPct}%`,
                top: `${s.topPct}%`,
                width: `${s.sizePx}px`,
                height: `${s.sizePx}px`,
                backgroundColor: s.color,
                boxShadow: `0 0 8px ${s.color}`,
                animation: `starTwinkle 3.2s ease-in-out ${s.delaySec}s infinite`,
              }}
            />
          ))}
        </div>
      )}

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
                opacity: 0.88;
              }
              88% {
                opacity: 0.88;
              }
              100% {
                transform: translate3d(0, 105vh, 0) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>

          {/* Deep Chaotic Electric Storm Sky */}
          <div
            className="absolute inset-0"
            style={{
              background: stormWaveActive
                ? 'radial-gradient(circle at 50% 25%, rgba(217, 70, 239, 0.35), transparent 55%), radial-gradient(circle at 50% 80%, rgba(34, 211, 238, 0.28), transparent 55%), linear-gradient(to bottom, #240347, #140229, #060012)'
                : 'radial-gradient(circle at 50% 25%, rgba(147, 51, 234, 0.26), transparent 55%), linear-gradient(to bottom, #1e023d, #110224, #05000f)',
            }}
          />

          {/* Lightweight Spinning Chaos Energy Vortex Ring */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full border-2 border-dashed border-fuchsia-400/30 animate-spin will-change-transform"
            style={{ animationDuration: stormWaveActive ? '8s' : '16s' }}
          />

          {/* Continuous Raining Random Unlocked Matthew Skins */}
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
