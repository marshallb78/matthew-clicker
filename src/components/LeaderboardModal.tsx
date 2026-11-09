import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';
import {
  fetchWorldwideLeaderboard,
  fetchPlayerLeaderboardEntry,
  updateLeaderboardEntry,
  sortLeaderboardDeterministically,
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
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    entry: LeaderboardEntry;
    rank: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Fire background leaderboard publish non-blockingly so fetching scores is always instant
      if (state.cloudAccount) {
        updateLeaderboardEntry(
          state.cloudAccount.uid,
          state.cloudAccount.displayUsername,
          state,
          seasonId
        ).catch(() => {});
      }

      const list = await fetchWorldwideLeaderboard(seasonId, 50);

      if (state.cloudAccount) {
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
          updatedAtMs: Date.now(),
        };

        // Ensure the player's latest live stats are reflected in the displayed leaderboard even during write cooldown
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#111528] border-2 border-yellow-400/60 rounded-3xl p-5 shadow-2xl font-chunky text-slate-100 overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* HEADER */}
        <div className="flex items-center justify-between pr-10 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center text-yellow-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-yellow-300 uppercase tracking-wide">
                Worldwide Seasonal Leaderboard
              </h2>
              <p className="text-xs text-slate-400">
                {seasonLabel} • Ends in{' '}
                <strong className="text-amber-300">{formatTime(seasonRemainingSec)}</strong>
              </p>
            </div>
          </div>

          {!selectedPlayer && (
            <button
              onClick={loadLeaderboard}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black text-cyan-300 flex items-center gap-1.5 cursor-pointer transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {/* INSPECTED PLAYER PROFILE VIEW */}
        {selectedPlayer ? (
          <div className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-cyan-300 flex items-center gap-1.5 cursor-pointer transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Leaderboard</span>
            </button>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/50 to-slate-900 border-2 border-cyan-500/40 flex items-center gap-4">
              <img
                src={getSkinById(selectedPlayer.entry.equippedSkin).image}
                alt={selectedPlayer.entry.username}
                className="w-20 h-20 rounded-2xl bg-slate-950 p-1.5 border-2 border-amber-400 object-contain shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg bg-yellow-400 text-slate-950 font-black text-xs">
                    Rank #{selectedPlayer.rank}
                  </span>
                  <h3 className="text-xl font-black text-white truncate">
                    {selectedPlayer.entry.username}
                  </h3>
                </div>
                <p className="text-xs text-amber-300 font-bold mt-1">
                  Equipped Skin: {getSkinById(selectedPlayer.entry.equippedSkin).name}
                </p>
              </div>
            </div>

            {/* PLAYER STATS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-black">
                  Seasonal Score
                </span>
                <p className="text-sm font-black text-amber-300 mt-0.5">
                  {formatCoins(selectedPlayer.entry.seasonalScore)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-black">
                  Ascension Mult
                </span>
                <p className="text-sm font-black text-fuchsia-300 mt-0.5">
                  {selectedPlayer.entry.ascensionMultiplier}×
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-black">
                  Total Clicks
                </span>
                <p className="text-sm font-black text-cyan-300 mt-0.5">
                  {formatCoins(selectedPlayer.entry.totalClicks)}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-black">
                  Rebirths
                </span>
                <p className="text-sm font-black text-emerald-300 mt-0.5">
                  {selectedPlayer.entry.rebirthCount}
                </p>
              </div>
            </div>

            {/* UNLOCKED SKINS GALLERY */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 mb-3">
                {selectedPlayer.entry.username}&apos;s Unlocked Matthew Skins (
                {selectedPlayer.entry.unlockedSkins.length})
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {selectedPlayer.entry.unlockedSkins.map((skinId) => {
                  const skin = getSkinById(skinId);
                  return (
                    <div
                      key={skinId}
                      className="p-2 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center text-center"
                      title={skin.name}
                    >
                      <img
                        src={skin.image}
                        alt={skin.name}
                        className="w-14 h-14 object-contain"
                      />
                      <span className="text-[10px] font-black text-slate-200 mt-1 truncate w-full">
                        {skin.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* CHAMPION MATTHEW #1 PRIZE BANNER */}
            <div className="my-3 p-3 rounded-2xl bg-gradient-to-r from-amber-950/80 via-yellow-900/40 to-slate-900 border border-amber-400/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={CHAMPION_SKIN.image}
                  alt={CHAMPION_SKIN.name}
                  className="w-12 h-12 rounded-xl bg-slate-950 p-1 border border-amber-400 object-contain"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-4 h-4 text-yellow-300" />
                    <span className="text-xs font-black text-yellow-300 uppercase">
                      #1 Season Winner Exclusive Skin: {CHAMPION_SKIN.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Finish Rank #1 when the 30-day season ends to permanently unlock{' '}
                    {CHAMPION_SKIN.name}! Click any player below to inspect their stats &amp; skins.
                  </p>
                </div>
              </div>
            </div>

            {/* PLAYER OWN SEASONAL STATUS */}
            <div className="mb-3 p-3 rounded-2xl bg-slate-900/90 border border-slate-750 flex items-center justify-between flex-wrap gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black">
                  Your Seasonal Score
                </span>
                <p className="text-lg font-black text-amber-300">
                  {formatCoins(state.seasonalScore)} Coins
                </p>
              </div>

              {state.cloudAccount ? (
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 uppercase font-black">
                    Competing as {state.cloudAccount.displayUsername}
                  </span>
                  <p className="text-xs text-slate-300">
                    {playerEntry ? 'Synced to Global Leaderboard' : 'Click Refresh to post score'}
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAccount();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Sign In to Post Score Worldwide</span>
                </button>
              )}
            </div>

            {/* LEADERBOARD TABLE */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loading && entries.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400 font-bold">
                  Loading worldwide seasonal rankings...
                </div>
              ) : entries.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-slate-900/50 rounded-2xl border border-slate-800 p-6">
                  <Trophy className="w-8 h-8 text-yellow-400 mx-auto" />
                  <p className="text-sm font-black text-white">
                    No global scores posted yet this season!
                  </p>
                  <p className="text-xs text-slate-400">
                    Sign in to your Matthew Account and click Refresh to claim Rank #1!
                  </p>
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
                      className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer hover:brightness-110 ${
                        rank === 1
                          ? 'bg-gradient-to-r from-yellow-500/20 to-slate-900 border-yellow-400'
                          : isMe
                          ? 'bg-cyan-950/40 border-cyan-400'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
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
                          className="w-10 h-10 rounded-xl bg-slate-950 p-1 border border-slate-700 object-contain"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-sm text-white">{entry.username}</span>
                            {rank === 1 && <Crown className="w-4 h-4 text-yellow-300" />}
                            {isMe && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-black">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-fuchsia-300">
                              Ascension: {entry.ascensionMultiplier}×
                            </span>
                            <span>•</span>
                            <span className="text-amber-300">
                              {entry.unlockedSkins.length} Skins
                            </span>
                            <span className="text-cyan-400 flex items-center gap-0.5 ml-1">
                              <Eye className="w-3 h-3" /> View Profile
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-black text-amber-300">
                          {formatCoins(entry.seasonalScore)}
                        </div>
                        <div className="text-[10px] text-slate-400">Seasonal Coins</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
