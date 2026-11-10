import {
  SEASON_CONFIG,
  FRIDAY_BONUS_CONFIG,
  MATTHEW_STORM_CONFIG,
  TIMEZONE_CONFIG,
} from '../config/gameConfig';

export interface ActiveSeasonInfo {
  seasonNumber: number;
  seasonId: string;
  startTimeMs: number;
  /** End of active gameplay on Friday 11:59:59 PM (when Weekend Downtime begins) */
  endTimeMs: number;
  /** Monday 12:00 AM when Downtime ends and the next weekly Season launches */
  nextSeasonStartMs: number;
  remainingMs: number;
  isDowntime: boolean;
  downtimeRemainingSeconds: number;
}

export interface StormWaveInfo {
  waveIndex: number;
  isActive: boolean;
  waveStartMs: number;
  waveEndMs: number;
  remainingWaveSeconds: number;
  multiplier: number;
  giantMatthewAvailable: boolean;
  giantMatthewWindowEndMs: number;
}

export interface MatthewStormState {
  status: 'inactive' | 'pre_countdown' | 'fullscreen_10s_countdown' | 'active' | 'ended';
  isTestMode: boolean;
  secondsUntilStart: number;
  secondsUntilEnd: number;
  shopOpen: boolean;
  currentWave: StormWaveInfo | null;
}

function seededRandom(seedStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += h << 13;
  h ^= h >>> 7;
  h += h << 3;
  h ^= h >>> 17;
  h += h << 5;
  return (h >>> 0) / 4294967296;
}

/**
 * Computes the active 1-Week Season deterministically from the authoritative Monday 00:00 EST anchor.
 * - Monday 00:00 -> Friday 24:00 (5 days): Active Season Gameplay (with All-Day Friday Live Event on Day 5).
 * - Saturday 00:00 -> Monday 00:00 (2 days): Weekend Downtime (after Friday Live Event ends until Monday).
 */
export function getActiveSeason(nowMs: number = Date.now()): ActiveSeasonInfo {
  const elapsedSinceEpoch = Math.max(0, nowMs - SEASON_CONFIG.epochStartMs);
  const seasonIndex = Math.floor(elapsedSinceEpoch / SEASON_CONFIG.durationMs);
  const seasonNumber = seasonIndex + 1;
  const startTimeMs = SEASON_CONFIG.epochStartMs + seasonIndex * SEASON_CONFIG.durationMs;
  const activePlayEndMs = startTimeMs + SEASON_CONFIG.activePlayDurationMs;
  const nextSeasonStartMs = startTimeMs + SEASON_CONFIG.durationMs;

  const isDowntime = nowMs >= activePlayEndMs && nowMs < nextSeasonStartMs;
  const remainingMs = Math.max(0, activePlayEndMs - nowMs);
  const downtimeRemainingSeconds = isDowntime
    ? Math.max(0, Math.ceil((nextSeasonStartMs - nowMs) / 1000))
    : 0;

  return {
    seasonNumber,
    seasonId: `season_${seasonNumber}`,
    startTimeMs,
    endTimeMs: activePlayEndMs,
    nextSeasonStartMs,
    remainingMs,
    isDowntime,
    downtimeRemainingSeconds,
  };
}

/**
 * Checks whether it is currently Friday (00:00 Friday to 00:00 Saturday) in America/New_York.
 */
export function isFridayBonusActive(nowMs: number = Date.now()): boolean {
  if (!FRIDAY_BONUS_CONFIG.enabled) return false;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE_CONFIG.timezone,
      weekday: 'short',
    });
    const weekday = formatter.format(new Date(nowMs));
    return weekday === 'Fri';
  } catch {
    const shifted = new Date(nowMs + TIMEZONE_CONFIG.utcOffsetHoursStandard * 3600 * 1000);
    return shifted.getUTCDay() === FRIDAY_BONUS_CONFIG.dayOfWeek;
  }
}

/**
 * Returns the current date string (YYYY-MM-DD) in the configured authoritative timezone.
 */
export function getAuthoritativeDateString(nowMs: number = Date.now()): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE_CONFIG.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(nowMs));
    const y = parts.find((p) => p.type === 'year')?.value || '2026';
    const m = parts.find((p) => p.type === 'month')?.value || '11';
    const d = parts.find((p) => p.type === 'day')?.value || '06';
    return `${y}-${m}-${d}`;
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
}

/**
 * Generates deterministic, synchronized waves across the All-Day Friday Live Event window
 * (24 hours = 86,400 seconds) with a steady 4x multiplier and periodic Giant Matthew spawns.
 */
