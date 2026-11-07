import React from 'react';

interface UpgradeArtworkProps {
  iconKey: string;
  tier?: number;
  className?: string;
}

const TIER_PALETTES: Record<number, { bg1: string; bg2: string; accent: string; glow: string }> = {
  1: { bg1: '#0f172a', bg2: '#1e293b', accent: '#38bdf8', glow: '#0284c7' },
  2: { bg1: '#1e1b4b', bg2: '#311042', accent: '#e879f9', glow: '#c026d3' },
  3: { bg1: '#062c22', bg2: '#0f3d30', accent: '#34d399', glow: '#059669' },
  4: { bg1: '#2e1065', bg2: '#4c1d95', accent: '#fbbf24', glow: '#d97706' },
  5: { bg1: '#3b0764', bg2: '#701a75', accent: '#22d3ee', glow: '#f43f5e' },
  6: { bg1: '#451a03', bg2: '#78350f', accent: '#fde047', glow: '#f59e0b' },
};

export const UpgradeArtwork: React.FC<UpgradeArtworkProps> = ({
  iconKey,
  tier = 1,
  className = 'w-14 h-14',
}) => {
  const pal = TIER_PALETTES[tier] || TIER_PALETTES[1];
  const gradId = `upg_bg_${iconKey}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${className} select-none shrink-0 rounded-2xl overflow-hidden`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={pal.bg1} />
          <stop offset="100%" stopColor={pal.bg2} />
        </linearGradient>
      </defs>

      {/* Rich Background Tile */}
      <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />
      <circle cx="32" cy="32" r="24" fill={pal.glow} opacity="0.22" />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="12"
        fill="none"
        stroke={pal.accent}
        strokeWidth="2"
        strokeOpacity="0.55"
      />

      {/* Custom Illustrated Game Item Graphic */}
      {renderIllustration(iconKey, pal.accent)}
    </svg>
  );
};

