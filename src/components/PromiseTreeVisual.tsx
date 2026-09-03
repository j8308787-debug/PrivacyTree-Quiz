import React from 'react';
import { UserProfile, TreeLevelConfig, PledgeItem } from '../types';
import { Droplet, Sparkles, ChevronRight, CheckCircle, Hash } from 'lucide-react';
import { playWaterDropSound } from '../lib/sound';

interface PromiseTreeVisualProps {
  user: UserProfile | null;
  treeLevels: TreeLevelConfig[];
  pledges: PledgeItem[];
  onWatering: () => void;
  onOpenPledgeModal: () => void;
  onOpenPledgeBoard: () => void;
  onToggleLikePledge?: (pledgeId: string) => void;
  isWateringLoading: boolean;
}

export const PromiseTreeVisual: React.FC<PromiseTreeVisualProps> = ({
  user,
  treeLevels,
  pledges,
  onWatering,
  onOpenPledgeModal,
  onOpenPledgeBoard,
  isWateringLoading,
}) => {
  const currentLevel = user?.treeLevel || 1;
  const currentLevelConfig = treeLevels.find((l) => l.level === currentLevel) || treeLevels[0];

  // Calculate progress toward next level
  const sortedLevels = [...treeLevels].sort((a, b) => a.level - b.level);
  const nextLevelConfig = sortedLevels.find((l) => l.level === currentLevel + 1);

  const currentMinPoints = currentLevelConfig?.minPoints || 0;
  const nextMinPoints = nextLevelConfig ? nextLevelConfig.minPoints : currentMinPoints + 150;
  const userPoints = user?.points || 0;
  const pointsInCurrentLevel = Math.max(0, userPoints - currentMinPoints);
  const pointsNeededForNext = Math.max(1, nextMinPoints - currentMinPoints);
  const progressPercent = nextLevelConfig
    ? Math.min(100, Math.round((pointsInCurrentLevel / pointsNeededForNext) * 100))
    : 100;

  // Show only the last 4 pledges on main screen
  const displayPledges = pledges.slice(0, 4);

  const handleWaterClick = () => {
    if (!user || user.waterDrops <= 0 || isWateringLoading) return;
    playWaterDropSound();
    onWatering();
  };

  // SVG Visual Tree per Level
  const renderTreeSvg = () => {
    switch (currentLevel) {
      case 1:
        // Level 1: Tiny Sprout in Rich Soil
        return (
          <svg viewBox="0 0 240 240" className="w-48 h-48 sm:w-56 sm:h-56 drop-shadow-md">
            <ellipse cx="120" cy="205" rx="55" ry="14" fill="#8D5B4C" />
            <ellipse cx="120" cy="202" rx="48" ry="10" fill="#A06955" />
            <path
              d="M 120 200 Q 120 160 118 145"
              stroke="#10B981"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 118 155 C 95 150, 85 130, 100 120 C 115 130, 118 145, 118 155"
              fill="#34D399"
              className="animate-pulse"
            />
            <path
              d="M 118 150 C 140 145, 150 125, 135 115 C 120 125, 118 140, 118 150"
              fill="#10B981"
              className="animate-pulse"
            />
            <circle cx="102" cy="122" r="3" fill="#67E8F9" className="animate-bounce" />
          </svg>
        );
      case 2:
        // Level 2: Young Growing Sapling with Multiple Leaves
        return (
          <svg viewBox="0 0 260 260" className="w-52 h-52 sm:w-60 sm:h-60 drop-shadow-md">
            <ellipse cx="130" cy="225" rx="65" ry="16" fill="#8D5B4C" />
            <ellipse cx="130" cy="222" rx="58" ry="12" fill="#A06955" />
            <path
              d="M 130 220 Q 128 170 130 115"
              stroke="#78350F"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
            />
            <path d="M 129 160 Q 100 140 85 130" stroke="#78350F" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M 130 145 Q 160 130 175 120" stroke="#78350F" strokeWidth="5" strokeLinecap="round" fill="none" />
            <circle cx="80" cy="125" r="22" fill="#34D399" />
            <circle cx="178" cy="115" r="24" fill="#10B981" />
            <circle cx="130" cy="95" r="32" fill="#059669" />
            <circle cx="130" cy="85" r="24" fill="#34D399" opacity="0.9" />
          </svg>
        );
      case 3:
        // Level 3: Thriving Green Tree with Bushy Foliage
        return (
          <svg viewBox="0 0 280 280" className="w-56 h-56 sm:w-64 sm:h-64 drop-shadow-lg">
            <ellipse cx="140" cy="245" rx="75" ry="18" fill="#78350F" opacity="0.8" />
            <path
              d="M 125 245 C 130 200, 132 170, 140 120 C 148 170, 150 200, 155 245 Z"
              fill="#92400E"
            />
            <circle cx="140" cy="100" r="50" fill="#047857" />
            <circle cx="100" cy="120" r="42" fill="#059669" />
            <circle cx="180" cy="120" r="42" fill="#059669" />
            <circle cx="120" cy="80" r="38" fill="#10B981" />
            <circle cx="160" cy="80" r="38" fill="#10B981" />
            <circle cx="140" cy="70" r="30" fill="#34D399" />
            <circle cx="110" cy="105" r="4" fill="#FDE047" />
            <circle cx="170" cy="95" r="4" fill="#FDE047" />
            <circle cx="140" cy="120" r="4" fill="#FDE047" />
          </svg>
        );
      case 4:
        // Level 4: Grand Sturdy Oak with Golden Security Badges
        return (
          <svg viewBox="0 0 300 300" className="w-60 h-60 sm:w-72 sm:h-72 drop-shadow-xl">
            <ellipse cx="150" cy="265" rx="90" ry="20" fill="#78350F" opacity="0.8" />
            <path
              d="M 130 265 C 138 210, 140 170, 150 120 C 160 170, 162 210, 170 265 Z"
              fill="#78350F"
            />
            <circle cx="150" cy="110" r="62" fill="#065F46" />
            <circle cx="100" cy="130" r="50" fill="#047857" />
            <circle cx="200" cy="130" r="50" fill="#047857" />
            <circle cx="115" cy="85" r="45" fill="#059669" />
            <circle cx="185" cy="85" r="45" fill="#059669" />
            <circle cx="150" cy="65" r="40" fill="#10B981" />
            <circle cx="150" cy="55" r="28" fill="#34D399" />
            <g transform="translate(115, 115) scale(0.7)">
              <circle cx="12" cy="12" r="12" fill="#F59E0B" />
              <text x="12" y="16" textAnchor="middle" fill="#FFF" fontSize="11" fontWeight="bold">🔒</text>
            </g>
            <g transform="translate(170, 105) scale(0.7)">
              <circle cx="12" cy="12" r="12" fill="#F59E0B" />
              <text x="12" y="16" textAnchor="middle" fill="#FFF" fontSize="11" fontWeight="bold">🔒</text>
            </g>
            <g transform="translate(140, 75) scale(0.7)">
              <circle cx="12" cy="12" r="12" fill="#F59E0B" />
              <text x="12" y="16" textAnchor="middle" fill="#FFF" fontSize="11" fontWeight="bold">🔒</text>
            </g>
          </svg>
        );
      case 5:
      default:
        // Level 5: Sacred Guardian Privacy Tree
        return (
          <svg viewBox="0 0 320 320" className="w-64 h-64 sm:w-80 sm:h-80 drop-shadow-2xl">
            <circle cx="160" cy="130" r="120" fill="url(#sunGlow)" opacity="0.4" />
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FDE047" stopOpacity="0.8" />
                <stop offset="60%" stopColor="#34D399" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="160" cy="285" rx="100" ry="22" fill="#78350F" opacity="0.8" />
            <path
              d="M 135 285 C 145 220, 148 160, 160 115 C 172 160, 175 220, 185 285 Z"
              fill="#78350F"
            />
            <circle cx="160" cy="115" r="72" fill="#064E3B" />
            <circle cx="105" cy="135" r="58" fill="#065F46" />
            <circle cx="215" cy="135" r="58" fill="#065F46" />
            <circle cx="120" cy="80" r="52" fill="#059669" />
            <circle cx="200" cy="80" r="52" fill="#059669" />
            <circle cx="160" cy="60" r="48" fill="#10B981" />
            <circle cx="160" cy="45" r="32" fill="#34D399" />
            <g transform="translate(110, 120) scale(0.9)">
              <circle cx="12" cy="12" r="13" fill="#F59E0B" />
              <text x="12" y="17" textAnchor="middle" fill="#FFF" fontSize="13">🛡️</text>
            </g>
            <g transform="translate(190, 115) scale(0.9)">
              <circle cx="12" cy="12" r="13" fill="#F59E0B" />
              <text x="12" y="17" textAnchor="middle" fill="#FFF" fontSize="13">🛡️</text>
            </g>
            <g transform="translate(150, 75) scale(0.9)">
              <circle cx="12" cy="12" r="13" fill="#F59E0B" />
              <text x="12" y="17" textAnchor="middle" fill="#FFF" fontSize="13">🛡️</text>
            </g>
          </svg>
        );
    }
  };

  return (
    <div className="w-full bg-white border border-emerald-100 rounded-3xl p-4 sm:p-6 shadow-sm sm:shadow-md flex flex-col items-center relative overflow-hidden transition-all">
      {/* Background Daylight Sky & Subtle Meadow Hill */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-50/60 via-emerald-50/30 to-emerald-100/40 pointer-events-none" />

      {/* Top Tree Level & Points Header */}
      <div className="w-full flex items-center justify-between z-10 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl p-1.5 rounded-2xl bg-white border border-emerald-200 shadow-xs">
            {currentLevelConfig.badge}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                LV.{currentLevelConfig.level}
              </span>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                {currentLevelConfig.name}
              </h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              {currentLevelConfig.description}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-400 font-medium whitespace-nowrap">
            {user ? (
              <span className="font-mono text-emerald-800 font-bold">{user.code} 님</span>
            ) : (
              <span>내 점수</span>
            )}
          </div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-600 whitespace-nowrap">
            {userPoints.toLocaleString()} <span className="text-xs text-slate-500 font-bold">P</span>
          </div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="w-full max-w-xl z-10 mb-4">
        <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 mb-1">
          <span>다음 등급까지</span>
          <span className="text-emerald-700">
            {nextLevelConfig
              ? `${userPoints} / ${nextMinPoints} P (${progressPercent}%)`
              : '최고 등급 달성 완료!'}
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700 shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Tree Centerpiece Stage */}
      <div className="relative w-full flex items-center justify-center py-2 sm:py-4 z-10">
        <div className="flex flex-col items-center justify-center">
          {renderTreeSvg()}
        </div>
      </div>

      {/* Primary Interaction Action Buttons (Watering & Write Pledge) */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 z-10 mt-2 mb-4">
        {/* Give Water Button */}
        <button
          id="btn-water-tree-main"
          type="button"
          onClick={handleWaterClick}
          disabled={!user || user.waterDrops <= 0 || isWateringLoading}
          className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
            user && user.waterDrops > 0
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-600/20 active:scale-95 cursor-pointer animate-pulse'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none'
          }`}
        >
          <Droplet className={`w-4 h-4 flex-shrink-0 ${user && user.waterDrops > 0 ? 'fill-white' : 'fill-slate-400'}`} />
          {isWateringLoading ? (
            <span>물주는 중...</span>
          ) : user && user.waterDrops > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-center leading-tight">
              <span>나무에 물주기</span>
              <span className="text-[10px] sm:text-xs opacity-90 sm:ml-1 font-semibold">({user.waterDrops}개 보유)</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center leading-tight">
              <span>나무에 물주기</span>
              <span className="text-[10px] sm:text-xs text-slate-400 font-semibold sm:ml-1">(0개)</span>
            </div>
          )}
        </button>

        {/* Write Pledge Button */}
        <button
          id="btn-write-pledge-main"
          type="button"
          onClick={onOpenPledgeModal}
          className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-emerald-200" />
          <span>약속 작성 (+30P)</span>
        </button>
      </div>

      {/* Recent Pledges (Shows 4-digit participant code, no department or name) */}
      {displayPledges.length > 0 && (
        <div className="w-full max-w-2xl z-10 mt-2 pt-4 border-t border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>최근 등록된 실천 약속</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                총 {pledges.length}건
              </span>
            </h3>
            <button
              onClick={onOpenPledgeBoard}
              className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              <span>전체보기</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 4 Recent Pledges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {displayPledges.map((pledge) => {
              return (
                <div
                  key={pledge.id}
                  className="bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl p-2.5 shadow-xs transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-extrabold font-mono text-emerald-800 flex items-center gap-0.5">
                        <Hash className="w-2.5 h-2.5 text-emerald-600" />
                        <span>{pledge.userCode}</span>
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-800 line-clamp-2 leading-tight">
                      "{pledge.content}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400">
                      {new Date(pledge.createdAt).toLocaleDateString('ko-KR', {
                        month: 'numeric',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                      <span>실천약속</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
