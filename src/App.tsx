import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  AppSettings,
  PledgeItem,
  OXQuiz,
  GoldenBellQuestion,
  TreeLevelConfig,
} from './types';
import {
  db,
  DEFAULT_APP_SETTINGS,
  DEFAULT_TREE_LEVELS,
  INITIAL_OX_QUIZZES,
  INITIAL_GOLDEN_BELL_QUESTIONS,
  initializeFirestoreDefaults,
} from './lib/firebase';
import {
  getOrCreateUserProfile,
  checkCodeRegistration,
  performWatering,
  toggleLikePledge,
  calculateTreeLevel,
  awardGoldenBellRoundBonuses,
} from './lib/dataService';
import { normalizeSchedule } from './lib/scheduleUtils';
import { collection, doc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';
import { Header } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { PromiseTreeVisual } from './components/PromiseTreeVisual';
import { PledgeModal } from './components/PledgeModal';
import { PledgeBoardModal } from './components/PledgeBoardModal';
import { OxQuizModal } from './components/OxQuizModal';
import { GoldenBellModal } from './components/GoldenBellModal';
import { HallOfFameModal } from './components/HallOfFameModal';
import { AdminModal } from './components/AdminModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { LevelUpModal } from './components/LevelUpModal';
import {
  Droplet,
  Trophy,
  PlusCircle,
  CheckCircle2,
  Bell,
} from 'lucide-react';
import { playClickSound, playLevelUpSound } from './lib/sound';
import confetti from 'canvas-confetti';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [pledges, setPledges] = useState<PledgeItem[]>([]);
  const [oxQuizzes, setOxQuizzes] = useState<OXQuiz[]>(INITIAL_OX_QUIZZES);
  const [goldenBellQuestions, setGoldenBellQuestions] = useState<GoldenBellQuestion[]>(INITIAL_GOLDEN_BELL_QUESTIONS);

  // Modal open states
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isPledgeOpen, setIsPledgeOpen] = useState(false);
  const [isPledgeBoardOpen, setIsPledgeBoardOpen] = useState(false);
  const [isOxQuizOpen, setIsOxQuizOpen] = useState(false);
  const [isGoldenBellOpen, setIsGoldenBellOpen] = useState(false);
  const [isHallOfFameOpen, setIsHallOfFameOpen] = useState(false);
  const [isAdminPasswordOpen, setIsAdminPasswordOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<TreeLevelConfig | null>(null);

  // Refs for real-time listener synchronization without stale closure
  const currentUserRef = useRef<UserProfile | null>(null);
  const sessionStartTimeRef = useRef<number>(Date.now());
  const isAdminOpenRef = useRef<boolean>(false);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    isAdminOpenRef.current = isAdminOpen;
  }, [isAdminOpen]);

  // Toast message state
  const [toastMessage, setToastMessage] = useState<{ text: string; type?: 'info' | 'success' } | null>(null);
  const [soundActive, setSoundActive] = useState(true);
  const [isWateringLoading, setIsWateringLoading] = useState(false);

  const showToast = (text: string, type: 'info' | 'success' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Forced logout when admin resets participants or total data
  const forceParticipantLogout = (reason: string = '참여자 데이터가 초기화되어 로그아웃되었습니다.') => {
    localStorage.removeItem('privacy_tree_user_code');
    currentUserRef.current = null;
    setCurrentUser(null);
    setIsPledgeOpen(false);
    setIsPledgeBoardOpen(false);
    setIsOxQuizOpen(false);
    setIsGoldenBellOpen(false);
    setIsHallOfFameOpen(false);
    setLevelUpLevel(null);
    setIsWateringLoading(false);

    // If admin panel is currently open on this screen, do not overlap with login modal
    if (!isAdminOpenRef.current) {
      setIsLoginOpen(true);
    }
    showToast(reason, 'info');
  };

  // 1. Initialize Firestore collections and Listeners
  useEffect(() => {
    let unsubscribeSettings = () => {};
    let unsubscribeUsers = () => {};
    let unsubscribePledges = () => {};
    let unsubscribeOx = () => {};
    let unsubscribeGb = () => {};

    const setupApp = async () => {
      const initSettings = await initializeFirestoreDefaults();
      setSettings(initSettings);

      // Listen to settings
      unsubscribeSettings = onSnapshot(doc(db, 'app_settings', 'config'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const newSettings = { ...DEFAULT_APP_SETTINGS, ...data } as AppSettings;
          setSettings(newSettings);

          // If admin triggered participant reset after participant's current session started
          if (
            newSettings.lastResetUsersAt &&
            newSettings.lastResetUsersAt > sessionStartTimeRef.current &&
            currentUserRef.current
          ) {
            forceParticipantLogout('관리자에 의해 참여자 데이터가 초기화되어 로그아웃되었습니다.');
          }
        }
      });

      // Listen to users
      unsubscribeUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const list = snap.docs.map((d) => d.data() as UserProfile);
        setUsers(list);

        // Keep current user updated, or force logout if deleted/reset by admin
        if (currentUserRef.current) {
          const updatedSelf = list.find(
            (u) => u.id === currentUserRef.current?.id || u.code === currentUserRef.current?.code
          );
          if (!updatedSelf) {
            // User record was wiped by admin reset!
            forceParticipantLogout('참여자 데이터가 초기화되어 로그아웃되었습니다.');
          } else {
            currentUserRef.current = updatedSelf;
            setCurrentUser(updatedSelf);
          }
        }
      });

      // Listen to pledges
      const pledgesQuery = query(collection(db, 'pledges'), orderBy('createdAt', 'desc'));
      unsubscribePledges = onSnapshot(pledgesQuery, (snap) => {
        const list = snap.docs.map((d) => d.data() as PledgeItem);
        setPledges(list);
      });

      // Listen to OX quizzes
      unsubscribeOx = onSnapshot(collection(db, 'ox_quizzes'), (snap) => {
        if (!snap.empty) {
          setOxQuizzes(snap.docs.map((d) => d.data() as OXQuiz));
        }
      });

      // Listen to Golden Bell Questions
      unsubscribeGb = onSnapshot(collection(db, 'golden_bell_questions'), (snap) => {
        if (!snap.empty) {
          setGoldenBellQuestions(snap.docs.map((d) => d.data() as GoldenBellQuestion));
        }
      });

      // Auto-restore previous user from LocalStorage by 4-digit code (re-entry)
      try {
        const savedCode = localStorage.getItem('privacy_tree_user_code');
        if (savedCode && /^\d{4}$/.test(savedCode)) {
          // Verify user still exists in Firestore (prevent ghost restoration after admin reset)
          const { exists, user } = await checkCodeRegistration(savedCode);
          if (exists && user) {
            sessionStartTimeRef.current = Date.now();
            currentUserRef.current = user;
            setCurrentUser(user);
            setIsLoginOpen(false);
            showToast(`환영합니다! (${user.code} / ${user.points}P)`, 'success');
          } else {
            // Document was wiped by admin reset
            localStorage.removeItem('privacy_tree_user_code');
            currentUserRef.current = null;
            setCurrentUser(null);
            setIsLoginOpen(true);
          }
        } else {
          // Open login modal for first-time / logged-out visitors
          setIsLoginOpen(true);
        }
      } catch (err) {
        console.error('Auto login check failed:', err);
        setIsLoginOpen(true);
      }
    };

    setupApp();

    return () => {
      unsubscribeSettings();
      unsubscribeUsers();
      unsubscribePledges();
      unsubscribeOx();
      unsubscribeGb();
    };
  }, []);

  // Periodic check: Auto-award Top 3 +50P bonus when a Golden Bell round concludes
  useEffect(() => {
    const checkScheduleAndEndRound = async () => {
      if (!settings.goldenBellSchedule) return;
      const schedule = normalizeSchedule(settings.goldenBellSchedule);
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // 1. If active LIVE round has reached its scheduled endTime
      if (
        settings.roundStatus === 'in_progress' &&
        settings.activeRound !== null &&
        settings.activeRound !== undefined
      ) {
        const currentItem = schedule[settings.activeRound];
        if (currentItem) {
          const [endH, endM] = currentItem.endTime.split(':').map(Number);
          const endMinutes = (endH || 0) * 60 + (endM || 0);
          if (currentMinutes >= endMinutes) {
            const activeIdx = settings.activeRound;
            try {
              await updateDoc(doc(db, 'app_settings', 'config'), {
                roundStatus: 'ended',
                activeRound: null,
              });
              const { awardedUsers } = await awardGoldenBellRoundBonuses(
                activeIdx,
                { first: 50, second: 50, third: 50 },
                settings.treeLevels || DEFAULT_TREE_LEVELS
              );
              if (awardedUsers.length > 0) {
                showToast(`제 ${activeIdx + 1} 라운드 종료! TOP 3 참가자에게 보너스 +50P 지급 완료`, 'success');
              }
            } catch (e) {
              console.error('Auto end round error:', e);
            }
          }
        }
      }

      // 2. Award any un-awarded Top 3 bonus for past ended rounds
      for (let i = 0; i < schedule.length; i++) {
        const item = schedule[i];
        const [endH, endM] = item.endTime.split(':').map(Number);
        const endMinutes = (endH || 0) * 60 + (endM || 0);
        if (currentMinutes > endMinutes) {
          try {
            const { awardedUsers } = await awardGoldenBellRoundBonuses(
              i,
              { first: 50, second: 50, third: 50 },
              settings.treeLevels || DEFAULT_TREE_LEVELS
            );
            if (awardedUsers.length > 0) {
              showToast(`제 ${i + 1} 라운드 종료! TOP 3 참가자에게 보너스 +50P 지급 완료`, 'success');
            }
          } catch (e) {
            // silent catch
          }
        }
      }
    };

    const interval = setInterval(checkScheduleAndEndRound, 20000);
    return () => clearInterval(interval);
  }, [settings]);

  // Handle User Login
  const handleLoginSuccess = (user: UserProfile, isExisting: boolean) => {
    localStorage.setItem('privacy_tree_user_code', user.code);
    sessionStartTimeRef.current = Date.now();
    currentUserRef.current = user;
    setCurrentUser(user);
    if (isExisting) {
      showToast(`로그인 완료! ${user.code} (${user.points}P 보유)`, 'success');
    } else {
      showToast(`환영합니다! 참여 번호 [${user.code}] 등록 완료 (+물방울 1개)`, 'success');
    }
  };

  // Handle Watering Action
  const handleWatering = () => {
    if (!currentUser || currentUser.waterDrops <= 0 || isWateringLoading) return;

    const prevUser = currentUser;
    const pointsPerWater = settings.wateringRewardPoints || 10;
    const newPoints = prevUser.points + pointsPerWater;
    const newWaterDrops = Math.max(0, prevUser.waterDrops - 1);
    const newWaterCount = (prevUser.waterCount || 0) + 1;
    const treeLevels = settings.treeLevels || DEFAULT_TREE_LEVELS;
    const newLevel = calculateTreeLevel(newPoints, treeLevels);
    const isLevelUp = newLevel > prevUser.treeLevel;

    // 1. Instant optimistic state update
    const optimisticUser: UserProfile = {
      ...prevUser,
      points: newPoints,
      waterDrops: newWaterDrops,
      waterCount: newWaterCount,
      treeLevel: newLevel,
      lastActive: Date.now(),
    };
    setCurrentUser(optimisticUser);

    // 2. Instant visual & sound reaction
    if (isLevelUp) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
      playLevelUpSound();
      const newLvlCfg = treeLevels.find((l) => l.level === newLevel);
      if (newLvlCfg) {
        setLevelUpLevel(newLvlCfg);
      }
    } else {
      showToast('물주기 완료! (+10P)', 'success');
    }

    setIsWateringLoading(true);
    setTimeout(() => setIsWateringLoading(false), 300);

    // 3. Background sync
    performWatering(
      prevUser.id,
      treeLevels,
      pointsPerWater
    ).catch((err) => {
      console.error('Background watering sync error:', err);
      setCurrentUser(prevUser);
      showToast('물주기 저장 실패.', 'info');
    });
  };

  // Handle Toggle Like Pledge
  const handleToggleLike = (pledgeId: string) => {
    if (!currentUser) return;
    playClickSound();

    setPledges((prevPledges) =>
      prevPledges.map((p) => {
        if (p.id !== pledgeId) return p;
        const likedBy = p.likedBy || [];
        const hasLiked = likedBy.includes(currentUser.id);
        const newLikedBy = hasLiked
          ? likedBy.filter((id) => id !== currentUser.id)
          : [...likedBy, currentUser.id];
        const newLikes = hasLiked ? Math.max(0, (p.likes || 1) - 1) : (p.likes || 0) + 1;
        return {
          ...p,
          likes: newLikes,
          likedBy: newLikedBy,
        };
      })
    );

    toggleLikePledge(pledgeId, currentUser.id).catch((err) => {
      console.error('Like toggle background sync error:', err);
    });
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('privacy_tree_user_code');
    currentUserRef.current = null;
    setCurrentUser(null);
    setIsLoginOpen(true);
    showToast('로그아웃되었습니다.', 'info');
  };

  // Admin access with password
  const handleRequestAdminOpen = () => {
    setIsAdminPasswordOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold shadow-xl flex items-center gap-2 border ${
              toastMessage.type === 'success'
                ? 'bg-emerald-900 border-emerald-500 text-emerald-100'
                : 'bg-slate-900 border-sky-500 text-sky-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        user={currentUser}
        settings={settings}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenGoldenBell={() => setIsGoldenBellOpen(true)}
        onOpenAdmin={handleRequestAdminOpen}
        onOpenHallOfFame={() => setIsHallOfFameOpen(true)}
        onLogout={handleLogout}
        soundActive={soundActive}
        setSoundActive={setSoundActive}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col items-center justify-start space-y-4 sm:space-y-5">
        {/* Promise Tree Main Screen (Centerpiece) */}
        <PromiseTreeVisual
          user={currentUser}
          treeLevels={settings.treeLevels}
          pledges={pledges}
          onWatering={handleWatering}
          onOpenPledgeModal={() => {
            if (!currentUser) setIsLoginOpen(true);
            else setIsPledgeOpen(true);
          }}
          onOpenPledgeBoard={() => setIsPledgeBoardOpen(true)}
          onToggleLikePledge={handleToggleLike}
          isWateringLoading={isWateringLoading}
        />

        {/* Quick Menu (Bottom Bar / Cards - exact same width as tree card) */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {/* OX Quiz Button */}
          <button
            id="quick-btn-ox-quiz"
            onClick={() => {
              playClickSound();
              if (!currentUser) setIsLoginOpen(true);
              else setIsOxQuizOpen(true);
            }}
            className="p-3.5 rounded-3xl bg-white hover:bg-sky-50/50 border border-slate-200 hover:border-sky-300 text-left shadow-xs hover:shadow-sm transition-all active:scale-95 group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 group-hover:scale-105 transition">
                <Droplet className="w-5 h-5 fill-sky-500" />
              </span>
              <span className="text-[10px] font-extrabold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                물방울 획득
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-sky-700 transition">
                보안 OX 퀴즈
              </h3>
              <p className="text-[11px] text-slate-500">정답 시 물방울 지급</p>
            </div>
          </button>

          {/* Golden Bell Button */}
          <button
            id="quick-btn-golden-bell"
            onClick={() => {
              playClickSound();
              if (!currentUser) setIsLoginOpen(true);
              else setIsGoldenBellOpen(true);
            }}
            className="p-3.5 rounded-3xl bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 text-left shadow-xs hover:shadow-sm transition-all active:scale-95 group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition">
                <Bell className="w-5 h-5 animate-pulse" />
              </span>
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                스피드런 5문항
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-amber-700 transition">
                스피드 골든벨
              </h3>
              <p className="text-[11px] text-slate-500">라운드별 TOP 3 보너스</p>
            </div>
          </button>

          {/* All Pledges Button */}
          <button
            id="quick-btn-pledges"
            onClick={() => {
              playClickSound();
              setIsPledgeBoardOpen(true);
            }}
            className="p-3.5 rounded-3xl bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left shadow-xs hover:shadow-sm transition-all active:scale-95 group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition">
                <PlusCircle className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                총 {pledges.length}건
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                실천 약속 게시판
              </h3>
              <p className="text-[11px] text-slate-500">전체 참가자 약속 열람</p>
            </div>
          </button>

          {/* Hall of Fame Button */}
          <button
            id="quick-btn-hall-of-fame"
            onClick={() => {
              playClickSound();
              setIsHallOfFameOpen(true);
            }}
            className="p-3.5 rounded-3xl bg-white hover:bg-purple-50/50 border border-slate-200 hover:border-purple-300 text-left shadow-xs hover:shadow-sm transition-all active:scale-95 group flex flex-col justify-between cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="p-2 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 group-hover:scale-105 transition">
                <Trophy className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                개인별 랭킹
              </span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition">
                명예의 전당
              </h3>
              <p className="text-[11px] text-slate-500">누적 포인트 전체 순위</p>
            </div>
          </button>
        </div>
      </main>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        currentUser={currentUser}
        users={users}
        treeLevels={settings.treeLevels}
        onLoginSuccess={handleLoginSuccess}
        onOpenAdminPrompt={() => {
          setIsLoginOpen(false);
          setIsAdminPasswordOpen(true);
        }}
      />

      <PledgeModal
        isOpen={isPledgeOpen}
        onClose={() => setIsPledgeOpen(false)}
        user={currentUser}
        treeLevels={settings.treeLevels}
        existingPledges={pledges}
        presetPledges={settings.presetPledges}
        onPledgeCreated={(updatedUser) => {
          setCurrentUser(updatedUser);
          showToast('실천 약속 등록 완료! +30P 적립.', 'success');
        }}
      />

      <PledgeBoardModal
        isOpen={isPledgeBoardOpen}
        onClose={() => setIsPledgeBoardOpen(false)}
        pledges={pledges}
        currentUser={currentUser}
        onToggleLikePledge={handleToggleLike}
      />

      <OxQuizModal
        isOpen={isOxQuizOpen}
        onClose={() => setIsOxQuizOpen(false)}
        user={currentUser}
        quizzes={oxQuizzes}
        onQuizCompleted={(updatedUser, drops) => {
          setCurrentUser(updatedUser);
          if (drops > 0) {
            showToast(`정답! 물방울 +${drops}개 획득.`, 'success');
          }
        }}
      />

      <GoldenBellModal
        isOpen={isGoldenBellOpen}
        onClose={() => setIsGoldenBellOpen(false)}
        user={currentUser}
        settings={settings}
        treeLevels={settings.treeLevels}
        questions={goldenBellQuestions}
        onSubmissionComplete={(updatedUser) => {
          setCurrentUser(updatedUser);
          showToast('골든벨 제출이 완료되었습니다.', 'success');
        }}
      />

      <HallOfFameModal
        isOpen={isHallOfFameOpen}
        onClose={() => setIsHallOfFameOpen(false)}
        users={users}
        currentUser={currentUser}
        treeLevels={settings.treeLevels}
      />

      <AdminPasswordModal
        isOpen={isAdminPasswordOpen}
        onClose={() => setIsAdminPasswordOpen(false)}
        currentAdminPassword={settings.adminPassword || 'admin'}
        onSuccess={() => {
          setIsAdminPasswordOpen(false);
          setIsAdminOpen(true);
        }}
      />

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => {
          setIsAdminOpen(false);
          if (!currentUserRef.current) {
            setIsLoginOpen(true);
          }
        }}
        settings={settings}
        users={users}
        pledges={pledges}
        quizzes={oxQuizzes}
        goldenBellQuestions={goldenBellQuestions}
        onSettingsUpdated={(newSettings) => setSettings(newSettings)}
        onResetParticipants={() => forceParticipantLogout('참여자 데이터가 초기화되어 로그아웃되었습니다.')}
        onResetAll={() => forceParticipantLogout('전체 시스템 데이터가 초기화되어 로그아웃되었습니다.')}
      />

      {levelUpLevel && (
        <LevelUpModal
          isOpen={!!levelUpLevel}
          onClose={() => setLevelUpLevel(null)}
          newLevelConfig={levelUpLevel}
        />
      )}
    </div>
  );
}