export function getSynchronizedWaveAtTime(
  nowMs: number,
  eventStartMs: number,
  eventEndMs: number,
  isTestMode = false
): StormWaveInfo | null {
  if (nowMs < eventStartMs || nowMs >= eventEndMs) {
    return null;
  }

  const minGap = isTestMode
    ? MATTHEW_STORM_CONFIG.devTestWaveIntervalMinSeconds * 1000
    : MATTHEW_STORM_CONFIG.waveIntervalMinSeconds * 1000;
  const maxGap = isTestMode
    ? MATTHEW_STORM_CONFIG.devTestWaveIntervalMaxSeconds * 1000
    : MATTHEW_STORM_CONFIG.waveIntervalMaxSeconds * 1000;

  const minDur = isTestMode
    ? MATTHEW_STORM_CONFIG.devTestWaveDurationMinSeconds * 1000
    : MATTHEW_STORM_CONFIG.waveDurationMinSeconds * 1000;
  const maxDur = isTestMode
    ? MATTHEW_STORM_CONFIG.devTestWaveDurationMaxSeconds * 1000
    : MATTHEW_STORM_CONFIG.waveDurationMaxSeconds * 1000;

  // Use a deterministic 90-second slot index so an all-day 24-hour event calculates in O(1) time!
  const elapsedMs = nowMs - eventStartMs;
  const slotLengthMs = Math.max(40000, Math.floor((minGap + maxGap + minDur + maxDur) / 2));
  const waveIndex = Math.floor(elapsedMs / slotLengthMs) + 1;
  const slotStartMs = eventStartMs + (waveIndex - 1) * slotLengthMs;

  const durRand = seededRandom(`${MATTHEW_STORM_CONFIG.eventId}_dur_${waveIndex}_${isTestMode}`);
  const multRand = seededRandom(`${MATTHEW_STORM_CONFIG.eventId}_mult_${waveIndex}_${isTestMode}`);

  const durationMs = Math.floor(minDur + durRand * (maxDur - minDur));
  const waveStartMs = slotStartMs + 2000;
  const waveEndMs = Math.min(eventEndMs, waveStartMs + durationMs);

  const minM = MATTHEW_STORM_CONFIG.waveMultiplierMin;
  const maxM = MATTHEW_STORM_CONFIG.waveMultiplierMax;
  const multiplier = Math.floor(minM + multRand * (maxM - minM + 1));

  const giantStartMs = waveStartMs + 2000;
  const giantEndMs = Math.min(
    waveEndMs,
    giantStartMs + MATTHEW_STORM_CONFIG.giantMatthewDurationSeconds * 1000
  );

  if (nowMs >= waveStartMs && nowMs < waveEndMs) {
    return {
      waveIndex,
      isActive: true,
      waveStartMs,
      waveEndMs,
      remainingWaveSeconds: Math.max(0, Math.ceil((waveEndMs - nowMs) / 1000)),
      multiplier,
      giantMatthewAvailable: nowMs >= giantStartMs && nowMs < giantEndMs,
      giantMatthewWindowEndMs: giantEndMs,
    };
  }

  return null;
}

/**
 * Evaluates the recurring Weekly Friday Matthew Storm event state.
 * Every week, the event runs ALL DAY FRIDAY (00:00 to 24:00 EST) with a 4x multiplier,
 * and once it ends at Friday 24:00, Weekend Season Downtime begins until Monday 00:00!
 */
export function evaluateMatthewStormState(
  nowMs: number = Date.now(),
  testSessionStartMs: number | null = null
): MatthewStormState {
  if (testSessionStartMs !== null) {
    const countdownDurationMs = MATTHEW_STORM_CONFIG.fullscreenCountdownSeconds * 1000;
    const liveStartMs = testSessionStartMs + countdownDurationMs;
    const liveEndMs = liveStartMs + MATTHEW_STORM_CONFIG.devTestDurationSeconds * 1000;

    if (nowMs < liveStartMs) {
      return {
        status: 'fullscreen_10s_countdown',
        isTestMode: true,
        secondsUntilStart: Math.max(0, Math.ceil((liveStartMs - nowMs) / 1000)),
        secondsUntilEnd: Math.ceil((liveEndMs - nowMs) / 1000),
        shopOpen: false,
        currentWave: null,
      };
    }

    if (nowMs >= liveStartMs && nowMs < liveEndMs) {
      return {
        status: 'active',
        isTestMode: true,
        secondsUntilStart: 0,
        secondsUntilEnd: Math.max(0, Math.ceil((liveEndMs - nowMs) / 1000)),
        shopOpen: true,
        currentWave: getSynchronizedWaveAtTime(nowMs, liveStartMs, liveEndMs, true),
      };
    }

    return {
      status: 'ended',
      isTestMode: true,
      secondsUntilStart: 0,
      secondsUntilEnd: 0,
      shopOpen: false,
      currentWave: null,
    };
  }

  // Compute the current week's Friday 00:00 -> 24:00 window relative to the weekly Season anchor
  const season = getActiveSeason(nowMs);
  const startMs = season.startTimeMs + SEASON_CONFIG.fridayEventOffsetStartMs;
  const endMs = season.startTimeMs + SEASON_CONFIG.fridayEventOffsetEndMs;
  const tenSecBeforeStartMs = startMs - MATTHEW_STORM_CONFIG.fullscreenCountdownSeconds * 1000;

  if (nowMs < tenSecBeforeStartMs) {
    return {
      status: 'pre_countdown',
      isTestMode: false,
      secondsUntilStart: Math.max(0, Math.ceil((startMs - nowMs) / 1000)),
      secondsUntilEnd: Math.max(0, Math.ceil((endMs - nowMs) / 1000)),
      shopOpen: false,
      currentWave: null,
    };
  }

  if (nowMs >= tenSecBeforeStartMs && nowMs < startMs) {
    return {
      status: 'fullscreen_10s_countdown',
      isTestMode: false,
      secondsUntilStart: Math.max(0, Math.ceil((startMs - nowMs) / 1000)),
      secondsUntilEnd: Math.max(0, Math.ceil((endMs - nowMs) / 1000)),
      shopOpen: false,
      currentWave: null,
    };
  }

  if (nowMs >= startMs && nowMs < endMs) {
    return {
      status: 'active',
      isTestMode: false,
      secondsUntilStart: 0,
      secondsUntilEnd: Math.max(0, Math.ceil((endMs - nowMs) / 1000)),
      shopOpen: true,
      currentWave: getSynchronizedWaveAtTime(nowMs, startMs, endMs, false),
    };
  }

  return {
    status: 'ended',
    isTestMode: false,
    secondsUntilStart: 0,
    secondsUntilEnd: 0,
    shopOpen: false,
    currentWave: null,
  };
}
