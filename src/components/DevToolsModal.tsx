import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';
import { verifyAccountPassword } from '../firebase/auth';
import {
  AntiCheatConfig,
  BanRecord,
  OFFICIAL_BAN_MESSAGE,
  ServerBroadcast,
  TEMP_AUTO_BAN_MESSAGE,
  adminBanPlayer,
  adminResetPlayerScore,
  adminSetServerBroadcast,
  adminUnbanPlayer,
  adminUpdateAntiCheatConfig,
  isDevAdminAccount,
  refreshCloudBans,
} from '../firebase/moderation';
import {
  LeaderboardEntry,
  evictLeaderboardCacheForUid,
  fetchWorldwideLeaderboard,
} from '../firebase/leaderboard';
import { getSkinById } from '../data/skins';
import { formatCoins, formatNumber, formatTime } from '../utils/formatters';
import {
  Wrench,
  Lock,
  ShieldAlert,
  Ban,
  CheckCircle2,
  RotateCcw,
  RefreshCw,
  X,
  Users,
  Megaphone,
  Sliders,
  Search,
  Eye,
  Clock,
  Activity,
} from 'lucide-react';

interface DevToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  onTriggerRain: () => void;
  onNotify: (title: string, subtitle: string) => void;
  onRefreshMiniLeaderboard: () => void;
}

type DevTab = 'moderation' | 'players' | 'broadcast' | 'anticheat';
type PlayerSortField = 'score' | 'clicks' | 'rebirths' | 'playtime' | 'recent';

