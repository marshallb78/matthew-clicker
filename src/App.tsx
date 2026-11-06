import React, { useState, useEffect } from 'react';
import { GameState } from './types/game';
import { loadGame, saveGame } from './utils/storage';
import { equipSkin } from './data/skins';
import { calculateOfflineEarnings } from './utils/calculations';
import { useGameLoop } from './hooks/useGameLoop';
import { ClickerArea } from './components/ClickerArea';
import { RightPanel } from './components/RightPanel';
import { SettingsModal } from './components/SettingsModal';
import { ParticleCanvas } from './components/ParticleCanvas';
import { GoldenMatthewEvent } from './components/GoldenMatthewEvent';
import { OfflineProgressModal } from './components/OfflineProgressModal';
import { SkinQualityModal } from './components/SkinQualityModal';
import { BALANCE } from './data/balance';
import { X, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';

interface Toast {
  id: number;
  title: string;
  subtitle: string;
}

export function App() {
  const [state, setState] = useState<GameState>(() => loadGame());
  const [showSettings, setShowSettings] = useState(false);
  const [showSkinQualityModal, setShowSkinQualityModal] = useState(false);
  const [offlineData, setOfflineData] = useState<{ elapsed: number; coins: number } | null>(null);
  const [notifications, setNotifications] = useState<Toast[]>([]);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // Check offline earnings on initial mount
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

  const handleNotify = (title: string, subtitle: string) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, title, subtitle }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  };

  useGameLoop({
    state,
    setState,
    onNotify: (title, subtitle) => handleNotify(title, subtitle),
  });

  const handleEarnCoins = (amount: number, isClick: boolean, isCrit: boolean) => {
    setState((prev) => ({
      ...prev,
      coins: prev.coins + amount,
      lifetimeCoins: prev.lifetimeCoins + amount,
      clicks: isClick ? prev.clicks + 1 : prev.clicks,
      criticalClicks: isCrit ? prev.criticalClicks + 1 : prev.criticalClicks,
      combo: isClick ? Math.min(prev.combo + 1, BALANCE.click.comboMax) : prev.combo,
      comboTimer: isClick ? BALANCE.click.comboTimerResetSec : prev.comboTimer,
    }));
  };

  const handleEquipSkin = (skinId: string) => {
    setState((prev) => {
      const next = equipSkin(prev, skinId);
      if (next !== prev) {
        saveGame(next);
      }
      return next;
    });
  };

  return (
    <div className="relative w-screen h-screen bg-[#0c0f1d] text-slate-100 flex flex-col lg:flex-row overflow-hidden font-chunky noise-overlay">
      {/* 60FPS CANVAS PARTICLES */}
      <ParticleCanvas
        reducedMotion={state.settings.reducedMotion}
        showParticles={state.settings.showParticles}
      />

      {/* FLYING GOLDEN MATTHEW EVENT */}
      <GoldenMatthewEvent
        state={state}
        setState={setState}
        onSpawnBonus={(text) => handleNotify('BONUS EVENT!', text)}
      />

      {/* POPUP NOTIFICATIONS */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none px-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto flex items-center justify-between p-3 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-xs font-black text-amber-300 uppercase">{n.title}</h4>
                <p className="text-xs font-bold text-slate-100">{n.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== n.id))}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* LEFT SIDE: MAIN MATTHEW GAME (~68% on Desktop) */}
      <div className="w-full lg:w-[68%] h-full flex flex-col z-10">
        <ClickerArea
          state={state}
          setState={setState}
          onEarnCoins={handleEarnCoins}
          onOpenSettings={() => setShowSettings(true)}
        />
      </div>

      {/* RIGHT SIDE: UPGRADES & REBIRTH PANEL (~32% on Desktop) */}
      <div
        className={`fixed lg:relative inset-x-0 bottom-0 z-30 transition-transform duration-300 lg:translate-y-0 lg:w-[32%] lg:h-full ${
          mobilePanelOpen ? 'translate-y-0 h-[65vh]' : 'translate-y-[calc(100%-52px)] lg:translate-y-0 h-[65vh] lg:h-full'
        }`}
      >
        {/* MOBILE DRAWER TOGGLE HEADER */}
        <div
          onClick={() => setMobilePanelOpen((prev) => !prev)}
          className="lg:hidden h-[52px] bg-[#101426] border-t-2 border-slate-700 flex items-center justify-between px-4 cursor-pointer select-none text-amber-300 font-black text-sm shadow-xl"
        >
          <span>Upgrades & Matthews ({state.unlockedSkins.length}/16)</span>
          {mobilePanelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>

        {/* SIDEBAR PANEL */}
        <div className="h-[calc(100%-52px)] lg:h-full w-full">
          <RightPanel
            state={state}
            setState={setState}
            onOpenSkinQualityModal={() => setShowSkinQualityModal(true)}
          />
        </div>
      </div>

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#13172b] border-2 border-slate-700 rounded-3xl p-5 overflow-y-auto shadow-2xl">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>
            <SettingsModal
              state={state}
              setState={setState}
            />
          </div>
        </div>
      )}

      {/* SKIN QUALITY CONTROL & ALIGNMENT INSPECTOR MODAL */}
      <SkinQualityModal
        isOpen={showSkinQualityModal}
        onClose={() => setShowSkinQualityModal(false)}
        equippedSkinId={state.equippedSkin}
        unlockedSkinIds={state.unlockedSkins}
        onEquipSkin={handleEquipSkin}
      />

      {/* OFFLINE EARNINGS POPUP */}
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
