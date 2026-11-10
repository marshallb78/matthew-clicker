/**
 * MATTHEW CLICKER v1.3 — CENTRALIZED GAME & WEEKLY LIVE-OPS CONFIGURATION
 * - 1-Week Seasons (Monday 12:00 AM -> Friday 11:59 PM active play, with All-Day Friday 4x Live Event)
 * - Weekend Downtime (After Friday Live Event ends -> Monday 12:00 AM)
 */

export const GAME_VERSION = '1.3.0';

export const TIMEZONE_CONFIG = {
  /** Authoritative IANA timezone used for Weekly Seasons, Friday Live Event, and Downtime */
  timezone: 'America/New_York',
  utcOffsetHoursStandard: -5, // EST
};

const NOV_8_620PM_MS = Date.parse('2026-11-08T18:20:00-05:00');

export const BETA_RESET_CONFIG = {
  wipeId: 'today_nov_8_2026_620pm_wipe_v1',
  resetIso: '2026-11-08T18:20:00-05:00',
  resetTimeMs: NOV_8_620PM_MS,
  announcementText: '',
};

export const SEASON_CONFIG = {
  /** Weekly cycle duration: 7 days in milliseconds (Monday 00:00 to next Monday 00:00) */
  durationDays: 7,
  durationMs: 7 * 24 * 60 * 60 * 1000,
  /** Active play window within each 7-day cycle: Monday 00:00 through Friday 24:00 (5 days) */
  activePlayDurationMs: 5 * 24 * 60 * 60 * 1000,
  /** Friday Live Event window within each 7-day cycle: Friday 00:00 to Friday 24:00 (Day 4 to Day 5) */
  fridayEventOffsetStartMs: 4 * 24 * 60 * 60 * 1000,
  fridayEventOffsetEndMs: 5 * 24 * 60 * 60 * 1000,
  /**
   * Season 1 anchor start: Monday, November 9, 2026 at 00:00:00 America/New_York
   * Subsequent 1-week seasons roll forward deterministically every Monday at 00:00:00 EST.
   */
  epochStartIso: '2026-11-09T00:00:00-05:00',
  epochStartMs: Date.parse('2026-11-09T00:00:00-05:00'),
  championSkinId: 'champion_matthew',
};

export const FRIDAY_BONUS_CONFIG = {
  enabled: true,
  dayOfWeek: 5, // Friday
  multiplier: 1.0, // Handled by the All-Day Friday 4x Live Event so it never double-stacks
  label: 'FRIDAY 4X LIVE EVENT',
};

export const GEM_ECONOMY_CONFIG = {
  /** 3 gems per 10 minutes (600 seconds) of verified active normal gameplay */
  normalGemsPerInterval: 3,
  normalIntervalSeconds: 600,
  /** 10 gems per 10 minutes (600 seconds) of active participation during Friday Matthew Storm */
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
  eventId: 'matthew_storm_weekly_friday',
  name: 'Friday Matthew Storm',
  /** First weekly Friday event anchor: Friday, November 13, 2026 (All Day: 00:00 to 24:00 EST) */
  startIso: '2026-11-13T00:00:00-05:00',
  endIso: '2026-11-13T23:59:59-05:00',
  startTimeMs: Date.parse('2026-11-13T00:00:00-05:00'),
  endTimeMs: Date.parse('2026-11-14T00:00:00-05:00'),
  /** Show pre-event countdown banner all week leading up to Friday */
  preAnnouncementLeadMs: 5 * 24 * 60 * 60 * 1000,
  /** Fullscreen dramatic lightning countdown: 10 seconds before start */
  fullscreenCountdownSeconds: 10,
  /** Balanced 4x Clicks & Points multiplier all day Friday! */
  baseStormMultiplier: 4,
  /** Wave scheduling rules for All-Day Friday Event (steady 4x multiplier + periodic Giant Matthew spawns) */
  waveIntervalMinSeconds: 35,
  waveIntervalMaxSeconds: 65,
  waveDurationMinSeconds: 30,
  waveDurationMaxSeconds: 45,
  waveMultiplierMin: 4,
  waveMultiplierMax: 4,
  /** Giant Rare Matthew per wave: disappears after 7 seconds */
  giantMatthewDurationSeconds: 7,
  giantMatthewMaxClicksPerWave: 35,
  /** Development-only isolated test mode duration: 10 minutes */
  devTestDurationSeconds: 10 * 60,
  devTestWaveIntervalMinSeconds: 15,
  devTestWaveIntervalMaxSeconds: 25,
  devTestWaveDurationMinSeconds: 25,
  devTestWaveDurationMaxSeconds: 40,
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
  enableEventTestButton: false,
};
