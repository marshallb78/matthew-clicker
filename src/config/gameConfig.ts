/**
 * MATTHEW CLICKER v1.1 — CENTRALIZED GAME & LIVE-OPS CONFIGURATION
 * All schedules, timezones, economy rates, seasons, and live-event parameters
 * are centrally configured here so future seasons and events never require core rewrites.
 */

export const GAME_VERSION = '1.2.0';

export const TIMEZONE_CONFIG = {
  /** Authoritative IANA timezone used for Seasons, Friday 2x, and Matthew Storm */
  timezone: 'America/New_York',
  utcOffsetHoursStandard: -5, // EST (November is Standard Time)
};

export const BETA_RESET_CONFIG = {
  /** Unique identifier for the Monday 1:00 AM global beta reset */
  wipeId: 'monday_nov_9_2026_1am_wipe_v1',
  /** Monday, November 9, 2026 at 1:00 AM EST */
  resetIso: '2026-11-09T01:00:00-05:00',
  resetTimeMs: Date.parse('2026-11-09T01:00:00-05:00'),
  announcementText:
    "BETA ANNOUNCEMENT: Everyone's accounts & progress will be reset at 1:00 AM tomorrow (Monday)!",
};

export const SEASON_CONFIG = {
  /** Season duration: exactly 30 days in milliseconds */
  durationDays: 30,
  durationMs: 30 * 24 * 60 * 60 * 1000,
  /**
   * Season 1 anchor start: November 1, 2026 at 00:00:00 America/New_York
   * Subsequent 30-day seasons roll forward deterministically from this epoch.
   */
  epochStartIso: '2026-11-01T00:00:00-05:00',
  epochStartMs: Date.parse('2026-11-01T00:00:00-05:00'),
  championSkinId: 'champion_matthew',
};

export const FRIDAY_BONUS_CONFIG = {
  enabled: true,
  dayOfWeek: 5, // Friday (0 = Sunday, 5 = Friday)
  multiplier: 2.0,
  label: 'FRIDAY 2X CHAOS BONUS',
};

export const GEM_ECONOMY_CONFIG = {
  /** 3 gems per 10 minutes (600 seconds) of verified active normal gameplay */
  normalGemsPerInterval: 3,
  normalIntervalSeconds: 600,
  /** 10 gems per 10 minutes (600 seconds) of active participation during Matthew Storm */
  stormGemsPerInterval: 10,
  stormIntervalSeconds: 600,
  /** Daily login reward */
  dailyLoginGems: 5,
  /** Offline earnings NEVER grant gems */
  offlineGems: 0,
  /** Price of each limited Matthew Storm event skin */
  stormSkinCostGems: 50,
  /** Maximum idle seconds before active-play gem timer pauses (anti-AFK safeguard) */
  activeInputWindowSeconds: 90,
};

export const MATTHEW_STORM_CONFIG = {
  eventId: 'matthew_storm_2026_11_13',
  name: 'Matthew Storm',
  /** Next Friday, November 13, 2026, 1:50 PM to 2:00 PM EST (10-minute high-intensity live event!) */
  startIso: '2026-11-13T13:50:00-05:00',
  endIso: '2026-11-13T14:00:00-05:00',
  startTimeMs: Date.parse('2026-11-13T13:50:00-05:00'),
  endTimeMs: Date.parse('2026-11-13T14:00:00-05:00'),
  /** Show pre-event countdown banner up to 10 days before start */
  preAnnouncementLeadMs: 10 * 24 * 60 * 60 * 1000,
  /** Unskippable fullscreen dramatic lightning countdown: 10 seconds before start */
  fullscreenCountdownSeconds: 10,
  /** Base multiplier always active during Matthew Storm even between mega-waves */
  baseStormMultiplier: 3,
  /** Wave scheduling rules (tuned for the 10-minute 1:50 PM – 2:00 PM window) */
  waveIntervalMinSeconds: 12,
  waveIntervalMaxSeconds: 25,
  waveDurationMinSeconds: 30,
  waveDurationMaxSeconds: 50,
  waveMultiplierMin: 6,
  waveMultiplierMax: 15,
  /** Giant Rare Matthew per wave: disappears after 7 seconds (5-10s window) */
  giantMatthewDurationSeconds: 7,
  giantMatthewMaxClicksPerWave: 35,
  /** Development-only isolated test mode duration: 10 minutes */
  devTestDurationSeconds: 10 * 60,
  devTestWaveIntervalMinSeconds: 12,
  devTestWaveIntervalMaxSeconds: 25,
  devTestWaveDurationMinSeconds: 30,
  devTestWaveDurationMaxSeconds: 50,
};

export const CLICK_SAFETY_CONFIG = {
  /** Maximum human/assisted clicks accepted per second to prevent script abuse */
  maxClicksPerSecond: 30,
  comboMax: 30,
  comboStepBonus: 0.02, // Up to +60% at 30x combo
  comboDecaySeconds: 1.8,
  baseCritChance: 0.06,
  baseCritMultiplier: 3.0,
};

export const DEV_FLAGS = {
  /** Production release: test button disabled */
  enableEventTestButton: false,
};
