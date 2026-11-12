import React, { useState, useEffect, useRef } from 'react';
import { GameState } from './types/game';
import { loadGame, saveGame, performBetaWipeIfDue } from './utils/storage';
import { equipSkin, getSkinById, checkAndApplyMilestoneUnlocks } from './data/skins';
import { checkAndAutoClaimQuests } from './data/quests';
import { calculateOfflineEarnings, calculateCPS } from './utils/calculations';
import { formatNumber } from './utils/formatters';
import {
  getActiveSeason,
  isFridayBonusActive,
  evaluateMatthewStormState,
} from './utils/scheduleEngine';
import { MATTHEW_STORM_CONFIG } from './config/gameConfig';
import { getFirebaseServices } from './firebase/config';
import { logoutPlayer, subscribeToAuthChanges } from './firebase/auth';
import {
  clearCloudSaveSignature,
  hasCompletedInitialCloudPull,
  hasForeignDeviceSavedMoreRecently,
  loadAndReconcileCloudSave,
  registerForeignCloudUpdateHandler,
  saveStateToCloud,
  saveStateToCloudKeepalive,
} from './firebase/cloudSave';
import {
  LeaderboardEntry,
  fetchWorldwideLeaderboard,
} from './firebase/leaderboard';
import {
  BanRecord,
  ServerBroadcast,
  checkAccountBanStatus,
  getCachedServerBroadcast,
} from './firebase/moderation';
import { useGameLoop } from './hooks/useGameLoop';
import { ClickerArea } from './components/ClickerArea';
import { RightPanel } from './components/RightPanel';
import { ParticleCanvas, particleEngine } from './components/ParticleCanvas';
import { GoldenMatthewEvent } from './components/GoldenMatthewEvent';
import { OfflineProgressModal } from './components/OfflineProgressModal';
import { SkinQualityModal } from './components/SkinQualityModal';
import { AccountModal } from './components/AccountModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { MatthewStormModal } from './components/MatthewStormModal';
import { IntroCutsceneModal } from './components/IntroCutsceneModal';
import { EscMenuModal } from './components/EscMenuModal';
import { SeasonDowntimeModal } from './components/SeasonDowntimeModal';
import { BannedScreenModal } from './components/BannedScreenModal';
import { DevToolsModal } from './components/DevToolsModal';
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
  const [showEscMenu, setShowEscMenu] = useState(false);
  const [showSkinQualityModal, setShowSkinQualityModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [showStormShop, setShowStormShop] = useState(false);
  const [showStormRecap, setShowStormRecap] = useState(false);
  const [showDevToolsModal, setShowDevToolsModal] = useState(false);
  const [showIntroCutscene, setShowIntroCutscene] = useState<boolean>(true);

  const [activeBanRecord, setActiveBanRecord] = useState<BanRecord | null>(null);
  const [top3Players, setTop3Players] = useState<LeaderboardEntry[]>([]);
  const [serverBroadcast, setServerBroadcast] = useState<ServerBroadcast | null>(null);

  // Schedule & Live Event state
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const [offlineData, setOfflineData] = useState<{ elapsed: number; coins: number } | null>(null);
  const [notifications, setNotifications] = useState<Toast[]>([]);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Blocks local state ticks, offline calculations, and cloud writes on initial load until
  // Firebase Auth & latest Cloud Save retrieval finish!
  const [isInitialCloudHydrating, setIsInitialCloudHydrating] = useState<boolean>(true);
  const isHydratingCloudRef = useRef<boolean>(true);
  const isReconcilingCloudRef = useRef<boolean>(false);
  const offlineCheckedForUidRef = useRef<string | null>(null);
  const lastForegroundCheckAtRef = useRef<number>(0);

  const prevStormStatusRef = useRef<string>('pre_countdown');
  const prevWaveIndexRef = useRef<number>(-1);

  const seasonInfo = getActiveSeason(nowMs);
  const seasonLabel = `Season #${seasonInfo.seasonNumber}`;
  const seasonRemainingSec = Math.max(0, Math.floor(seasonInfo.remainingMs / 1000));

  const fridayBonus = isFridayBonusActive(nowMs);
  const stormState = evaluateMatthewStormState(nowMs, null);
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

  const applyLocalBanReset = (ban: BanRecord) => {
    setActiveBanRecord(ban);
    setOfflineData(null);
    setState((prev) => {
      const zeroed: GameState = {
        ...prev,
        coins: 0,
        lifetimeCoins: 0,
        seasonalScore: 0,
        clicks: 0,
        criticalClicks: 0,
        combo: 0,
        upgrades: {},
        prestigeCount: 0,
        prestigeShards: 0,
        lifetimePrestigeShards: 0,
        lastSaveTime: Date.now(),
      };
      saveGame(zeroed);
      return zeroed;
    });
  };

  const refreshMiniLeaderboard = async () => {
    try {
      const entries = await fetchWorldwideLeaderboard(getActiveSeason().seasonId, 5);
      setTop3Players(entries.slice(0, 3));
      setServerBroadcast(getCachedServerBroadcast());
    } catch {
      // ignore transient error
    }
  };

  // Poll cloud bans & refresh Top 3 Mini Leaderboard every 6 seconds so banned players are locked even while playing
  useEffect(() => {
    const checkBanAndLeaderboard = async () => {
      const curr = stateRef.current;
      const uid = curr.cloudAccount?.uid || null;
      const username =
        curr.cloudAccount?.displayUsername || curr.cloudAccount?.username || null;

      const ban = await checkAccountBanStatus(uid, username, true);
      if (ban) {
        applyLocalBanReset(ban);
      } else {
        setActiveBanRecord(null);
      }
      setServerBroadcast(getCachedServerBroadcast());
      await refreshMiniLeaderboard();
    };

    checkBanAndLeaderboard();
    const interval = setInterval(checkBanAndLeaderboard, 6000);
    return () => clearInterval(interval);
  }, [state.cloudAccount?.uid, state.cloudAccount?.displayUsername]);

  // Disable right-click context menu globally so fast trackpad clicking never opens a browser menu
  useEffect(() => {
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', preventContextMenu);
    return () => window.removeEventListener('contextmenu', preventContextMenu);
  }, []);

  // ESC Key Listener: Opens/closes the Full In-Game Menu Screen
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showIntroCutscene || activeBanRecord) return;
      e.preventDefault();

      if (showDevToolsModal) {
        setShowDevToolsModal(false);
        return;
      }
      if (showSkinQualityModal) {
        setShowSkinQualityModal(false);
        return;
      }
      if (showLeaderboardModal) {
        setShowLeaderboardModal(false);
        return;
      }
      if (showStormShop) {
        setShowStormShop(false);
        return;
      }
      setShowEscMenu((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    showIntroCutscene,
    activeBanRecord,
    showDevToolsModal,
    showSkinQualityModal,
    showLeaderboardModal,
    showStormShop,
  ]);

  // 1-second schedule ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Always play music throughout the game: chill music normally, crazy epic techno during the live event!
  useEffect(() => {
    const isStormMusic =
      stormState.status === 'active' || stormState.status === 'fullscreen_10s_countdown';
    soundManager.setMusicTrack(isStormMusic ? 'storm' : 'chill');
  }, [stormState.status]);

  // Mandatory Sign-In: Only show the Sign In popup after cloud hydration completes if not signed in
  useEffect(() => {
    if (
      !isInitialCloudHydrating &&
      !showIntroCutscene &&
      !activeBanRecord &&
      !state.cloudAccount &&
      !showAccountModal &&
      !showEscMenu
    ) {
      setShowAccountModal(true);
    }
  }, [
    isInitialCloudHydrating,
    showIntroCutscene,
    activeBanRecord,
    state.cloudAccount,
    showAccountModal,
    showEscMenu,
  ]);

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
        'All-Day Friday 4× Click & CPS Multiplier + Secret Storm Vault unlocked!'
      );
    }

    if (prevStatus === 'active' && currStatus === 'ended') {
      setShowStormShop(false);
      setShowStormRecap(true);
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
        `⚡ STORM WAVE #${currWaveIdx} (${stormState.currentWave?.multiplier}×)!`,
        'Giant Matthew spawned!'
      );
    }
    prevWaveIndexRef.current = currWaveIdx;
  }, [stormState.status, stormState.currentWave]);

  // Step 0: On page load (BEFORE gameplay ticks, offline calculations, or cloud saves run),
  // wait for Firebase Auth & retrieve the most recent cloud save for this player.
  useEffect(() => {
    let cancelled = false;

    const finishHydration = () => {
      if (cancelled) return;
      isHydratingCloudRef.current = false;
      setIsInitialCloudHydrating(false);
    };

    const hydrateProfileFromCloud = async (uid: string, username: string, notifySync = false) => {
      if (cancelled) return;
      isReconcilingCloudRef.current = true;
      try {
        const ban = await checkAccountBanStatus(uid, username, true);
        if (ban) {
          applyLocalBanReset(ban);
          return;
        }

        const merged = await loadAndReconcileCloudSave(uid, username, stateRef.current);
        if (cancelled) return;

        // Calculate offline earnings once using the retrieved cloud save (never stale localStorage)
        if (offlineCheckedForUidRef.current !== uid) {
          offlineCheckedForUidRef.current = uid;
          const nowSec = Math.floor(Date.now() / 1000);
          const { elapsedSeconds, coinsEarned } = calculateOfflineEarnings(
            merged,
            nowSec,
            getActiveSeason().seasonId
          );
          if (elapsedSeconds > 15 && coinsEarned > 0 && merged.coins > 0) {
            setOfflineData({ elapsed: elapsedSeconds, coins: coinsEarned });
          } else {
            setOfflineData(null);
          }
        }

        setState((prev) => {
          const { state: checkedPrev } = performBetaWipeIfDue(prev, Date.now());
          const sameOwner = !checkedPrev.lastOwnerUid || checkedPrev.lastOwnerUid === uid;
          const next: GameState = {
            ...merged,
            unlockedSkins: sameOwner
              ? Array.from(new Set([...checkedPrev.unlockedSkins, ...merged.unlockedSkins]))
              : merged.unlockedSkins,
            lastOwnerUid: uid,
            lastSaveTime: Date.now(),
            cloudAccount: {
              uid,
              username,
              displayUsername: username,
              lastCloudSync: Date.now(),
            },
          };
          saveGame(next, true);
          return next;
        });

        if (notifySync) {
          handleNotify('CLOUD SAVE SYNCED!', 'Loaded newer progress from your other device!');
        }
        refreshMiniLeaderboard();
      } finally {
        isReconcilingCloudRef.current = false;
        finishHydration();
      }
    };

    const unsubscribe = subscribeToAuthChanges(async (profile) => {
      if (!profile) return;
      await hydrateProfileFromCloud(profile.uid, profile.username, false);
    });

    // Ensure initial hydration always resolves even if the player is a guest / signed out
    const waitForInitialAuth = async () => {
      try {
        const { auth } = getFirebaseServices();
        if (auth && typeof auth.authStateReady === 'function') {
          await Promise.race([
            auth.authStateReady(),
            new Promise((resolve) => setTimeout(resolve, 5000)),
          ]);
        }

        if (cancelled) return;

        const { auth: resolvedAuth } = getFirebaseServices();
        const currentUser = resolvedAuth?.currentUser;

        if (currentUser) {
          const fallbackName =
            currentUser.displayName ||
            (currentUser.email ? currentUser.email.split('@')[0] : 'player');
          const uid = currentUser.uid;
          if (!hasCompletedInitialCloudPull(uid) && !isReconcilingCloudRef.current) {
            await hydrateProfileFromCloud(uid, fallbackName, false);
          } else {
            finishHydration();
          }
          return;
        }

        // Not signed into Firebase Auth: check if local guest offline earnings apply
        const curr = stateRef.current;
        if (!curr.cloudAccount) {
          const nowSec = Math.floor(Date.now() / 1000);
          const { elapsedSeconds, coinsEarned } = calculateOfflineEarnings(
            curr,
            nowSec,
            getActiveSeason().seasonId
          );
          if (elapsedSeconds > 15 && coinsEarned > 0 && curr.coins > 0) {
            setOfflineData({ elapsed: elapsedSeconds, coins: coinsEarned });
          }
        }
        finishHydration();
      } catch {
        finishHydration();
      }
    };

    waitForInitialAuth();

    // Register foreign-device conflict handler + tab wake-up sync so switching back to an open tab
    // pulls newer cloud data instead of overwriting it!
    const pullIfAnotherDeviceUpdated = async (forceCheck = false) => {
      const curr = stateRef.current;
      if (
        cancelled ||
        !curr.cloudAccount?.uid ||
        isHydratingCloudRef.current ||
        isReconcilingCloudRef.current
      ) {
        return;
      }
      const now = Date.now();
      if (!forceCheck && now - lastForegroundCheckAtRef.current < 8000) return;
      lastForegroundCheckAtRef.current = now;

      const foreignNewer = await hasForeignDeviceSavedMoreRecently(curr.cloudAccount.uid);
      if (foreignNewer) {
        await hydrateProfileFromCloud(
          curr.cloudAccount.uid,
          curr.cloudAccount.displayUsername,
          true
        );
      }
    };

    registerForeignCloudUpdateHandler((uid) => {
      if (stateRef.current.cloudAccount?.uid === uid) {
        pullIfAnotherDeviceUpdated(true).catch(() => {});
      }
    });

    const onWindowFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        pullIfAnotherDeviceUpdated(false).catch(() => {});
      }
    };
    window.addEventListener('focus', onWindowFocusOrVisible);
    document.addEventListener('visibilitychange', onWindowFocusOrVisible);

    return () => {
      cancelled = true;
      unsubscribe();
      registerForeignCloudUpdateHandler(null);
      window.removeEventListener('focus', onWindowFocusOrVisible);
      document.removeEventListener('visibilitychange', onWindowFocusOrVisible);
    };
  }, []);

  // Fast 10-second Realtime Database Profile + Leaderboard sync while playing, plus keepalive flush on close/background
  useEffect(() => {
    const syncProfileAndLeaderboard = () => {
      if (
        isHydratingCloudRef.current ||
        isReconcilingCloudRef.current ||
        activeBanRecord
      ) {
        return;
      }
      const curr = stateRef.current;
      if (!curr.cloudAccount) return;
      saveStateToCloud(
        curr.cloudAccount.uid,
        curr.cloudAccount.displayUsername,
        curr
      ).catch(() => {});
    };

    const syncInterval = setInterval(syncProfileAndLeaderboard, 10000);

    const flushOnHideOrUnload = () => {
      if (
        isHydratingCloudRef.current ||
        isReconcilingCloudRef.current ||
        activeBanRecord
      ) {
        return;
      }
      const curr = stateRef.current;
      saveGame(curr);
      if (curr.cloudAccount) {
        saveStateToCloudKeepalive(
          curr.cloudAccount.uid,
          curr.cloudAccount.displayUsername,
          curr
        );
      }
    };

    const onVisibilityHide = () => {
      if (document.visibilityState === 'hidden') {
        flushOnHideOrUnload();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityHide);
    window.addEventListener('pagehide', flushOnHideOrUnload);
    window.addEventListener('beforeunload', flushOnHideOrUnload);
    return () => {
      clearInterval(syncInterval);
      document.removeEventListener('visibilitychange', onVisibilityHide);
      window.removeEventListener('pagehide', flushOnHideOrUnload);
      window.removeEventListener('beforeunload', flushOnHideOrUnload);
    };
  }, [activeBanRecord]);

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
          handleNotify('EASTER EGG: MATTHEW RAIN!', 'Raining your unlocked Matthews!');
          buffer = '';
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleClaimOffline = () => {
    if (offlineData && !activeBanRecord) {
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
    enabled: !isInitialCloudHydrating && !activeBanRecord,
  });

  const handleEarnCoins = (amount: number, isClick: boolean, isCrit: boolean) => {
    if (seasonInfo.isDowntime || activeBanRecord) return;

    let unlockedSkinsNow: { id: string; name: string }[] = [];
    let autoClaimedQuestsNow: { title: string; rewardGems: number; rewardCoins: number }[] = [];

    setState((prev) => {
      const nextCombo = isClick ? Math.min(prev.combo + 1, BALANCE.click.comboMax) : prev.combo;
      const baseNext: GameState = {
        ...prev,
        coins: prev.coins + amount,
        lifetimeCoins: prev.lifetimeCoins + amount,
        seasonalScore: prev.seasonalScore + amount,
        clicks: isClick ? prev.clicks + 1 : prev.clicks,
        lifetimeAllSeasonsClicks: isClick
          ? Math.max((prev.lifetimeAllSeasonsClicks || 0) + 1, prev.clicks + 1)
          : prev.lifetimeAllSeasonsClicks,
        criticalClicks: isCrit ? prev.criticalClicks + 1 : prev.criticalClicks,
        combo: nextCombo,
        maxComboReached: Math.max(prev.maxComboReached || 0, nextCombo),
        comboTimer: isClick ? BALANCE.click.comboTimerResetSec : prev.comboTimer,
        lastActiveInputTimestamp: Date.now(),
      };

      const { state: questState, newlyClaimed } = checkAndAutoClaimQuests(baseNext);
      if (newlyClaimed.length > 0) {
        autoClaimedQuestsNow = newlyClaimed.map((q) => ({
          title: q.title,
          rewardGems: q.rewardGems,
          rewardCoins: q.rewardCoins,
        }));
      }

      const cps = calculateCPS(questState, {
        fridayBonusActive: fridayBonus,
        stormWaveMultiplier,
      });
      const unlockCheck = checkAndApplyMilestoneUnlocks(questState, cps);
      if (unlockCheck.newlyUnlocked.length > 0) {
        unlockedSkinsNow = unlockCheck.newlyUnlocked.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        saveGame(unlockCheck.state);
        return unlockCheck.state;
      }

      if (newlyClaimed.length > 0) {
        saveGame(questState);
      }

      return questState;
    });

    if (autoClaimedQuestsNow.length > 0) {
      soundManager.playBuy();
      autoClaimedQuestsNow.forEach((q) => {
        handleNotify(
          '🎯 QUEST AUTO-CLAIMED!',
          `${q.title}: +${q.rewardGems} 💎 & +${formatNumber(q.rewardCoins)} MC!`
        );
      });
    }

    if (unlockedSkinsNow.length > 0) {
      soundManager.playSkinUnlock();
      particleEngine.emitPrestige();
      particleEngine.emitMatthewRain(
        18,
        stateRef.current.unlockedSkins.map((id) => getSkinById(id).image)
      );
      unlockedSkinsNow.forEach((skin) => {
        handleNotify('NEW MATTHEW UNLOCKED!', `${skin.name} equipped!`);
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
    if (!stateRef.current.cloudAccount) {
      setShowAccountModal(true);
    }
    setState((prev) => {
      const next = { ...prev, introCutsceneSeen: true, lastActiveInputTimestamp: Date.now() };
      saveGame(next);
      return next;
    });
  };

  const handleSignOutFromBanScreen = async () => {
    const uid = stateRef.current.cloudAccount?.uid;
    if (uid) clearCloudSaveSignature(uid);
    offlineCheckedForUidRef.current = null;
    await logoutPlayer();
    setActiveBanRecord(null);
    setState((prev) => {
      const next: GameState = { ...prev, cloudAccount: null };
      saveGame(next);
      return next;
    });
    setShowAccountModal(true);
  };

  return (
    <div className="relative w-screen h-screen bg-[#0c0f1d] text-slate-100 flex flex-col lg:flex-row overflow-hidden font-chunky noise-overlay">
      {/* FULL-SCREEN BANNED ACCOUNT LOCK OVERLAY */}
      {activeBanRecord && (
        <BannedScreenModal
          banRecord={activeBanRecord}
          onSignOut={handleSignOutFromBanScreen}
        />
      )}

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

      {/* TOP NOTIFICATION BANNERS (Auto-Claimed Quests, Unlocks, Events) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[95] flex flex-col gap-2 max-w-md w-full pointer-events-none px-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="pointer-events-auto flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/95 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.35)] backdrop-blur-md animate-fade-in"
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
          onOpenSettings={() => setShowEscMenu(true)}
          onOpenAccount={() => setShowAccountModal(true)}
          onOpenLeaderboard={() => setShowLeaderboardModal(true)}
          onOpenStormShop={() => setShowStormShop(true)}
          onOpenDevTools={() => setShowDevToolsModal(true)}
          top3Players={top3Players}
          serverBroadcast={serverBroadcast}
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

      {/* MARSHALLB78 EXCLUSIVE PASSWORD-PROTECTED DEV TOOLS MODAL */}
      <DevToolsModal
        isOpen={showDevToolsModal}
        onClose={() => setShowDevToolsModal(false)}
        state={state}
        onTriggerRain={() => {
          particleEngine.emitMatthewRain(
            45,
            stateRef.current.unlockedSkins.map((id) => getSkinById(id).image)
          );
          soundManager.playSkinUnlock();
        }}
        onNotify={handleNotify}
        onRefreshMiniLeaderboard={refreshMiniLeaderboard}
      />

      {/* WEEKEND SEASON DOWNTIME OVERLAY (Active Saturday 12:00 AM -> Monday 12:00 AM after Friday Live Event) */}
      <SeasonDowntimeModal
        isOpen={!showIntroCutscene && !activeBanRecord && seasonInfo.isDowntime}
        state={state}
        seasonNumber={seasonInfo.seasonNumber}
        downtimeRemainingSeconds={seasonInfo.downtimeRemainingSeconds}
        onOpenLeaderboard={() => setShowLeaderboardModal(true)}
        onOpenSkins={() => setShowSkinQualityModal(true)}
        onOpenEscMenu={() => setShowEscMenu(true)}
      />

      {/* FULL-SCREEN ESC GAME MENU (Hub + Account + Settings) */}
      <EscMenuModal
        isOpen={showEscMenu}
        onClose={() => setShowEscMenu(false)}
        state={state}
        setState={setState}
        onOpenLeaderboard={() => setShowLeaderboardModal(true)}
        onOpenSkins={() => setShowSkinQualityModal(true)}
        onOpenStormShop={() => setShowStormShop(true)}
        isStormActive={isStormActive}
        seasonLabel={seasonLabel}
        onNotify={handleNotify}
      />

      {/* VIEW ALL SKINS MODAL (Only active season's skins — no spoilers!) */}
      <SkinQualityModal
        isOpen={showSkinQualityModal}
        onClose={() => setShowSkinQualityModal(false)}
        equippedSkinId={state.equippedSkin}
        unlockedSkinIds={state.unlockedSkins}
        onEquipSkin={handleEquipSkin}
        currentSeasonId={state.currentSeasonId}
      />

      {/* UNIFIED SIGN IN / CREATE ACCOUNT MODAL */}
      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        state={state}
        setState={setState}
        onNotify={handleNotify}
      />

      {/* WORLDWIDE SEASONAL LEADERBOARD MODAL */}
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

      {/* UPGRADED LOADING SCREEN ANIMATION (Click PLAY to Start) */}
      <IntroCutsceneModal
        isOpen={showIntroCutscene}
        onComplete={handleCompleteIntro}
        isCloudLoading={isInitialCloudHydrating}
      />

      {/* OFFLINE EARNINGS POPUP */}
      {offlineData && !activeBanRecord && (
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
