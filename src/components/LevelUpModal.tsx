import React from 'react';
import { TreeLevelConfig } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';
import { playClickSound } from '../lib/sound';

interface LevelUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  newLevelConfig: TreeLevelConfig;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
  isOpen,
  onClose,
  newLevelConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-fade-in overflow-hidden">
      {/* Light Burst & Flash Effects Layer (Zero-lag GPU Accelerated) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* 1. Instant Brilliant White & Golden Flash Burst */}
        <div className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,1)_0%,rgba(254,240,138,0.85)_25%,rgba(52,211,153,0.4)_55%,transparent_75%)] animate-light-flash will-change-transform" />

        {/* 2. Rotating Radiant Sunburst Light Rays */}
        <div className="absolute w-[450px] h-[450px] sm:w-[650px] sm:h-[650px] opacity-75 animate-ray-rotate will-change-transform">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <radialGradient id="rayGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FDE047" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#34D399" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
              <polygon
                key={deg}
                points="100,100 92,0 108,0"
                fill="url(#rayGrad)"
                transform={`rotate(${deg} 100 100)`}
              />
            ))}
          </svg>
        </div>

        {/* 3. Expanding Light Shockwave Rings */}
        <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border-4 border-amber-300/80 animate-light-ring-1 will-change-transform shadow-[0_0_50px_rgba(251,191,36,0.8)]" />
        <div className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border-2 border-emerald-300/70 animate-light-ring-2 will-change-transform shadow-[0_0_40px_rgba(52,211,153,0.7)]" />
      </div>

      {/* Main Modal Card */}
      <div className="w-full max-w-sm bg-white/95 backdrop-blur-lg border-2 border-amber-300 rounded-3xl p-6 text-center text-slate-800 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.35)] relative overflow-hidden z-10">
        {/* Soft internal amber spotlight */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-56 bg-gradient-to-b from-amber-200/60 via-emerald-100/30 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Animated Badge */}
        <div className="text-6xl my-2 animate-badge-pop filter drop-shadow-md">
          {newLevelConfig.badge}
        </div>

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-100 to-emerald-100 border border-amber-300 text-amber-900 text-xs font-black my-1 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-spin" />
          <span>LEVEL UP 달성!</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-2 tracking-tight">
          LV.{newLevelConfig.level} {newLevelConfig.name}
        </h3>

        <p className="text-xs text-slate-600 my-3 leading-relaxed px-2 font-medium">
          {newLevelConfig.description}
        </p>

        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-xs text-emerald-800 font-bold mb-4 shadow-xs">
          ✨ 축하합니다! 수호목이 한층 더 튼튼하고 울창해졌습니다.
        </div>

        <button
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
        >
          <span>확인</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
