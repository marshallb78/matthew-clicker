import React, { useState, useRef, useEffect } from 'react';
import { GameState, FloatingNumber } from '../types/game';
import { ALL_SKINS, SKINS, CHARACTER_SKINS, getSkinMilestoneProgress, getSkinById } from '../data/skins';
import { getAscensionMultiplier } from '../data/prestige';
import { formatCoins, formatTime } from '../utils/formatters';
import {
  calculateClickPower,
  calculateCPS,
  calculateGiantMatthewClickReward,
  LiveMultiplierOptions,
} from '../utils/calculations';
import { MatthewStormState } from '../utils/scheduleEngine';
import { MATTHEW_STORM_CONFIG, BETA_RESET_CONFIG } from '../config/gameConfig';
import { BALANCE } from '../data/balance';
import { soundManager } from '../audio/soundManager';
import { particleEngine } from './ParticleCanvas';
import { EnvironmentBackground } from './EnvironmentBackground';
import {
  Volume2,
  VolumeX,
  Settings as SettingsIcon,
  Flame,
  Target,
  Trophy,
  User,
  Zap,
  Gem,
  ShoppingBag,
  AlertTriangle,
  Infinity as InfinityIcon,
} from 'lucide-react';

interface ClickerAreaProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onEarnCoins: (amount: number, isClick: boolean, isCrit: boolean) => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenLeaderboard: () => void;
  onOpenStormShop: () => void;
  onStartStormTest?: () => void;
  onStopStormTest?: () => void;
  onNotify?: (title: string, subtitle: string) => void;
  fridayBonusActive: boolean;
  stormState: MatthewStormState;
  seasonLabel: string;
  seasonRemainingSec: number;
}

const OVERDRIVE_TARGET_SECONDS = 20;

