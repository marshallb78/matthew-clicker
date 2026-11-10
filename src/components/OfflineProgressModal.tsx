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
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0c1329] via-[#070b18] to-[#04060e] font-chunky text-white select-none animate-fade-in">
      <div className="w-full max-w-md bg-[#111830] border-2 border-cyan-400/70 rounded-3xl p-8 shadow-[0_0_60px_rgba(34,211,238,0.25)] text-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500 to-purple-600 p-1 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <Moon className="w-10 h-10 text-white" />
        </div>

        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase">Offline Earnings</h3>
        <span className="inline-block mt-1 px-3 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-xs font-black text-cyan-300">
          Away for {formatTime(elapsedSeconds)}
        </span>

        <div className="my-6 p-6 rounded-3xl bg-slate-950/90 border-2 border-amber-400/50 flex flex-col items-center shadow-inner">
          <Sparkles className="w-5 h-5 text-yellow-300 mb-1" />
          <p className="text-4xl sm:text-5xl font-black text-yellow-300 drop-shadow-[0_0_16px_rgba(255,215,0,0.6)]">
            +{formatCoins(coinsEarned)}
          </p>
        </div>

        <button
          onClick={handleClaim}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:brightness-110 active:scale-95 text-slate-950 shadow-lg flex items-center justify-center gap-2 cursor-pointer transition btn-chunky"
        >
          <Check className="w-5 h-5 stroke-[3]" />
          <span>Claim Coins</span>
        </button>
      </div>
    </div>
  );
};
