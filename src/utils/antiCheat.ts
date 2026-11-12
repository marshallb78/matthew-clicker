import { getCachedAntiCheatConfig } from '../firebase/moderation';

/**
 * Real-time Clicks-Per-Second (CPS) tracker & Auto-Clicker / Macro Detector.
 * - Live calculates the player's current CPS over a rolling 1,000ms window.
 * - Flags cheating if:
 *   1. Rolling 1-second click rate exceeds the configured maxCps (default > 17 CPS).
 *   2. Robotic / perfect-timing intervals: across 25 consecutive fast clicks (< 170ms apart),
 *      the standard deviation of inter-click intervals is < 2.2ms (machine-timed auto-clicker).
 */

export const MAX_LEGAL_CPS = 17;
const ROBOTIC_SAMPLE_SIZE = 25;
const ROBOTIC_MAX_AVG_INTERVAL_MS = 170; // ~5.9+ CPS sustained
const ROBOTIC_STD_DEV_THRESHOLD_MS = 2.2; // < 2.2ms jitter over 25 clicks is impossible for a human

export interface ClickCheckResult {
  liveCps: number;
  flagged: boolean;
  reason?: string;
}

export class AutoClickerDetector {
  private clickTimestampsMs: number[] = [];
  private recentIntervalsMs: number[] = [];
  private overLimitStrikes = 0;

  public recordClick(nowMs: number = performance.now()): ClickCheckResult {
    const config = getCachedAntiCheatConfig();
    const maxCps = config?.maxCps || MAX_LEGAL_CPS;
    const checkRobotic = config?.detectRoboticTiming !== false;

    // Track inter-click interval for robotic regularity analysis
    if (this.clickTimestampsMs.length > 0) {
      const prevTs = this.clickTimestampsMs[this.clickTimestampsMs.length - 1];
      const delta = nowMs - prevTs;
      // Ignore simultaneous (<8ms) hardware bounce and long pauses (>500ms)
      if (delta >= 8 && delta <= 500) {
        this.recentIntervalsMs.push(delta);
        if (this.recentIntervalsMs.length > ROBOTIC_SAMPLE_SIZE) {
          this.recentIntervalsMs.shift();
        }
      } else if (delta > 1200) {
        this.recentIntervalsMs = [];
      }
    }

    // Prune clicks older than 1000ms
    this.clickTimestampsMs.push(nowMs);
    this.clickTimestampsMs = this.clickTimestampsMs.filter((ts) => nowMs - ts <= 1000);

    const liveCps = this.clickTimestampsMs.length;

    // Rule 1: Clicking above maxCps (> 17 CPS default)
    if (liveCps > maxCps) {
      this.overLimitStrikes += 1;
      // Require 2 consecutive clicks above the threshold inside the 1s window to avoid single lag-frame spikes
      if (this.overLimitStrikes >= 2 || liveCps >= maxCps + 2) {
        return {
          liveCps,
          flagged: true,
          reason: `You have been temporarily banned because of suspicious behavior including cheating or using an auto clicker (${liveCps} CPS detected — max allowed is ${maxCps} CPS).`,
        };
      }
    } else {
      this.overLimitStrikes = 0;
    }

    // Rule 2: Robotic / perfect-timing auto-clicker detection
    if (checkRobotic && this.recentIntervalsMs.length >= ROBOTIC_SAMPLE_SIZE) {
      const sum = this.recentIntervalsMs.reduce((acc, v) => acc + v, 0);
      const mean = sum / this.recentIntervalsMs.length;

      if (mean <= ROBOTIC_MAX_AVG_INTERVAL_MS) {
        const variance =
          this.recentIntervalsMs.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) /
          this.recentIntervalsMs.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev < ROBOTIC_STD_DEV_THRESHOLD_MS) {
          return {
            liveCps,
            flagged: true,
            reason:
              'You have been temporarily banned because of suspicious behavior including robotic perfect-timing clicks (auto clicker / macro detected).',
          };
        }
      }
    }

    return {
      liveCps,
      flagged: false,
    };
  }

  public getCurrentCps(nowMs: number = performance.now()): number {
    this.clickTimestampsMs = this.clickTimestampsMs.filter((ts) => nowMs - ts <= 1000);
    return this.clickTimestampsMs.length;
  }

  public reset(): void {
    this.clickTimestampsMs = [];
    this.recentIntervalsMs = [];
    this.overLimitStrikes = 0;
  }
}
