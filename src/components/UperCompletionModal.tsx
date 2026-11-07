import React, { useState } from 'react';
import { Download, Copy, Check, Sparkles, X, Award } from 'lucide-react';

interface UperCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export const UperCompletionModal: React.FC<UperCompletionModalProps> = ({
  isOpen,
  onClose,
  username,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const badgePath = './assets/completion/matthew-clicker-uper-complete.svg';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = badgePath;
    link.download = 'Matthew-Clicker-Uper-Complete.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyProof = async () => {
    try {
      const msg = `Matthew Clicker — I conquered the final realm UPER! ${
        username ? `(Player: ${username})` : ''
      } Send to gt3!`;
      await navigator.clipboard.writeText(msg);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-[#2b1d04] via-[#171104] to-[#0c0902] border-2 border-amber-400 rounded-3xl p-6 shadow-[0_0_60px_rgba(251,191,36,0.45)] text-center font-chunky text-white overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-200 hover:text-white flex items-center justify-center cursor-pointer transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 text-xs font-black uppercase mb-2">
          <Award className="w-4 h-4" />
          <span>FINAL REALM CONQUERED — UPER ASCENSION</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-yellow-300 uppercase tracking-wide drop-shadow">
          You Reached Uper!
        </h2>
        <p className="text-xs sm:text-sm text-amber-100/90 mt-1">
          Save or copy the official <strong className="text-yellow-300">"Matthew Clicker"</strong>{' '}
          completion image below and send it to{' '}
          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black">gt3</span>!
        </p>

        {/* OFFICIAL "MATTHEW CLICKER" COMPLETION IMAGE */}
        <div className="my-4 p-2 rounded-2xl bg-black/60 border-2 border-amber-400/80 shadow-inner">
          <img
            src={badgePath}
            alt="Matthew Clicker — Uper Realm Completed — Send to gt3"
            className="w-full rounded-xl object-contain max-h-64 mx-auto"
          />
        </div>

        <div className="p-3 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200 mb-4">
          📢 <strong>Instruction:</strong> Download or screenshot this{' '}
          <strong className="text-white">"Matthew Clicker"</strong> badge and send it directly to{' '}
          <strong className="text-yellow-300">gt3</strong> to verify your Uper completion!
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
          <button
            onClick={handleDownload}
            className="py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Save "Matthew Clicker" Image</span>
          </button>

          <button
            onClick={handleCopyProof}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-amber-400/50 text-amber-200 font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Message for gt3!' : 'Copy Proof Text for gt3'}</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          <span>Enter Endless Mode (50× Uper Boost Active)</span>
        </button>
      </div>
    </div>
  );
};

