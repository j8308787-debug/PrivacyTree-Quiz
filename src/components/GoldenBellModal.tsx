import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  AppSettings,
  GoldenBellQuestion,
  GoldenBellSubmission,
  TreeLevelConfig,
} from '../types';
import { submitGoldenBellAnswers, calculateTreeLevel } from '../lib/dataService';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { normalizeSchedule, getRoundTimeStatus } from '../lib/scheduleUtils';
import {
  Bell,
  Timer,
  CheckCircle2,
  HelpCircle,
  Trophy,
  ArrowRight,
  X,
  Play,
  Hash,
} from 'lucide-react';
import {
  playClickSound,
  playCorrectSound,
  playIncorrectSound,
  playCountdownBeep,
  playVictorySound,
} from '../lib/sound';
import confetti from 'canvas-confetti';

interface GoldenBellModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  settings: AppSettings;
  treeLevels: TreeLevelConfig[];
  questions: GoldenBellQuestion[];
  onSubmissionComplete: (updatedUser: UserProfile) => void;
}

export const GoldenBellModal: React.FC<GoldenBellModalProps> = ({
  isOpen,
  onClose,
  user,
  settings,
  treeLevels,
  questions,
  onSubmissionComplete,
}) => {
  const scheduleList = normalizeSchedule(settings.goldenBellSchedule);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const [gameState, setGameState] = useState<'lobby' | 'countdown' | 'playing' | 'result' | 'review'>('lobby');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [roundSubmissions, setRoundSubmissions] = useState<GoldenBellSubmission[]>([]);

  const [answers, setAnswers] = useState<{
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
    timeMs: number;
  }[]>([]);

  const [lastSubmissionResult, setLastSubmissionResult] = useState<{
    correctCount: number;
    totalTimeMs: number;
    pointsEarned: number;
  } | null>(null);

  const [elapsedTimer, setElapsedTimer] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const currentRoundQuestions = questions.filter((q) => q.roundIndex === selectedRoundIndex);

  // Auto-detect active round
  useEffect(() => {
    if (!isOpen) return;
    if (settings.roundStatus === 'in_progress' && settings.activeRound !== null) {
      setSelectedRoundIndex(settings.activeRound);
      return;
    }
    let foundActiveOrUpcoming = false;
    for (let i = 0; i < scheduleList.length; i++) {
      const item = scheduleList[i];
      const status = getRoundTimeStatus(item, settings.roundStatus, settings.activeRound);
      if (status === 'active') {
        setSelectedRoundIndex(i);
        foundActiveOrUpcoming = true;
        break;
      }
    }
    if (!foundActiveOrUpcoming) {
      for (let i = 0; i < scheduleList.length; i++) {
        const item = scheduleList[i];
        const status = getRoundTimeStatus(item, settings.roundStatus, settings.activeRound);
        if (status === 'upcoming') {
          setSelectedRoundIndex(i);
          foundActiveOrUpcoming = true;
          break;
        }
      }
    }
  }, [isOpen, settings.roundStatus, settings.activeRound, settings.goldenBellSchedule]);

  // Real-time Round Leaderboard
  useEffect(() => {
    if (!isOpen) return;
    const q = query(
      collection(db, 'golden_bell_submissions'),
      where('roundIndex', '==', selectedRoundIndex)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as GoldenBellSubmission);
      list.sort((a, b) => {
        if (b.correctCount !== a.correctCount) {
          return b.correctCount - a.correctCount;
        }
        return a.totalTimeMs - b.totalTimeMs;
      });
      setRoundSubmissions(list);
    });
    return () => unsubscribe();
  }, [isOpen, selectedRoundIndex]);

  // Live Timer
  useEffect(() => {
    if (gameState === 'playing') {
      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setElapsedTimer(Date.now() - start);
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const safeRoundIndex = Math.min(
    Math.max(0, selectedRoundIndex),
    Math.max(0, scheduleList.length - 1)
  );

  const currentScheduleItem = scheduleList[safeRoundIndex] || scheduleList[0] || {
    round: safeRoundIndex + 1,
    startTime: '10:00',
    endTime: '10:30',
  };

  const roundTimeStatus = getRoundTimeStatus(
    currentScheduleItem,
    settings.roundStatus,
    settings.activeRound
  );

  const alreadyPlayed = user?.goldenBellRoundsPlayed?.includes(safeRoundIndex) ?? false;
  const canPlay = roundTimeStatus === 'active' && !alreadyPlayed;

  // Keyboard shortcuts (1, 2, 3, 4) for instant, zero-latency response during speedrun
  useEffect(() => {
    if (!isOpen || gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        const currentQ = currentRoundQuestions[currentQuestionIndex];
        if (currentQ && optIdx >= 0 && optIdx < currentQ.options.length) {
          e.preventDefault();
          handleSelectOption(optIdx);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, gameState, currentQuestionIndex, currentRoundQuestions, answers, questionStartTime]);

  const handleStartSpeedrun = () => {
    if (!canPlay || !user) return;
    playClickSound();
    setGameState('countdown');
    setCountdownNum(3);
    let count = 3;
    playCountdownBeep();
    const interval = window.setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
        playCountdownBeep();
      } else {
        clearInterval(interval);
        setGameState('playing');
        setCurrentQuestionIndex(0);
        setAnswers([]);
        const now = Date.now();
        setQuestionStartTime(now);
      }
    }, 750);
  };

  const handleSelectOption = (optionIndex: number) => {
    if (gameState !== 'playing' || !user) return;
    const currentQ = currentRoundQuestions[currentQuestionIndex];
    if (!currentQ) return;
    const now = Date.now();
    const timeForThisQuestion = now - questionStartTime;
    const isCorrect = optionIndex === currentQ.answerIndex;
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }
    const recorded = [
      ...answers,
      {
        questionId: currentQ.id,
        selectedOption: optionIndex,
        isCorrect,
        timeMs: timeForThisQuestion,
      },
    ];
    setAnswers(recorded);

    if (currentQuestionIndex + 1 < currentRoundQuestions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setQuestionStartTime(Date.now());
    } else {
      completeSubmission(recorded);
    }
  };

  const completeSubmission = (
    allAnswers: { questionId: string; selectedOption: number; isCorrect: boolean; timeMs: number }[]
  ) => {
    if (!user) return;
    setGameState('result');
    playVictorySound();
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });

    const correctCount = allAnswers.filter((a) => a.isCorrect).length;
    const totalTimeMs = allAnswers.reduce((acc, curr) => acc + curr.timeMs, 0);
    const earned = correctCount * 10 + 5;
    setLastSubmissionResult({
      correctCount,
      totalTimeMs,
      pointsEarned: earned,
    });

    const newPoints = (user.points || 0) + earned;
    const newLevel = calculateTreeLevel(newPoints, treeLevels);
    const playedRounds = user.goldenBellRoundsPlayed || [];
    const newPlayedRounds = playedRounds.includes(safeRoundIndex)
      ? playedRounds
      : [...playedRounds, safeRoundIndex];

    const optimisticUser: UserProfile = {
      ...user,
      points: newPoints,
      treeLevel: newLevel,
      goldenBellRoundsPlayed: newPlayedRounds,
      lastActive: Date.now(),
    };

    onSubmissionComplete(optimisticUser);

    submitGoldenBellAnswers(
      user,
      safeRoundIndex,
      allAnswers,
      treeLevels
    ).catch((err) => {
      console.error('Golden Bell submission background sync error:', err);
    });
  };

  const handleResetToLobby = () => {
    playClickSound();
    setGameState('lobby');
    setAnswers([]);
    setCurrentQuestionIndex(0);
  };

  const activeQuestion = currentRoundQuestions[currentQuestionIndex];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[92vh] bg-white border border-amber-200 rounded-3xl flex flex-col text-slate-800 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs shrink-0">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
                <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 whitespace-nowrap shrink-0">
                  개인정보보호 스피드 골든벨
                </h3>
                <span className="text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500 text-white tracking-wider whitespace-nowrap shrink-0">
                  SPEEDRUN
                </span>
              </div>
              <div className="text-[11px] sm:text-xs font-bold text-amber-700 mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                <span>제 {currentScheduleItem.round} 라운드</span>
                <span className="text-slate-400 font-normal">
                  ({currentScheduleItem.startTime} ~ {currentScheduleItem.endTime})
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. LOBBY VIEW */}
          {gameState === 'lobby' && (
            <div className="space-y-4">
              {/* Round Selector Tabs */}
              <div className={`w-full grid gap-2 ${
                scheduleList.length === 1 ? 'grid-cols-1' :
                scheduleList.length === 2 ? 'grid-cols-2' :
                scheduleList.length === 3 ? 'grid-cols-3' :
                scheduleList.length === 4 ? 'grid-cols-2 sm:grid-cols-4' :
                'grid-cols-2 sm:grid-cols-3 md:grid-cols-5'
              }`}>
                {scheduleList.map((item, idx) => {
                  const status = getRoundTimeStatus(item, settings.roundStatus, settings.activeRound);
                  const isSelected = safeRoundIndex === idx;
                  const isPlayed = user?.goldenBellRoundsPlayed?.includes(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        playClickSound();
                        setSelectedRoundIndex(idx);
                      }}
                      className={`w-full min-h-[76px] p-2.5 sm:p-3 rounded-2xl border text-center transition flex flex-col items-center justify-between shadow-xs cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-extrabold text-slate-800">
                        <span>제 {item.round} 라운드</span>
                        {status === 'active' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </div>
                      <div className="text-[10px] sm:text-xs text-slate-500 font-semibold my-0.5">
                        {item.startTime} ~ {item.endTime}
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-extrabold">
                        {isPlayed ? (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">참여 완료</span>
                        ) : status === 'active' ? (
                          <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full font-black animate-pulse">
                            LIVE 진행 중
                          </span>
                        ) : status === 'upcoming' ? (
                          <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            시작 대기
                          </span>
                        ) : (
                          <span className="text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">종료</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                  roundTimeStatus === 'active'
                    ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-amber-300 shadow-xs'
                    : roundTimeStatus === 'upcoming'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${
                      roundTimeStatus === 'active'
                        ? 'bg-amber-500 text-white animate-bounce'
                        : roundTimeStatus === 'upcoming'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {roundTimeStatus === 'active' ? '🔥' : roundTimeStatus === 'upcoming' ? '⏰' : '🔒'}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                      제 {selectedRoundIndex + 1} 라운드 골든벨
                    </h4>
                    <p className="text-xs text-slate-600">
                      {roundTimeStatus === 'active'
                        ? '지금 바로 골든벨 문제풀이에 도전하세요!'
                        : roundTimeStatus === 'upcoming'
                        ? `시작 시간: ${currentScheduleItem.startTime} (정해진 시간에 자동 오픈)`
                        : '해당 라운드는 종료되었습니다.'}
                    </p>
                  </div>
                </div>

                {alreadyPlayed ? (
                  <div className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 font-extrabold text-xs border border-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>참여 완료</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartSpeedrun}
                    disabled={!canPlay}
                    className={`px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm shadow-md transition flex items-center gap-2 ${
                      canPlay
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-amber-600/30 active:scale-95 cursor-pointer animate-pulse'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{roundTimeStatus === 'active' ? '스피드런 도전!' : '시작 대기 중'}</span>
                  </button>
                )}
              </div>

              {/* Round Leaderboard Table (No department column, No name column) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                <div className="flex items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-100">
                  <div className="flex items-start gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                        제 {selectedRoundIndex + 1} 라운드 실시간 순위표
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-bold text-amber-600 block mt-0.5">
                        (TOP 3 특별 보너스 포인트 지급)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 whitespace-nowrap shrink-0">
                    제출 {roundSubmissions.length}명
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[280px]">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 whitespace-nowrap">순위</th>
                        <th className="py-2 px-2.5 whitespace-nowrap">참여 번호</th>
                        <th className="py-2 px-2.5 text-center whitespace-nowrap">정답 수</th>
                        <th className="py-2 px-2.5 text-right whitespace-nowrap">소요 시간</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roundSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                            아직 본 라운드에 제출된 기록이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        roundSubmissions.slice(0, 10).map((sub, idx) => {
                          const isMe = user && (sub.userId === user.id || sub.userCode === user.code);
                          return (
                            <tr
                              key={sub.id}
                              className={isMe ? 'bg-amber-50/70 font-bold text-amber-900' : 'hover:bg-slate-50'}
                            >
                              <td className="py-2 px-2.5 font-extrabold whitespace-nowrap">
                                {idx === 0 ? '🥇 1위' : idx === 1 ? '🥈 2위' : idx === 2 ? '🥉 3위' : `${idx + 1}위`}
                              </td>
                              <td className="py-2 px-2.5 font-bold whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-slate-900">{sub.userCode}</span>
                                  {isMe && (
                                    <span className="text-[10px] bg-amber-500 text-white px-1 py-0.2 rounded font-normal">
                                      내 기록
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2.5 text-center font-extrabold text-emerald-700 whitespace-nowrap">
                                {sub.correctCount} / 5
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                                {(sub.totalTimeMs / 1000).toFixed(2)}s
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. COUNTDOWN VIEW */}
          {gameState === 'countdown' && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
              <div className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                제 {selectedRoundIndex + 1} 라운드 골든벨
              </div>
              <div className="text-7xl sm:text-8xl font-black text-amber-500 animate-ping">
                {countdownNum}
              </div>
              <p className="text-sm font-extrabold text-slate-700">
                준비하세요! 문제가 곧 시작됩니다!
              </p>
            </div>
          )}

          {/* 3. PLAYING VIEW */}
          {gameState === 'playing' && activeQuestion && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md">
                    문제 {currentQuestionIndex + 1} / 5
                  </span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 hidden sm:inline-block">
                    ⚡ 키보드 1~4번 키 즉시 입력 가능
                  </span>
                </div>
                <span className="flex items-center gap-1 text-rose-600 font-mono text-sm font-black">
                  <Timer className="w-4 h-4 animate-spin" />
                  {(elapsedTimer / 1000).toFixed(2)}s
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-200"
                  style={{ width: `${((currentQuestionIndex + 1) / 5) * 100}%` }}
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
                <h4 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                  {activeQuestion.question}
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1">
                {activeQuestion.options.map((opt, optIdx) => (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(optIdx)}
                    className="w-full p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-left font-bold text-xs sm:text-sm text-slate-800 shadow-xs flex items-center gap-3 transition active:scale-[0.98] cursor-pointer group touch-manipulation select-none"
                  >
                    <span className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-amber-500 group-hover:text-white text-slate-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0 transition">
                      {optIdx + 1}
                    </span>
                    <span className="flex-1 leading-snug">{opt}</span>
                    <span className="hidden sm:inline-block text-[10px] text-slate-400 font-mono group-hover:text-amber-700">
                      키 [{optIdx + 1}]
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 4. RESULT VIEW */}
          {gameState === 'result' && lastSubmissionResult && (
            <div className="py-6 flex flex-col items-center text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                🏆
              </div>
              <div>
                <h4 className="text-xl font-extrabold text-slate-900">
                  골든벨 제출 완료!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  제 {selectedRoundIndex + 1} 라운드 점수가 정상 집계되었습니다.
                </p>
              </div>

              <div className="w-full max-w-md bg-amber-50/80 border border-amber-200 rounded-2xl p-4 grid grid-cols-3 gap-2 shadow-xs">
                <div className="text-center">
                  <span className="text-[11px] text-slate-500 block font-medium">정답 개수</span>
                  <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                    {lastSubmissionResult.correctCount} / 5
                  </span>
                </div>
                <div className="text-center border-x border-amber-200">
                  <span className="text-[11px] text-slate-500 block font-medium">총 소요시간</span>
                  <span className="text-base sm:text-lg font-extrabold font-mono text-slate-800">
                    {(lastSubmissionResult.totalTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[11px] text-slate-500 block font-medium">획득 포인트</span>
                  <span className="text-base sm:text-lg font-extrabold text-amber-600">
                    +{lastSubmissionResult.pointsEarned}P
                  </span>
                </div>
              </div>

              <div className="w-full max-w-md grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound();
                    setGameState('review');
                  }}
                  className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>정답 및 해설 보기</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetToLobby}
                  className="py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-700/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>대기실로 이동</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 5. REVIEW VIEW */}
          {gameState === 'review' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <span>제 {selectedRoundIndex + 1} 라운드 문항 복습 및 해설</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setGameState('result')}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                >
                  결과 화면으로
                </button>
              </div>
              <div className="space-y-3.5">
                {currentRoundQuestions.map((q, idx) => {
                  const userAns = answers.find((a) => a.questionId === q.id);
                  const isCorrect = userAns ? userAns.isCorrect : false;
                  const selectedIdx = userAns ? userAns.selectedOption : -1;
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border ${
                        isCorrect ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                              isCorrect
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            Q{idx + 1} {isCorrect ? '정답' : '오답'}
                          </span>
                        </div>
                        {userAns && (
                          <span className="text-[11px] font-mono text-slate-500">
                            풀이시간: {(userAns.timeMs / 1000).toFixed(2)}s
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 mb-2.5">
                        {q.question}
                      </p>
                      <div className="space-y-1 mb-2.5">
                        {q.options.map((opt, oIdx) => {
                          const isTheCorrectOne = oIdx === q.answerIndex;
                          const isTheSelectedOne = oIdx === selectedIdx;
                          return (
                            <div
                              key={oIdx}
                              className={`text-xs p-2 rounded-lg flex items-center justify-between ${
                                isTheCorrectOne
                                  ? 'bg-emerald-100 font-bold text-emerald-900 border border-emerald-300'
                                  : isTheSelectedOne && !isCorrect
                                  ? 'bg-rose-100 font-bold text-rose-900 border border-rose-300'
                                  : 'text-slate-600 bg-white/70'
                              }`}
                            >
                              <span>
                                {oIdx + 1}. {opt}
                              </span>
                              {isTheCorrectOne && (
                                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-extrabold">
                                  정답
                                </span>
                              )}
                              {isTheSelectedOne && !isTheCorrectOne && (
                                <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.2 rounded font-extrabold">
                                  내가 선택한 오답
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="bg-white/90 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                        <strong className="text-emerald-700 block mb-0.5">정답 해설:</strong>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={handleResetToLobby}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm shadow-md transition cursor-pointer"
              >
                골든벨 대기실로 가기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
