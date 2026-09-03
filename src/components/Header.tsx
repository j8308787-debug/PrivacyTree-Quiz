import React from 'react';
import { UserProfile, AppSettings } from '../types';
import { Droplet, Award, Bell, Shield, Volume2, VolumeX, LogOut, Settings, Sparkles, Hash } from 'lucide-react';
import { toggleSound, playClickSound } from '../lib/sound';
import { normalizeSchedule, getRoundTimeStatus } from '../lib/scheduleUtils';

interface HeaderProps {
  user: UserProfile | null;
  settings: AppSettings;
  onOpenLogin: () => void;
  onOpenGoldenBell: () => void;
  onOpenAdmin: () => void;
  onOpenHallOfFame: () => void;
  onLogout?: () => void;
  soundActive: boolean;
  setSoundActive: (active: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  settings,
  onOpenLogin,
  onOpenGoldenBell,
  onOpenAdmin,
  onOpenHallOfFame,
  onLogout,
  soundActive,
  setSoundActive,
}) => {
  const [nowTime, setNowTime] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSound = () => {
    const updated = toggleSound();
    setSoundActive(updated);
  };

  const scheduleList = normalizeSchedule(settings.goldenBellSchedule);

  // Find next or active golden bell round
  const getNextGoldenBellInfo = () => {
    if (settings.roundStatus === 'in_progress') {
      const liveRound = (settings.activeRound ?? 0) + 1;
      return {
        label: `제 ${liveRound} 라운드 LIVE 진행 중!`,
        isLive: true,
        isSoon: false,
      };
    }
    if (settings.roundStatus === 'countdown') {
      const liveRound = (settings.activeRound ?? 0) + 1;
      return {
        label: `제 ${liveRound} 라운드 곧 시작!`,
        isLive: true,
        isSoon: true,
      };
    }
    if (!scheduleList || scheduleList.length === 0) {
      return {
        label: '골든벨 일정이 대기 중입니다.',
        isLive: false,
        isSoon: false,
      };
    }

    const now = new Date(nowTime);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Check if any round in schedule is currently active by time
    for (let i = 0; i < scheduleList.length; i++) {
      const item = scheduleList[i];
      const status = getRoundTimeStatus(item, settings.roundStatus, settings.activeRound);
      if (status === 'active') {
        return {
          label: `제 ${item.round} 라운드 LIVE (${item.startTime} ~ ${item.endTime})`,
          isLive: true,
          isSoon: false,
        };
      }
    }

    // 2. Check for upcoming round
    for (let i = 0; i < scheduleList.length; i++) {
      const item = scheduleList[i];
      const [h, m] = item.startTime.split(':').map(Number);
      const scheduleMinutes = (h || 0) * 60 + (m || 0);
      if (scheduleMinutes > currentMinutes) {
        const diffMinutes = scheduleMinutes - currentMinutes;
        return {
          label: diffMinutes <= 1
            ? `제 ${item.round} 라운드 1분 전 대기!`
            : `다음: 제 ${item.round} 라운드 (${item.startTime} ~ ${item.endTime})`,
          isLive: false,
          isSoon: diffMinutes <= 1,
        };
      }
    }

    // 3. If all scheduled rounds have passed
    return {
      label: `오늘의 골든벨 (${scheduleList.length}개 라운드) 종료`,
      isLive: false,
      isSoon: false,
    };
  };

  const bellInfo = getNextGoldenBellInfo();

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-emerald-100 sticky top-0 z-40 shadow-sm">
      {/* Golden Bell Live/Countdown Banner */}
      <div
        id="golden-bell-top-banner"
        onClick={() => {
          playClickSound();
          onOpenGoldenBell();
        }}
        className={`w-full py-1.5 px-3 sm:px-4 text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer transition-all ${
          bellInfo.isLive || bellInfo.isSoon
            ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 text-white animate-pulse shadow-sm'
            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-b border-emerald-100'
        }`}
      >
        <Bell className={`w-3.5 h-3.5 flex-shrink-0 ${bellInfo.isLive ? 'animate-bounce text-yellow-200' : 'text-amber-500'}`} />
        <span className="truncate max-w-[240px] sm:max-w-none text-[11px] sm:text-xs font-bold">{bellInfo.label}</span>
        <span className="bg-white/80 text-slate-800 px-2 py-0.5 rounded-full text-[10px] tracking-wide font-bold shadow-xs whitespace-nowrap">
          {bellInfo.isLive ? '입장하기' : '일정확인'}
        </span>
      </div>

      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Logo */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-600/20 text-white flex-shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[11px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                  개인정보보호 주간
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1 mt-0.5 whitespace-nowrap">
                <span>개인정보 보호 약속나무</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              </h1>
            </div>
          </div>

          {/* Sound & Admin & Logout Buttons (Mobile compact corner) */}
          <div className="flex items-center gap-1 sm:hidden">
            <button
              id="btn-toggle-sound-mobile"
              onClick={handleToggleSound}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title={soundActive ? '소리 끄기' : '소리 켜기'}
            >
              {soundActive ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
            <button
              id="btn-admin-console-mobile"
              onClick={() => {
                playClickSound();
                onOpenAdmin();
              }}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
              title="관리자 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
            {user && (
              <button
                id="btn-logout-mobile"
                onClick={() => {
                  playClickSound();
                  if (onLogout) onLogout();
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition shadow-xs cursor-pointer flex items-center justify-center"
                title="로그아웃"
                aria-label="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* User Info & Stats Pill - Strictly 4-digit code only (No department, no name) */}
        {user ? (
          <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2.5 w-full sm:w-auto">
            {/* 4-digit code badge and stats */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-emerald-50/80 border border-emerald-200/80 rounded-full px-2.5 sm:px-3.5 py-1 text-xs text-slate-800 shadow-xs flex-1 sm:flex-none justify-between sm:justify-start whitespace-nowrap">
              <div className="flex items-center gap-1">
                <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Hash className="w-2.5 h-2.5" />
                  <span>{user.code}</span>
                </span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm">참여자</span>
              </div>

              <div className="h-3 w-px bg-emerald-200 mx-0.5 flex-shrink-0" />

              {/* Points */}
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onOpenHallOfFame();
                }}
                className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-extrabold cursor-pointer"
                title="명예의 전당 보기"
              >
                <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>{user.points.toLocaleString()} P</span>
              </button>

              <div className="h-3 w-px bg-emerald-200 mx-0.5 flex-shrink-0" />

              {/* Water Drops */}
              <div
                className="flex items-center gap-1 text-sky-600 font-extrabold"
                title="보유 물방울"
              >
                <Droplet className="w-3.5 h-3.5 fill-sky-500 text-sky-500 flex-shrink-0" />
                <span>{user.waterDrops}개</span>
              </div>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                id="btn-toggle-sound"
                onClick={handleToggleSound}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title={soundActive ? '소리 끄기' : '소리 켜기'}
              >
                {soundActive ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
              </button>
              <button
                id="btn-admin-console"
                onClick={() => {
                  playClickSound();
                  onOpenAdmin();
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                title="관리자 설정"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                id="btn-switch-user"
                onClick={() => {
                  playClickSound();
                  if (onLogout) onLogout();
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition shadow-xs cursor-pointer flex items-center justify-center"
                title="로그아웃"
                aria-label="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 justify-end">
            <button
              id="btn-login-header"
              onClick={onOpenLogin}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer"
            >
              4자리 번호로 참여
            </button>
            <button
              id="btn-admin-header-no-login"
              onClick={onOpenAdmin}
              className="hidden sm:block p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 transition cursor-pointer"
              title="관리자 설정"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
