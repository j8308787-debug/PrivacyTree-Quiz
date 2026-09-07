import React from 'react';
import { Megaphone, X, TreePine, Droplet, Bell, Trophy, CheckCircle2, Sparkles } from 'lucide-react';
import { playClickSound } from '../lib/sound';

interface GameGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOxQuiz?: () => void;
  onOpenGoldenBell?: () => void;
}

export const GameGuideModal: React.FC<GameGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl bg-white border border-emerald-100 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-800 relative">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 pr-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
              <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[9px] sm:text-[10px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  HOW TO PLAY
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-600 flex items-center gap-0.5 shrink-0">
                  <Sparkles className="w-3 h-3" /> 쉽고 재미있는 참여 가이드
                </span>
              </div>
              <h3 className="text-xs sm:text-base font-black text-slate-900 mt-0.5 whitespace-nowrap">
                개인정보 보호 약속나무 이용 안내
              </h3>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white/80 transition cursor-pointer shrink-0"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 sm:space-y-3.5">
          {/* Step 1: 약속나무 키우기 */}
          <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm sm:text-base">
              <TreePine className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] sm:text-xs font-black text-emerald-900 whitespace-nowrap">
                  1. 실천 약속 & 나무 물주기
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 whitespace-nowrap shrink-0">
                  +30P / +10P
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                추천된 개인정보보호 실천 약속을 선택해 약속나무에 걸어보세요 (<span className="font-bold text-emerald-700">+30P</span>).
                모은 물방울로 나무에 물을 주면 나무가 무럭무럭 성장하며 추가 포인트를 얻습니다!
              </p>
            </div>
          </div>

          {/* Step 2: OX 퀴즈 */}
          <div className="p-3 sm:p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm sm:text-base">
              <Droplet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] sm:text-xs font-black text-blue-900 whitespace-nowrap">
                  2. 매일매일 OX 퀴즈
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 whitespace-nowrap shrink-0">
                  물방울 획득
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                개인정보보호와 관련된 알쏭달쏭한 OX 퀴즈를 풀고 나무에 줄 수 있는 소중한 물방울을 획득하세요.
              </p>
            </div>
          </div>

          {/* Step 3: 스피드 골든벨 */}
          <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm sm:text-base">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] sm:text-xs font-black text-amber-900 whitespace-nowrap">
                  3. 실시간 스피드 골든벨
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 whitespace-nowrap shrink-0">
                  정답당 3P + TOP 3
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                운영 시간표에 따라 열리는 골든벨에 참여하세요!
              </p>
              <ul className="mt-1.5 space-y-1 text-[10px] sm:text-[11px] text-slate-600 bg-white/80 p-2 sm:p-2.5 rounded-xl border border-amber-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>정답 1문제당 <strong className="text-amber-800">3P</strong> 획득 (5문제 정답 시 <strong className="text-amber-800">총 15P</strong>)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>회차 종료 시 순위 <strong className="text-amber-800">TOP 3(1위~3위)</strong>에게는 회차별 추가 보너스 포인트 자동 지급!</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Step 4: 명예의 전당 */}
          <div className="p-3 sm:p-4 rounded-2xl bg-purple-50/70 border border-purple-200 flex gap-2.5 sm:gap-3.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm sm:text-base">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] sm:text-xs font-black text-purple-900 whitespace-nowrap">
                  4. 명예의 전당 순위 경쟁
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 whitespace-nowrap shrink-0">
                  실시간 랭킹
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                다양한 미션으로 포인트를 모아 약속나무를 최종 레벨까지 성장시키고, 전체 순위 랭킹에서 최고의 자리에 도전하세요!
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 transition cursor-pointer"
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};
