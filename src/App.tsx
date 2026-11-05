import React, { useState, useEffect } from 'react';
import { GameState } from './types/game';
import { loadGame, saveGame } from './utils/storage';
import { calculateOfflineEarnings } from './utils/calculations';
import { soundManager } from './audio/soundManager';
import { useGameLoop } from './hooks/useGameLoop';
import { Navbar, ScreenTab } from './components/Navbar';
import { ClickerArea } from './components/ClickerArea';
import { UpgradeShop } from './components/UpgradeShop';
import { SkinCollection } from './components/SkinCollection';
import { PrestigeModal } from './components/PrestigeModal';
import { AchievementsModal } from './components/AchievementsModal';
import { SettingsModal } from './components/SettingsModal';
import { ParticleCanvas } from './components/ParticleCanvas';
import { GoldenMatthewEvent } from './components/GoldenMatthewEvent';
import { OfflineProgressModal } from './components/OfflineProgressModal';
import { ACHIEVEMENTS } from './data/achievements';
import { Sparkles, Trophy, Shirt, X } from 'lucide-react';

interface NotificationToast {
  id: number;
  title: string;
  subtitle: string;
  type: 'skin' | 'ach' | 'info';
}

export function App() {
  const [state, setState] = useState<GameState>(() => loadGame());
  const [currentTab, setCurrentTab] = useState<ScreenTab>('clicker');
  const [offlineData, setOfflineData] = useState<{ elapsed: number; coins: number } | null>(null);
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);

  // Check offline earnings on initial load
  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const { elapsedSeconds, coinsEarned } = calculateOfflineEarnings(state, nowSec);
    if (elapsedSeconds > 15 && coinsEarned > 0) {
      setOfflineData({ elapsed: elapsedSeconds, coins: coinsEarned });
    }
  }, []);

  const handleClaimOffline = () => {
    if (offlineData) {
      setState((prev) => ({
        ...prev,
        coins: prev.coins + offlineData.coins,
        lifetimeCoins: prev.lifetimeCoins + offlineData.coins,
        lastSaveTime: Date.now(),
      }));
      setOfflineData(null);
    }
  };

  const handleNotify = (title: string, subtitle: string, type: 'skin' | 'ach' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, title, subtitle, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  // Run the core game loop (CPS, tick, combo decay, autosave, unlock checks)
  useGameLoop({
    state,
    setState,
    onNotify: handleNotify,
  });

  const handleEarnCoins = (amount: number, isClick: boolean, isCrit: boolean) => {
    setState((prev) => ({
      ...prev,
      coins: prev.coins + amount,
      lifetimeCoins: prev.lifetimeCoins + amount,
      clicks: isClick ? prev.clicks + 1 : prev.clicks,
      criticalClicks: isCrit ? prev.criticalClicks + 1 : prev.criticalClicks,
      combo: isClick ? Math.min(prev.combo + 1, 40) : prev.combo,
      comboTimer: isClick ? 1.8 : prev.comboTimer, // 1.8s window to maintain combo
    }));
  };

  const toggleMute = () => {
    const isMuted = soundManager.toggleMute();
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, isMuted },
    }));
  };

  return (
    <div className="relative min-h-screen w-full bg-game-pattern text-slate-100 flex flex-col overflow-x-hidden font-sans">
      {/* 60FPS CANVAS PARTICLES */}
      <ParticleCanvas
        reducedMotion={state.settings.reducedMotion}
        showParticles={state.settings.showParticles}
      />

      {/* RARE FLYING GOLDEN MATTHEW EVENT */}
      <GoldenMatthewEvent
        state={state}
        setState={setState}
        onSpawnBonus={(text) => handleNotify('BONUS EVENT!', text, 'info')}
      />

      {/* TOP NOTIFICATION TOASTS */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-400/60 shadow-2xl shadow-cyan-500/20 backdrop-blur-md animate-bounce"
            style={{ animationIterationCount: 1, animationDuration: '0.4s' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center p-2 text-white">
                {n.type === 'skin' ? <Shirt className="w-5 h-5" /> : n.type === 'ach' ? <Trophy className="w-5 h-5 text-yellow-300" /> : <Sparkles className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="text-xs font-black text-cyan-300 font-display uppercase tracking-wider">{n.title}</h4>
                <p className="text-xs font-bold text-slate-100 mt-0.5">{n.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== n.id))}
              className="text-slate-500 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* NAVIGATION BAR */}
      <Navbar
        currentTab={currentTab}
        setTab={setCurrentTab}
        unlockedSkinsCount={state.unlockedSkins.length}
        unlockedAchCount={state.unlockedAchievements.length}
        totalAchCount={ACHIEVEMENTS.length}
        isMuted={state.settings.isMuted}
        onToggleMute={toggleMute}
      />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col w-full relative z-10 pb-16 md:pb-6">
        {currentTab === 'clicker' && (
          <ClickerArea
            state={state}
            setState={setState}
            onEarnCoins={handleEarnCoins}
          />
        )}

        {currentTab === 'upgrades' && (
          <UpgradeShop
            state={state}
            setState={setState}
          />
        )}

        {currentTab === 'skins' && (
          <SkinCollection
            state={state}
            setState={setState}
          />
        )}

        {currentTab === 'achievements' && (
          <AchievementsModal
            state={state}
          />
        )}

        {currentTab === 'prestige' && (
          <PrestigeModal
            state={state}
            setState={setState}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsModal
            state={state}
            setState={setState}
          />
        )}
      </main>

      {/* OFFLINE EARNINGS WELCOME BACK POPUP */}
      {offlineData && (
        <OfflineProgressModal
          elapsedSeconds={offlineData.elapsed}
          coinsEarned={offlineData.coins}
          onClaim={handleClaimOffline}
        />
      )}
    </div>
  );
}
export default App;
