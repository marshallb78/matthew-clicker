import React, { useState } from 'react';
import { GameState } from '../types/game';
import {
  authenticateUnified,
  logoutPlayer,
  validateUsernameFormat,
} from '../firebase/auth';
import { loadAndReconcileCloudSave, saveStateToCloud } from '../firebase/cloudSave';
import { updateLeaderboardEntry } from '../firebase/leaderboard';
import { getFirebaseServices } from '../firebase/config';
import { saveGame } from '../utils/storage';
import {
  User,
  Cloud,
  LogOut,
  ShieldCheck,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onNotify: (title: string, subtitle: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  state,
  setState,
  onNotify,
}) => {
  const [username, setUsername] = useState(state.cloudAccount?.displayUsername || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const { error: firebaseInitError } = getFirebaseServices();

  const handleSubmit = async (e: React.FormEvent) => {
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
      await saveStateToCloud(profile.uid, profile.username, nextState);
      await updateLeaderboardEntry(profile.uid, profile.username, nextState);

      onNotify(
        isNewAccount ? 'ACCOUNT CREATED & SIGNED IN!' : 'WELCOME BACK!',
        `Signed in as ${profile.username}! Auto-saving every 5s to the cloud.`
      );
      setPassword('');
      onClose();
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
      const ok = await saveStateToCloud(
        state.cloudAccount.uid,
        state.cloudAccount.displayUsername,
        state
      );
      await updateLeaderboardEntry(
        state.cloudAccount.uid,
        state.cloudAccount.displayUsername,
        state
      );
      if (ok) {
        const now = Date.now();
        setState((prev) =>
          prev.cloudAccount
            ? { ...prev, cloudAccount: { ...prev.cloudAccount, lastCloudSync: now } }
            : prev
        );
        setSyncMessage('Cloud save & worldwide leaderboard synced!');
      } else {
        setError('Cloud sync could not complete. Check your connection.');
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
        await saveStateToCloud(
          state.cloudAccount.uid,
          state.cloudAccount.displayUsername,
          state
        );
      }
      await logoutPlayer();
      setState((prev) => {
        const next: GameState = { ...prev, cloudAccount: null };
        saveGame(next);
        return next;
      });
      onNotify('SIGNED OUT', 'Sign back in anytime to sync your cloud progress.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#13172b] border-2 border-emerald-500/60 rounded-3xl p-6 shadow-2xl font-chunky text-slate-100">
        {state.cloudAccount && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Sign In / Create Account</h2>
            <p className="text-xs text-slate-400">
              {state.cloudAccount
                ? 'Signed in • Auto-saves every 5 seconds'
                : 'Sign-in required to play & save • Auto-creates if new!'}
            </p>
          </div>
        </div>

        {firebaseInitError && (
          <div className="p-3 mb-4 rounded-xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{firebaseInitError}</span>
          </div>
        )}

        {state.cloudAccount ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">Active Account</span>
                <span className="text-sm font-black text-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  {state.cloudAccount.displayUsername}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Unlocked Skins Synced</span>
                <span className="text-amber-300 font-black">{state.unlockedSkins.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Permanent Gems Synced</span>
                <span className="text-fuchsia-300 font-black">{state.gems} 💎</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Auto-Save Status</span>
                <span className="text-cyan-300 font-mono">
                  Every 5s (Last: {new Date(state.cloudAccount.lastCloudSync).toLocaleTimeString()})
                </span>
              </div>
            </div>

            {syncMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{syncMessage}</span>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={handleManualSync}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs cursor-pointer transition"
              >
                Play Now
              </button>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <LogOut className="w-4 h-4 text-red-400" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-750 text-xs text-slate-300 leading-relaxed">
              Enter your <strong className="text-emerald-300">Username</strong> and{' '}
              <strong className="text-emerald-300">Password</strong>. If you don&apos;t have an
              account yet, it will <strong className="text-white">automatically create one</strong>{' '}
              for you. If you already have one, it signs you right in!
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Username (3–20 letters, numbers, _)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition disabled:opacity-50"
            >
              {loading ? 'Signing In / Creating Account...' : 'Sign In / Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
