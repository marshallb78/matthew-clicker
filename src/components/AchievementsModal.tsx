import React from 'react';
import { GameState } from '../types/game';
import { ACHIEVEMENTS } from '../data/achievements';
import {
  Trophy,
  CheckCircle2,
  Lock,
  MousePointerClick,
  Zap,
  Flame,
  Gauge,
  Activity,
  Crosshair,
  Target,
  ShoppingBag,
  Layers,
  Building2,
  Coins,
  Gem,
  Sparkle,
  Shirt,
  Palette,
  Crown,
  Sparkles,
  Infinity as InfinityIcon,
} from 'lucide-react';

interface AchievementsModalProps {
  state: GameState;
}

const ICON_MAP: Record<string, React.ElementType> = {
  MousePointerClick,
  Zap,
  Flame,
  Gauge,
  Activity,
  Crosshair,
  Target,
  ShoppingBag,
  Layers,
  Building2,
  Coins,
  Gem,
  Sparkle,
  Shirt,
  Palette,
  Crown,
  Sparkles,
  Infinity: InfinityIcon,
};

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ state }) => {
  const unlockedCount = state.unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const percent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 overflow-y-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 font-display">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Achievements & Badges
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Complete milestones to earn bonus Matthew Coins and Shards</p>
        </div>

        {/* PROGRESS */}
        <div className="flex flex-col items-end min-w-[180px]">
          <div className="flex items-center justify-between w-full text-xs font-bold text-slate-300 mb-1">
            <span>Completed</span>
            <span className="text-yellow-400">
              {unlockedCount} / {totalCount} ({percent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-yellow-500 to-amber-300 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-20">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = state.unlockedAchievements.includes(ach.id);
          const IconComp = ICON_MAP[ach.icon] || Trophy;

          return (
            <div
              key={ach.id}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                isUnlocked
                  ? 'bg-slate-900/90 border-yellow-500/30 shadow-lg shadow-yellow-500/10'
                  : 'bg-slate-950/60 border-slate-850 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3.5 flex-1 pr-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center p-2.5 ${
                    isUnlocked
                      ? 'bg-gradient-to-tr from-yellow-500/20 to-amber-500/20 text-yellow-400 border border-yellow-500/40'
                      : 'bg-slate-800/60 text-slate-600 border border-slate-700/40'
                  }`}
                >
                  <IconComp className="w-full h-full" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{ach.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{ach.description}</p>
                  <span className="inline-block text-[10px] font-bold text-amber-400 mt-1">
                    Reward: {ach.rewardText}
                  </span>
                </div>
              </div>

              {/* STATUS BADGE */}
              <div className="flex items-center">
                {isUnlocked ? (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Unlocked</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-500 border border-slate-700 text-xs font-bold">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

