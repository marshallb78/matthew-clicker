import React from 'react';
import { formatCoins, formatTime } from '../utils/formatters';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { Moon, Sparkles, Check } from 'lucide-react';

interface OfflineProgressModalProps {
  elapsedSeconds: number;
  coinsEarned: number;
  onClaim: () => void;
}

export const OfflineProgressModal: React.FC<OfflineProgressModalProps> = ({
  elapsedSeconds,
  coinsEarned,
  onClaim,
}) => {
  const handleClaim = () => {
    soundManager.playBuy();
    particleEngine.emitPrestige();
    onClaim();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
        {/* Glow behind */}
        <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-cyan-500/20 blur-2xl pointer-events-none" />

        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-600 p-1 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Moon className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-xl font-black text-slate-100 font-display">Welcome Back!</h3>
        <p className="text-xs text-slate-400 mt-1">
          While you were away for <strong className="text-cyan-400">{formatTime(elapsedSeconds)}</strong>, Matthew's empire
          kept mining coins for you!
        </p>

        {/* REWARD AMOUNT */}
        <div className="my-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-400" />
            Offline Earnings
          </span>
          <p className="text-3xl font-black text-yellow-300 mt-1 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
            +{formatCoins(coinsEarned)}
          </p>
        </div>

        <button
          onClick={handleClaim}
          className="w-full py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 hover:brightness-110 active:scale-95 text-slate-950 shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          Claim Coins
        </button>
      </div>
    </div>
  );
};

