/**
 * Real-Time Anti-Cheat & Auto-Clicker Detector:
 * 1. High-CPS Detection: Clicking > 17 CPS (18+ manual clicks within a 1-second window).
 * 2. Robotic / Perfect-Timing Detection: Sustained rapid clicking (24+ clicks at >= 6 CPS)
 *    with near-zero human timing jitter (standard deviation < 2.2ms).
 */

export interface AntiCheatCheckResult {
  liveCps: number;
  flagged: boolean;
  reason?: string;
}

export class AutoClickerDetector {
  private clickTimestamps: number[] = [];
  private highCpsStreakCount = 0;

  public recordClick(nowMs: number = performance.now()): AntiCheatCheckResult {
    // Prune clicks older than 3.5 seconds
    this.clickTimestamps = this.clickTimestamps.filter((t) => nowMs - t <= 3500);
    this.clickTimestamps.push(nowMs);

    // 1. Live CPS in the last 1000ms
    const clicksLast1s = this.clickTimestamps.filter((t) => nowMs - t <= 1000).length;

    // Rule 1: Clicking above 17 CPS (>= 18 CPS)
    if (clicksLast1s > 17) {
      this.highCpsStreakCount += 1;
      // Trigger immediately if >= 19 CPS, or if > 17 CPS is sustained for 3+ clicks
      if (clicksLast1s >= 19 || this.highCpsStreakCount >= 3) {
        return {
          liveCps: clicksLast1s,
          flagged: true,
          reason: `You have been temporarily banned because of suspicious behavior including cheating or using an auto clicker (${clicksLast1s} CPS detected — max allowed is 17 CPS).`,
        };
      }
    } else {
      this.highCpsStreakCount = Math.max(0, this.highCpsStreakCount - 1);
    }

    // Rule 2: Robotic / Perfect-Timing Detection over last 24 clicks
    if (this.clickTimestamps.length >= 25) {
      const recent = this.clickTimestamps.slice(-25);
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i] - recent[i - 1]);
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      // Only check robotic timing when clicking fast (average interval <= 165ms, i.e., >= 6 CPS)
      if (avgInterval > 15 && avgInterval <= 165) {
        const variance =
          intervals.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) /
          intervals.length;
        const stdDev = Math.sqrt(variance);

        // Human rapid clicking always has > 4ms jitter; software timers/macros have < 2.2ms jitter
        if (stdDev < 2.2) {
          return {
            liveCps: clicksLast1s,
            flagged: true,
            reason:
              'You have been temporarily banned because of suspicious behavior including cheating, robotic perfect-timing clicks, or using an auto clicker.',
          };
        }
      }
    }

    return {
      liveCps: clicksLast1s,
      flagged: false,
    };
  }

  public getCurrentCps(nowMs: number = performance.now()): number {
    this.clickTimestamps = this.clickTimestamps.filter((t) => nowMs - t <= 1000);
    return this.clickTimestamps.length;
  }

  public reset(): void {
    this.clickTimestamps = [];
    this.highCpsStreakCount = 0;
  }
}

