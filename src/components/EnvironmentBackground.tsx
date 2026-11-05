import React from 'react';
import { GameState } from '../types/game';
import { ENVIRONMENTS } from '../data/environments';

interface EnvironmentBackgroundProps {
  state: GameState;
  onSelectEnvironment: (envId: string) => void;
}

export const EnvironmentBackground: React.FC<EnvironmentBackgroundProps> = ({ state, onSelectEnvironment }) => {
  // Determine active environment: either user chosen, or highest unlocked
  const unlockedEnvs = ENVIRONMENTS.filter((env) => {
    if (env.rebirthRequired && state.prestigeCount >= env.rebirthRequired) return true;
    if (env.unlockCoins !== undefined && state.lifetimeCoins >= env.unlockCoins) return true;
    return false;
  });

  const activeEnvId =
    state.selectedEnvironment && unlockedEnvs.some((e) => e.id === state.selectedEnvironment)
      ? state.selectedEnvironment
      : unlockedEnvs[unlockedEnvs.length - 1]?.id || 'matthew_room';

  const hasMouse = (state.upgrades['gaming_mouse'] || 0) > 0;
  const hasKeyboard = (state.upgrades['mechanical_keyboard'] || 0) > 0;
  const hasBot = (state.upgrades['autoclicker_bot'] || 0) > 0;
  const hasMic = (state.upgrades['studio_microphone'] || 0) > 0;
  const hasRig = (state.upgrades['gaming_rig'] || 0) > 0;
  const hasFactory = (state.upgrades['matthew_factory'] || 0) > 0;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. BASE ENVIRONMENT ATMOSPHERE & ART */}
      {activeEnvId === 'matthew_room' && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          {/* Cozy bedroom gradient with desk lamp glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1424] via-[#121930] to-[#0a0d17]" />
          {/* Desk Lamp Warm Cone Light */}
          <div className="absolute -top-12 left-1/4 w-96 h-96 rounded-full bg-amber-500/15 blur-[90px]" />
          <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[#080b12] to-transparent opacity-80" />
          {/* Subtle Room Shelf & Wall Poster Silhouette */}
          <div className="absolute top-12 left-8 w-24 h-32 rounded-lg border border-slate-700/30 bg-slate-800/10 backdrop-blur-[1px] hidden sm:block opacity-40">
            <div className="p-2 text-[9px] font-black text-amber-400/40 uppercase tracking-widest text-center">
              MATTHEW POSTER
            </div>
          </div>
        </div>
      )}

      {activeEnvId === 'neon_gaming' && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <div className="absolute inset-0 bg-gradient-to-b from-[#090b1c] via-[#120e29] to-[#070814]" />
          {/* Cyberpunk LED Neon Glows */}
          <div className="absolute -top-20 left-1/3 w-[30rem] h-[30rem] rounded-full bg-cyan-500/15 blur-[100px]" />
          <div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-fuchsia-600/15 blur-[90px]" />
          {/* Vertical Neon Light Strips */}
          <div className="absolute top-0 left-6 w-1 h-full bg-gradient-to-b from-cyan-400/30 via-cyan-500/10 to-transparent blur-[1px]" />
          <div className="absolute top-0 right-6 w-1 h-full bg-gradient-to-b from-fuchsia-500/30 via-fuchsia-500/10 to-transparent blur-[1px]" />
        </div>
      )}

      {activeEnvId === 'golden_palace' && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1c1404] via-[#241a06] to-[#0d0902]" />
          {/* Golden Palace Royal Chandelier Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[34rem] h-[34rem] rounded-full bg-amber-400/20 blur-[110px]" />
          {/* Gilded Architecture Pillars on Sides */}
          <div className="absolute top-0 left-4 w-12 h-full border-r border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent hidden md:block" />
          <div className="absolute top-0 right-4 w-12 h-full border-l border-amber-500/20 bg-gradient-to-l from-amber-500/5 to-transparent hidden md:block" />
        </div>
      )}

      {activeEnvId === 'fire_dimension' && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <div className="absolute inset-0 bg-gradient-to-b from-[#1f0705] via-[#2b0c08] to-[#120302]" />
          {/* Molten Magma Ambient Radiance */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-80 rounded-full bg-orange-600/25 blur-[100px]" />
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-red-600/20 blur-[90px]" />
        </div>
      )}

      {activeEnvId === 'ice_kingdom' && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <div className="absolute inset-0 bg-gradient-to-b from-[#031521] via-[#062133] to-[#020d14]" />
          {/* Aurora Borealis Waves */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[40rem] h-64 bg-gradient-to-r from-cyan-400/20 via-teal-300/25 to-blue-500/20 blur-[80px]" />
          <div className="absolute bottom-0 w-full h-48 bg-gradient-to-t from-cyan-900/30 to-transparent blur-md" />
        </div>
      )}

      {activeEnvId === 'galaxy_world' && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c051a] via-[#120929] to-[#05020c]" />
          {/* Stellar Nebula Clouds */}
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-purple-600/20 blur-[100px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/20 blur-[100px]" />
          {/* Faint Galaxy Ring Arch */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-48 rounded-[100%] border border-violet-400/15 rotate-[-25deg] blur-[0.5px]" />
        </div>
      )}

      {activeEnvId === 'divine_realm' && (
        <div className="absolute inset-0 transition-opacity duration-1000">
          <div className="absolute inset-0 bg-gradient-to-b from-[#241a04] via-[#332508] to-[#120d02]" />
          {/* Sunbeams & Celestial Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-amber-300/25 via-yellow-400/10 to-transparent blur-[80px]" />
        </div>
      )}

      {/* 2. VISUAL UPGRADE ACCESSORIES IN MATTHEW'S SPACE */}
      {/* Auto-Tapper Bot Drone (Floats near Matthew) */}
      {hasBot && (
        <div className="absolute top-1/3 right-8 sm:right-16 md:right-28 animate-bounce transition-all duration-500 hidden sm:flex flex-col items-center pointer-events-none">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-400 border-2 border-cyan-200 flex items-center justify-center text-white shadow-lg shadow-cyan-500/40">
            🤖
          </div>
          <span className="text-[9px] font-black text-cyan-300 uppercase tracking-widest mt-1 bg-slate-950/80 px-2 py-0.5 rounded-full border border-cyan-800">
            Auto-Bot
          </span>
        </div>
      )}

      {/* Studio Microphone on Boom Arm */}
      {hasMic && (
        <div className="absolute top-1/3 left-8 sm:left-14 md:left-24 transition-all duration-500 hidden sm:flex flex-col items-center pointer-events-none">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 border-2 border-red-300 flex items-center justify-center text-white shadow-lg shadow-red-500/30">
            🎙️
          </div>
          <span className="text-[9px] font-black text-red-300 uppercase tracking-widest mt-1 bg-slate-950/80 px-2 py-0.5 rounded-full border border-red-800">
            Studio Mic
          </span>
        </div>
      )}

      {/* Liquid Cooled Gaming PC Rig */}
      {hasRig && (
        <div className="absolute bottom-16 left-6 sm:left-12 transition-all duration-500 hidden md:flex flex-col items-center pointer-events-none">
          <div className="w-12 h-14 rounded-xl bg-slate-900/90 border-2 border-cyan-400/60 p-1 flex flex-col justify-between shadow-xl shadow-cyan-500/20">
            <div className="w-full h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <div className="flex justify-center text-sm">🖥️</div>
            <div className="w-full h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
          </div>
          <span className="text-[9px] font-black text-cyan-300 uppercase tracking-wider mt-1 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-700">
            Rig V8
          </span>
        </div>
      )}

      {/* Holographic Coin Minting Station */}
      {hasFactory && (
        <div className="absolute bottom-16 right-6 sm:right-12 transition-all duration-500 hidden md:flex flex-col items-center pointer-events-none">
          <div className="w-12 h-14 rounded-xl bg-slate-900/90 border-2 border-amber-400/60 p-1 flex flex-col items-center justify-center shadow-xl shadow-amber-500/20">
            <span className="text-xl animate-spin" style={{ animationDuration: '6s' }}>
              🪙
            </span>
          </div>
          <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider mt-1 bg-slate-950/80 px-2 py-0.5 rounded-full border border-slate-700">
            Mint Lab
          </span>
        </div>
      )}

      {/* Desk accessories (Gaming Mouse + Keyboard) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 hidden sm:flex opacity-70">
        {hasKeyboard && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300">
            <span>⌨️</span>
            <span className="text-[10px] text-cyan-400">RGB Keys</span>
          </div>
        )}
        {hasMouse && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300">
            <span>🖱️</span>
            <span className="text-[10px] text-amber-400">Pro Mouse</span>
          </div>
        )}
      </div>

      {/* 3. ENVIRONMENT SWITCHER CHIP (Clickable, pointer-events-auto) */}
      {unlockedEnvs.length > 1 && (
        <div className="absolute bottom-2 left-3 z-30 pointer-events-auto flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md border border-slate-750 p-1 rounded-2xl shadow-lg">
          {unlockedEnvs.map((env) => (
            <button
              key={env.id}
              onClick={() => onSelectEnvironment(env.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                activeEnvId === env.id
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={`${env.name} — ${env.tagline}`}
            >
              <span>{env.icon}</span>
              <span className="hidden xl:inline">{env.name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