export const DevToolsModal: React.FC<DevToolsModalProps> = ({
  isOpen,
  onClose,
  state,
  onTriggerRain,
  onNotify,
  onRefreshMiniLeaderboard,
}) => {
  const [unlocked, setUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [activeTab, setActiveTab] = useState<DevTab>('moderation');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [bansList, setBansList] = useState<BanRecord[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Quick Ban inputs
  const [manualUsername, setManualUsername] = useState('');
  const [manualUid, setManualUid] = useState('');
  const [manualBanType, setManualBanType] = useState<'banned' | 'temp_banned'>('banned');
  const [manualBanReason, setManualBanReason] = useState(OFFICIAL_BAN_MESSAGE);

  // Player Manager search, sort & inspection
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSort, setPlayerSort] = useState<PlayerSortField>('score');
  const [inspectedEntry, setInspectedEntry] = useState<LeaderboardEntry | null>(null);

  // Broadcast state
  const [broadcastInput, setBroadcastInput] = useState('');
  const [broadcastTheme, setBroadcastTheme] = useState<'gold' | 'red' | 'cyan' | 'purple'>('gold');
  const [activeBroadcast, setActiveBroadcast] = useState<ServerBroadcast | null>(null);

  // Anti-cheat config state
  const [antiCheatConfig, setAntiCheatConfig] = useState<AntiCheatConfig>({
    maxCps: 17,
    detectRoboticTiming: true,
  });

  const isMarshall = isDevAdminAccount(
    state.cloudAccount?.uid,
    state.cloudAccount?.displayUsername
  );

  // Require re-entering password every time the Dev Tools modal is opened
  useEffect(() => {
    if (!isOpen) {
      setUnlocked(false);
      setPasswordInput('');
      setAuthError(null);
      setStatusBanner(null);
      setInspectedEntry(null);
    }
  }, [isOpen]);

  const loadModerationAndLeaderboard = async () => {
    setLoadingData(true);
    try {
      const [cloudMod, lbEntries] = await Promise.all([
        refreshCloudBans(true),
        fetchWorldwideLeaderboard(state.currentSeasonId, 50),
      ]);

      // Deduplicate bans by normalizedUsername so each banned/temp-banned account appears once
      const byNorm = new Map<string, BanRecord>();
      for (const rec of Object.values(cloudMod.byUid)) {
        if (!rec || rec.status === 'pardoned') continue;
        const key = (rec.normalizedUsername || rec.username || rec.uid).toLowerCase();
        const prev = byNorm.get(key);
        if (!prev || (rec.bannedAtMs || 0) >= (prev.bannedAtMs || 0)) {
          byNorm.set(key, rec);
        }
      }
      for (const rec of Object.values(cloudMod.byUsername)) {
        if (!rec || rec.status === 'pardoned') continue;
        const key = (rec.normalizedUsername || rec.username || rec.uid).toLowerCase();
        const prev = byNorm.get(key);
        if (!prev || (rec.bannedAtMs || 0) >= (prev.bannedAtMs || 0)) {
          byNorm.set(key, rec);
        }
      }

      setBansList(
        Array.from(byNorm.values()).sort((a, b) => (b.bannedAtMs || 0) - (a.bannedAtMs || 0))
      );
      setLeaderboard(lbEntries);
      setActiveBroadcast(cloudMod.broadcast);
      setAntiCheatConfig(cloudMod.antiCheatConfig);
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

  const handleBanAction = async (
    uid: string,
    username: string,
    status: 'banned' | 'temp_banned' = 'banned',
    reason: string = OFFICIAL_BAN_MESSAGE
  ) => {
    setLoadingData(true);
    try {
      await adminBanPlayer(uid, username, reason, status);
      evictLeaderboardCacheForUid(uid);
      setStatusBanner(
        `${status === 'banned' ? 'Officially banned' : 'Temp-banned'} ${username} — removed from leaderboard and locked with ban screen.`
      );
      onNotify(
        status === 'banned' ? 'PLAYER BANNED' : 'PLAYER TEMP-BANNED',
        `${username} has been removed from the leaderboard.`
      );
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
      // Immediately remove from local bansList UI state as well
      const norm = username.trim().toLowerCase();
      setBansList((prev) =>
        prev.filter(
          (r) =>
            r.uid !== uid &&
            (r.normalizedUsername || r.username || '').toLowerCase() !== norm
        )
      );
      setStatusBanner(`Unbanned ${username}! Their account lock has been lifted.`);
      onNotify('PLAYER UNBANNED', `${username} has been unbanned and can play again.`);
      await loadModerationAndLeaderboard();
      onRefreshMiniLeaderboard();
    } finally {
      setLoadingData(false);
    }
  };

  const handleUnbanAllTemp = async () => {
    const tempList = bansList.filter((b) => b.status === 'temp_banned');
    if (tempList.length === 0) return;
    setLoadingData(true);
    try {
      for (const rec of tempList) {
        await adminUnbanPlayer(rec.uid, rec.username);
      }
      setStatusBanner(`Unbanned all ${tempList.length} temp-banned players!`);
      onNotify('TEMP BANS CLEARED', `Unbanned ${tempList.length} players.`);
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
    await handleBanAction(
      targetUid,
      matchInLb?.username || targetName,
      manualBanType,
      manualBanReason.trim() || OFFICIAL_BAN_MESSAGE
    );
    setManualUsername('');
    setManualUid('');
  };

  const handlePublishBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastInput.trim()) return;
    setLoadingData(true);
    try {
      await adminSetServerBroadcast(broadcastInput.trim(), broadcastTheme);
      setBroadcastInput('');
      setStatusBanner('Published live Global Server Broadcast banner to all online players!');
      onNotify('BROADCAST LIVE', 'All players now see your announcement banner.');
      await loadModerationAndLeaderboard();
    } finally {
      setLoadingData(false);
    }
  };

  const handleClearBroadcast = async () => {
    setLoadingData(true);
    try {
      await adminSetServerBroadcast(null);
      setStatusBanner('Cleared active Global Server Broadcast.');
      onNotify('BROADCAST CLEARED', 'Removed the global announcement banner.');
      await loadModerationAndLeaderboard();
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveAntiCheatConfig = async (nextConfig: AntiCheatConfig) => {
    setLoadingData(true);
    try {
      setAntiCheatConfig(nextConfig);
      await adminUpdateAntiCheatConfig(nextConfig);
      setStatusBanner(
        `Updated Anti-Cheat: Max ${nextConfig.maxCps} CPS • Robotic Detection ${
          nextConfig.detectRoboticTiming ? 'ON' : 'OFF'
        }`
      );
      onNotify('ANTI-CHEAT UPDATED', `Max legal click speed set to ${nextConfig.maxCps} CPS.`);
    } finally {
      setLoadingData(false);
    }
  };

  const tempBannedQueue = bansList.filter((b) => b.status === 'temp_banned');
  const officialBannedList = bansList.filter((b) => b.status === 'banned');

  const filteredPlayers = leaderboard
    .filter(
      (entry) =>
        !playerSearch.trim() ||
        entry.username.toLowerCase().includes(playerSearch.trim().toLowerCase()) ||
        entry.uid.toLowerCase().includes(playerSearch.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (playerSort === 'clicks') return (b.totalClicks || 0) - (a.totalClicks || 0);
      if (playerSort === 'rebirths') return (b.rebirthCount || 0) - (a.rebirthCount || 0);
      if (playerSort === 'playtime')
        return (b.totalPlaytimeSeconds || 0) - (a.totalPlaytimeSeconds || 0);
      if (playerSort === 'recent') return (b.updatedAtMs || 0) - (a.updatedAtMs || 0);
      return b.seasonalScore - a.seasonalScore;
    });

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
                Marshallb78 Admin &amp; Moderation Center
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300 uppercase">
                Fair Play Admin
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400">
              Anti-Cheat Queue • Ban &amp; Unban Manager • Player Inspector • Live Server Broadcasts
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
                Re-enter your account password to unlock Admin Moderation &amp; Server Controls.
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
        /* UNLOCKED ADMIN CONTROLS */
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="max-w-6xl mx-auto space-y-5">
            {/* TOP TABS + REFRESH */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition ${
                    activeTab === 'moderation'
                      ? 'bg-red-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    Bans &amp; Queue ({tempBannedQueue.length} Temp / {officialBannedList.length}{' '}
                    Banned)
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('players')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition ${
                    activeTab === 'players'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>All Players &amp; Inspector ({leaderboard.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('broadcast')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition ${
                    activeTab === 'broadcast'
                      ? 'bg-cyan-400 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Megaphone className="w-4 h-4" />
                  <span>Global Broadcast</span>
                </button>

                <button
                  onClick={() => setActiveTab('anticheat')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer transition ${
                    activeTab === 'anticheat'
                      ? 'bg-purple-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Anti-Cheat &amp; Server</span>
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

            {/* ================= TAB 1: MODERATION & AUTO-CLICKER DETECTOR QUEUE ================= */}
            {activeTab === 'moderation' && (
              <div className="space-y-6">
                {/* MANUAL BAN / TEMP-BAN FORM */}
                <form
                  onSubmit={handleManualBanSubmit}
                  className="p-5 rounded-3xl bg-slate-900/95 border-2 border-red-500/40 space-y-3"
                >
                  <label className="text-xs font-black uppercase text-red-300 block">
                    Ban or Temp-Ban Any Player by Username
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      type="text"
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      placeholder="Username (e.g. liamkd, wessy, dryce)"
                      className="sm:col-span-4 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-red-400"
                    />
                    <select
                      value={manualBanType}
                      onChange={(e) =>
                        setManualBanType(e.target.value as 'banned' | 'temp_banned')
                      }
                      className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-black text-amber-300 focus:outline-none"
                    >
                      <option value="banned">Official Permanent Ban</option>
                      <option value="temp_banned">Temporary Ban (Review Queue)</option>
                    </select>
                    <input
                      type="text"
                      value={manualBanReason}
                      onChange={(e) => setManualBanReason(e.target.value)}
                      placeholder="Ban Reason Message..."
                      className="sm:col-span-3 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-red-400"
                    />
                    <button
                      type="submit"
                      disabled={loadingData || !manualUsername.trim()}
                      className="sm:col-span-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Apply Ban</span>
                    </button>
                  </div>
                </form>

                {/* AUTO-DETECTED TEMP-BANNED CHEATERS QUEUE */}
                <div className="p-5 rounded-3xl bg-amber-950/25 border-2 border-amber-400/50 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      <span>
                        Auto-Detected Temp-Banned Players (&gt;{antiCheatConfig.maxCps} CPS /
                        Robotic Timing)
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      {tempBannedQueue.length > 0 && (
                        <button
                          onClick={handleUnbanAllTemp}
                          disabled={loadingData}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase cursor-pointer transition"
                        >
                          Unban All Temp ({tempBannedQueue.length})
                        </button>
                      )}
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-black text-xs">
                        {tempBannedQueue.length} Pending
                      </span>
                    </div>
                  </div>

                  {tempBannedQueue.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4 text-center">
                      No pending temp-banned players right now. Any player caught clicking above{' '}
                      {antiCheatConfig.maxCps} CPS or using a robotic auto-clicker is locked and
                      appears here immediately!
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {tempBannedQueue.map((rec) => (
                        <div
                          key={`${rec.uid}_${rec.normalizedUsername}`}
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
                            <p className="text-[10px] text-slate-500 mt-0.5">UID: {rec.uid}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleBanAction(
                                  rec.uid,
                                  rec.username,
                                  'banned',
                                  OFFICIAL_BAN_MESSAGE
                                )
                              }
                              disabled={loadingData}
                              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <Ban className="w-4 h-4" />
                              <span>Confirm Official Ban</span>
                            </button>
                            <button
                              onClick={() => handleUnban(rec.uid, rec.username)}
                              disabled={loadingData}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Unban Player</span>
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

                  {officialBannedList.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400 py-4 text-center">
                      No officially banned accounts.
                    </p>
                  ) : (
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
                            disabled={loadingData}
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer transition shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Unban</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================= TAB 2: ALL PLAYERS & FULL PROFILE INSPECTOR ================= */}
            {activeTab === 'players' && (
              <div className="space-y-4">
                {/* SEARCH & SORT CONTROLS */}
                <div className="p-4 rounded-3xl bg-slate-900/95 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      placeholder="Search players by username or UID..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(
                      [
                        { id: 'score', label: 'Score' },
                        { id: 'clicks', label: 'Clicks' },
                        { id: 'rebirths', label: 'Rebirths' },
                        { id: 'playtime', label: 'Playtime' },
                        { id: 'recent', label: 'Last Active' },
                      ] as { id: PlayerSortField; label: string }[]
                    ).map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setPlayerSort(s.id)}
                        className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase cursor-pointer transition ${
                          playerSort === s.id
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        Sort: {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* INSPECTED PLAYER DIAGNOSTIC MODAL CARD */}
                {inspectedEntry && (
                  <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-2 border-cyan-400 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={getSkinById(inspectedEntry.equippedSkin).image}
                          alt={inspectedEntry.username}
                          className="w-16 h-16 rounded-2xl bg-slate-950 p-1.5 border border-amber-400 object-contain"
                        />
                        <div>
                          <h4 className="text-xl font-black text-white">
                            {inspectedEntry.username}
                          </h4>
                          <p className="text-xs font-mono text-cyan-300">
                            UID: {inspectedEntry.uid}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setInspectedEntry(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-200 cursor-pointer"
                      >
                        Close Inspector
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-center">
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Seasonal Score
                        </span>
                        <p className="text-sm font-black text-amber-300 mt-0.5">
                          {formatCoins(inspectedEntry.seasonalScore)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Current Coins
                        </span>
                        <p className="text-sm font-black text-yellow-300 mt-0.5">
                          {formatCoins(inspectedEntry.coins ?? inspectedEntry.seasonalScore)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Total Clicks
                        </span>
                        <p className="text-sm font-black text-cyan-300 mt-0.5">
                          {formatNumber(inspectedEntry.totalClicks)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Rebirths / Mult
                        </span>
                        <p className="text-sm font-black text-fuchsia-300 mt-0.5">
                          {inspectedEntry.rebirthCount} ({inspectedEntry.ascensionMultiplier.toFixed(2)}×)
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Time Spent
                        </span>
                        <p className="text-sm font-black text-sky-300 mt-0.5">
                          {formatTime(inspectedEntry.totalPlaytimeSeconds || 0)}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Skins &amp; Gems
                        </span>
                        <p className="text-sm font-black text-emerald-300 mt-0.5">
                          {inspectedEntry.unlockedSkins.length} Skins • {inspectedEntry.gems ?? 0} 💎
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* PLAYERS LIST */}
                <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                  {filteredPlayers.map((entry, idx) => {
                    const isSelf = isDevAdminAccount(entry.uid, entry.username);
                    const skin = getSkinById(entry.equippedSkin);

                    return (
                      <div
                        key={entry.uid}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between flex-wrap gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-slate-800 text-amber-300 font-black text-xs flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <img
                            src={skin.image}
                            alt={skin.name}
                            className="w-10 h-10 rounded-xl bg-slate-900 p-1 border border-slate-700 object-contain"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-white">
                                {entry.username}
                              </span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                                  YOU (ADMIN)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] font-bold text-slate-400 flex items-center gap-2 flex-wrap mt-0.5">
                              <span className="text-amber-300">
                                Score: {formatCoins(entry.seasonalScore)}
                              </span>
                              <span>•</span>
                              <span className="text-cyan-300">
                                Clicks: {formatNumber(entry.totalClicks)}
                              </span>
                              <span>•</span>
                              <span className="text-fuchsia-300">
                                {entry.ascensionMultiplier.toFixed(2)}× ({entry.rebirthCount} Rebirths)
                              </span>
                              <span>•</span>
                              <span className="text-sky-300 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(entry.totalPlaytimeSeconds || 0)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setInspectedEntry(entry)}
                            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-200 font-black text-xs uppercase flex items-center gap-1 cursor-pointer transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>

                          {!isSelf && (
                            <>
                              <button
                                onClick={() => handleResetPlayer(entry.uid, entry.username)}
                                disabled={loadingData}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 text-amber-200 font-black text-xs uppercase flex items-center gap-1 cursor-pointer transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Score</span>
                              </button>
                              <button
                                onClick={() =>
                                  handleBanAction(
                                    entry.uid,
                                    entry.username,
                                    'temp_banned',
                                    TEMP_AUTO_BAN_MESSAGE
                                  )
                                }
                                disabled={loadingData}
                                className="px-3 py-1.5 rounded-xl bg-orange-600/80 hover:bg-orange-500 text-white font-black text-xs uppercase cursor-pointer transition"
                              >
                                Temp Ban
                              </button>
                              <button
                                onClick={() =>
                                  handleBanAction(
                                    entry.uid,
                                    entry.username,
                                    'banned',
                                    OFFICIAL_BAN_MESSAGE
                                  )
                                }
                                disabled={loadingData}
                                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase flex items-center gap-1 cursor-pointer transition"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Official Ban</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================= TAB 3: GLOBAL SERVER BROADCAST BANNER ================= */}
            {activeTab === 'broadcast' && (
              <div className="space-y-5">
                <div className="p-6 rounded-3xl bg-slate-900/95 border-2 border-cyan-400/50 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-base font-black text-cyan-300 uppercase flex items-center gap-2">
                        <Megaphone className="w-5 h-5" />
                        <span>Live Global Server Broadcast Banner</span>
                      </h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5">
                        Send a real-time announcement banner to the top of every online player&apos;s screen.
                      </p>
                    </div>
                    {activeBroadcast && (
                      <button
                        onClick={handleClearBroadcast}
                        disabled={loadingData}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase cursor-pointer transition"
                      >
                        Clear Active Broadcast
                      </button>
                    )}
                  </div>

                  {activeBroadcast && (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-400/50 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-400">
                          Currently Live on All Screens:
                        </span>
                        <p className="text-sm font-black text-white mt-0.5">
                          [ADMIN] {activeBroadcast.message}
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handlePublishBroadcast} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={broadcastInput}
                        onChange={(e) => setBroadcastInput(e.target.value)}
                        placeholder="Type global announcement for all players..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                      />
                      <select
                        value={broadcastTheme}
                        onChange={(e) =>
                          setBroadcastTheme(
                            e.target.value as 'gold' | 'red' | 'cyan' | 'purple'
                          )
                        }
                        className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-3 text-xs font-black text-amber-300 focus:outline-none"
                      >
                        <option value="gold">Gold Banner</option>
                        <option value="red">Red Warning Banner</option>
                        <option value="cyan">Cyan Info Banner</option>
                        <option value="purple">Purple Event Banner</option>
                      </select>
                      <button
                        type="submit"
                        disabled={loadingData || !broadcastInput.trim()}
                        className="px-5 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-black text-xs uppercase cursor-pointer transition"
                      >
                        Publish Live
                      </button>
                    </div>
                  </form>

                  <div className="pt-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                      Quick Broadcast Templates:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        {
                          text: '⚠️ Auto-clickers (>17 CPS) are strictly prohibited and automatically banned!',
                          theme: 'red' as const,
                        },
                        {
                          text: '⚡ Get ready! Friday All-Day 4× Matthew Storm Live Event is coming!',
                          theme: 'purple' as const,
                        },
                        {
                          text: '🏆 Keep clicking! The #1 Season Champion wins the exclusive Champion Matthew skin!',
                          theme: 'gold' as const,
                        },
                        {
                          text: '🛠️ Fair Play Update: Leaderboard anti-cheat is active and monitoring all clicks!',
                          theme: 'cyan' as const,
                        },
                      ].map((tpl) => (
                        <button
                          key={tpl.text}
                          type="button"
                          onClick={() => {
                            setBroadcastInput(tpl.text);
                            setBroadcastTheme(tpl.theme);
                          }}
                          className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left text-xs font-bold text-slate-200 cursor-pointer transition"
                        >
                          {tpl.text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= TAB 4: ANTI-CHEAT & SERVER CONTROLS ================= */}
            {activeTab === 'anticheat' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-6 rounded-3xl bg-slate-900/95 border-2 border-purple-500/40 space-y-4">
                  <h3 className="text-base font-black text-purple-300 uppercase flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    <span>Live Anti-Cheat Detector Settings</span>
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    Controls the real-time auto-clicker detector across all connected players.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-300 block mb-1.5">
                        Max Allowed Click Speed (CPS Threshold):
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 17, 19, 22].map((cpsLimit) => (
                          <button
                            key={cpsLimit}
                            onClick={() =>
                              handleSaveAntiCheatConfig({
                                ...antiCheatConfig,
                                maxCps: cpsLimit,
                              })
                            }
                            className={`py-2.5 rounded-xl font-black text-xs cursor-pointer transition ${
                              antiCheatConfig.maxCps === cpsLimit
                                ? 'bg-purple-500 text-white shadow-lg border border-purple-300'
                                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                            }`}
                          >
                            {cpsLimit} CPS {cpsLimit === 17 ? '(Default)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-black text-white block">
                          Robotic / Perfect-Timing Macro Detection
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Flags players whose clicks have machine-like &lt;2.2ms interval variance
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleSaveAntiCheatConfig({
                            ...antiCheatConfig,
                            detectRoboticTiming: !antiCheatConfig.detectRoboticTiming,
                          })
                        }
                        className={`px-4 py-2 rounded-xl font-black text-xs uppercase cursor-pointer transition ${
                          antiCheatConfig.detectRoboticTiming
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {antiCheatConfig.detectRoboticTiming ? 'ENABLED' : 'DISABLED'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-slate-900/95 border-2 border-amber-400/40 space-y-4">
                  <h3 className="text-base font-black text-amber-300 uppercase flex items-center gap-2">
                    <Sliders className="w-5 h-5" />
                    <span>Fair Server Utilities &amp; Visual Effects</span>
                  </h3>
                  <p className="text-xs font-bold text-slate-400">
                    Fair administrative utilities that never add unfair coins, gems, or rebirths.
                  </p>

                  <div className="space-y-2.5">
                    <button
                      onClick={() => {
                        onTriggerRain();
                        onNotify('MATTHEW RAIN', 'Triggered visual Matthew Rain shower!');
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-cyan-500/20 hover:bg-cyan-400 text-cyan-200 hover:text-slate-950 border border-cyan-400/50 font-black text-xs uppercase cursor-pointer transition"
                    >
                      Trigger Visual Matthew Rain (0 Coins)
                    </button>

                    <button
                      onClick={async () => {
                        await loadModerationAndLeaderboard();
                        onRefreshMiniLeaderboard();
                        setStatusBanner('Synchronized live leaderboard & purged banned ghosts!');
                      }}
                      className="w-full py-3 px-4 rounded-2xl bg-amber-400/20 hover:bg-amber-400 text-amber-200 hover:text-slate-950 border border-amber-400/50 font-black text-xs uppercase cursor-pointer transition"
                    >
                      Force Scrub &amp; Resync Leaderboard
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
