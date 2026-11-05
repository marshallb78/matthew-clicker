import React, { useState } from 'react';
import { GameState } from '../types/game';
import { soundManager } from '../audio/soundManager';
import { exportSaveString, importSaveString, clearSavedGame } from '../utils/storage';
import { formatCoins, formatNumber, formatTime } from '../utils/formatters';
import {
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  Music,
  Eye,
  Download,
  Upload,
  RotateCcw,
  BarChart3,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface SettingsModalProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ state, setState }) => {
  const [copied, setCopied] = useState(false);
  const [importString, setImportString] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleExport = () => {
    const code = exportSaveString(state);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    try {
      setImportError(null);
      const newState = importSaveString(importString);
      setState(newState);
      setImportString('');
      alert('Save game imported successfully!');
    } catch (err: unknown) {
      setImportError((err as Error).message || 'Failed to import save.');
    }
  };

  const handleReset = () => {
    const pristine = clearSavedGame();
    setState(pristine);
    setShowResetConfirm(false);
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
      <div className="mb-6 pb-4 border-b border-slate-800">
        <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 font-display">
          <SettingsIcon className="w-6 h-6 text-cyan-400" />
          Settings & Statistics
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">Customize audio, visuals, and manage your cloudless local save</p>
      </div>

      <div className="space-y-6 pb-20">
        {/* AUDIO CONTROLS */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            Audio Controls
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* MUTE & MUSIC TOGGLES */}
            <div className="flex gap-2">
              <button
                onClick={toggleMute}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                  state.settings.isMuted
                    ? 'bg-red-950/60 border-red-500/40 text-red-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
              >
                {state.settings.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                {state.settings.isMuted ? 'Unmute All' : 'Mute Audio'}
              </button>

              <button
                onClick={toggleMusic}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                  state.settings.isMusicPlaying
                    ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750'
                }`}
              >
                <Music className="w-4 h-4 text-purple-400" />
                {state.settings.isMusicPlaying ? 'Stop Music' : 'Play Music'}
              </button>
            </div>

            {/* MASTER VOLUME SLIDER */}
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

            {/* SFX VOLUME SLIDER */}
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

            {/* MUSIC VOLUME SLIDER */}
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
            Visuals & Accessibility
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-sm text-slate-200">Reduced Motion Mode</span>
              <p className="text-xs text-slate-400 mt-0.5">Disables heavy particle bursts and screen animations</p>
            </div>
            <button
              onClick={toggleReducedMotion}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
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

        {/* LIFETIME STATISTICS */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            Career Statistics
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Clicks</span>
              <p className="text-base font-extrabold text-cyan-400 mt-0.5">{formatNumber(state.clicks)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Critical Strikes</span>
              <p className="text-base font-extrabold text-yellow-400 mt-0.5">{formatNumber(state.criticalClicks)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Lifetime Coins</span>
              <p className="text-base font-extrabold text-amber-400 mt-0.5">{formatCoins(state.lifetimeCoins)}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Ascensions (Prestige)</span>
              <p className="text-base font-extrabold text-pink-400 mt-0.5">{state.prestigeCount}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Golden Matthews Caught</span>
              <p className="text-base font-extrabold text-yellow-300 mt-0.5">{state.goldenMatthewsClicked}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Playtime</span>
              <p className="text-base font-extrabold text-purple-400 mt-0.5">
                {formatTime(state.totalPlaytimeSeconds)}
              </p>
            </div>
          </div>
        </div>

        {/* SAVE MANAGEMENT: EXPORT / IMPORT / RESET */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-4">
            <Download className="w-4 h-4 text-green-400" />
            Save Management
          </h3>

          <div className="space-y-4">
            {/* EXPORT */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-200">Export Save Code</span>
                <p className="text-xs text-slate-400 mt-0.5">Copy a portable code to transfer your progress anywhere</p>
              </div>
              <button
                onClick={handleExport}
                className="py-2 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Save Code'}
              </button>
            </div>

            {/* IMPORT */}
            <div className="border-t border-slate-800 pt-4">
              <span className="font-bold text-sm text-slate-200">Import Save Code</span>
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Paste your save code here..."
                  value={importString}
                  onChange={(e) => setImportString(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleImport}
                  disabled={!importString.trim()}
                  className="py-2 px-4 rounded-xl font-bold text-xs bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
              </div>
              {importError && <p className="text-xs text-red-400 mt-1 font-semibold">{importError}</p>}
            </div>

            {/* HARD RESET */}
            <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div>
                <span className="font-bold text-sm text-red-400">Hard Reset</span>
                <p className="text-xs text-slate-400 mt-0.5">Wipes all progress and restarts fresh from the beginning</p>
              </div>
              <button
                onClick={() => setShowResetConfirm(true)}
                className="py-2 px-4 rounded-xl font-bold text-xs bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/40 flex items-center justify-center gap-2 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h4 className="text-xl font-bold text-slate-100 font-display">Are you absolutely sure?</h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              This will permanently delete all your Matthew Coins, upgrades, unlocked skins, and prestige stats. This action
              cannot be undone!
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition"
              >
                Wipe Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
