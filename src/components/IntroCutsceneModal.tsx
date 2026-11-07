import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

interface IntroCutsceneModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const IntroCutsceneModal: React.FC<IntroCutsceneModalProps> = ({ isOpen, onComplete }) => {
  const [progress, setProgress] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    const startTime = Date.now();
    const durationMs = 3000;

    const loadTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(loadTimer);
      }
    }, 50);

    const finishTimer = setTimeout(() => {
      setProgress(100);
      onCompleteRef.current();
    }, durationMs);

    return () => {
      clearInterval(loadTimer);
      clearTimeout(finishTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const loadingStageText =
    progress < 35
      ? 'Connecting to Matthew Cloud & Global Leaderboards...'
      : progress < 75
      ? 'Calibrating 10 Collectible Matthews & Ascension Multipliers...'
      : 'Ready! Launching Matthew Clicker...';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#060812] text-white select-none p-6 overflow-hidden font-chunky">
      {/* ANIMATED NEON AURA RINGS */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border-2 border-dashed border-amber-400/30 animate-spin pointer-events-none"
        style={{ animationDuration: '9s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full border-2 border-cyan-400/25 animate-spin pointer-events-none"
        style={{ animationDuration: '6s', animationDirection: 'reverse' }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center">
        <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-cyan-400 p-1.5 mb-5 shadow-[0_0_40px_rgba(251,191,36,0.45)] flex items-center justify-center animate-bounce">
          <div className="w-full h-full rounded-[20px] bg-slate-950 flex items-center justify-center p-2">
            <img
              src="./images/skins/classic_matthew.png"
              alt="Matthew Clicker"
              className="w-24 h-24 object-contain"
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[11px] font-black uppercase tracking-widest mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Matthew Clicker v1.1</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-200 uppercase tracking-tight">
          MATTHEW CLICKER
        </h1>

        <p className="text-xs font-bold text-cyan-300 mt-2 mb-5 min-h-[1.25rem]">
          {loadingStageText}
        </p>

        {/* PROGRESS BAR */}
        <div className="w-full h-4 rounded-2xl bg-slate-900/90 border-2 border-slate-800 overflow-hidden p-0.5 shadow-inner">
          <div
            className="h-full rounded-xl bg-gradient-to-r from-amber-500 via-yellow-300 to-cyan-400 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="mt-2 text-xs font-black font-mono text-amber-300">{progress}%</span>
      </div>
    </div>
  );
};
