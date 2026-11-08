import React from 'react';
import { PUBLIC_VIEWABLE_SKINS } from '../data/skins';
import { X, Check, Sparkles, Lock, HelpCircle } from 'lucide-react';

interface SkinQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEquipSkin?: (skinId: string) => void;
  equippedSkinId: string;
  unlockedSkinIds?: string[];
}

export const SkinQualityModal: React.FC<SkinQualityModalProps> = ({
  isOpen,
  onClose,
  onEquipSkin,
  equippedSkinId,
  unlockedSkinIds,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-lg animate-fade-in select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-gradient-to-b from-[#131931] to-[#0b0f1f] border-2 border-amber-400/70 rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.25)] overflow-hidden font-chunky">
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#161e38]/95 border-b border-slate-700/80">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <h2 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-cyan-300 uppercase tracking-wide">
                All Matthew Skins ({PUBLIC_VIEWABLE_SKINS.length})
              </h2>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Unlock skins to reveal their mystery appearance! (Secret Live Event skins only appear in the Storm Shop during Matthew Storm)
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-amber-400 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {PUBLIC_VIEWABLE_SKINS.map((skin) => {
              const isEquipped = skin.id === equippedSkinId;
              const isUnlocked = Array.isArray(unlockedSkinIds)
                ? unlockedSkinIds.includes(skin.id)
                : false;

              const rarityColors: Record<string, string> = {
                Common: 'text-slate-400',
                Rare: 'text-cyan-400',
                Epic: 'text-purple-400',
                Legendary: 'text-amber-300',
                Mythic: 'text-rose-400',
                Divine: 'text-yellow-300',
              };

              const rarityBorderGlow: Record<string, string> = {
                Common: 'border-slate-700/80',
                Rare: 'border-cyan-500/50',
                Epic: 'border-purple-500/50',
                Legendary: 'border-amber-400/60',
                Mythic: 'border-rose-500/60',
                Divine: 'border-yellow-300/80 shadow-[0_0_20px_rgba(253,224,71,0.2)]',
              };

              return (
                <div
                  key={skin.id}
                  className={`relative flex flex-col items-center p-3.5 rounded-2xl bg-[#11172b] border-2 transition-all duration-200 hover:-translate-y-0.5 shadow-lg ${
                    isEquipped
                      ? 'ring-2 ring-amber-400 border-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
                      : isUnlocked
                      ? rarityBorderGlow[skin.rarity] || 'border-slate-800'
                      : 'border-slate-800/90'
                  }`}
                >
                  {/* IMAGE OR 100% OPAQUE MYSTERY LOCKED VAULT (ZERO FAINT IMAGE WHEN LOCKED!) */}
                  <div className="relative w-full aspect-square flex items-center justify-center p-2 overflow-hidden bg-slate-950 rounded-xl border border-slate-800/80">
                    {isUnlocked ? (
                      <img
                        src={skin.image}
                        alt={skin.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            skin.fallbackImage || './images/skins/classic_matthew.png';
                        }}
                        className="w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_16px_rgba(0,0,0,0.75)] transition-transform duration-200 hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center p-3 text-center select-none rounded-lg"
                        style={{
                          background:
                            'radial-gradient(circle at 50% 40%, rgba(30, 41, 59, 0.95), rgba(2, 6, 23, 1))',
                        }}
                      >
                        <div className="relative w-16 h-16 rounded-2xl bg-slate-900/95 border-2 border-slate-700/90 flex items-center justify-center mb-2.5 shadow-inner">
                          <HelpCircle className="w-9 h-9 text-slate-600" />
                          <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500/20 border border-amber-400/60 flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-amber-300" />
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                          Mystery Appearance
                        </span>
                        <span className="text-[10px] font-black text-amber-300 bg-slate-900/95 px-2.5 py-1 rounded-lg border border-amber-400/40 shadow">
                          {skin.milestone.description}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SKIN NAME & RARITY ALWAYS VISIBLE */}
                  <div className="w-full mt-3 flex items-center justify-between gap-1.5">
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-slate-100 leading-tight truncate">
                        {skin.name}
                      </h4>
                      <span
                        className={`text-[10px] font-bold ${
                          rarityColors[skin.rarity] || 'text-slate-400'
                        }`}
                      >
                        {skin.rarity} • {skin.perkDescription}
                      </span>
                    </div>

                    {isEquipped ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Equipped</span>
                      </div>
                    ) : isUnlocked && onEquipSkin ? (
                      <button
                        onClick={() => onEquipSkin(skin.id)}
                        className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-gradient-to-r from-cyan-400 to-sky-400 hover:brightness-110 text-slate-950 transition cursor-pointer shadow-sm shrink-0 btn-chunky"
                      >
                        Equip
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-900 border border-slate-800 text-slate-500 shrink-0">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
