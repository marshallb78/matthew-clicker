import React, { useState, useEffect, useRef } from 'react';
import { GameState } from './types/game';
import { loadGame, saveGame, performBetaWipeIfDue } from './utils/storage';
import { equipSkin, getSkinById, checkAndApplyMilestoneUnlocks } from './data/skins';
import { calculateOfflineEarnings, calculateCPS } from './utils/calculations';
import {
  getActiveSeason,
  isFridayBonusActive,
  evaluateMatthewStormState,
} from './utils/scheduleEngine';
import { MATTHEW_STORM_CONFIG, BETA_RESET_CONFIG } from './config/gameConfig';
import { subscribeToAuthChanges } from './firebase/auth';
import { loadAndReconcileCloudSave, saveStateToCloud } from './firebase/cloudSave';
import { updateLeaderboardEntry } from './firebase/leaderboard';
import { useGameLoop } from './hooks/useGameLoop';
import { ClickerArea } from './components/ClickerArea';
import { RightPanel } from './components/RightPanel';
import { SettingsModal } from './components/SettingsModal';
import { ParticleCanvas, particleEngine } from './components/ParticleCanvas';
import { GoldenMatthewEvent } from './components/GoldenMatthewEvent';
import { OfflineProgressModal } from './components/OfflineProgressModal';
import { SkinQualityModal } from './components/SkinQualityModal';
import { AccountModal } from './components/AccountModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MatthewStormModal } from './components/MatthewStormModal';
import { IntroCutsceneModal } from './components/IntroCutsceneModal';
import { soundManager } from './audio/soundManager';
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
  // Prompt the user to Sign In / Create Account on every reload after the loading screen finishes!
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showStormShop, setShowStormShop] = useState(false);
  const [showStormRecap, setShowStormRecap] = useState(false);
  // Sleek Loading Screen animation plays on site reload/entry
  const [showIntroCutscene, setShowIntroCutscene] = useState<boolean>(true);

  // Schedule & Live Event state
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [testSimStartMs, setTestSimStartMs] = useState<number | null>(null);

  const [offlineData, setOfflineData] = useState<{ elapsed: number; coins: number } | null>(null);
  const [notifications, setNotifications] = useState<Toast[]>([]);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  const prevStormStatusRef = useRef<string>('pre_countdown');
  const prevWaveIndexRef = useRef<number>(-1);

  const seasonInfo = getActiveSeason(nowMs);
  const seasonLabel = `Season #${seasonInfo.seasonNumber}`;
  const seasonRemainingSec = Math.max(0, Math.floor(seasonInfo.remainingMs / 1000));

  const fridayBonus = isFridayBonusActive(nowMs);
  const stormState = evaluateMatthewStormState(nowMs, testSimStartMs);
  const isStormActive = stormState.status === 'active';
  const stormWaveMultiplier = isStormActive
    ? stormState.currentWave
      ? stormState.currentWave.multiplier
      : MATTHEW_STORM_CONFIG.baseStormMultiplier
    : 1;

  const handleNotify = (title: string, subtitle: string) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev.slice(-4), { id, title, subtitle }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 3500);
  };

  // 1-second schedule ticker for Season, Friday 2×, Matthew Storm waves, and Monday 1 AM Beta Reset
  useEffect(() => {
    const timer = setInterval(() => {
      const currentNow = Date.now();
      setNowMs(currentNow);

      // Enforce Monday 1:00 AM Beta Reset live if player is currently online when 1:00 AM hits
      if (
        currentNow >= BETA_RESET_CONFIG.resetTimeMs &&
        stateRef.current.lastBetaWipeId !== BETA_RESET_CONFIG.wipeId
      ) {
        const { state: wipedState, wiped } = performBetaWipeIfDue(stateRef.current, currentNow);
        if (wiped) {
          saveGame(wipedState);
          setState(wipedState);
          if (wipedState.cloudAccount) {
            saveStateToCloud(
              wipedState.cloudAccount.uid,
              wipedState.cloudAccount.displayUsername,
              wipedState
            );
          }
          handleNotify(
            '🚨 MONDAY 1:00 AM BETA RESET COMPLETE!',
            'All accounts and progress have been wiped for the new Click-Power update!'
          );
        }
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Always play music throughout the game: chill music normally, crazy epic techno during the live event!
  useEffect(() => {
    const isStormMusic =
      stormState.status === 'active' || stormState.status === 'fullscreen_10s_countdown';
    soundManager.setMusicTrack(isStormMusic ? 'storm' : 'chill');
  }, [stormState.status]);

  // Mandatory Sign-In: Only show the Sign In popup automatically if the player is NOT signed in!
  useEffect(() => {
    if (!showIntroCutscene && !state.cloudAccount && !showAccountModal) {
      setShowAccountModal(true);
    }
  }, [showIntroCutscene, state.cloudAccount, showAccountModal]);

  // Detect Matthew Storm wave transitions and event completion
  useEffect(() => {
    const prevStatus = prevStormStatusRef.current;
    const currStatus = stormState.status;

    if (prevStatus !== 'active' && currStatus === 'active') {
      soundManager.playThunder();
      particleEngine.emitMatthewRain(
        40,
        stateRef.current.unlockedSkins.map((id) => getSkinById(id).image)
      );
      handleNotify(
        '⚡ MATTHEW STORM IS LIVE! ⚡',
        '6×–15× Surge Waves, Raining Matthews, Giant Matthew & Secret Storm Shop unlocked!'
      );
    }

    if (prevStatus === 'active' && currStatus === 'ended') {
      setShowStormShop(false);
      setShowStormRecap(true);
      if (testSimStartMs !== null) {
        setTestSimStartMs(null);
      }
    }

    prevStormStatusRef.current = currStatus;

    const currWaveIdx = stormState.currentWave ? stormState.currentWave.waveIndex : -1;
    if (currStatus === 'active' && currWaveIdx !== -1 && currWaveIdx !== prevWaveIndexRef.current) {
      soundManager.playStormWaveStart();
      particleEngine.emitMatthewRain(
        35,
        stateRef.current.unlockedSkins.map((id) => getSkinById(id).image)
      );
      handleNotify(
        `⚡ STORM WAVE #${currWaveIdx} (${stormState.currentWave?.multiplier}× MULTIPLIER)!`,
        'Giant Matthew has spawned for 7 seconds — click him fast!'
      );
    }
    prevWaveIndexRef.current = currWaveIdx;
  }, [stormState.status, stormState.currentWave, testSimStartMs]);

  // Check uncapped offline earnings on initial mount
  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const { elapsedSeconds, coinsEarned } = calculateOfflineEarnings(
      state,
      nowSec,
      seasonInfo.seasonId
    );
    if (elapsedSeconds > 15 && coinsEarned > 0) {
      setOfflineData({ elapsed: elapsedSeconds, coins: coinsEarned });
    }
  }, []);

  // Subscribe to Firebase Auth changes for persistent session restoration
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (profile) => {
      if (!profile) return;
      const merged = await loadAndReconcileCloudSave(
        profile.uid,
        profile.username,
        stateRef.current
      );
      setState((prev) => {
        const { state: checkedPrev } = performBetaWipeIfDue(prev, Date.now());
        const next: GameState = {
          ...merged,
          coins: Math.max(checkedPrev.coins, merged.coins),
          cloudAccount: {
            uid: profile.uid,
            username: profile.username,
            displayUsername: profile.username,
            lastCloudSync: Date.now(),
          },
        };
        saveGame(next);
        return next;
      });
    });
    return () => unsubscribe();
  }, []);

  // Fast 25-second 1-document Leaderboard + Progress sync while actively playing,
  // plus 5-minute deep profile backup & automatic sync on tab close/hide.
  useEffect(() => {
    const fastLeaderboardSync = () => {
      const curr = stateRef.current;
      if (!curr.cloudAccount) return;
      const isRecentlyActive = Date.now() - (curr.lastActiveInputTimestamp || 0) < 30000;
      if (!isRecentlyActive) return;
      updateLeaderboardEntry(
        curr.cloudAccount.uid,
        curr.cloudAccount.displayUsername,
        curr
      ).catch(() => {});
    };

    const deepProfileBackup = () => {
      const curr = stateRef.current;
      if (!curr.cloudAccount) return;
      const isRecentlyActive = Date.now() - (curr.lastActiveInputTimestamp || 0) < 310000;
      if (!isRecentlyActive) return;
      saveStateToCloud(
        curr.cloudAccount.uid,
        curr.cloudAccount.displayUsername,
        curr
      ).catch(() => {});
    };

    const fastInterval = setInterval(fastLeaderboardSync, 25000);
    const deepInterval = setInterval(deepProfileBackup, 300000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const curr = stateRef.current;
        if (curr.cloudAccount) {
          saveStateToCloud(
            curr.cloudAccount.uid,
            curr.cloudAccount.displayUsername,
            curr
          ).catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(fastInterval);
      clearInterval(deepInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Keyboard Easter Egg ("rain" — ignored when typing in inputs)
  useEffect(() => {
    let buffer = '';
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key.length === 1) {
        buffer = (buffer + e.key.toLowerCase()).slice(-10);
        if (buffer.endsWith('rain')) {
          particleEngine.emitMatthewRain(
            45,
            stateRef.current.unlockedSkins.map((id) => getSkinById(id).image)
          );
          soundManager.playSkinUnlock();
          handleNotify('EASTER EGG: MATTHEW RAIN!', 'Raining your unlocked Matthews from the sky!');
          buffer = '';
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleClaimOffline = () => {
    if (offlineData) {
      setState((prev) => {
        const next: GameState = {
          ...prev,
          coins: prev.coins + offlineData.coins,
          lifetimeCoins: prev.lifetimeCoins + offlineData.coins,
          seasonalScore: prev.seasonalScore + offlineData.coins,
          lastSaveTime: Date.now(),
          lastActiveInputTimestamp: Date.now(),
        };
        saveGame(next);
        return next;
      });
      setOfflineData(null);
    }
  };

  useGameLoop({
    state,
    setState,
    onNotify: (title, subtitle) => handleNotify(title, subtitle),
    liveContext: {
      fridayBonusActive: fridayBonus,
      stormWaveMultiplier,
      isStormActive,
    },
  });

  const handleEarnCoins = (amount: number, isClick: boolean, isCrit: boolean) => {
    let unlockedSkinsNow: { id: string; name: string }[] = [];

    setState((prev) => {
      const nextCombo = isClick ? Math.min(prev.combo + 1, BALANCE.click.comboMax) : prev.combo;
      const baseNext: GameState = {
        ...prev,
        coins: prev.coins + amount,
        lifetimeCoins: prev.lifetimeCoins + amount,
        seasonalScore: prev.seasonalScore + amount,
        clicks: isClick ? prev.clicks + 1 : prev.clicks,
        criticalClicks: isCrit ? prev.criticalClicks + 1 : prev.criticalClicks,
        combo: nextCombo,
        maxComboReached: Math.max(prev.maxComboReached || 0, nextCombo),
        comboTimer: isClick ? BALANCE.click.comboTimerResetSec : prev.comboTimer,
        lastActiveInputTimestamp: Date.now(),
      };

      const cps = calculateCPS(baseNext, {
        fridayBonusActive: fridayBonus,
        stormWaveMultiplier,
      });
      const unlockCheck = checkAndApplyMilestoneUnlocks(baseNext, cps);
      if (unlockCheck.newlyUnlocked.length > 0) {
        unlockedSkinsNow = unlockCheck.newlyUnlocked.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        saveGame(unlockCheck.state);
        return unlockCheck.state;
      }

      return baseNext;
    });

    if (unlockedSkinsNow.length > 0) {
      soundManager.playSkinUnlock();
      particleEngine.emitPrestige();
      particleEngine.emitMatthewRain(
        18,
        stateRef.current.unlockedSkins.map((id) => getSkinById(id).image)
      );
      unlockedSkinsNow.forEach((skin) => {
        handleNotify('NEW MATTHEW UNLOCKED!', `${skin.name} automatically equipped!`);
      });
    }
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

  const handleCompleteIntro = () => {
    setShowIntroCutscene(false);
    // Only show the Sign In / Create Account popup if the player is NOT already signed in!
    if (!stateRef.current.cloudAccount) {
      setShowAccountModal(true);
    }
    setState((prev) => {
      const next = { ...prev, introCutsceneSeen: true, lastActiveInputTimestamp: Date.now() };
      saveGame(next);
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
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-amber-300 uppercase">{n.title}</h4>
                <p className="text-xs font-bold text-slate-100">{n.subtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setNotifications((prev) => prev.filter((item) => item.id !== n.id))}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
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
          onOpenAccount={() => setShowAccountModal(true)}
          onOpenLeaderboard={() => setShowLeaderboardModal(true)}
          onOpenStormShop={() => setShowStormShop(true)}
          onStartStormTest={() => {
            const startNow = Date.now();
            setTestSimStartMs(startNow);
            setNowMs(startNow);
          }}
          onStopStormTest={() => {
            setShowStormShop(false);
            setTestSimStartMs(null);
            setShowStormRecap(true);
          }}
          onNotify={handleNotify}
          fridayBonusActive={fridayBonus}
          stormState={stormState}
          seasonLabel={seasonLabel}
          seasonRemainingSec={seasonRemainingSec}
        />
      </div>

      {/* RIGHT SIDE: UPGRADES, REBIRTH & QUESTS PANEL (~32% on Desktop) */}
      <div
        className={`fixed lg:relative inset-x-0 bottom-0 z-30 transition-transform duration-300 lg:translate-y-0 lg:w-[32%] lg:h-full ${
          mobilePanelOpen
            ? 'translate-y-0 h-[65vh]'
            : 'translate-y-[calc(100%-52px)] lg:translate-y-0 h-[65vh] lg:h-full'
        }`}
      >
        <div
          onClick={() => setMobilePanelOpen((prev) => !prev)}
          className="lg:hidden h-[52px] bg-[#101426] border-t-2 border-slate-700 flex items-center justify-between px-4 cursor-pointer select-none text-amber-300 font-black text-sm shadow-xl"
        >
          <span>Shop, Rebirth &amp; Quests ({state.unlockedSkins.length} Matthews)</span>
          {mobilePanelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>

        <div className="h-[calc(100%-52px)] lg:h-full w-full">
          <RightPanel
            state={state}
            setState={setState}
            onOpenSkinQualityModal={() => setShowSkinQualityModal(true)}
            onNotify={handleNotify}
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
            <SettingsModal state={state} setState={setState} />
          </div>
        </div>
      )}

      {/* VIEW ALL SKINS MODAL (Excludes secret storm skins) */}
      <SkinQualityModal
        isOpen={showSkinQualityModal}
        onClose={() => setShowSkinQualityModal(false)}
        equippedSkinId={state.equippedSkin}
        unlockedSkinIds={state.unlockedSkins}
        onEquipSkin={handleEquipSkin}
      />

      {/* UNIFIED SIGN IN / CREATE ACCOUNT MODAL */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        state={state}
        setState={setState}
        onNotify={handleNotify}
      />

      {/* WORLDWIDE SEASONAL LEADERBOARD MODAL (Click any player to inspect stats & skins) */}
      <LeaderboardModal
        isOpen={showLeaderboardModal}
        onClose={() => setShowLeaderboardModal(false)}
        state={state}
        seasonId={seasonInfo.seasonId}
        seasonLabel={seasonLabel}
        seasonRemainingSec={seasonRemainingSec}
        onOpenAccount={() => setShowAccountModal(true)}
      />

      {/* MATTHEW STORM COUNTDOWN, SECRET EVENT SHOP & CLOSING ANIMATION/RECAP MODAL */}
      <MatthewStormModal
        state={state}
        setState={setState}
        stormState={stormState}
        isOpenShop={showStormShop}
        onCloseShop={() => setShowStormShop(false)}
        isOpenRecap={showStormRecap}
        onCloseRecap={() => setShowStormRecap(false)}
        onNotify={handleNotify}
      />

      {/* SLEEK LOADING SCREEN ANIMATION */}
      <IntroCutsceneModal isOpen={showIntroCutscene} onComplete={handleCompleteIntro} />

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
