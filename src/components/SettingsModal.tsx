import React, { useState } from 'react';
import { GameState } from '../types/game';
import { getAscensionMultiplier } from '../data/prestige';
import { getDefaultGameState, saveGame } from '../utils/storage';
import { saveStateToCloud } from '../firebase/cloudSave';
import { updateLeaderboardEntry } from '../firebase/leaderboard';
import { soundManager } from '../audio/soundManager';
import { formatCoins, formatNumber, formatTime } from '../utils/formatters';
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Music,
  Eye,
  BarChart3,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface SettingsModalProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  state,
  setState,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  const handleResetProgress = async () => {
    const fresh = getDefaultGameState();
    const resetState: GameState = {
      ...fresh,
      introCutsceneSeen: true,
      settings: state.settings,
      cloudAccount: state.cloudAccount
        ? { ...state.cloudAccount, lastCloudSync: Date.now() }
        : null,
    };

    setState(resetState);
    saveGame(resetState);
    setConfirmReset(false);

    if (resetState.cloudAccount) {
      await saveStateToCloud(
        resetState.cloudAccount.uid,
        resetState.cloudAccount.displayUsername,
        resetState
      );
      await updateLeaderboardEntry(
        resetState.cloudAccount.uid,
        resetState.cloudAccount.displayUsername,
        resetState
      );
    }
  };
  const handleMasterVol = (val: number) => {
    soundManager.setMasterVolume(val);
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, masterVolume: val },
    }));
  };

  const handleSfxVol = (val: number) => {
    soundManager.setSfxVolume(val);
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, sfxVolume: val },
    }));
  };

  const handleMusicVol = (val: number) => {
    soundManager.setMusicVolume(val);
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, musicVolume: val },
    }));
  };

  const toggleMute = () => {
    const isMuted = soundManager.toggleMute();
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, isMuted },
    }));
  };

  const toggleMusic = () => {
    const isPlaying = soundManager.toggleMusic();
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, isMusicPlaying: isPlaying },
    }));
  };

  const toggleReducedMotion = () => {
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, reducedMotion: !prev.settings.reducedMotion },
    }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 overflow-y-auto">
      {/* HEADER */}
      <div className="mb-6 pb-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 font-display">
            <SettingsIcon className="w-6 h-6 text-cyan-400" />
            Settings &amp; Statistics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Customize audio, visuals, and view your career statistics (Progress auto-saves every 5s to your account)
          </p>
        </div>
      </div>

      <div className="space-y-6 pb-10">
        {/* AUDIO CONTROLS */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            Audio Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex gap-2">
              <button
                onClick={toggleMute}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                  state.settings.isMuted
                    ? 'bg-red-950/60 border-red-500/40 text-red-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
              >
                {state.settings.isMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                )}
                {state.settings.isMuted ? 'Unmute All' : 'Mute Audio'}
              </button>

              <button
                onClick={toggleMusic}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition cursor-pointer ${
                  state.settings.isMusicPlaying
                    ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <Music className="w-4 h-4 text-purple-400" />
                {state.settings.isMusicPlaying ? 'Stop Music' : 'Play Music'}
              </button>
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Master Volume</span>
                <span className="text-cyan-400">{Math.round(state.settings.masterVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.settings.masterVolume}
                onChange={(e) => handleMasterVol(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Effects Volume</span>
                <span className="text-cyan-400">{Math.round(state.settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.settings.sfxVolume}
                onChange={(e) => handleSfxVol(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Music Volume</span>
                <span className="text-purple-400">{Math.round(state.settings.musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={state.settings.musicVolume}
                onChange={(e) => handleMusicVol(parseFloat(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* VISUAL & ACCESSIBILITY */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-purple-400" />
            Visuals &amp; Accessibility
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-slate-200">Reduced Motion Mode</span>
              <p className="text-xs text-slate-400 mt-0.5">
                Disables heavy particle bursts, rain, and click bounce animations
              </p>
            </div>
            <button
              onClick={toggleReducedMotion}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                state.settings.reducedMotion ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  state.settings.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* LIFETIME & SEASONAL STATISTICS */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            Career &amp; Seasonal Statistics
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Lifetime Clicks (All Seasons)
              </span>
              <p className="text-base font-extrabold text-cyan-400 mt-0.5">
                {formatNumber(Math.max(state.lifetimeAllSeasonsClicks || 0, state.clicks))}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Critical Strikes</span>
              <p className="text-base font-extrabold text-yellow-400 mt-0.5">
                {formatNumber(state.criticalClicks)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Seasonal Score</span>
              <p className="text-base font-extrabold text-amber-400 mt-0.5">
                {formatCoins(state.seasonalScore)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Permanent Gems</span>
              <p className="text-base font-extrabold text-fuchsia-400 mt-0.5">
                {state.gems} 💎 (Lifetime: {state.lifetimeGems})
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Ascension Multiplier
              </span>
              <p className="text-base font-extrabold text-pink-400 mt-0.5">
                {getAscensionMultiplier(state.prestigeShards).toFixed(2)}× ({state.prestigeCount} Rebirths)
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Playtime</span>
              <p className="text-base font-extrabold text-purple-400 mt-0.5">
                {formatTime(state.totalPlaytimeSeconds)}
              </p>
            </div>
          </div>
        </div>

        {/* RESET PROGRESS (NO COPY/IMPORT SAVE) */}
        <div className="p-5 rounded-2xl bg-red-950/25 border border-red-500/40 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-red-300 flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-red-400" />
            Reset Progress
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Wipe your current coins, upgrades, rebirths, and unlocked skins to start fresh from zero.
          </p>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="px-4 py-2.5 rounded-xl bg-red-600/25 hover:bg-red-600/40 border border-red-500/60 text-red-200 font-black text-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Reset Progress</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-black text-red-300 flex items-center gap-1.5 mr-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Are you sure? This cannot be undone!
              </span>
              <button
                onClick={handleResetProgress}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs cursor-pointer transition shadow-lg"
              >
                Yes, Reset Everything
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
