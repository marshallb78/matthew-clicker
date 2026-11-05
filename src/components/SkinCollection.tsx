import React, { useState } from 'react';
import { GameState, Skin, SkinRarity } from '../types/game';
import { SKINS } from '../data/skins';
import { soundManager } from '../audio/soundManager';
import { Sparkles, Check, Lock, Shirt, Info } from 'lucide-react';

interface SkinCollectionProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
}

const RARITY_COLORS: Record<SkinRarity, { border: string; bg: string; text: string; badge: string }> = {
  Common: {
    border: 'border-slate-600',
    bg: 'bg-slate-800/40',
    text: 'text-slate-300',
    badge: 'bg-slate-700/60 text-slate-300 border-slate-600',
  },
  Rare: {
    border: 'border-cyan-500/50',
    bg: 'bg-cyan-950/30',
    text: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  Epic: {
    border: 'border-purple-500/50',
    bg: 'bg-purple-950/30',
    text: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  Legendary: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/30',
    text: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  Mythic: {
    border: 'border-pink-500/60',
    bg: 'bg-pink-950/30',
    text: 'text-pink-400',
    badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  Divine: {
    border: 'border-yellow-300/80',
    bg: 'bg-gradient-to-tr from-yellow-900/30 via-purple-900/30 to-cyan-900/30',
    text: 'text-yellow-200',
    badge: 'bg-yellow-400/20 text-yellow-200 border-yellow-300/50 shadow-[0_0_10px_rgba(255,220,0,0.4)]',
  },
};

export const SkinCollection: React.FC<SkinCollectionProps> = ({ state, setState }) => {
  const [selectedSkin, setSelectedSkin] = useState<Skin>(
    SKINS.find((s) => s.id === state.equippedSkin) || SKINS[0]
  );

  const unlockedCount = state.unlockedSkins.length;
  const progressPercent = Math.round((unlockedCount / SKINS.length) * 100);

  const handleEquip = (skin: Skin) => {
    if (!state.unlockedSkins.includes(skin.id)) return;
    setState((prev) => ({
      ...prev,
      equippedSkin: skin.id,
    }));
    soundManager.playBuy();
  };

  const isSelectedUnlocked = state.unlockedSkins.includes(selectedSkin.id);
  const isSelectedEquipped = state.equippedSkin === selectedSkin.id;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-4 overflow-y-auto">
      {/* HEADER & PROGRESS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-100 flex items-center gap-2 font-display">
            <Shirt className="w-6 h-6 text-purple-400" />
            Matthew's Wardrobe
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Collect all 16 unique skins to unleash maximum coin power</p>
        </div>

        {/* PROGRESS DISPLAY */}
        <div className="flex flex-col items-end min-w-[180px]">
          <div className="flex items-center justify-between w-full text-xs font-bold text-slate-300 mb-1">
            <span>Collection</span>
            <span className="text-purple-400">
              {unlockedCount} / {SKINS.length} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT: PREVIEW & GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-20">
        {/* LEFT COLUMN: ACTIVE PREVIEW CARD */}
        <div className="lg:col-span-1 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 flex flex-col items-center text-center shadow-xl backdrop-blur-md">
          {/* SKIN IMAGE PREVIEW */}
          <div className="relative w-48 h-48 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-center p-3 mb-4 overflow-hidden group">
            <div
              className={`absolute inset-0 opacity-20 blur-xl ${
                RARITY_COLORS[selectedSkin.rarity].bg
              }`}
            />
            {isSelectedUnlocked ? (
              <img
                src={selectedSkin.image}
                alt={selectedSkin.name}
                className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
                <Lock className="w-12 h-12" />
                <span className="text-xs font-bold">LOCKED</span>
              </div>
            )}
          </div>

          {/* NAME & RARITY BADGE */}
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-extrabold text-lg text-slate-100 font-display">{selectedSkin.name}</h3>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                RARITY_COLORS[selectedSkin.rarity].badge
              }`}
            >
              {selectedSkin.rarity}
            </span>
          </div>

          <p className="text-xs text-slate-400 mb-3">{selectedSkin.description}</p>

          {/* PERK BOX */}
          <div className="w-full p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-4 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Skin Ability</span>
            </div>
            <p className="text-xs font-semibold text-slate-200">{selectedSkin.perkDescription}</p>
          </div>

          {/* UNLOCK CRITERIA IF LOCKED */}
          {!isSelectedUnlocked && (
            <div className="w-full p-2.5 rounded-xl bg-red-950/30 border border-red-500/30 text-left mb-4">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-400 mb-0.5">
                <Info className="w-3.5 h-3.5" />
                <span>Unlock Requirement</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{selectedSkin.unlockRequirementText}</p>
            </div>
          )}

          {/* EQUIP BUTTON */}
          {isSelectedUnlocked && (
            <button
              onClick={() => handleEquip(selectedSkin)}
              disabled={isSelectedEquipped}
              className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                isSelectedEquipped
                  ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white shadow-lg shadow-cyan-500/25 cursor-pointer active:scale-95'
              }`}
            >
              {isSelectedEquipped ? (
                <>
                  <Check className="w-4 h-4 text-green-400" />
                  Currently Equipped
                </>
              ) : (
                'Equip Skin'
              )}
            </button>
          )}
        </div>

        {/* RIGHT COLUMN: 4x4 GRID OF ALL 16 SKINS */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SKINS.map((skin) => {
            const isUnlocked = state.unlockedSkins.includes(skin.id);
            const isEquipped = state.equippedSkin === skin.id;
            const isSelected = selectedSkin.id === skin.id;
            const colors = RARITY_COLORS[skin.rarity];

            return (
              <div
                key={skin.id}
                onClick={() => setSelectedSkin(skin)}
                className={`relative flex flex-col items-center p-3 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 bg-slate-800/90 shadow-lg scale-[1.02]'
                    : 'hover:scale-[1.01] hover:bg-slate-800/50'
                } ${isUnlocked ? colors.bg + ' ' + colors.border : 'bg-slate-950/60 border-slate-800/80 opacity-60'}`}
              >
                {/* EQUIPPED RIBBON */}
                {isEquipped && (
                  <div className="absolute top-2 right-2 bg-green-500 text-slate-950 rounded-full p-0.5 shadow-md">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                )}

                {/* THUMBNAIL */}
                <div className="w-20 h-20 relative flex items-center justify-center mb-2">
                  {isUnlocked ? (
                    <img
                      src={skin.image}
                      alt={skin.name}
                      className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
                    />
                  ) : (
                    <Lock className="w-8 h-8 text-slate-600" />
                  )}
                </div>

                {/* NAME & RARITY */}
                <span className="font-bold text-xs text-slate-100 text-center line-clamp-1">{skin.name}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full mt-1 border ${colors.badge}`}>
                  {skin.rarity}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
