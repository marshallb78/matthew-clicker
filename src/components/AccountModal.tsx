import React, { useState } from 'react';
import { GameState } from '../types/game';
import {
  authenticateUnified,
  changeAccountUsername,
  logoutPlayer,
  validateUsernameFormat,
} from '../firebase/auth';
import {
  clearCloudSaveSignature,
  saveStateToCloud,
  signInAndReconcileAccount,
  syncAccountBidirectional,
} from '../firebase/cloudSave';
import { getFirebaseServices, isCloudWriteCoolingDown } from '../firebase/config';
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
  Play,
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
  const [newUsernameInput, setNewUsernameInput] = useState('');
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
      const nextState = await signInAndReconcileAccount(profile.uid, profile.username, state);
      setState(nextState);

      onNotify(
        isNewAccount ? 'ACCOUNT CREATED!' : 'WELCOME BACK!',
        `Signed in as ${profile.username}!`
      );
      setPassword('');
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.cloudAccount) return;
    setError(null);
    setSyncMessage(null);

    const validationErr = validateUsernameFormat(newUsernameInput);
    if (validationErr) {
      setError(validationErr);
      return;
    }

    setLoading(true);
    try {
      const updatedName = await changeAccountUsername(
        state.cloudAccount.uid,
        state.cloudAccount.displayUsername,
        newUsernameInput
      );
      const nextState: GameState = {
        ...state,
        cloudAccount: {
          ...state.cloudAccount,
          username: updatedName,
          displayUsername: updatedName,
          lastCloudSync: Date.now(),
        },
      };
      setState(nextState);
      saveGame(nextState);
      await saveStateToCloud(nextState.cloudAccount!.uid, updatedName, nextState, true);
      setNewUsernameInput('');
      setSyncMessage(`Username changed to ${updatedName}!`);
      onNotify('USERNAME UPDATED!', `Your account name is now ${updatedName}!`);
    } catch (err: unknown) {
      setError((err as Error).message || 'Could not change username.');
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
      const { nextState, ok } = await syncAccountBidirectional(
        state.cloudAccount.uid,
        state.cloudAccount.displayUsername,
        state
      );
      setState(nextState);
      if (ok) {
        setSyncMessage('Synced!');
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
        const uid = state.cloudAccount.uid;
        await saveStateToCloud(uid, state.cloudAccount.displayUsername, state, true).catch(
          () => {}
        );
        clearCloudSaveSignature(uid);
      }
      await logoutPlayer();
      setState((prev) => {
        const next: GameState = { ...prev, cloudAccount: null };
        saveGame(next);
        return next;
      });
      onNotify('SIGNED OUT', 'Signed out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#0d1429] via-[#090d1b] to-[#050710] font-chunky text-slate-100 select-none overflow-hidden animate-fade-in">
      {state.cloudAccount && (
        <button
          onClick={onClose}
          className="absolute top-5 right-6 px-4 py-2.5 rounded-2xl bg-slate-900 border-2 border-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 font-black text-xs uppercase cursor-pointer transition"
        >
          <X className="w-5 h-5" />
          <span>Close</span>
        </button>
      )}

      <div className="w-full max-w-md bg-[#11172e]/95 border-2 border-emerald-400/70 rounded-3xl p-7 shadow-[0_0_60px_rgba(16,185,129,0.25)] text-center">
        <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mx-auto mb-3 shadow-[0_0_25px_rgba(16,185,129,0.4)]">
          <Cloud className="w-10 h-10" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase">Matthew Account</h2>
        <p className="text-xs font-bold text-emerald-300 mt-1 mb-5">
          {state.cloudAccount ? 'Cloud Sync Active' : 'Enter Username & Password to Play'}
        </p>

        {firebaseInitError && (
          <div className="p-3 mb-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-xs text-amber-200 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{firebaseInitError}</span>
          </div>
        )}

        {state.cloudAccount ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40">
                <span className="text-[10px] text-slate-400 font-black uppercase">Player</span>
                <p className="text-base font-black text-emerald-300 mt-1 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4" />
                  {state.cloudAccount.displayUsername}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-black uppercase">Skins</span>
                <p className="text-base font-black text-amber-300 mt-1">
                  {state.unlockedSkins.length} Matthews
                </p>
              </div>
            </div>

            {/* CHANGE ACCOUNT NAME */}
            <form
              onSubmit={handleRenameAccount}
              className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 text-left"
            >
              <label className="text-[10px] font-black uppercase text-cyan-300 block">
                Change Account Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUsernameInput}
                  onChange={(e) => setNewUsernameInput(e.target.value)}
                  placeholder="New Username (3-18 chars)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={loading || !newUsernameInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase cursor-pointer transition shrink-0"
                >
                  Rename
                </button>
              </div>
            </form>

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

            <div className="flex gap-2.5">
              <button
                onClick={handleManualSync}
                disabled={loading}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-50 btn-chunky"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs uppercase flex items-center justify-center gap-1.5 cursor-pointer transition btn-chunky"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Play</span>
              </button>

              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs flex items-center gap-1.5 cursor-pointer transition"
              >
                <LogOut className="w-4 h-4 text-red-400" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg cursor-pointer transition disabled:opacity-50 btn-chunky"
            >
              {loading ? 'Loading...' : 'Play Now'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
