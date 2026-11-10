import React, { useState } from 'react';
import { GameState } from '../types/game';
import { SettingsModal } from './SettingsModal';
import { getSkinById } from '../data/skins';
import { getAscensionMultiplier } from '../data/prestige';
import {
  authenticateUnified,
  logoutPlayer,
  validateUsernameFormat,
} from '../firebase/auth';
import { loadAndReconcileCloudSave, saveStateToCloud } from '../firebase/cloudSave';
import { isCloudWriteCoolingDown } from '../firebase/config';
import { saveGame } from '../utils/storage';
import { formatCoins, formatNumber, formatTime } from '../utils/formatters';
import {
  Play,
  Settings,
  User,
  Trophy,
  Eye,
  Cloud,
  RefreshCw,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
  ShoppingBag,
  Gem,
  Infinity as InfinityIcon,
  Clock,
  MousePointerClick,
} from 'lucide-react';

interface EscMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onOpenLeaderboard: () => void;
  onOpenSkins: () => void;
  onOpenStormShop: () => void;
  isStormActive: boolean;
  seasonLabel: string;
  onNotify: (title: string, subtitle: string) => void;
}

export const EscMenuModal: React.FC<EscMenuModalProps> = ({
  isOpen,
  onClose,
  state,
  setState,
  onOpenLeaderboard,
  onOpenSkins,
  onOpenStormShop,
  isStormActive,
  seasonLabel,
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<'hub' | 'account' | 'settings'>('hub');
  const [username, setUsername] = useState(state.cloudAccount?.displayUsername || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const equippedSkin = getSkinById(state.equippedSkin);
  const ascensionMult = getAscensionMultiplier(state.prestigeShards);
  const careerClicks = Math.max(state.lifetimeAllSeasonsClicks || 0, state.clicks || 0);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSyncMessage(null);

    const validationErr = validateUsernameFormat(username);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const { account: profile, isNewAccount } = await authenticateUnified(username, password);
      const merged = await loadAndReconcileCloudSave(profile.uid, profile.username, state);
      const nextState: GameState = {
        ...merged,
        cloudAccount: {
          uid: profile.uid,
          username: profile.username,
          displayUsername: profile.username,
          lastCloudSync: Date.now(),
        },
      };

      setState(nextState);
      saveGame(nextState);
      saveStateToCloud(profile.uid, profile.username, nextState, true).catch(() => {});

      onNotify(
        isNewAccount ? 'ACCOUNT CREATED!' : 'WELCOME BACK!',
        `Signed in as ${profile.username}!`
      );
      setPassword('');
      setSyncMessage(`Synced as ${profile.username}`);
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!state.cloudAccount) return;
    setLoading(true);
    setError(null);
    setSyncMessage(null);
    try {
      saveGame(state);
      const ok = await saveStateToCloud(
        state.cloudAccount.uid,
        state.cloudAccount.displayUsername,
        state,
        true
      );
      const now = Date.now();
      setState((prev) =>
        prev.cloudAccount
          ? { ...prev, cloudAccount: { ...prev.cloudAccount, lastCloudSync: now } }
          : prev
      );
      if (ok) {
        setSyncMessage('Cloud & Leaderboard Synced!');
      } else if (isCloudWriteCoolingDown()) {
        setSyncMessage('Saved Locally!');
      } else {
        setSyncMessage('Saved!');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to sync.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      if (state.cloudAccount) {
        saveStateToCloud(
          state.cloudAccount.uid,
          state.cloudAccount.displayUsername,
          state
        ).catch(() => {});
      }
      await logoutPlayer();
      setState((prev) => {
        const next: GameState = { ...prev, cloudAccount: null };
        saveGame(next);
        return next;
      });
      onNotify('SIGNED OUT', 'Signed out of cloud account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] w-screen h-screen flex flex-col bg-gradient-to-b from-[#0f152b] via-[#090d1c] to-[#050711] animate-fade-in select-none font-chunky text-slate-100 overflow-hidden">
      {/* FULL-SCREEN TOP HEADER */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 bg-[#141c38]/95 border-b-2 border-cyan-400/40 shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-cyan-400 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)]">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center p-1">
              <img
                src={equippedSkin.image}
                alt={equippedSkin.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-wide">
                GAME MENU
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-[11px] font-black text-cyan-300 uppercase">
                ESC
              </span>
            </div>
            <span className="text-xs font-bold text-amber-300">{seasonLabel}</span>
          </div>
        </div>

        {/* BIG GRAPHICAL TAB BAR */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-950/90 p-1.5 rounded-2xl border-2 border-slate-800">
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'hub'
                  ? 'bg-amber-400 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-4 h-4" />
              <span>Hub</span>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'account'
                  ? 'bg-emerald-400 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Account</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'settings'
                  ? 'bg-cyan-400 text-slate-950 shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg btn-chunky"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Resume</span>
          </button>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-cyan-400 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* FULL-SCREEN BODY */}
      <div className="flex-1 overflow-y-auto p-5 sm:p-8 flex flex-col justify-center">
        {/* ================= TAB 1: VISUAL GAME HUB ================= */}
        {activeTab === 'hub' && (
          <div className="max-w-6xl w-full mx-auto space-y-6">
            {/* HERO CHARACTER SHOWCASE + BIG GRAPHICAL STAT CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* EQUIPPED MATTHEW VISUAL CARD */}
              <div className="lg:col-span-4 p-6 rounded-3xl bg-gradient-to-b from-[#172042] to-[#0d1329] border-2 border-amber-400/60 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 45%, rgba(251, 191, 36, 0.45), transparent 70%)',
                  }}
                />
                <img
                  src={equippedSkin.image}
                  alt={equippedSkin.name}
                  className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.75)] mb-3"
                />
                <span className="px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[10px] font-black uppercase text-amber-300">
                  Equipped Matthew
                </span>
                <h3 className="text-xl font-black text-white mt-1">{equippedSkin.name}</h3>
              </div>

              {/* 6 VISUAL STAT TILES */}
              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-amber-400/40 flex flex-col items-center justify-center text-center shadow-xl">
                  <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-black text-lg mb-2">
                    M
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Coins</span>
                  <p className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">
                    {formatCoins(state.coins)}
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-fuchsia-400/40 flex flex-col items-center justify-center text-center shadow-xl">
                  <div className="w-11 h-11 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-400/50 flex items-center justify-center text-fuchsia-300 mb-2">
                    <Gem className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Gems</span>
                  <p className="text-xl sm:text-2xl font-black text-fuchsia-300 mt-0.5">
                    {state.gems}
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-purple-400/40 flex flex-col items-center justify-center text-center shadow-xl">
                  <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 mb-2">
                    <InfinityIcon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Ascension</span>
                  <p className="text-xl sm:text-2xl font-black text-purple-300 mt-0.5">
                    {ascensionMult.toFixed(2)}×
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-cyan-400/40 flex flex-col items-center justify-center text-center shadow-xl">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 mb-2">
                    <Eye className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Skins Owned</span>
                  <p className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5">
                    {state.unlockedSkins.length}
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-emerald-400/40 flex flex-col items-center justify-center text-center shadow-xl">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 mb-2">
                    <MousePointerClick className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Lifetime Clicks</span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">
                    {formatNumber(careerClicks)}
                  </p>
                </div>

                <div className="p-5 rounded-3xl bg-slate-900/90 border-2 border-sky-400/40 flex flex-col items-center justify-center text-center shadow-xl">
                  <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300 mb-2">
                    <Clock className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Playtime</span>
                  <p className="text-xl sm:text-2xl font-black text-sky-300 mt-0.5">
                    {formatTime(state.totalPlaytimeSeconds)}
                  </p>
                </div>
              </div>
            </div>

            {/* LARGE GRAPHICAL PORTAL TILES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                onClick={() => {
                  onClose();
                  onOpenLeaderboard();
                }}
                className="group p-6 rounded-3xl bg-gradient-to-b from-amber-500/25 to-slate-900/90 border-2 border-amber-400/70 hover:border-yellow-300 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1 cursor-pointer shadow-xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(251,191,36,0.35)]">
                  <Trophy className="w-9 h-9 text-yellow-300" />
                </div>
                <span className="text-sm sm:text-base font-black text-white uppercase">
                  Leaderboard
                </span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenSkins();
                }}
                className="group p-6 rounded-3xl bg-gradient-to-b from-cyan-500/25 to-slate-900/90 border-2 border-cyan-400/70 hover:border-cyan-300 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1 cursor-pointer shadow-xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-400/20 border-2 border-cyan-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                  <Eye className="w-9 h-9 text-cyan-300" />
                </div>
                <span className="text-sm sm:text-base font-black text-white uppercase">
                  Skins Vault
                </span>
              </button>

              <button
                onClick={() => {
                  if (isStormActive) {
                    onClose();
                    onOpenStormShop();
                  } else {
                    setActiveTab('account');
                  }
                }}
                className="group p-6 rounded-3xl bg-gradient-to-b from-emerald-500/25 to-slate-900/90 border-2 border-emerald-400/70 hover:border-emerald-300 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1 cursor-pointer shadow-xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-400/20 border-2 border-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(52,211,153,0.35)]">
                  {isStormActive ? (
                    <ShoppingBag className="w-9 h-9 text-fuchsia-300" />
                  ) : (
                    <Cloud className="w-9 h-9 text-emerald-300" />
                  )}
                </div>
                <span className="text-sm sm:text-base font-black text-white uppercase">
                  {isStormActive ? 'Storm Shop' : 'Cloud Account'}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className="group p-6 rounded-3xl bg-gradient-to-b from-purple-500/25 to-slate-900/90 border-2 border-purple-400/70 hover:border-purple-300 flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1 cursor-pointer shadow-xl"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-400/20 border-2 border-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(192,132,252,0.35)]">
                  <Settings className="w-9 h-9 text-purple-300" />
                </div>
                <span className="text-sm sm:text-base font-black text-white uppercase">
                  Settings
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================= TAB 2: ACCOUNT & CLOUD SYNC ================= */}
        {activeTab === 'account' && (
          <div className="max-w-xl w-full mx-auto">
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/95 border-2 border-emerald-500/60 shadow-2xl space-y-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-3 shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                  <Cloud className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase">Cloud Account</h3>
              </div>

              {state.cloudAccount ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Player</span>
                      <p className="text-base font-black text-emerald-300 mt-1 flex items-center justify-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        {state.cloudAccount.displayUsername}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-black uppercase">Skins Synced</span>
                      <p className="text-base font-black text-amber-300 mt-1">
                        {state.unlockedSkins.length} Matthews
                      </p>
                    </div>
                  </div>

                  {syncMessage && (
                    <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-center gap-2 font-black">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{syncMessage}</span>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center justify-center gap-2 font-black">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleManualSync}
                      disabled={loading}
                      className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 btn-chunky"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                      <span>{loading ? 'Syncing...' : 'Sync Now'}</span>
                    </button>

                    <button
                      onClick={handleLogout}
                      disabled={loading}
                      className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs uppercase flex items-center gap-2 cursor-pointer transition"
                    >
                      <LogOut className="w-4 h-4 text-red-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center justify-center gap-2 font-black">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer transition disabled:opacity-50 btn-chunky"
                  >
                    {loading ? 'Signing In...' : 'Sign In / Create Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: SETTINGS & STATS ================= */}
        {activeTab === 'settings' && <SettingsModal state={state} setState={setState} />}
      </div>
    </div>
  );
};
