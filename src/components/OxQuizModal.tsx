import React, { useState } from 'react';
import { UserProfile, OXQuiz } from '../types';
import { completeOxQuizQuestion } from '../lib/dataService';
import { Droplet, X as XIcon, ArrowRight, Hash } from 'lucide-react';
import { playCorrectSound, playIncorrectSound, playClickSound } from '../lib/sound';

interface OxQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  quizzes: OXQuiz[];
  onQuizCompleted: (updatedUser: UserProfile, drops: number) => void;
}

export const OxQuizModal: React.FC<OxQuizModalProps> = ({
  isOpen,
  onClose,
  user,
  quizzes,
  onQuizCompleted,
}) => {
  const activeQuizzes = quizzes.slice(0, 10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  const currentQuiz = activeQuizzes[currentIndex];
  const completedIds = user.completedOxIds || [];
  const alreadyCompleted = currentQuiz ? completedIds.includes(currentQuiz.id) : false;

  const totalAnswered = activeQuizzes.filter((q) => completedIds.includes(q.id)).length;
  const isAll10Completed = totalAnswered >= activeQuizzes.length || currentIndex >= activeQuizzes.length;

  const handleSelectOption = (choice: boolean) => {
    if (isAnswerSubmitted || isSubmitting) return;
    setSelectedAnswer(choice);
  };

  const handleConfirmAnswer = () => {
    if (selectedAnswer === null || !currentQuiz || isAnswerSubmitted) return;
    const isCorrect = selectedAnswer === currentQuiz.answer;

    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    const dropsEarned = isCorrect && !alreadyCompleted ? 1 : 0;

    setIsAnswerSubmitted(true);

    const completed = user.completedOxIds || [];
    const newCompleted = completed.includes(currentQuiz.id)
      ? completed
      : [...completed, currentQuiz.id];

    const optimisticUser: UserProfile = {
      ...user,
      waterDrops: (user.waterDrops || 0) + dropsEarned,
      completedOxIds: newCompleted,
      lastActive: Date.now(),
    };

    onQuizCompleted(optimisticUser, dropsEarned);

    completeOxQuizQuestion(
      user,
      currentQuiz.id,
      isCorrect,
      1
    ).catch((err) => {
      console.error('OX Quiz background sync error:', err);
    });
  };

  const handleNextQuestion = () => {
    playClickSound();
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);

    let nextIdx = currentIndex + 1;
    if (nextIdx < activeQuizzes.length) {
      setCurrentIndex(nextIdx);
    } else {
      setCurrentIndex(activeQuizzes.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-emerald-100 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-800 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Droplet className="w-5 h-5 fill-sky-500" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>개인정보보호 OX 퀴즈</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold">
                  정답 시 물방울 지급
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                <span>참여자:</span>
                <span className="font-mono font-bold text-emerald-800">{user.code}</span>
              </p>
            </div>
          </div>
        </div>

        {/* All 10 Quizzes Completed Summary View */}
        {isAll10Completed ? (
          <div className="py-6 flex flex-col items-center text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
              🎉
            </div>
            <div>
              <h4 className="text-lg font-extrabold text-slate-900">
                모든 OX 퀴즈 완료!
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                퀴즈를 통해 획득한 물방울로 수호목에 물을 주어 레벨을 올려보세요.
              </p>
            </div>
            <div className="w-full bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-around shadow-xs">
              <div className="text-center">
                <span className="text-xs text-slate-500 block font-medium">참여 완료 문항</span>
                <span className="text-lg font-extrabold text-slate-900">{totalAnswered} / 10</span>
              </div>
              <div className="h-8 w-px bg-emerald-200" />
              <div className="text-center">
                <span className="text-xs text-slate-500 block font-medium">현재 보유 물방울</span>
                <span className="text-lg font-extrabold text-sky-600 flex items-center justify-center gap-1">
                  <Droplet className="w-4 h-4 fill-sky-500" />
                  {user.waterDrops}개
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 transition active:scale-98 cursor-pointer"
            >
              수호목에 물주러 가기
            </button>
          </div>
        ) : (
          /* Active Question View */
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-extrabold">
                  Q{currentIndex + 1}
                </span>
                <span className="text-slate-400 font-normal">/ 총 {activeQuizzes.length}문항</span>
              </span>
              <span className="text-sky-600 font-extrabold flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 fill-sky-500" />
                <span>보유 물방울: {user.waterDrops}개</span>
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / activeQuizzes.length) * 100}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
                [{currentQuiz.category || '보안수칙'}]
              </div>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                {currentQuiz.question}
              </h4>
            </div>

            {/* O / X Buttons */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-1">
              <button
                type="button"
                onClick={() => handleSelectOption(true)}
                disabled={isAnswerSubmitted}
                className={`py-5 sm:py-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all shadow-xs ${
                  selectedAnswer === true
                    ? isAnswerSubmitted
                      ? currentQuiz.answer === true
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-400'
                        : 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-400'
                      : 'bg-emerald-50 border-emerald-500 text-emerald-700 scale-102 ring-2 ring-emerald-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                } ${isAnswerSubmitted ? 'cursor-default' : 'active:scale-95 cursor-pointer'}`}
              >
                <span className="text-3xl sm:text-4xl font-black">⭕</span>
                <span className="text-xs sm:text-sm font-extrabold mt-1">그렇다 (O)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectOption(false)}
                disabled={isAnswerSubmitted}
                className={`py-5 sm:py-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all shadow-xs ${
                  selectedAnswer === false
                    ? isAnswerSubmitted
                      ? currentQuiz.answer === false
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-400'
                        : 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-400'
                      : 'bg-rose-50 border-rose-500 text-rose-700 scale-102 ring-2 ring-rose-300'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                } ${isAnswerSubmitted ? 'cursor-default' : 'active:scale-95 cursor-pointer'}`}
              >
                <span className="text-3xl sm:text-4xl font-black">❌</span>
                <span className="text-xs sm:text-sm font-extrabold mt-1">아니다 (X)</span>
              </button>
            </div>

            {/* Feedback */}
            {isAnswerSubmitted && (
              <div
                className={`p-4 rounded-2xl border animate-fade-in ${
                  selectedAnswer === currentQuiz.answer
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-extrabold text-sm mb-1.5">
                  {selectedAnswer === currentQuiz.answer ? (
                    <>
                      <span className="text-xl">🎉</span>
                      <span className="text-emerald-700">정답입니다! 물방울 1개가 적립되었습니다.</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">💡</span>
                      <span className="text-rose-700">아쉽네요! 정답은 [{currentQuiz.answer ? 'O' : 'X'}] 입니다.</span>
                    </>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-slate-700">
                  {currentQuiz.explanation}
                </p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-2">
              {!isAnswerSubmitted ? (
                <button
                  type="button"
                  onClick={handleConfirmAnswer}
                  disabled={selectedAnswer === null || isSubmitting}
                  className={`w-full py-3 rounded-xl font-extrabold text-sm shadow-md transition flex items-center justify-center gap-1.5 ${
                    selectedAnswer !== null
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98 shadow-emerald-600/20'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                  }`}
                >
                  <span>정답 확인</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition"
                >
                  <span>{currentIndex + 1 >= activeQuizzes.length ? '결과 확인하기' : '다음 문제 풀기'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
