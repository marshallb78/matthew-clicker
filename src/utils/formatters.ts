/**
 * Compact number formatting for clicker economy.
 */

const SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
  'UDc',
  'DDc',
  'TDc',
  'QaDc',
  'QiDc',
  'SxDc',
  'SpDc',
  'ODc',
  'NDc',
  'Vg',
  'Infinity',
];

export function formatCoins(val: number, precision: number = 1): string {
  if (isNaN(val) || val <= 0) return '0';
  if (!isFinite(val)) return '∞';

  if (val < 1000) {
    return val >= 10 ? Math.floor(val).toLocaleString() : (Math.round(val * 10) / 10).toString();
  }

  const tier = Math.floor(Math.log10(val) / 3);
  if (tier >= SUFFIXES.length) return '∞';

  const scale = Math.pow(10, tier * 3);
  const scaled = val / scale;

  return scaled.toFixed(precision) + SUFFIXES[tier];
}

export function formatNumber(val: number): string {
  return Math.floor(val).toLocaleString();
}

export function formatTime(seconds: number): string {
  const safeSec = Math.max(0, Math.floor(seconds));
  if (safeSec < 60) return `${safeSec}s`;
  const m = Math.floor(safeSec / 60);
  const s = safeSec % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  if (h < 24) return `${h}h ${remM}m`;
  const d = Math.floor(h / 24);
  const remH = h % 24;
  return `${d}d ${remH}h ${remM}m`;
}
