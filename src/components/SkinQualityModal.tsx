import React from 'react';
import { PUBLIC_VIEWABLE_SKINS } from '../data/skins';
import { X, Check, Sparkles, Lock } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0f1424] border-2 border-amber-400/60 rounded-3xl shadow-2xl overflow-hidden font-chunky">
        {/* HEADER (No "Show Landmarks" button, secret storm skins hidden) */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#151c33] border-b border-slate-750">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black text-amber-300 uppercase tracking-wide">
                All Matthew Skins ({PUBLIC_VIEWABLE_SKINS.length})
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Earn points to unlock permanent collectible Matthews! (Secret Live Event skins can only be viewed in the Storm Shop during Matthew Storm)
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
                Mythic: 'text-red-400',
                Divine: 'text-yellow-300',
              };

              return (
                <div
                  key={skin.id}
                  className={`relative flex flex-col items-center p-3 rounded-2xl bg-[#141b30] border-2 transition hover:border-amber-400/80 shadow-lg ${
                    isEquipped ? 'ring-2 ring-amber-400 border-amber-400' : 'border-slate-800'
                  }`}
                >
                  <div className="relative w-full aspect-square flex items-center justify-center p-2 overflow-hidden bg-slate-950/60 rounded-xl">
                    <img
                      src={skin.image}
                      alt={skin.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          skin.fallbackImage || './images/skins/classic_matthew.png';
                      }}
                      className={`w-full h-full object-contain pointer-events-none drop-shadow-md ${
                        !isUnlocked ? 'filter grayscale brightness-50' : ''
                      }`}
                    />

                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-2 text-center">
                        <Lock className="w-6 h-6 text-slate-300 mb-1" />
                        <span className="text-[10px] font-black text-amber-300 bg-slate-950/90 px-2 py-0.5 rounded-lg border border-amber-400/40">
                          {skin.milestone.description}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="w-full mt-2.5 flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-100 leading-tight truncate">
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
                      <div className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black rounded-lg bg-green-500/20 text-green-300 border border-green-500/40 shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Equipped</span>
                      </div>
                    ) : isUnlocked && onEquipSkin ? (
                      <button
                        onClick={() => onEquipSkin(skin.id)}
                        className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer shadow-sm shrink-0"
                      >
                        Equip
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-900 border border-slate-750 text-slate-500 shrink-0">
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
