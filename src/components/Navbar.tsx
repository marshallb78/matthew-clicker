import React from 'react';
import {
  MousePointer,
  ShoppingBag,
  Shirt,
  Trophy,
  Infinity as InfinityIcon,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
} from 'lucide-react';

export type ScreenTab = 'clicker' | 'upgrades' | 'skins' | 'achievements' | 'prestige' | 'settings';

interface NavbarProps {
  currentTab: ScreenTab;
  setTab: (tab: ScreenTab) => void;
  unlockedSkinsCount: number;
  unlockedAchCount: number;
  totalAchCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setTab,
  unlockedSkinsCount,
  unlockedAchCount,
  totalAchCount,
  isMuted,
  onToggleMute,
}) => {
  const navItems: { tab: ScreenTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { tab: 'clicker', label: 'Play', icon: MousePointer },
    { tab: 'upgrades', label: 'Upgrades', icon: ShoppingBag },
    { tab: 'skins', label: 'Skins', icon: Shirt, badge: `${unlockedSkinsCount}/16` },
    { tab: 'achievements', label: 'Badges', icon: Trophy, badge: `${unlockedAchCount}/${totalAchCount}` },
    { tab: 'prestige', label: 'Prestige', icon: InfinityIcon },
    { tab: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* DESKTOP TOP HEADER & NAVIGATION */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40 w-full">
        {/* LOGO */}
        <div
          onClick={() => setTab('clicker')}
          className="flex items-center gap-3 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-200 p-0.5 shadow-md shadow-yellow-500/20 group-hover:scale-105 transition-transform flex items-center justify-center font-black text-slate-950 text-lg">
            M
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white font-display">
              Matthew <span className="text-cyan-400">Clicker</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Indie Edition</span>
          </div>
        </div>

        {/* TABS */}
        <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setTab(item.tab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* AUDIO MUTE TOGGLE */}
        <button
          onClick={onToggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
      </header>

      {/* MOBILE BOTTOM NAVIGATION DOCK */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-slate-800/80 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.tab;
          return (
            <button
              key={item.tab}
              onClick={() => setTab(item.tab)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all relative ${
                isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-transform ${
                  isActive ? 'bg-cyan-500/20 scale-110 shadow-sm shadow-cyan-500/30' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight">{item.label}</span>
              {item.badge && (
                <span className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