export const ClickerArea: React.FC<ClickerAreaProps> = ({
  state,
  setState,
  onEarnCoins,
  onOpenSettings,
  onOpenAccount,
  onOpenLeaderboard,
  onOpenStormShop,
  onStartStormTest,
  onStopStormTest,
  onNotify,
  fridayBonusActive,
  stormState,
  seasonLabel,
  seasonRemainingSec,
}) => {
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [clickRipples, setClickRipples] = useState<{ id: number; x: number; y: number; isCrit: boolean }[]>([]);
  const [imgSrcOverride, setImgSrcOverride] = useState<string | null>(null);
  const [giantWaveClicks, setGiantWaveClicks] = useState<{ waveIndex: number; clicks: number }>({
    waveIndex: -1,
    clicks: 0,
  });

  // 20-Second Rapid-Clicking Zoom-In Overdrive State
  const [zoomSeconds, setZoomSeconds] = useState<number>(0);
  const recentClickTimestampsRef = useRef<number[]>([]);
  const zoomSecondsRef = useRef<number>(0);
  const stateRef = useRef<GameState>(state);
  stateRef.current = state;

  const characterRef = useRef<HTMLDivElement | null>(null);
  const spriteContainerRef = useRef<HTMLDivElement | null>(null);
  const clickAnimRef = useRef<Animation | null>(null);

  const equippedSkin = ALL_SKINS.find((s) => s.id === state.equippedSkin) || ALL_SKINS[0];
  const ascensionMultiplier = getAscensionMultiplier(state.prestigeShards);

  const isStormActive = stormState.status === 'active';
  const currentWave = stormState.currentWave;
  const stormWaveMultiplier = isStormActive
    ? currentWave
      ? currentWave.multiplier
      : MATTHEW_STORM_CONFIG.baseStormMultiplier
    : 1;

  const liveOpts: LiveMultiplierOptions = {
    fridayBonusActive,
    stormWaveMultiplier,
  };

  const { totalPower, critChance, critMultiplier } = calculateClickPower(state, liveOpts);
  const cps = calculateCPS(state, liveOpts);

  useEffect(() => {
    setImgSrcOverride(null);
    const img = new Image();
    img.src = equippedSkin.image;
  }, [equippedSkin]);

  useEffect(() => {
    if (currentWave && currentWave.waveIndex !== giantWaveClicks.waveIndex) {
      setGiantWaveClicks({ waveIndex: currentWave.waveIndex, clicks: 0 });
    }
  }, [currentWave, giantWaveClicks.waveIndex]);

  useEffect(() => {
    return () => {
      if (clickAnimRef.current) {
        clickAnimRef.current.cancel();
      }
    };
  }, []);

  // 20-Second Rapid-Clicking Zoom-In Overdrive Ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = Date.now();
      recentClickTimestampsRef.current = recentClickTimestampsRef.current.filter(
        (t) => now - t <= 1000
      );
      const clicksPerSec = recentClickTimestampsRef.current.length;

      let nextZoom = zoomSecondsRef.current;
      if (clicksPerSec >= 5) {
        // Clicking really fast -> slowly zoom in over 20 seconds
        nextZoom = Math.min(OVERDRIVE_TARGET_SECONDS, nextZoom + 0.1);
      } else {
        // Decay when not clicking fast
        nextZoom = Math.max(0, nextZoom - 0.25);
      }

      if (nextZoom >= OVERDRIVE_TARGET_SECONDS) {
        // Trigger massive 20-second Zoom Overdrive Bonus scaling with player's money!
        zoomSecondsRef.current = 0;
        setZoomSeconds(0);
        recentClickTimestampsRef.current = [];

        const s = stateRef.current;
        const { totalPower: currPower } = calculateClickPower(s, {
          fridayBonusActive,
          stormWaveMultiplier,
        });
        const currCps = calculateCPS(s, {
          fridayBonusActive,
          stormWaveMultiplier,
        });
        // Balanced overdrive reward: 45 clicks + 20s of CPS (scales with production without exponential bank-doubling)
        const prodBonus = currPower * 45 + currCps * 20;
        const bonusReward = Math.max(
          50,
          Math.floor(Math.max(prodBonus, Math.min(s.coins * 0.05, prodBonus * 2)))
        );

        soundManager.playSkinUnlock();
        particleEngine.emitPrestige();
        particleEngine.emitMatthewRain(
          45,
          s.unlockedSkins.map((id) => getSkinById(id).image)
        );

        setState((prev) => ({
          ...prev,
          coins: prev.coins + bonusReward,
          lifetimeCoins: prev.lifetimeCoins + bonusReward,
          seasonalScore: prev.seasonalScore + bonusReward,
          lastActiveInputTimestamp: Date.now(),
        }));

        if (onNotify) {
          onNotify(
            '🔥 20s HYPER-ZOOM OVERDRIVE BONUS! 🔥',
            `Sustained rapid clicking awarded +${formatCoins(bonusReward)} Matthew Coins!`
          );
        }
      } else if (Math.abs(nextZoom - zoomSecondsRef.current) > 0.001) {
        zoomSecondsRef.current = nextZoom;
        setZoomSeconds(nextZoom);
      }
    }, 100);

    return () => clearInterval(ticker);
  }, [fridayBonusActive, stormWaveMultiplier, onNotify, setState]);

  const triggerRestartableBounce = (isCrit = false) => {
    if (state.settings.reducedMotion) return;
    const el = spriteContainerRef.current;
    if (!el || typeof el.animate !== 'function') return;

    if (clickAnimRef.current) {
      clickAnimRef.current.cancel();
    }

    const tiltDeg = (Math.random() - 0.5) * (isCrit ? 14 : 8);
    clickAnimRef.current = el.animate(
      [
        { transform: `scale(${isCrit ? 0.78 : 0.85}, ${isCrit ? 1.22 : 1.15}) rotate(${tiltDeg.toFixed(1)}deg)` },
        { transform: `scale(${isCrit ? 1.24 : 1.18}, ${isCrit ? 0.82 : 0.86}) rotate(${(-tiltDeg * 0.6).toFixed(1)}deg)` },
        { transform: 'scale(0.95, 1.05) rotate(0deg)' },
        { transform: 'scale(1, 1) rotate(0deg)' },
      ],
      {
        duration: isCrit ? 220 : 175,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    );
  };

  const handleClick = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    recentClickTimestampsRef.current.push(Date.now());

    const rect = characterRef.current?.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent<HTMLDivElement>).clientX;
      clientY = (e as React.MouseEvent<HTMLDivElement>).clientY;
    }

    if ((!clientX || !clientY) && rect) {
      clientX = rect.left + rect.width / 2;
      clientY = rect.top + rect.height / 2;
    }

    const isCrit = Math.random() < critChance;
    const earned = isCrit ? Math.floor(totalPower * critMultiplier) : totalPower;

    if (isCrit) {
      soundManager.playCrit();
    } else {
      soundManager.playClick(state.combo);
    }

    particleEngine.emitClick(clientX, clientY, isCrit, isCrit ? 14 : 9);
    triggerRestartableBounce(isCrit);

    const floatId = Date.now() + Math.random();
    const floatX = clientX + (Math.random() - 0.5) * 60;
    const floatY = clientY - 42;
    const floatValue = isCrit ? `⚡ CRIT! +${formatCoins(earned)}` : `+${formatCoins(earned)}`;

    setFloatingNumbers((prev) => [
      ...prev.slice(-10),
      { id: floatId, x: floatX, y: floatY, value: floatValue, isCrit },
    ]);

    setClickRipples((prev) => [
      ...prev.slice(-5),
      { id: floatId, x: clientX, y: clientY, isCrit },
    ]);

    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((f) => f.id !== floatId));
      setClickRipples((prev) => prev.filter((r) => r.id !== floatId));
    }, 850);

    onEarnCoins(earned, true, isCrit);
  };

  // Clickable Giant Rare Matthew during Storm Waves (Image ONLY, disappears after 7s)
  const handleGiantMatthewClick = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    if (!isStormActive || !currentWave || !currentWave.giantMatthewAvailable) return;

    const maxClicks = MATTHEW_STORM_CONFIG.giantMatthewMaxClicksPerWave;
    if (giantWaveClicks.clicks >= maxClicks) return;

    const reward = calculateGiantMatthewClickReward(state, liveOpts);
    soundManager.playGiantHit();
    particleEngine.emitClick(e.clientX, e.clientY, true, 16);

    setGiantWaveClicks((prev) => ({
      waveIndex: currentWave.waveIndex,
      clicks: prev.clicks + 1,
    }));

    const floatId = Date.now() + Math.random();
    setFloatingNumbers((prev) => [
      ...prev.slice(-10),
      {
        id: floatId,
        x: e.clientX,
        y: e.clientY - 30,
        value: `+${formatCoins(reward)}`,
        isCrit: true,
      },
    ]);
    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((f) => f.id !== floatId));
    }, 850);

    setState((prev) => ({
      ...prev,
      coins: prev.coins + reward,
      lifetimeCoins: prev.lifetimeCoins + reward,
      seasonalScore: prev.seasonalScore + reward,
      giantMatthewsClicked: (prev.giantMatthewsClicked || 0) + 1,
      lastActiveInputTimestamp: Date.now(),
      eventStats: {
        ...prev.eventStats,
        giantMatthewsClicked: prev.eventStats.giantMatthewsClicked + 1,
        giantMatthewRewardsCoins: prev.eventStats.giantMatthewRewardsCoins + reward,
      },
    }));
  };

  const toggleMute = () => {
    const isMuted = soundManager.toggleMute();
    setState((prev) => ({
      ...prev,
      settings: { ...prev.settings, isMuted },
    }));
  };

  // --- MILESTONE PROGRESS TRACKING ---
  const progressionSkins = [...SKINS, ...CHARACTER_SKINS];
  const nextLockedSkin = progressionSkins.find((s) => !state.unlockedSkins.includes(s.id));

  let nextGoalTitle = 'All Main Skins Unlocked';
  let goalPercent = 100;

  if (nextLockedSkin) {
    const skinProgress = getSkinMilestoneProgress(nextLockedSkin, state, cps);
    nextGoalTitle = `${nextLockedSkin.name} (${formatCoins(skinProgress.target)} pts)`;
    goalPercent = skinProgress.percent;
  }

  const activeSpriteUrl = imgSrcOverride || equippedSkin.image;

  const giantClicksRemaining =
    currentWave && currentWave.giantMatthewAvailable
      ? Math.max(0, MATTHEW_STORM_CONFIG.giantMatthewMaxClicksPerWave - giantWaveClicks.clicks)
      : 0;

  const zoomScale = 1 + (zoomSeconds / OVERDRIVE_TARGET_SECONDS) * 0.72;
  const zoomPercent = Math.min(100, Math.floor((zoomSeconds / OVERDRIVE_TARGET_SECONDS) * 100));

  const secondsUntilBetaReset = Math.max(
    0,
    Math.floor((BETA_RESET_CONFIG.resetTimeMs - Date.now()) / 1000)
  );
  const comboPercent = Math.min(
    100,
    Math.floor(((state.combo || 0) / BALANCE.click.comboMax) * 100)
  );
  const comboBonusPct = Math.round((state.combo || 0) * BALANCE.click.comboBonusPerStack * 100);

  return (
    <div className="relative flex-1 flex flex-col items-center justify-between h-full p-2.5 sm:p-4 select-none overflow-hidden">
      {/* 1. ATMOSPHERIC & LIVE STORM BACKGROUND */}
      <EnvironmentBackground
        state={state}
        isStormActive={isStormActive}
        stormWaveActive={Boolean(currentWave)}
      />

      {/* 2. TOP BAR: BETA RESET ANNOUNCEMENT, NAVIGATION, ACCOUNT, LEADERBOARD, GEMS & LIVE BANNERS */}
      <div className="w-full flex flex-col gap-2 z-20">
        {/* TOP BETA RESET ANNOUNCEMENT BANNER */}
        <div className="w-full px-3 py-1.5 rounded-2xl bg-gradient-to-r from-rose-600/95 via-amber-500/95 to-rose-600/95 animate-banner-shimmer border-2 border-yellow-200/80 shadow-[0_0_24px_rgba(244,63,94,0.45)] flex items-center justify-center gap-2 text-center">
          <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0 animate-bounce" />
          <span className="text-[11px] sm:text-xs font-black text-slate-950 uppercase tracking-wide">
            {secondsUntilBetaReset > 0
              ? `BETA ANNOUNCEMENT: Everyone's accounts & progress will be reset at 1:00 AM tomorrow (Monday)! • Reset in ${formatTime(
                  secondsUntilBetaReset
                )}`
              : `MONDAY 1:00 AM BETA RESET ACTIVE: All accounts & progress have been freshly reset for the Click-Power update!`}
          </span>
        </div>
        <div className="w-full flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={toggleMute}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900/85 backdrop-blur-md border-2 border-slate-700/80 hover:border-amber-400/80 flex items-center justify-center text-slate-300 hover:text-white transition shadow-md active:scale-90 cursor-pointer"
              title={state.settings.isMuted ? 'Unmute' : 'Mute'}
            >
              {state.settings.isMuted ? (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              )}
            </button>

            <button
              onClick={onOpenSettings}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900/85 backdrop-blur-md border-2 border-slate-700/80 hover:border-cyan-400/80 flex items-center justify-center text-slate-300 hover:text-white transition shadow-md active:scale-90 cursor-pointer"
              title="Settings & Career Stats"
            >
              <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
            </button>

            <button
              onClick={onOpenAccount}
              className="px-2.5 h-9 sm:h-10 rounded-2xl bg-slate-900/85 backdrop-blur-md border-2 border-slate-700/80 hover:border-emerald-400/80 flex items-center gap-1.5 text-xs font-black text-slate-200 hover:text-white transition shadow-md cursor-pointer"
              title="Sign In / Cloud Account"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span className="max-w-[90px] truncate">
                {state.cloudAccount?.username || 'Sign In'}
              </span>
            </button>

            <button
              onClick={onOpenLeaderboard}
              className="px-2.5 h-9 sm:h-10 rounded-2xl bg-slate-900/85 backdrop-blur-md border-2 border-slate-700/80 hover:border-yellow-400/80 flex items-center gap-1.5 text-xs font-black text-yellow-300 hover:text-white transition shadow-md cursor-pointer"
              title="Worldwide Seasonal Leaderboard"
            >
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            {/* STORM SHOP BUTTON: ONLY SHOWN WHEN LIVE EVENT IS ACTIVE! */}
            {isStormActive && (
              <button
                onClick={onOpenStormShop}
                className="px-3 h-9 sm:h-10 rounded-2xl bg-purple-950/95 backdrop-blur-md border-2 border-fuchsia-400 text-fuchsia-200 hover:bg-purple-900 flex items-center gap-1.5 text-xs font-black transition shadow-[0_0_20px_rgba(217,70,239,0.5)] animate-pulse cursor-pointer"
                title="Secret Matthew Storm Event Shop (Only open during the live event!)"
              >
                <ShoppingBag className="w-4 h-4 text-fuchsia-300" />
                <span>Storm Shop</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border-2 border-fuchsia-500/50 text-xs font-black text-fuchsia-300 shadow-md"
              title="Gems (Earn 3/10m normal active play, 10/10m during Matthew Storm, +5 Daily Login)"
            >
              <Gem className="w-4 h-4 text-fuchsia-400" />
              <span>{state.gems}</span>
              <span className="text-[10px] text-slate-400 uppercase hidden sm:inline">Gems</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border-2 border-purple-500/50 text-xs font-black text-purple-300 shadow-md"
              title="Ascension Multiplier (Multiplies all Click Power & CPS)"
            >
              <InfinityIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Ascension:</span>
              <span className="text-yellow-300">{ascensionMultiplier.toFixed(2)}×</span>
            </div>

            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-slate-900/85 border border-slate-700 text-[11px] font-bold text-slate-300"
              title="30-Day Competitive Season"
            >
              <span className="text-amber-400 font-black">{seasonLabel}</span>
              <span className="text-slate-400">• {formatTime(seasonRemainingSec)}</span>
            </div>
          </div>
        </div>

        {/* SECOND ROW: FRIDAY 2X BONUS, MATTHEW STORM BANNER & DEV TEST TRIGGER */}
        <div className="w-full flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {fridayBonusActive && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-xs shadow-lg border border-emerald-300/50">
                <Zap className="w-3.5 h-3.5" />
                <span>FRIDAY 2× POINTS ACTIVE!</span>
              </div>
            )}

            {state.frenzyTimer > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white font-extrabold text-xs shadow-lg shadow-amber-500/40 animate-pulse">
                <Flame className="w-4 h-4" />
                <span>
                  {state.frenzyMultiplier}X FRENZY ({Math.ceil(state.frenzyTimer)}s)
                </span>
              </div>
            )}

            {(stormState.status === 'pre_countdown' || stormState.status === 'inactive') && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/90 border border-purple-500/60 text-purple-200 text-xs font-black shadow-md">
                <span>⚡ Matthew Storm Live Event:</span>
                <span className="text-amber-300 font-mono">
                  {formatTime(stormState.secondsUntilStart)}
                </span>
              </div>
            )}

            {isStormActive && (
              <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-purple-700 via-fuchsia-600 to-indigo-700 border border-fuchsia-300 text-white text-xs font-black shadow-lg">
                <Zap className="w-4 h-4 text-yellow-300 animate-bounce" />
                <span>
                  MATTHEW STORM LIVE •{' '}
                  {currentWave
                    ? `WAVE #${currentWave.waveIndex}: ${currentWave.multiplier}× MULTIPLIER (${formatTime(
                        currentWave.remainingWaveSeconds
                      )})`
                    : `${MATTHEW_STORM_CONFIG.baseStormMultiplier}× STORM MULTIPLIER ACTIVE`}
                </span>
                <span className="text-yellow-200 font-mono">
                  [{formatTime(stormState.secondsUntilEnd)} left]
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BIG CHUNKY COIN COUNTER + CLICK-POWER-FIRST HUD */}
      <div className="flex flex-col items-center z-20 my-auto sm:my-1 w-full max-w-md">
        <div className="flex items-center gap-2.5 drop-shadow-[0_6px_18px_rgba(251,191,36,0.35)]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-200 border-2 border-white flex items-center justify-center text-slate-950 font-black text-xl sm:text-2xl shadow-[0_0_22px_rgba(251,191,36,0.6)] rotate-[-4deg]">
            M
          </div>
          <span className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-amber-400 tracking-tight font-chunky drop-shadow-[0_4px_0_#78350f]">
            {formatCoins(state.coins)}
          </span>
        </div>

        {/* CLICK POWER PRIMARY PILL + PASSIVE CPS SECONDARY PILL */}
        <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-cyan-500/25 via-sky-500/20 to-amber-500/25 border-2 border-cyan-400/70 text-xs sm:text-sm font-black text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.25)]">
            <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            <span className="text-yellow-300">+{formatCoins(totalPower)}</span>
            <span className="text-cyan-200">per click</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/85 border border-slate-700/90 text-xs font-bold text-slate-300">
            <span className="text-amber-300 font-black">{formatCoins(cps)}</span>
            <span className="text-slate-400">/ sec</span>
          </div>

          {(fridayBonusActive || stormWaveMultiplier > 1) && (
            <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-600/30 border border-fuchsia-400 text-[11px] text-fuchsia-200 font-black">
              {(fridayBonusActive ? 2 : 1) * stormWaveMultiplier}× LIVE BOOST!
            </span>
          )}
        </div>

        {/* LIVE COMBO & CRIT METER BAR */}
        <div className="mt-2 flex flex-col items-center gap-1 bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-800/90 shadow-lg w-full max-w-xs">
          <div className="flex items-center justify-between w-full text-[11px] font-black">
            <span className="flex items-center gap-1 text-cyan-300">
              <Flame
                className={`w-3.5 h-3.5 ${
                  state.combo > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'
                }`}
              />
              <span>
                Combo {state.combo}× (+{comboBonusPct}% Click)
              </span>
            </span>
            <span className="text-amber-300 font-mono">
              {Math.round(critChance * 100)}% Crit ({critMultiplier}×)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-500 transition-all duration-150"
              style={{ width: `${comboPercent}%` }}
            />
          </div>
        </div>

        {/* NEXT SKIN GOAL MILESTONE PROGRESS BAR */}
        <div className="mt-1.5 flex flex-col items-center gap-1 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-800/80 shadow-md max-w-xs w-full">
          <div className="flex items-center justify-between w-full text-[11px] font-black">
            <span className="flex items-center gap-1 text-slate-300 truncate pr-2">
              <Target className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate">Next Skin: {nextGoalTitle}</span>
            </span>
            <span className="text-amber-300 font-mono shrink-0">{goalPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-300 shadow-sm shadow-yellow-400/50"
              style={{ width: `${goalPercent}%` }}
            />
          </div>
        </div>

        {/* 20-SECOND RAPID CLICKING ZOOM OVERDRIVE BAR */}
        {zoomSeconds > 0.3 && (
          <div className="mt-2 flex flex-col items-center gap-1 bg-fuchsia-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border-2 border-fuchsia-400 shadow-[0_0_25px_rgba(217,70,239,0.5)] max-w-xs w-full">
            <div className="flex items-center justify-between w-full text-[11px] font-black text-fuchsia-200">
              <span>🔥 RAPID CLICK ZOOM OVERDRIVE!</span>
              <span className="font-mono text-yellow-300">
                {zoomSeconds.toFixed(1)}s / {OVERDRIVE_TARGET_SECONDS}s
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fuchsia-500 via-pink-400 to-yellow-300 transition-all duration-100"
                style={{ width: `${zoomPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. CENTRAL HERO MATTHEW CHARACTER + SPINNING RAYS & PULSING RINGS + GIANT STORM MATTHEW */}
      <div className="relative flex-1 flex items-center justify-center w-full z-10 py-2">
        <style>{`
          @keyframes clickerBreathPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.045); }
          }
          @keyframes clickerRingPulse {
            0% { transform: translate(-50%, -50%) scale(0.82); opacity: 0.75; }
            70% { transform: translate(-50%, -50%) scale(1.22); opacity: 0.15; }
            100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
          }
          @keyframes clickRippleBurst {
            0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.95; }
            100% { transform: translate(-50%, -50%) scale(2.1); opacity: 0; }
          }
        `}</style>

        <div
          ref={characterRef}
          onMouseDown={handleClick}
          onTouchStart={handleClick}
          className="group relative flex items-center justify-center cursor-pointer select-none transition-transform duration-100 ease-out"
          style={{
            WebkitTapHighlightColor: 'transparent',
            transform: `scale(${zoomScale.toFixed(3)})`,
          }}
        >
          {/* SPINNING SUNBURST LINES BEHIND MATTHEW */}
          {!state.settings.reducedMotion && (
            <>
              <svg
                viewBox="0 0 200 200"
                className="absolute w-72 h-72 sm:w-96 sm:h-96 md:w-[27rem] md:h-[27rem] pointer-events-none animate-spin opacity-65 group-hover:opacity-90 transition-opacity will-change-transform"
                style={{
                  animationDuration:
                    zoomSeconds > 2 ? '3.5s' : state.combo > 5 ? '6s' : '12s',
                }}
              >
                <defs>
                  <radialGradient id="sunburstGrad" cx="50%" cy="50%" r="50%">
                    <stop
                      offset="0%"
                      stopColor={isStormActive ? '#e879f9' : '#facc15'}
                      stopOpacity="0.55"
                    />
                    <stop
                      offset="60%"
                      stopColor={isStormActive ? '#22d3ee' : '#f59e0b'}
                      stopOpacity="0.22"
                    />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </radialGradient>
                </defs>
                {Array.from({ length: 12 }).map((_, idx) => {
                  const angle = idx * 30;
                  return (
                    <polygon
                      key={idx}
                      points="100,100 90,4 110,4"
                      fill="url(#sunburstGrad)"
                      transform={`rotate(${angle} 100 100)`}
                    />
                  );
                })}
              </svg>

              {/* OUTER SPINNING DASHED ENERGY RING */}
              <div
                className={`absolute w-60 h-60 sm:w-80 sm:h-80 md:w-92 md:h-92 rounded-full border-[3px] border-dashed pointer-events-none animate-spin will-change-transform ${
                  isStormActive
                    ? 'border-fuchsia-400/70'
                    : zoomSeconds > 1
                    ? 'border-rose-400/80'
                    : 'border-amber-400/65 group-hover:border-yellow-300'
                }`}
                style={{ animationDuration: zoomSeconds > 2 ? '4s' : '9s' }}
              />

              {/* INNER COUNTER-SPINNING CYAN RING */}
              <div
                className="absolute w-52 h-52 sm:w-68 sm:h-68 md:w-80 md:h-80 rounded-full border-2 border-dotted border-cyan-400/60 pointer-events-none animate-spin will-change-transform"
                style={{
                  animationDuration: zoomSeconds > 2 ? '3s' : '7s',
                  animationDirection: 'reverse',
                }}
              />

              {/* PULSING SHOCKWAVE RINGS */}
              <div
                className={`absolute top-1/2 left-1/2 w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 pointer-events-none ${
                  isStormActive ? 'border-fuchsia-400' : 'border-amber-400'
                }`}
                style={{ animation: 'clickerRingPulse 1.8s ease-out infinite' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-56 h-56 sm:w-72 sm:h-72 rounded-full border-2 border-cyan-400 pointer-events-none"
                style={{ animation: 'clickerRingPulse 1.8s ease-out 0.9s infinite' }}
              />
            </>
          )}

          {/* PULSING PRESSABLE HERO CHARACTER */}
          <div
            style={{
              animation: state.settings.reducedMotion
                ? undefined
                : 'clickerBreathPulse 1.5s ease-in-out infinite',
            }}
          >
            <div
              ref={spriteContainerRef}
              className="relative w-56 h-56 sm:w-76 sm:h-76 md:w-88 md:h-88 max-w-[82vw] max-h-[48vh] flex items-center justify-center group-hover:scale-105 transition-transform duration-150 will-change-transform"
              style={{ transformOrigin: '49.3% 50.1%' }}
            >
              <img
                src={activeSpriteUrl}
                alt={equippedSkin.name}
                draggable={false}
                onError={() => {
                  const fallback =
                    equippedSkin.fallbackImage || './images/skins/classic_matthew.png';
                  if (activeSpriteUrl !== fallback) {
                    setImgSrcOverride(fallback);
                  }
                }}
                className="w-full h-full object-contain pointer-events-none drop-shadow-[0_16px_22px_rgba(0,0,0,0.65)] transition-opacity duration-150"
              />
            </div>
          </div>
        </div>

        {/* CLICKABLE GIANT RARE MATTHEW BOSS TARGET (MUCH BIGGER IMAGE + SPINNING RAYS & PULSING RING — NO BOX OR TEXT) */}
        {isStormActive && currentWave && currentWave.giantMatthewAvailable && giantClicksRemaining > 0 && (
          <div
            onClick={handleGiantMatthewClick}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-52 h-52 sm:w-72 sm:h-72 md:w-80 md:h-80 flex items-center justify-center cursor-pointer select-none group"
            title="Click Giant Matthew before he disappears!"
          >
            {!state.settings.reducedMotion && (
              <>
                <div
                  className="absolute inset-0 rounded-full border-4 border-dashed border-yellow-300/80 animate-spin pointer-events-none will-change-transform"
                  style={{ animationDuration: '4s' }}
                />
                <div
                  className="absolute inset-3 rounded-full border-2 border-fuchsia-400/80 animate-ping pointer-events-none"
                  style={{ animationDuration: '1.2s' }}
                />
              </>
            )}
            <img
              src="./images/skins/classic_matthew.png"
              alt="Giant Matthew"
              draggable={false}
              className="relative z-10 w-full h-full object-contain animate-bounce group-hover:scale-110 group-active:scale-90 transition-transform will-change-transform"
            />
          </div>
        )}
      </div>

      {/* 5. CLICK SHOCKWAVE RIPPLES & FLOATING COIN DAMAGE POPUPS */}
      {clickRipples.map((r) => (
        <div
          key={`ripple-${r.id}`}
          className={`fixed pointer-events-none z-40 w-20 h-20 rounded-full border-2 ${
            r.isCrit ? 'border-cyan-300' : 'border-amber-300'
          }`}
          style={{
            left: r.x,
            top: r.y,
            animation: 'clickRippleBurst 0.55s ease-out forwards',
          }}
        />
      ))}

      {/* 5. FLOATING COIN DAMAGE POPUPS */}
      {floatingNumbers.map((f) => (
        <div
          key={f.id}
          className={`fixed pointer-events-none font-black z-50 select-none font-chunky ${
            f.isCrit
              ? 'animate-float-crit text-cyan-200 text-3xl sm:text-4xl drop-shadow-[0_4px_12px_rgba(34,211,238,0.85)]'
              : 'animate-float-coin text-amber-300 text-2xl sm:text-3xl drop-shadow-[0_2px_0_#78350f]'
          }`}
          style={{
            left: f.x,
            top: f.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {f.value}
        </div>
      ))}
    </div>
  );
};
