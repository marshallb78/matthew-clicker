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
  endTimeMs: number;
  remainingMs: number;
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

/**
 * Deterministic 32-bit hash for synchronized cross-client wave generation
 */
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
 * Computes the active 30-day Season deterministically from the authoritative timestamp.
 */
export function getActiveSeason(nowMs: number = Date.now()): ActiveSeasonInfo {
  const elapsedSinceEpoch = Math.max(0, nowMs - SEASON_CONFIG.epochStartMs);
  const seasonIndex = Math.floor(elapsedSinceEpoch / SEASON_CONFIG.durationMs);
  const seasonNumber = seasonIndex + 1;
  const startTimeMs = SEASON_CONFIG.epochStartMs + seasonIndex * SEASON_CONFIG.durationMs;
  const endTimeMs = startTimeMs + SEASON_CONFIG.durationMs;
  const remainingMs = Math.max(0, endTimeMs - nowMs);

  return {
    seasonNumber,
    seasonId: `season_${seasonNumber}`,
    startTimeMs,
    endTimeMs,
    remainingMs,
  };
}

/**
 * Checks whether it is currently Friday (00:00 Friday to 00:00 Saturday) in the configured timezone.
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
 * Generates deterministic, synchronized waves for an event window so all players
 * experience the exact same wave intervals and 6x-15x multipliers.
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

  // First wave starts right away (2s after event start) so players immediately feel the storm multiplier!
  let cursorMs = eventStartMs + 2000;
  let waveIndex = 1;

  while (cursorMs < eventEndMs && waveIndex <= 200) {
    const durRand = seededRandom(`${MATTHEW_STORM_CONFIG.eventId}_dur_${waveIndex}_${isTestMode}`);
    const multRand = seededRandom(`${MATTHEW_STORM_CONFIG.eventId}_mult_${waveIndex}_${isTestMode}`);
    const gapRand = seededRandom(`${MATTHEW_STORM_CONFIG.eventId}_gap_${waveIndex}_${isTestMode}`);

    const durationMs = Math.floor(minDur + durRand * (maxDur - minDur));
    const waveStartMs = cursorMs;
    const waveEndMs = Math.min(eventEndMs, waveStartMs + durationMs);

    const minM = MATTHEW_STORM_CONFIG.waveMultiplierMin;
    const maxM = MATTHEW_STORM_CONFIG.waveMultiplierMax;
    const multiplier = Math.floor(minM + multRand * (maxM - minM + 1));

    // Giant Matthew spawns 2 seconds into the wave and stays strictly for giantMatthewDurationSeconds (7s)
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

    const nextGapMs = Math.floor(minGap + gapRand * (maxGap - minGap));
    cursorMs = waveEndMs + nextGapMs;
    waveIndex++;
  }

  return null;
}

/**
 * Evaluates the complete Matthew Storm event state for either the authoritative production schedule
 * or an active 10-minute isolated developer test session.
 */
export function evaluateMatthewStormState(
  nowMs: number = Date.now(),
  testSessionStartMs: number | null = null
): MatthewStormState {
  // If isolated developer test session is active:
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

  // Production Schedule: Friday, November 13, 2026, 9:45 AM – 3:00 PM EST
  const startMs = MATTHEW_STORM_CONFIG.startTimeMs;
  const endMs = MATTHEW_STORM_CONFIG.endTimeMs;
  const tenSecBeforeStartMs = startMs - MATTHEW_STORM_CONFIG.fullscreenCountdownSeconds * 1000;
  const preAnnounceStartMs = startMs - MATTHEW_STORM_CONFIG.preAnnouncementLeadMs;

  if (nowMs < preAnnounceStartMs) {
    return {
      status: 'inactive',
      isTestMode: false,
      secondsUntilStart: Math.ceil((startMs - nowMs) / 1000),
      secondsUntilEnd: Math.ceil((endMs - nowMs) / 1000),
      shopOpen: false,
      currentWave: null,
    };
  }

  if (nowMs >= preAnnounceStartMs && nowMs < tenSecBeforeStartMs) {
    return {
      status: 'pre_countdown',
      isTestMode: false,
      secondsUntilStart: Math.max(11, Math.ceil((startMs - nowMs) / 1000)),
      secondsUntilEnd: Math.ceil((endMs - nowMs) / 1000),
      shopOpen: false,
      currentWave: null,
    };
  }

  if (nowMs >= tenSecBeforeStartMs && nowMs < startMs) {
    return {
      status: 'fullscreen_10s_countdown',
      isTestMode: false,
      secondsUntilStart: Math.max(0, Math.ceil((startMs - nowMs) / 1000)),
      secondsUntilEnd: Math.ceil((endMs - nowMs) / 1000),
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
