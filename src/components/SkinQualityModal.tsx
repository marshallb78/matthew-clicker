import React, { useState } from 'react';
import { SKINS, Skin } from '../data/skins';
import { MATTHEW_LANDMARKS } from '../data/landmarks';
import { X, Check, Eye, Sparkles, Layers } from 'lucide-react';

interface SkinQualityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEquipSkin?: (skinId: string) => void;
  equippedSkinId: string;
}

export const SkinQualityModal: React.FC<SkinQualityModalProps> = ({
  isOpen,
  onClose,
  onEquipSkin,
  equippedSkinId,
}) => {
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'contact_sheet'>('grid');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0f1424] border-2 border-amber-400/60 rounded-3xl shadow-2xl overflow-hidden font-chunky">
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 bg-[#151c33] border-b border-slate-750">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg sm:text-xl font-black text-amber-300 uppercase tracking-wide">
                Skin Quality Control & Facial Alignment Inspector
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Calibrated Facial Landmarks: Pupils at (393, 532) & (616, 494) • Tilt: {MATTHEW_LANDMARKS.headTiltAngleDeg.toFixed(2)}°
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                16-Skin Grid
              </button>
              <button
                onClick={() => setViewMode('contact_sheet')}
                className={`px-3 py-1 text-xs font-black rounded-lg transition ${
                  viewMode === 'contact_sheet' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Contact Sheet
              </button>
            </div>

            {/* Landmark Overlay Toggle */}
            {viewMode === 'grid' && (
              <button
                onClick={() => setShowLandmarks((prev) => !prev)}
                className={`px-3 py-1.5 text-xs font-black rounded-xl border transition flex items-center gap-1.5 ${
                  showLandmarks
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Toggle visual crosshairs for pupils, nose bridge, and head tilt"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showLandmarks ? 'Hide Landmarks' : 'Show Landmarks'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:border-amber-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {viewMode === 'contact_sheet' ? (
            <div className="flex flex-col items-center">
              <img
                src="./images/skins_contact_sheet.png"
                alt="16-Skin Quality Control Contact Sheet"
                className="w-full max-w-5xl rounded-2xl border border-slate-750 shadow-2xl object-contain"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {SKINS.map((skin) => {
                const isEquipped = skin.id === equippedSkinId;

                // Color accent based on rarity
                const rarityColors: Record<string, string> = {
                  Common: 'border-slate-700 text-slate-400',
                  Rare: 'border-cyan-500/50 text-cyan-400',
                  Epic: 'border-purple-500/50 text-purple-400',
                  Legendary: 'border-amber-400/60 text-amber-300',
                  Mythic: 'border-red-500/50 text-red-400',
                  Divine: 'border-yellow-300 text-yellow-300',
                };

                return (
                  <div
                    key={skin.id}
                    className={`relative flex flex-col items-center p-3 rounded-2xl bg-[#141b30] border-2 transition hover:border-amber-400/80 shadow-lg ${
                      isEquipped ? 'ring-2 ring-amber-400 border-amber-400' : 'border-slate-800'
                    }`}
                  >
                    {/* CHARACTER THUMBNAIL WITH LANDMARK OVERLAY OPTION */}
                    <div className="relative w-full aspect-square flex items-center justify-center p-2 overflow-hidden bg-slate-950/60 rounded-xl">
                      <img
                        src={skin.image}
                        alt={skin.name}
                        className="w-full h-full object-contain pointer-events-none drop-shadow-md"
                      />

                      {/* MATHEMATICAL LANDMARK CROSSHAIRS OVERLAY */}
                      {showLandmarks && (
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Left Eye pupil: (393/1024 = 38.38%, 532/1024 = 51.95%) */}
                          <div
                            className="absolute w-3 h-3 rounded-full bg-cyan-400/80 border border-white -translate-x-1/2 -translate-y-1/2"
                            style={{ left: '38.38%', top: '51.95%' }}
                            title="Left Pupil (393, 532)"
                          />
                          {/* Right Eye pupil: (616/1024 = 60.16%, 494/1024 = 48.24%) */}
                          <div
                            className="absolute w-3 h-3 rounded-full bg-cyan-400/80 border border-white -translate-x-1/2 -translate-y-1/2"
                            style={{ left: '60.16%', top: '48.24%' }}
                            title="Right Pupil (616, 494)"
                          />
                          {/* Eye axis tilted line */}
                          <div
                            className="absolute h-0.5 bg-yellow-400/70 -translate-y-1/2"
                            style={{
                              left: '38.38%',
                              top: '51.95%',
                              width: '22%',
                              transform: 'rotate(-9.68deg)',
                              transformOrigin: '0 0',
                            }}
                          />
                          {/* Nose bridge */}
                          <div
                            className="absolute w-2 h-2 rounded-full bg-green-400 -translate-x-1/2 -translate-y-1/2"
                            style={{ left: '49.27%', top: '50.10%' }}
                            title="Nose Bridge (504.5, 513)"
                          />
                        </div>
                      )}
                    </div>

                    {/* METADATA */}
                    <div className="w-full mt-2.5 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-100 leading-tight">{skin.name}</h4>
                        <span className={`text-[10px] font-bold ${rarityColors[skin.rarity] || 'text-slate-400'}`}>
                          {skin.rarity}
                        </span>
                      </div>

                      {onEquipSkin && (
                        <button
                          onClick={() => onEquipSkin(skin.id)}
                          className={`px-2.5 py-1 text-[11px] font-black rounded-lg transition ${
                            isEquipped
                              ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

