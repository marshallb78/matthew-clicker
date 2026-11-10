import React, { useEffect, useState } from 'react';
import { Sparkles, Play, Zap, ShieldCheck, Trophy } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface IntroCutsceneModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

const FLOATING_BADGES = [
  { left: '10%', top: '16%', size: 54, delay: '0s', duration: '5.5s', rot: '-12deg' },
  { left: '84%', top: '18%', size: 62, delay: '0.8s', duration: '6.2s', rot: '14deg' },
  { left: '14%', top: '76%', size: 58, delay: '1.3s', duration: '5.8s', rot: '10deg' },
  { left: '82%', top: '74%', size: 50, delay: '0.4s', duration: '6.5s', rot: '-15deg' },
  { left: '48%', top: '10%', size: 42, delay: '1.7s', duration: '5.2s', rot: '8deg' },
];

export const IntroCutsceneModal: React.FC<IntroCutsceneModalProps> = ({ isOpen, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [isReadyToPlay, setIsReadyToPlay] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    setIsReadyToPlay(false);
    const startTime = Date.now();
    const durationMs = 2600;

    const loadTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawRatio = Math.min(1, elapsed / durationMs);
      // Smooth ease-out curve for the loading bar
      const easedPct = Math.min(100, Math.floor((1 - Math.pow(1 - rawRatio, 2.2)) * 100));
      setProgress(easedPct);
      if (rawRatio >= 1) {
        setProgress(100);
        setIsReadyToPlay(true);
        clearInterval(loadTimer);
      }
    }, 35);

    return () => {
      clearInterval(loadTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const loadingStageText =
    progress < 30
      ? 'Connecting to Matthew Realtime Cloud & Worldwide Leaderboards...'
      : progress < 65
      ? 'Loading Weekly Season Schedule, 4× Friday Storm & Collectible Skins...'
      : progress < 100
      ? 'Synchronizing Ascension Multipliers & Offline Earnings...'
      : 'All Systems Ready! Click PLAY to enter Matthew Clicker!';

  const handleStartGame = () => {
    if (!isReadyToPlay) return;
    soundManager.playSkinUnlock();
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050711] text-white select-none p-6 overflow-hidden font-chunky">
      <style>{`
        @keyframes introFloat {
          0%, 100% { transform: translateY(0px) rotate(var(--rot, 0deg)) scale(1); }
          50% { transform: translateY(-18px) rotate(calc(var(--rot, 0deg) * -1)) scale(1.08); }
        }
        @keyframes introHeroPulse {
          0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 28px rgba(251,191,36,0.55)); }
          50% { transform: scale(1.08) rotate(2deg); filter: drop-shadow(0 0 46px rgba(34,211,238,0.75)); }
        }
        @keyframes introPlayPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 30px rgba(250,204,21,0.55), 0 0 60px rgba(34,211,238,0.35); }
          50% { transform: scale(1.05); box-shadow: 0 0 45px rgba(250,204,21,0.85), 0 0 85px rgba(217,70,239,0.55); }
        }
        @keyframes introShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
      `}</style>

      {/* RADIAL NEON BACKGROUND GLOW */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(245, 158, 11, 0.16) 0%, rgba(56, 189, 248, 0.1) 35%, rgba(5, 7, 17, 0.98) 75%)',
        }}
      />

      {/* FLOATING MATTHEW SILHOUETTES IN BACKGROUND */}
      {FLOATING_BADGES.map((b, i) => (
        <div
          key={i}
          className="absolute pointer-events-none opacity-25"
          style={
            {
              left: b.left,
              top: b.top,
              width: b.size,
              height: b.size,
              '--rot': b.rot,
              animation: `introFloat ${b.duration} ease-in-out ${b.delay} infinite`,
            } as React.CSSProperties
          }
        >
          <img
            src="./images/skins/classic_matthew.png"
            alt=""
            className="w-full h-full object-contain drop-shadow-[0_0_16px_rgba(251,191,36,0.4)]"
          />
        </div>
      ))}

      {/* ANIMATED NEON AURA RINGS */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26rem] h-[26rem] sm:w-[32rem] sm:h-[32rem] rounded-full border-2 border-dashed border-amber-400/30 animate-spin pointer-events-none"
        style={{ animationDuration: '11s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 rounded-full border-2 border-dotted border-cyan-400/30 animate-spin pointer-events-none"
        style={{ animationDuration: '7s', animationDirection: 'reverse' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border border-fuchsia-400/25 animate-ping pointer-events-none"
        style={{ animationDuration: '2.8s' }}
      />

      {/* MAIN CENTER CONTENT */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center">
        {/* HERO EMBLEM */}
        <div
          className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-[2rem] bg-gradient-to-tr from-amber-500 via-yellow-300 to-cyan-400 p-1.5 mb-6 flex items-center justify-center"
          style={{ animation: 'introHeroPulse 2.4s ease-in-out infinite' }}
        >
          <div className="w-full h-full rounded-[1.7rem] bg-slate-950/95 flex items-center justify-center p-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/15 via-transparent to-cyan-400/15 pointer-events-none" />
            <img
              src="./images/skins/classic_matthew.png"
              alt="Matthew Clicker"
              className="w-28 h-28 sm:w-34 sm:h-34 object-contain relative z-10"
            />
          </div>
          <div className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[10px] uppercase tracking-widest border-2 border-white shadow-lg">
            Weekly Seasons Edition
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-widest mb-2 shadow">
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
          <span>Matthew Clicker • Live Cloud Sync</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-cyan-300 uppercase tracking-tight drop-shadow-[0_4px_20px_rgba(251,191,36,0.35)]">
          MATTHEW CLICKER
        </h1>

        <p className="text-xs sm:text-sm font-bold text-cyan-200 mt-2.5 mb-5 min-h-[1.5rem] px-2">
          {loadingStageText}
        </p>

        {/* FEATURE PILLS */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-5 text-[11px] font-black">
          <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-amber-400/40 text-amber-300 flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> 1-Week Seasons
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-fuchsia-400/40 text-fuchsia-300 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" /> Friday 4× Live Event
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-emerald-400/40 text-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Auto-Save Cloud
          </span>
        </div>

        {/* PROGRESS BAR OR PLAY BUTTON */}
        {!isReadyToPlay ? (
          <div className="w-full max-w-md">
            <div className="relative w-full h-5 rounded-2xl bg-slate-900/95 border-2 border-slate-700 overflow-hidden p-0.5 shadow-inner">
              <div
                className="relative h-full rounded-xl bg-gradient-to-r from-amber-500 via-yellow-300 to-cyan-400 transition-all duration-75 overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                  style={{ animation: 'introShimmer 1.1s linear infinite' }}
                />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-black font-mono text-amber-300 px-1">
              <span>LOADING ASSETS &amp; CLOUD...</span>
              <span>{progress}%</span>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center animate-fade-in">
            <button
              onClick={handleStartGame}
              style={{ animation: 'introPlayPulse 1.6s ease-in-out infinite' }}
              className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-yellow-300 via-amber-400 to-cyan-300 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xl sm:text-2xl uppercase tracking-wider border-2 border-white flex items-center justify-center gap-3 cursor-pointer transition btn-chunky"
            >
              <Play className="w-7 h-7 fill-slate-950 text-slate-950" />
              <span>CLICK TO PLAY</span>
            </button>
            <span className="mt-2.5 text-[11px] font-bold text-slate-400">
              Tip: Press <strong className="text-cyan-300">SPACEBAR</strong> to click &amp;{' '}
              <strong className="text-amber-300">ESC</strong> to open the Full Game Menu!
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
