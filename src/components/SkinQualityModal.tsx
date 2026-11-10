import React from 'react';
import { PUBLIC_VIEWABLE_SKINS, SEASON_2_PUBLIC_VIEWABLE_SKINS } from '../data/skins';
import { X, Check, Sparkles, Lock, HelpCircle } from 'lucide-react';

interface SkinQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEquipSkin?: (skinId: string) => void;
  equippedSkinId: string;
  unlockedSkinIds?: string[];
  currentSeasonId?: string;
}

export const SkinQualityModal: React.FC<SkinQualityModalProps> = ({
  isOpen,
  onClose,
  onEquipSkin,
  equippedSkinId,
  unlockedSkinIds,
  currentSeasonId,
}) => {
  if (!isOpen) return null;

  // Never spoil next season's skins until that season actually starts!
  const isSeason2OrLater = Boolean(currentSeasonId && currentSeasonId !== 'season_1');
  const displayedSkins = isSeason2OrLater
    ? SEASON_2_PUBLIC_VIEWABLE_SKINS
    : PUBLIC_VIEWABLE_SKINS;

  const unlockedCount = displayedSkins.filter((s) =>
    Array.isArray(unlockedSkinIds) ? unlockedSkinIds.includes(s.id) : false
  ).length;

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen flex flex-col bg-gradient-to-b from-[#0d1226] via-[#090d1b] to-[#050710] animate-fade-in select-none font-chunky text-white overflow-hidden">
      {/* FULL-SCREEN HEADER */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 bg-[#121830]/95 border-b-2 border-amber-400/40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.35)]">
            <Sparkles className="w-6 h-6 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-cyan-300 uppercase tracking-wide">
              Matthew Skins Vault
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[11px] font-black text-amber-300">
                {unlockedCount} / {displayedSkins.length} Unlocked
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 hover:border-amber-400 flex items-center gap-2 text-slate-200 hover:text-white font-black text-xs uppercase transition cursor-pointer shadow-lg"
        >
          <X className="w-5 h-5" />
          <span className="hidden sm:inline">Close</span>
        </button>
      </div>

      {/* FULL-SCREEN IMAGE-FIRST GRID */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {displayedSkins.map((skin) => {
            const isEquipped = skin.id === equippedSkinId;
            const isUnlocked = Array.isArray(unlockedSkinIds)
              ? unlockedSkinIds.includes(skin.id)
              : false;

            const rarityBorderGlow: Record<string, string> = {
              Common: 'border-slate-700/80',
              Rare: 'border-cyan-500/60',
              Epic: 'border-purple-500/60',
              Legendary: 'border-amber-400/70',
              Mythic: 'border-rose-500/70',
              Divine: 'border-yellow-300/90 shadow-[0_0_25px_rgba(253,224,71,0.25)]',
            };

            return (
              <div
                key={skin.id}
                onClick={() => {
                  if (isUnlocked && !isEquipped && onEquipSkin) {
                    onEquipSkin(skin.id);
                  }
                }}
                className={`group relative flex flex-col items-center p-3 rounded-3xl bg-[#10162b] border-2 transition-all duration-200 hover:-translate-y-1 shadow-xl ${
                  isEquipped
                    ? 'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)]'
                    : isUnlocked
                    ? `${rarityBorderGlow[skin.rarity] || 'border-slate-800'} cursor-pointer`
                    : 'border-slate-800/90'
                }`}
              >
                {/* BIG ARTWORK CONTAINER */}
                <div className="relative w-full aspect-square flex items-center justify-center p-3 overflow-hidden bg-slate-950 rounded-2xl border border-slate-800/80">
                  {isUnlocked ? (
                    <img
                      src={skin.image}
                      alt={skin.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          skin.fallbackImage || './images/skins/classic_matthew.png';
                      }}
                      className="w-full h-full object-contain pointer-events-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.8)] transition-transform duration-200 group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-3 text-center select-none rounded-xl"
                      style={{
                        background:
                          'radial-gradient(circle at 50% 40%, rgba(30, 41, 59, 0.95), rgba(2, 6, 23, 1))',
                      }}
                    >
                      <div className="relative w-16 h-16 rounded-2xl bg-slate-900/95 border-2 border-slate-700/90 flex items-center justify-center mb-3 shadow-inner">
                        <HelpCircle className="w-9 h-9 text-slate-600" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5 text-amber-300" />
                        </div>
                      </div>
                      <span className="text-[11px] font-black text-amber-300 bg-slate-900/95 px-2.5 py-1 rounded-xl border border-amber-400/40 shadow">
                        {skin.milestone.description}
                      </span>
                    </div>
                  )}

                  {/* RARITY PILL BADGE */}
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-slate-950/90 border border-slate-700 text-[9px] font-black uppercase tracking-wider text-slate-300">
                    {skin.rarity}
                  </span>
                </div>

                {/* COMPACT VISUAL FOOTER */}
                <div className="w-full mt-2.5 flex items-center justify-between gap-2 px-1">
                  <h4 className="text-xs sm:text-sm font-black text-white truncate">
                    {skin.name}
                  </h4>

                  {isEquipped ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-xl bg-amber-400 text-slate-950 shrink-0 shadow">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  ) : isUnlocked && onEquipSkin ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEquipSkin(skin.id);
                      }}
                      className="px-3 py-1 text-[11px] font-black rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:brightness-110 text-slate-950 transition cursor-pointer shadow-sm shrink-0 btn-chunky"
                    >
                      Equip
                    </button>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
