import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';
import { verifyAccountPassword } from '../firebase/auth';
import {
  BanRecord,
  OFFICIAL_BAN_MESSAGE,
  adminBanPlayer,
  adminResetPlayerScore,
  adminUnbanPlayer,
  isDevAdminAccount,
  refreshCloudBans,
} from '../firebase/moderation';
import {
  LeaderboardEntry,
  evictLeaderboardCacheForUid,
  fetchWorldwideLeaderboard,
} from '../firebase/leaderboard';
import { saveStateToCloud } from '../firebase/cloudSave';
import { ALL_SKINS } from '../data/skins';
import { saveGame } from '../utils/storage';
import { formatCoins, formatTime } from '../utils/formatters';
import {
  Wrench,
  Lock,
  ShieldAlert,
  Ban,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  X,
  Zap,
  Gem,
  Coins,
  Sparkles,
  Crown,
  Users,
} from 'lucide-react';

interface DevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onSpawnGoldenMatthew: () => void;
  onTriggerRain: () => void;
  onNotify: (title: string, subtitle: string) => void;
  onRefreshMiniLeaderboard: () => void;
}

export const DevToolsModal: React.FC<DevToolsModalProps> = ({
  isOpen,
  onClose,
  state,
  setState,
  onSpawnGoldenMatthew,
  onTriggerRain,
  onNotify,
  onRefreshMiniLeaderboard,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState<'moderation' | 'leaderboard' | 'godmode'>(
    'moderation'
  );
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bansList, setBansList] = useState<BanRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [manualUsername, setManualUsername] = useState('');
  const [manualUid, setManualUid] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const isMarshall = isDevAdminAccount(
    state.cloudAccount?.uid,
    state.cloudAccount?.displayUsername
  );

  // Always require re-entering password every time the Dev Tools modal is opened
  useEffect(() => {
    if (!isOpen) {
      setUnlocked(false);
      setPasswordInput('');
      setAuthError(null);
      setStatusBanner(null);
    }
  }, [isOpen]);

  const loadModerationAndLeaderboard = async () => {
    setLoadingData(true);
    try {
      const [bansMap, lbEntries] = await Promise.all([
        refreshCloudBans(true),
        fetchWorldwideLeaderboard(state.currentSeasonId, 50),
      ]);

      const combinedBans = new Map<string, BanRecord>();
      for (const rec of Object.values(bansMap.byUid)) {
        if (rec && rec.status !== 'pardoned') {
          combinedBans.set(rec.uid || rec.normalizedUsername, rec);
        }
      }
      for (const rec of Object.values(bansMap.byUsername)) {
        if (rec && rec.status !== 'pardoned') {
          combinedBans.set(rec.uid || rec.normalizedUsername, rec);
        }
      }

      setBansList(
        Array.from(combinedBans.values()).sort((a, b) => b.bannedAtMs - a.bannedAtMs)
      );
      setLeaderboard(lbEntries);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen && unlocked && isMarshall) {
      loadModerationAndLeaderboard();
    }
  }, [isOpen, unlocked, isMarshall]);

  if (!isOpen || !isMarshall) return null;

  const handlePasswordUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.cloudAccount) return;
    setAuthError(null);
    setVerifying(true);
    try {
      const ok = await verifyAccountPassword(
        state.cloudAccount.displayUsername,
        passwordInput
      );
      if (!ok) {
        setAuthError('Incorrect password for Marshallb78. Access denied.');
        return;
      }
      setUnlocked(true);
      setPasswordInput('');
    } catch {
      setAuthError('Could not verify password. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleOfficialBan = async (uid: string, username: string) => {
    setLoadingData(true);
    try {
      await adminBanPlayer(uid, username, OFFICIAL_BAN_MESSAGE);
      evictLeaderboardCacheForUid(uid);
      setStatusBanner(
        `Officially banned ${username} — removed from leaderboard, reset to 0, and locked with ban message.`
      );
      onNotify('PLAYER BANNED', `${username} has been banned and removed from the leaderboard.`);
      await loadModerationAndLeaderboard();
      onRefreshMiniLeaderboard();
    } finally {
      setLoadingData(false);
    }
  };

  const handleUnban = async (uid: string, username: string) => {
    setLoadingData(true);
    try {
      await adminUnbanPlayer(uid, username);
      setStatusBanner(`Unbanned ${username}. They can play again from 0.`);
      onNotify('PLAYER UNBANNED', `${username} has been pardoned.`);
      await loadModerationAndLeaderboard();
      onRefreshMiniLeaderboard();
    } finally {
      setLoadingData(false);
    }
  };

  const handleResetPlayer = async (uid: string, username: string) => {
    setLoadingData(true);
    try {
      await adminResetPlayerScore(uid, username, state.currentSeasonId);
      evictLeaderboardCacheForUid(uid);
      setStatusBanner(`Reset ${username}'s score, coins, and rebirths to 0.`);
      onNotify('SCORE RESET', `${username}'s leaderboard score was reset to 0.`);
      await loadModerationAndLeaderboard();
      onRefreshMiniLeaderboard();
    } finally {
      setLoadingData(false);
    }
  };

  const handleManualBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUsername.trim()) return;
    const targetName = manualUsername.trim();
    const matchInLb = leaderboard.find(
      (entry) => entry.username.toLowerCase() === targetName.toLowerCase()
    );
    const targetUid = manualUid.trim() || matchInLb?.uid || `user_${targetName.toLowerCase()}`;
    await handleOfficialBan(targetUid, matchInLb?.username || targetName);
    setManualUsername('');
    setManualUid('');
  };

  const applyMarshallBoost = (mutator: (prev: GameState) => GameState, label: string) => {
    setState((prev) => {
      const next = mutator(prev);
      saveGame(next);
      if (next.cloudAccount) {
        saveStateToCloud(
          next.cloudAccount.uid,
          next.cloudAccount.displayUsername,
          next,
          true
        ).catch(() => {});
      }
      return next;
    });
    setStatusBanner(label);
    onNotify('DEV BOOST APPLIED', label);
    onRefreshMiniLeaderboard();
  };

  const tempBannedQueue = bansList.filter((b) => b.status === 'temp_banned');
  const officialBannedList = bansList.filter((b) => b.status === 'banned');

  return (
    <div className="fixed inset-0 z-[120] w-screen h-screen flex flex-col bg-gradient-to-b from-[#0b1024] via-[#070b18] to-[#04060e] font-chunky text-slate-100 select-none overflow-hidden animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#121a36]/95 border-b-2 border-amber-400/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-amber-300 uppercase tracking-wide">
                Marshallb78 Dev Control Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300 uppercase">
                Exclusive Admin
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400">
              Anti-Cheat Queue • Live Ban &amp; Leaderboard Control • Developer Economy Tools
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition"
        >
          <X className="w-5 h-5" />
          <span>Close</span>
        </button>
      </div>

      {/* PASSWORD GATE */}
      {!unlocked ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <form
            onSubmit={handlePasswordUnlock}
            className="w-full max-w-md rounded-3xl bg-[#111833]/95 border-2 border-amber-400/70 p-8 text-center shadow-[0_0_60px_rgba(251,191,36,0.2)] space-y-5"
          >
            <div className="w-20 h-20 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-300 shadow-lg">
              <Lock className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white uppercase">
                Verify Marshallb78 Password
              </h3>
              <p className="text-xs font-bold text-slate-300 mt-1">
                Re-enter your account password to unlock Developer Controls &amp; Ban Management.
              </p>
            </div>

            <input
              type="password"
              required
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter Marshallb78 password..."
              className="w-full bg-slate-950 border-2 border-slate-700 focus:border-amber-400 rounded-2xl px-4 py-3.5 text-sm font-bold text-white focus:outline-none text-center"
            />

            {authError && (
              <div className="p-3 rounded-2xl bg-red-950/70 border border-red-500/50 text-xs font-black text-red-200">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying || !passwordInput}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider cursor-pointer transition disabled:opacity-50 btn-chunky"
            >
              {verifying ? 'Verifying...' : 'Unlock Dev Menu'}
            </button>
          </form>
        </div>
      ) : (
        /* UNLOCKED DEV CONTROLS */
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* TOP TABS + REFRESH */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition ${
                    activeTab === 'moderation'
                      ? 'bg-red-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    Bans &amp; Auto-Detector ({tempBannedQueue.length} Temp /{' '}
                    {officialBannedList.length} Banned)
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition ${
                    activeTab === 'leaderboard'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Manage All Players ({leaderboard.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('godmode')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 cursor-pointer transition ${
                    activeTab === 'godmode'
                      ? 'bg-cyan-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Marshallb78 God Mode</span>
                </button>
              </div>

              <button
                onClick={loadModerationAndLeaderboard}
                disabled={loadingData}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-black text-cyan-300 flex items-center gap-2 cursor-pointer transition"
              >
                <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin' : ''}`} />
                <span>Refresh Live Data</span>
              </button>
            </div>

            {statusBanner && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-400/50 text-xs font-black text-emerald-200 flex items-center justify-between">
                <span>{statusBanner}</span>
                <button
                  onClick={() => setStatusBanner(null)}
                  className="text-emerald-300 hover:text-white text-xs font-black ml-4 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* TAB 1: MODERATION & AUTO-CLICKER DETECTOR QUEUE */}
            {activeTab === 'moderation' && (
              <div className="space-y-6">
                {/* MANUAL BAN BY USERNAME */}
                <form
                  onSubmit={handleManualBanSubmit}
                  className="p-5 rounded-3xl bg-slate-900/95 border-2 border-red-500/40 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex-1">
                    <label className="text-[11px] font-black uppercase text-red-300 block mb-1">
                      Quick Ban Any Username (Removes from Leaderboard, Resets to 0 &amp; Shows Ban Screen)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualUsername}
                        onChange={(e) => setManualUsername(e.target.value)}
                        placeholder="Player Username (e.g. liamkd, wessy, dryce)"
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-red-400"
                      />
                      <input
                        type="text"
                        value={manualUid}
                        onChange={(e) => setManualUid(e.target.value)}
                        placeholder="Optional UID"
                        className="w-40 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-300 focus:outline-none focus:border-red-400 hidden sm:block"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loadingData || !manualUsername.trim()}
                    className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
                  >
                    <Ban className="w-4 h-4" />
                    <span>Official Ban</span>
                  </button>
                </form>

                {/* AUTO-DETECTED TEMP-BANNED CHEATERS QUEUE */}
                <div className="p-5 rounded-3xl bg-amber-950/25 border-2 border-amber-400/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <span>
                        Auto-Detected Cheaters Queue (&gt;17 CPS or Robotic Timing) — Awaiting Your Official Ban
                      </span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-xs">
                      {tempBannedQueue.length} Pending
                    </span>
                  </div>

                  {tempBannedQueue.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4 text-center">
                      No pending temp-banned players right now. Anyone clicking above 17 CPS or using a robotic auto-clicker is automatically temp-banned and appears here!
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {tempBannedQueue.map((rec) => (
                        <div
                          key={rec.uid}
                          className="p-4 rounded-2xl bg-slate-950/90 border border-amber-400/40 flex items-center justify-between flex-wrap gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-base text-white">
                                {rec.username}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/50 text-[10px] font-black text-amber-300 uppercase">
                                TEMP BANNED {rec.detectedCps ? `• ${rec.detectedCps} CPS` : ''}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{rec.reason}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOfficialBan(rec.uid, rec.username)}
                              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Confirm Official Ban</span>
                            </button>
                            <button
                              onClick={() => handleUnban(rec.uid, rec.username)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Unban</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* OFFICIALLY BANNED ACCOUNTS */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-red-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm sm:text-base font-black text-red-400 uppercase flex items-center gap-2">
                      <Ban className="w-5 h-5 text-red-400" />
                      <span>Officially Banned Players (Removed from Leaderboard &amp; Locked)</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 font-black text-xs">
                      {officialBannedList.length} Banned
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {officialBannedList.map((rec) => (
                      <div
                        key={`${rec.uid}_${rec.normalizedUsername}`}
                        className="p-4 rounded-2xl bg-slate-950 border border-red-500/30 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-white truncate">
                              {rec.username}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-red-500/25 text-[10px] font-black text-red-300 uppercase">
                              BANNED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            UID: {rec.uid}
                          </p>
                        </div>

                        <button
                          onClick={() => handleUnban(rec.uid, rec.username)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-black text-xs uppercase cursor-pointer transition shrink-0"
                        >
                          Unban
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE LEADERBOARD PLAYER MODERATION */}
            {activeTab === 'leaderboard' && (
              <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-3">
                <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase">
                  Active Worldwide Leaderboard — One-Click Ban or Reset Score
                </h3>
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => {
                    const isSelf = isDevAdminAccount(entry.uid, entry.username);
                    return (
                      <div
                        key={entry.uid}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-slate-800 text-amber-300 font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-white">
                                {entry.username}
                              </span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                                  YOU (DEV)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="text-amber-300">
                                Score: {formatCoins(entry.seasonalScore)}
                              </span>
                              <span>•</span>
                              <span className="text-fuchsia-300">
                                {entry.ascensionMultiplier.toFixed(2)}× ({entry.rebirthCount}{' '}
                                Rebirths)
                              </span>
                              <span>•</span>
                              <span className="text-sky-300">
                                Playtime: {formatTime(entry.totalPlaytimeSeconds || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {!isSelf && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleResetPlayer(entry.uid, entry.username)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 text-amber-200 font-black text-xs uppercase flex items-center gap-1 cursor-pointer transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Score</span>
                            </button>
                            <button
                              onClick={() => handleOfficialBan(entry.uid, entry.username)}
                              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center gap-1 cursor-pointer transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Ban Cheater</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: MARSHALLB78 GOD MODE ECONOMY & EVENT CONTROLS */}
            {activeTab === 'godmode' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* COINS BOOSTS */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-400/40 space-y-3">
                  <h4 className="text-sm font-black uppercase text-amber-300 flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    <span>Add Matthew Coins &amp; Score</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { label: '+1 Million', amount: 1e6 },
                      { label: '+1 Billion', amount: 1e9 },
                      { label: '+1 Trillion', amount: 1e12 },
                      { label: '+1 Quadrillion', amount: 1e15 },
                      { label: '+100 Quadrillion', amount: 1e17 },
                      { label: '×2 Current Coins', amount: -1 },
                    ].map((btn) => (
                      <button
                        key={btn.label}
                        onClick={() =>
                          applyMarshallBoost((prev) => {
                            const add = btn.amount === -1 ? prev.coins : btn.amount;
                            return {
                              ...prev,
                              coins: prev.coins + add,
                              lifetimeCoins: prev.lifetimeCoins + add,
                              seasonalScore: prev.seasonalScore + add,
                            };
                          }, `Added ${btn.label}!`)
                        }
                        className="py-2.5 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-200 hover:text-slate-950 border border-amber-400/50 font-black text-xs cursor-pointer transition"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* GEMS & REBIRTH MULTIPLIER BOOSTS */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-fuchsia-400/40 space-y-3">
                  <h4 className="text-sm font-black uppercase text-fuchsia-300 flex items-center gap-2">
                    <Gem className="w-4 h-4" />
                    <span>Gems &amp; Ascension Multiplier</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        applyMarshallBoost(
                          (prev) => ({
                            ...prev,
                            gems: prev.gems + 100,
                            lifetimeGems: prev.lifetimeGems + 100,
                          }),
                          '+100 Permanent Gems added!'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-400 text-fuchsia-200 hover:text-slate-950 border border-fuchsia-400/50 font-black text-xs cursor-pointer transition"
                    >
                      +100 Gems 💎
                    </button>
                    <button
                      onClick={() =>
                        applyMarshallBoost(
                          (prev) => ({
                            ...prev,
                            gems: prev.gems + 1000,
                            lifetimeGems: prev.lifetimeGems + 1000,
                          }),
                          '+1,000 Permanent Gems added!'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-400 text-fuchsia-200 hover:text-slate-950 border border-fuchsia-400/50 font-black text-xs cursor-pointer transition"
                    >
                      +1,000 Gems 💎
                    </button>
                    <button
                      onClick={() =>
                        applyMarshallBoost(
                          (prev) => ({
                            ...prev,
                            prestigeCount: prev.prestigeCount + 1,
                            prestigeShards: prev.prestigeShards + 10,
                            lifetimePrestigeShards: prev.lifetimePrestigeShards + 10,
                          }),
                          '+1.50× Ascension Multiplier added!'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-400 text-purple-200 hover:text-slate-950 border border-purple-400/50 font-black text-xs cursor-pointer transition"
                    >
                      +1.50× Ascension
                    </button>
                    <button
                      onClick={() =>
                        applyMarshallBoost(
                          (prev) => ({
                            ...prev,
                            prestigeCount: prev.prestigeCount + 5,
                            prestigeShards: prev.prestigeShards + 50,
                            lifetimePrestigeShards: prev.lifetimePrestigeShards + 50,
                          }),
                          '+7.50× Ascension Multiplier added!'
                        )
                      }
                      className="py-2.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-400 text-purple-200 hover:text-slate-950 border border-purple-400/50 font-black text-xs cursor-pointer transition"
                    >
                      +7.50× Ascension
                    </button>
                  </div>
                </div>

                {/* SKINS & LIVE SPAWNS */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-cyan-400/40 space-y-3 md:col-span-2">
                  <h4 className="text-sm font-black uppercase text-cyan-300 flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    <span>Skins &amp; Instant Spawns</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() =>
                        applyMarshallBoost(
                          (prev) => ({
                            ...prev,
                            unlockedSkins: Array.from(
                              new Set([...prev.unlockedSkins, ...ALL_SKINS.map((s) => s.id)])
                            ),
                          }),
                          'Unlocked all Matthews!'
                        )
                      }
                      className="py-3 px-4 rounded-2xl bg-cyan-500/20 hover:bg-cyan-400 text-cyan-200 hover:text-slate-950 border border-cyan-400/50 font-black text-xs uppercase cursor-pointer transition"
                    >
                      Unlock All Skins
                    </button>
                    <button
                      onClick={() => {
                        onSpawnGoldenMatthew();
                        onNotify('GOLDEN MATTHEW SPAWNED', 'Spawned a Golden Floating Matthew!');
                      }}
                      className="py-3 px-4 rounded-2xl bg-yellow-400/20 hover:bg-yellow-400 text-yellow-200 hover:text-slate-950 border border-yellow-400/50 font-black text-xs uppercase cursor-pointer transition flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Spawn Golden Matthew</span>
                    </button>
                    <button
                      onClick={() => {
                        onTriggerRain();
                        onNotify('MATTHEW RAIN', 'Triggered Matthew Rain shower!');
                      }}
                      className="py-3 px-4 rounded-2xl bg-emerald-500/20 hover:bg-emerald-400 text-emerald-200 hover:text-slate-950 border border-emerald-400/50 font-black text-xs uppercase cursor-pointer transition"
                    >
                      Trigger Matthew Rain
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
