import React from 'react';
import { BanRecord, OFFICIAL_BAN_MESSAGE } from '../firebase/moderation';
import { ShieldAlert, Ban, LogOut, Lock } from 'lucide-react';

interface BannedScreenModalProps {
  banRecord: BanRecord;
  onSignOut?: () => void;
}

export const BannedScreenModal: React.FC<BannedScreenModalProps> = ({
  banRecord,
  onSignOut,
}) => {
  const isTemp = banRecord.status === 'temp_banned';

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-[200] w-screen h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#1f060a] via-[#120306] to-[#050102] font-chunky text-white select-none overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-35"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(239, 68, 68, 0.35), transparent 70%)',
        }}
      />

      <div className="relative z-10 w-full max-w-xl rounded-3xl bg-[#19070b]/95 border-4 border-red-500 p-8 sm:p-10 text-center shadow-[0_0_90px_rgba(239,68,68,0.5)]">
        <div className="w-24 h-24 rounded-3xl bg-red-600/25 border-2 border-red-400 flex items-center justify-center mx-auto mb-5 shadow-[0_0_35px_rgba(239,68,68,0.6)] animate-pulse">
          <Ban className="w-14 h-14 text-red-400" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-500/20 border border-red-400/50 text-xs font-black uppercase tracking-widest text-red-300 mb-3">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>{isTemp ? 'Anti-Cheat Temp Ban • Pending Admin Review' : 'Account Banned'}</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-red-400 uppercase tracking-wide drop-shadow">
          YOU HAVE BEEN BANNED
        </h1>

        <p className="text-sm sm:text-base font-bold text-slate-100 mt-4 leading-relaxed bg-red-950/60 border-2 border-red-500/40 rounded-2xl p-5">
          {OFFICIAL_BAN_MESSAGE}
        </p>

        {banRecord.reason && banRecord.reason !== OFFICIAL_BAN_MESSAGE && (
          <p className="text-xs font-bold text-amber-300 mt-3 bg-slate-950/80 border border-amber-500/30 rounded-xl p-3">
            Detection Details: {banRecord.reason}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-red-500/30">
            <span className="text-[10px] font-black uppercase text-slate-400">Account</span>
            <p className="text-sm font-black text-red-300 mt-0.5 truncate">
              {banRecord.username}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-red-500/30">
            <span className="text-[10px] font-black uppercase text-slate-400">
              Leaderboard &amp; Score
            </span>
            <p className="text-sm font-black text-amber-300 mt-0.5">Removed &amp; Reset to 0</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
          <Lock className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            {isTemp
              ? 'Your account is locked until Marshallb78 reviews your temp-ban.'
              : 'Your account has been permanently locked and removed from the leaderboard.'}
          </span>
        </div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className="mt-6 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-black text-slate-300 hover:text-white inline-flex items-center gap-2 cursor-pointer transition"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Switch Account</span>
          </button>
        )}
      </div>
    </div>
  );
};

