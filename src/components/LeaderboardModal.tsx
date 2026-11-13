import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';
import {
  fetchWorldwideLeaderboard,
  fetchPlayerLeaderboardEntry,
  updateLeaderboardEntry,
  sortLeaderboardDeterministically,
  isExcludedFromLeaderboard,
  LeaderboardEntry,
} from '../firebase/leaderboard';
import { getAscensionMultiplier } from '../data/prestige';
import { CHAMPION_SKIN, getSkinById } from '../data/skins';
import { formatCoins, formatTime } from '../utils/formatters';
import { Trophy, Crown, RefreshCw, X, UploadCloud, ArrowLeft, Eye } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  seasonId: string;
  seasonLabel: string;
  seasonRemainingSec: number;
  onOpenAccount: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  state,
  seasonId,
  seasonLabel,
  seasonRemainingSec,
  onOpenAccount,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [, setPlayerEntry] = useState<LeaderboardEntry | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    entry: LeaderboardEntry;
    rank: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      if (state.cloudAccount) {
        updateLeaderboardEntry(
          state.cloudAccount.uid,
          state.cloudAccount.displayUsername,
          state,
          seasonId
        ).catch(() => {});
      }

      const list = await fetchWorldwideLeaderboard(seasonId, 50);

      if (
        state.cloudAccount &&
        !isExcludedFromLeaderboard(state.cloudAccount.uid, state.cloudAccount.displayUsername)
      ) {
        const localScore = Math.max(
          0,
          Math.floor(Math.max(state.seasonalScore || 0, state.lifetimeCoins || 0))
        );
        const liveMine: LeaderboardEntry = {
          uid: state.cloudAccount.uid,
          username: state.cloudAccount.displayUsername,
          seasonalScore: localScore,
          lifetimeCoins: Math.floor(state.lifetimeCoins || 0),
          totalClicks: Math.floor(state.clicks || 0),
          rebirthCount: state.prestigeCount || 0,
          ascensionMultiplier: getAscensionMultiplier(state.prestigeShards),
          equippedSkin: state.equippedSkin || 'classic_matthew',
          unlockedSkins:
            Array.isArray(state.unlockedSkins) && state.unlockedSkins.length > 0
              ? state.unlockedSkins
              : ['classic_matthew'],
          totalPlaytimeSeconds: Math.floor(state.totalPlaytimeSeconds || 0),
          updatedAtMs: Date.now(),
        };

        const existingIdx = list.findIndex((e) => e.uid === state.cloudAccount?.uid);
        if (existingIdx >= 0) {
          if (liveMine.seasonalScore >= list[existingIdx].seasonalScore) {
            list[existingIdx] = liveMine;
          }
        } else {
          list.push(liveMine);
        }

        const sorted = sortLeaderboardDeterministically(list).slice(0, 50);
        setEntries(sorted);

        const cloudMine = await fetchPlayerLeaderboardEntry(state.cloudAccount.uid, seasonId);
        setPlayerEntry(
          cloudMine && cloudMine.seasonalScore > liveMine.seasonalScore ? cloudMine : liveMine
        );
      } else {
        setEntries(list);
        setPlayerEntry(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayer(null);
      loadLeaderboard();
    }
  }, [isOpen, seasonId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-gradient-to-b from-[#0e1429] via-[#090d1b] to-[#050710] font-chunky text-slate-100 select-none overflow-hidden animate-fade-in">
      {/* FULL-SCREEN HEADER */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 bg-[#131b36]/95 border-b-2 border-yellow-400/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.35)]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-yellow-300 uppercase tracking-wide">
              Worldwide Leaderboard
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[11px] font-black text-amber-300">
                {seasonLabel} • {formatTime(seasonRemainingSec)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {!selectedPlayer && (
            <button
              onClick={loadLeaderboard}
              disabled={loading}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-xs font-black text-cyan-300 flex items-center gap-2 cursor-pointer transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-yellow-400 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition shadow-lg"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </div>

      {/* FULL-SCREEN BODY */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          {selectedPlayer ? (
            <div className="space-y-5">
              <button
                onClick={() => setSelectedPlayer(null)}
                className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-cyan-300 flex items-center gap-2 cursor-pointer transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {/* HERO PROFILE BANNER */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-2 border-cyan-400/60 flex items-center gap-5 shadow-2xl">
                <img
                  src={getSkinById(selectedPlayer.entry.equippedSkin).image}
                  alt={selectedPlayer.entry.username}
                  className="w-28 h-28 rounded-3xl bg-slate-950 p-2 border-2 border-amber-400 object-contain shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-yellow-400 text-slate-950 font-black text-sm">
                      #{selectedPlayer.rank}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white truncate">
                      {selectedPlayer.entry.username}
                    </h3>
                  </div>
                  <p className="text-sm text-amber-300 font-black mt-1">
                    {getSkinById(selectedPlayer.entry.equippedSkin).name}
                  </p>
                </div>
              </div>

              {/* 5 STAT CARDS INCLUDING PLAYTIME */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 text-center">
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Score</span>
                  <p className="text-lg font-black text-amber-300 mt-1">
                    {formatCoins(selectedPlayer.entry.seasonalScore)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Ascension</span>
                  <p className="text-lg font-black text-fuchsia-300 mt-1">
                    {selectedPlayer.entry.ascensionMultiplier.toFixed(2)}×
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Clicks</span>
                  <p className="text-lg font-black text-cyan-300 mt-1">
                    {formatCoins(selectedPlayer.entry.totalClicks)}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black">Rebirths</span>
                  <p className="text-lg font-black text-emerald-300 mt-1">
                    {selectedPlayer.entry.rebirthCount}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/90 border-2 border-sky-400/50 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-sky-300 uppercase font-black">Time Spent</span>
                  <p className="text-lg font-black text-sky-300 mt-1">
                    {formatTime(selectedPlayer.entry.totalPlaytimeSeconds || 0)}
                  </p>
                </div>
              </div>

              {/* SKIN COLLECTION GRID */}
              <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 mb-4">
                  Unlocked Matthews ({selectedPlayer.entry.unlockedSkins.length})
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {selectedPlayer.entry.unlockedSkins.map((skinId) => {
                    const skin = getSkinById(skinId);
                    return (
                      <div
                        key={skinId}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center"
                        title={skin.name}
                      >
                        <img
                          src={skin.image}
                          alt={skin.name}
                          className="w-16 h-16 object-contain"
                        />
                        <span className="text-[10px] font-black text-slate-200 mt-1.5 truncate w-full">
                          {skin.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* COMPACT VISUAL #1 CHAMPION REWARD + PLAYER SCORE BAR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/80 via-yellow-900/40 to-slate-900 border-2 border-amber-400/60 flex items-center gap-4">
                  <img
                    src={CHAMPION_SKIN.image}
                    alt={CHAMPION_SKIN.name}
                    className="w-14 h-14 rounded-2xl bg-slate-950 p-1.5 border-2 border-amber-400 object-contain shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Crown className="w-4 h-4 text-yellow-300" />
                      <span className="text-xs font-black text-yellow-300 uppercase">
                        #1 Season Prize
                      </span>
                    </div>
                    <p className="text-base font-black text-white mt-0.5">{CHAMPION_SKIN.name}</p>
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/95 border-2 border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-black">
                      Your Score
                    </span>
                    <p className="text-xl font-black text-amber-300">
                      {formatCoins(state.seasonalScore)}
                    </p>
                  </div>

                  {state.cloudAccount ? (
                    <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-xs font-black text-emerald-300">
                      {state.cloudAccount.displayUsername} ✓
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAccount();
                      }}
                      className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition btn-chunky"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Sign In</span>
                    </button>
                  )}
                </div>
              </div>

              {/* RANKINGS LIST */}
              <div className="space-y-2.5">
                {loading && entries.length === 0 ? (
                  <div className="py-16 text-center text-sm text-slate-400 font-black">
                    Loading Leaderboard...
                  </div>
                ) : entries.length === 0 ? (
                  <div className="py-14 text-center bg-slate-900/60 rounded-3xl border border-slate-800 p-6">
                    <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
                    <p className="text-base font-black text-white">No Scores Yet</p>
                  </div>
                ) : (
                  entries.map((entry, idx) => {
                    const rank = idx + 1;
                    const isMe = state.cloudAccount?.uid === entry.uid;
                    const equipped = getSkinById(entry.equippedSkin);

                    return (
                      <div
                        key={entry.uid}
                        onClick={() => setSelectedPlayer({ entry, rank })}
                        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-3xl border-2 transition cursor-pointer hover:scale-[1.005] ${
                          rank === 1
                            ? 'bg-gradient-to-r from-yellow-500/25 to-slate-900 border-yellow-400 shadow-lg'
                            : isMe
                            ? 'bg-cyan-950/40 border-cyan-400'
                            : 'bg-slate-900/85 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm ${
                              rank === 1
                                ? 'bg-yellow-400 text-slate-950 shadow'
                                : rank === 2
                                ? 'bg-slate-300 text-slate-950'
                                : rank === 3
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            #{rank}
                          </div>
                          <img
                            src={equipped.image}
                            alt={equipped.name}
                            className="w-12 h-12 rounded-2xl bg-slate-950 p-1 border border-slate-700 object-contain"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-base text-white">
                                {entry.username}
                              </span>
                              {rank === 1 && <Crown className="w-4 h-4 text-yellow-300" />}
                              {isMe && (
                                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-500/25 text-cyan-300 font-black">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-black text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="text-fuchsia-300">{entry.ascensionMultiplier}×</span>
                              <span>•</span>
                              <span className="text-amber-300">{entry.unlockedSkins.length} Skins</span>
                              <Eye className="w-3.5 h-3.5 text-cyan-400 ml-1" />
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base sm:text-lg font-black text-amber-300">
                            {formatCoins(entry.seasonalScore)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