function renderIllustration(key: string, accent: string) {
  switch (key) {
    case 'espresso':
      return (
        <g>
          <path d="M22 18 Q20 12 24 9 M30 18 Q28 11 32 8 M38 18 Q36 12 40 9" stroke="#fde047" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <rect x="16" y="22" width="26" height="24" rx="6" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
          <path d="M42 26 H47 A5 5 0 0 1 47 38 H42" fill="none" stroke="#fef08a" strokeWidth="3" />
          <polygon points="29,26 24,35 30,35 27,43 35,33 29,33" fill="#ffffff" />
        </g>
      );
    case 'gamertub':
      return (
        <g>
          <rect x="18" y="20" width="28" height="30" rx="5" fill="#10b981" stroke="#a7f3d0" strokeWidth="2" />
          <rect x="15" y="13" width="34" height="8" rx="3" fill="#ec4899" stroke="#fbcfe8" strokeWidth="1.5" />
          <circle cx="32" cy="35" r="8" fill="#064e3b" />
          <polygon points="32,28 28,36 33,36 30,42 37,34 32,34" fill="#fde047" />
        </g>
      );
    case 'gloves':
      return (
        <g>
          <rect x="16" y="20" width="14" height="28" rx="7" fill="#06b6d4" stroke="#cffafe" strokeWidth="2" />
          <rect x="34" y="20" width="14" height="28" rx="7" fill="#ec4899" stroke="#fce7f3" strokeWidth="2" />
          <line x1="18" y1="30" x2="28" y2="30" stroke="#fde047" strokeWidth="2.5" />
          <line x1="36" y1="30" x2="46" y2="30" stroke="#fde047" strokeWidth="2.5" />
          <circle cx="23" cy="14" r="3" fill="#fde047" />
          <circle cx="41" cy="14" r="3" fill="#fde047" />
        </g>
      );
    case 'bot':
      return (
        <g>
          <line x1="32" y1="10" x2="32" y2="18" stroke="#38bdf8" strokeWidth="3" />
          <circle cx="32" cy="9" r="4" fill="#f43f5e" />
          <rect x="14" y="18" width="36" height="28" rx="7" fill="#334155" stroke="#38bdf8" strokeWidth="2.5" />
          <circle cx="25" cy="30" r="4.5" fill="#22d3ee" />
          <circle cx="39" cy="30" r="4.5" fill="#22d3ee" />
          <rect x="22" y="39" width="20" height="3.5" rx="1.5" fill="#fde047" />
        </g>
      );
    case 'mouse':
      return (
        <g>
          <rect x="19" y="12" width="26" height="40" rx="13" fill="#8b5cf6" stroke="#ddd6fe" strokeWidth="2.5" />
          <line x1="32" y1="12" x2="32" y2="27" stroke="#ddd6fe" strokeWidth="2" />
          <rect x="30" y="17" width="4" height="8" rx="2" fill="#22d3ee" />
          <circle cx="27" cy="36" r="2.5" fill="#fde047" />
          <circle cx="37" cy="36" r="2.5" fill="#fde047" />
          <circle cx="32" cy="43" r="2.5" fill="#22d3ee" />
        </g>
      );
    case 'keyboard':
      return (
        <g>
          <rect x="9" y="20" width="46" height="26" rx="5" fill="#1e1b4b" stroke="#f472b6" strokeWidth="2.5" />
          <rect x="14" y="25" width="7" height="6" rx="1.5" fill="#22d3ee" />
          <rect x="24" y="25" width="7" height="6" rx="1.5" fill="#f472b6" />
          <rect x="34" y="25" width="7" height="6" rx="1.5" fill="#fde047" />
          <rect x="44" y="25" width="6" height="6" rx="1.5" fill="#a855f7" />
          <rect x="18" y="35" width="28" height="6" rx="2" fill="#fde047" />
        </g>
      );
    case 'mic':
      return (
        <g>
          <rect x="23" y="11" width="18" height="26" rx="9" fill="#f43f5e" stroke="#fecdd3" strokeWidth="2.5" />
          <line x1="23" y1="20" x2="41" y2="20" stroke="#fecdd3" strokeWidth="1.8" />
          <line x1="23" y1="26" x2="41" y2="26" stroke="#fecdd3" strokeWidth="1.8" />
          <path d="M17 28 A15 15 0 0 0 47 28" fill="none" stroke="#38bdf8" strokeWidth="3" />
          <line x1="32" y1="43" x2="32" y2="52" stroke="#38bdf8" strokeWidth="3.5" />
          <line x1="22" y1="52" x2="42" y2="52" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    case 'deck':
      return (
        <g>
          <rect x="11" y="15" width="42" height="34" rx="6" fill="#0f172a" stroke="#e879f9" strokeWidth="2.5" />
          <rect x="16" y="20" width="9" height="9" rx="2" fill="#22d3ee" />
          <rect x="27.5" y="20" width="9" height="9" rx="2" fill="#f59e0b" />
          <rect x="39" y="20" width="9" height="9" rx="2" fill="#ec4899" />
          <rect x="16" y="33" width="9" height="9" rx="2" fill="#a855f7" />
          <rect x="27.5" y="33" width="9" height="9" rx="2" fill="#10b981" />
          <rect x="39" y="33" width="9" height="9" rx="2" fill="#fde047" />
        </g>
      );
    case 'gpu':
      return (
        <g>
          <rect x="9" y="18" width="46" height="28" rx="5" fill="#1e293b" stroke="#22d3ee" strokeWidth="2.5" />
          <circle cx="22" cy="32" r="9" fill="#0f172a" stroke="#ec4899" strokeWidth="2.5" />
          <circle cx="42" cy="32" r="9" fill="#0f172a" stroke="#22d3ee" strokeWidth="2.5" />
          <circle cx="22" cy="32" r="3" fill="#ec4899" />
          <circle cx="42" cy="32" r="3" fill="#22d3ee" />
        </g>
      );
    case 'mods':
      return (
        <g>
          <circle cx="22" cy="25" r="7" fill="#818cf8" />
          <circle cx="42" cy="25" r="7" fill="#f472b6" />
          <circle cx="32" cy="21" r="8" fill="#fde047" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M16 48 C16 36 48 36 48 48" fill="#6366f1" stroke="#c7d2fe" strokeWidth="2" />
        </g>
      );
    case 'phonk':
      return (
        <g>
          <polygon points="32,10 48,22 42,48 22,48 16,22" fill="#ec4899" stroke="#fde047" strokeWidth="2.5" />
          <circle cx="26" cy="28" r="3.5" fill="#0f172a" />
          <circle cx="38" cy="28" r="3.5" fill="#0f172a" />
          <path d="M23 39 L41 39" stroke="#fde047" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    case 'factory':
      return (
        <g>
          <polygon points="10,50 10,28 24,36 24,26 38,36 38,24 54,24 54,50" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
          <rect x="44" y="12" width="7" height="12" fill="#dc2626" />
          <circle cx="24" cy="43" r="4" fill="#fef08a" />
          <circle cx="40" cy="43" r="4" fill="#fef08a" />
        </g>
      );
    case 'dna':
      return (
        <g>
          <path d="M20 12 C44 22 20 42 44 52" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" />
          <path d="M44 12 C20 22 44 42 20 52" fill="none" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
          <line x1="25" y1="20" x2="39" y2="20" stroke="#fde047" strokeWidth="2.5" />
          <line x1="26" y1="32" x2="38" y2="32" stroke="#ec4899" strokeWidth="2.5" />
          <line x1="25" y1="44" x2="39" y2="44" stroke="#fde047" strokeWidth="2.5" />
        </g>
      );
    case 'chip':
      return (
        <g>
          <rect x="18" y="18" width="28" height="28" rx="5" fill="#059669" stroke="#6ee7b7" strokeWidth="2.5" />
          <rect x="25" y="25" width="14" height="14" rx="2" fill="#fde047" />
          <path d="M10 24 H18 M10 32 H18 M10 40 H18 M46 24 H54 M46 32 H54 M46 40 H54 M24 10 V18 M32 10 V18 M40 10 V18 M24 46 V54 M32 46 V54 M40 46 V54" stroke="#6ee7b7" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case 'server':
      return (
        <g>
          <rect x="14" y="12" width="36" height="11" rx="3" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1.5" />
          <rect x="14" y="26.5" width="36" height="11" rx="3" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1.5" />
          <rect x="14" y="41" width="36" height="11" rx="3" fill="#0ea5e9" stroke="#bae6fd" strokeWidth="1.5" />
          <circle cx="20" cy="17.5" r="2.2" fill="#fde047" />
          <circle cx="20" cy="32" r="2.2" fill="#4ade80" />
          <circle cx="20" cy="46.5" r="2.2" fill="#f43f5e" />
        </g>
      );
    case 'reactor':
      return (
        <g>
          <circle cx="32" cy="32" r="19" fill="none" stroke="#22d3ee" strokeWidth="3" strokeDasharray="8 4" />
          <circle cx="32" cy="32" r="11" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
          <circle cx="32" cy="32" r="5" fill="#fde047" />
        </g>
      );
    case 'satellite':
      return (
        <g>
          <rect x="10" y="25" width="13" height="14" rx="2" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1.5" />
          <rect x="41" y="25" width="13" height="14" rx="2" fill="#38bdf8" stroke="#bae6fd" strokeWidth="1.5" />
          <rect x="25" y="20" width="14" height="22" rx="4" fill="#fbbf24" stroke="#fef08a" strokeWidth="2" />
          <line x1="32" y1="42" x2="32" y2="54" stroke="#f43f5e" strokeWidth="3.5" />
        </g>
      );
    case 'mars':
      return (
        <g>
          <circle cx="32" cy="32" r="18" fill="#ef4444" stroke="#fca5a5" strokeWidth="2.5" />
          <circle cx="25" cy="26" r="4" fill="#b91c1c" />
          <circle cx="39" cy="36" r="5" fill="#b91c1c" />
          <path d="M16 24 Q32 14 48 24" fill="none" stroke="#fde047" strokeWidth="2.5" />
        </g>
      );
    case 'asteroid':
      return (
        <g>
          <polygon points="32,11 49,19 52,37 40,51 20,49 12,32 19,16" fill="#f59e0b" stroke="#fef08a" strokeWidth="2.5" />
          <circle cx="27" cy="27" r="4" fill="#d97706" />
          <circle cx="39" cy="36" r="5" fill="#d97706" />
          <polygon points="32,16 34,22 40,22 35,26 37,32 32,28 27,32 29,26 24,22 30,22" fill="#ffffff" />
        </g>
      );
    case 'portal':
      return (
        <g>
          <ellipse cx="32" cy="32" rx="20" ry="12" fill="none" stroke="#e879f9" strokeWidth="3.5" transform="rotate(-25 32 32)" />
          <ellipse cx="32" cy="32" rx="14" ry="20" fill="none" stroke="#22d3ee" strokeWidth="3" transform="rotate(20 32 32)" />
          <circle cx="32" cy="32" r="7" fill="#fde047" />
        </g>
      );
    case 'seraphim':
      return (
        <g>
          <ellipse cx="32" cy="32" rx="21" ry="11" fill="none" stroke="#fde047" strokeWidth="2.5" />
          <ellipse cx="32" cy="32" rx="11" ry="21" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="7" fill="#ffffff" />
          <circle cx="32" cy="32" r="3.5" fill="#dc2626" />
        </g>
      );
    case 'dyson':
      return (
        <g>
          <circle cx="32" cy="32" r="11" fill="#fde047" />
          <circle cx="32" cy="32" r="19" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="5 4" />
          <ellipse cx="32" cy="32" rx="22" ry="8" fill="none" stroke="#ec4899" strokeWidth="2.5" />
        </g>
      );
    case 'magnetar':
      return (
        <g>
          <polygon points="32,8 38,24 55,24 41,34 46,51 32,41 18,51 23,34 9,24 26,24" fill="#22d3ee" stroke="#ffffff" strokeWidth="2" />
          <circle cx="32" cy="32" r="6" fill="#fde047" />
        </g>
      );
    case 'hourglass':
      return (
        <g>
          <polygon points="18,12 46,12 32,32" fill="#f59e0b" stroke="#fef08a" strokeWidth="2" />
          <polygon points="32,32 46,52 18,52" fill="#22d3ee" stroke="#bae6fd" strokeWidth="2" />
          <rect x="15" y="9" width="34" height="4" rx="2" fill="#fde047" />
          <rect x="15" y="51" width="34" height="4" rx="2" fill="#fde047" />
        </g>
      );
    case 'blackhole':
      return (
        <g>
          <ellipse cx="32" cy="32" rx="23" ry="9" fill="#f43f5e" opacity="0.8" transform="rotate(-18 32 32)" />
          <circle cx="32" cy="32" r="11" fill="#020617" stroke="#fde047" strokeWidth="3" />
        </g>
      );
    case 'nebula':
      return (
        <g>
          <circle cx="24" cy="28" r="12" fill="#ec4899" opacity="0.75" />
          <circle cx="38" cy="26" r="11" fill="#8b5cf6" opacity="0.75" />
          <circle cx="32" cy="38" r="12" fill="#06b6d4" opacity="0.75" />
          <circle cx="26" cy="24" r="2.5" fill="#ffffff" />
          <circle cx="39" cy="34" r="2.5" fill="#fde047" />
          <circle cx="31" cy="31" r="3" fill="#ffffff" />
        </g>
      );
    case 'throne':
      return (
        <g>
          <polygon points="12,46 16,20 26,31 32,14 38,31 48,20 52,46" fill="#fde047" stroke="#ffffff" strokeWidth="2" />
          <rect x="12" y="46" width="40" height="6" rx="3" fill="#f59e0b" />
          <circle cx="32" cy="36" r="3.5" fill="#ef4444" />
          <circle cx="22" cy="38" r="2.5" fill="#22d3ee" />
          <circle cx="42" cy="38" r="2.5" fill="#22d3ee" />
        </g>
      );
    case 'infinity_core':
      return (
        <g>
          <path
            d="M20 24 C11 24 11 40 20 40 C26 40 38 24 44 24 C53 24 53 40 44 40 C38 40 26 24 20 24 Z"
            fill="none"
            stroke="#fde047"
            strokeWidth="5"
          />
          <path
            d="M20 24 C11 24 11 40 20 40 C26 40 38 24 44 24 C53 24 53 40 44 40 C38 40 26 24 20 24 Z"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
          />
        </g>
      );
    case 'collider':
      return (
        <g>
          <circle cx="32" cy="32" r="20" fill="none" stroke="#f43f5e" strokeWidth="3" />
          <line x1="10" y1="32" x2="54" y2="32" stroke="#22d3ee" strokeWidth="3" />
          <line x1="32" y1="10" x2="32" y2="54" stroke="#22d3ee" strokeWidth="3" />
          <circle cx="32" cy="32" r="8" fill="#fde047" stroke="#ffffff" strokeWidth="2" />
        </g>
      );
    case 'nirvana':
      return (
        <g>
          <polygon points="32,8 52,46 12,46" fill="none" stroke="#22d3ee" strokeWidth="3" />
          <polygon points="32,54 52,18 12,18" fill="none" stroke="#ec4899" strokeWidth="3" />
          <circle cx="32" cy="32" r="8" fill="#fde047" />
        </g>
      );
    case 'terminal':
      return (
        <g>
          <rect x="10" y="14" width="44" height="36" rx="6" fill="#020617" stroke="#4ade80" strokeWidth="2.5" />
          <polyline points="18,26 26,32 18,38" fill="none" stroke="#4ade80" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="30" y1="38" x2="44" y2="38" stroke="#fde047" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    case 'apex_god':
    default:
      return (
        <g>
          <circle cx="32" cy="32" r="22" fill="none" stroke="#fde047" strokeWidth="2.5" strokeDasharray="4 3" />
          <polygon points="32,9 39,23 55,25 43,36 46,52 32,44 18,52 21,36 9,25 25,23" fill="#fde047" stroke="#ffffff" strokeWidth="2" />
          <circle cx="32" cy="32" r="7" fill="#f43f5e" />
        </g>
      );
  }
}

