import React, { useState, useEffect } from 'react';
import { UserProfile, TreeLevelConfig } from '../types';
import { getOrCreateUserProfile } from '../lib/dataService';
import { ShieldCheck, Sparkles, Lock, X, AlertCircle, KeyRound } from 'lucide-react';
import { playClickSound, playCorrectSound, playIncorrectSound } from '../lib/sound';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  users?: UserProfile[];
  treeLevels: TreeLevelConfig[];
  onLoginSuccess: (user: UserProfile, isExisting: boolean) => void;
  onOpenAdminPrompt?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users = [],
  treeLevels,
  onLoginSuccess,
  onOpenAdminPrompt,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCode(numericOnly);
    setErrorMsg('');
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const targetCode = code.trim();
    if (targetCode.length !== 4) {
      setErrorMsg('숫자 4자리를 정확히 입력해 주세요. (예: 1234)');
      playIncorrectSound();
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      playClickSound();

      // Check in-memory users cache for instant zero-latency retrieval
      const cachedUser = users.find((u) => u.code === targetCode);
      if (cachedUser) {
        localStorage.setItem('privacy_tree_user_code', targetCode);
        playCorrectSound();
        onLoginSuccess(cachedUser, true);
        onClose();
        // Background sync touch
        getOrCreateUserProfile(targetCode, treeLevels, false).catch(() => {});
        return;
      }

      // Fast single Firestore lookup/create
      const { user, isExisting } = await getOrCreateUserProfile(
        targetCode,
        treeLevels,
        false
      );

      // Save to localStorage for automatic session restoration
      localStorage.setItem('privacy_tree_user_code', targetCode);

      playCorrectSound();
      onLoginSuccess(user, isExisting);
      onClose();
    } catch (err: unknown) {
      console.error('Login error:', err);
      const message = err instanceof Error ? err.message : '참여 처리 중 오류가 발생했습니다.';
      setErrorMsg(message);
      playIncorrectSound();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white border border-emerald-100 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-800 relative">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={() => {
            playClickSound();
            onClose();
          }}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            개인정보보호 참여 로그인
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            <strong className="text-emerald-700 font-bold">숫자 4자리</strong>로 참여합니다.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={(e) => handleLoginSubmit(e)} className="space-y-4">
          {/* 4-digit code input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>참여 번호 (숫자 4자리)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {code.length} / 4자리
              </span>
            </label>

            <div className="relative">
              <input
                id="login-input-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={code}
                onChange={handleInputChange}
                placeholder="숫자 4자리 입력 (예: 1234)"
                autoFocus
                className="w-full px-3 sm:px-4 py-3 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl text-center text-xl sm:text-2xl font-black font-mono tracking-widest text-slate-900 placeholder:text-xs sm:placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400 placeholder-slate-400 outline-none transition shadow-xs"
              />
            </div>

            <p className="text-[11px] text-slate-500 mt-2 text-center">
              ※ 처음 참여 시 신규 등록되며, 기존 참여자는 이전 기록이 즉시 복원됩니다.
            </p>
          </div>

          {/* Quick Digit Display visual helper */}
          <div className="flex justify-center gap-2 py-1">
            {[0, 1, 2, 3].map((idx) => {
              const char = code[idx];
              return (
                <div
                  key={idx}
                  className={`w-11 h-12 rounded-xl border-2 flex items-center justify-center font-mono font-extrabold text-lg transition-all ${
                    char
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {char || '•'}
                </div>
              );
            })}
          </div>

          {/* Submit Button */}
          <button
            id="login-submit-button"
            type="submit"
            disabled={loading || code.length !== 4}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition transform active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin">확인 중...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>4자리 번호로 참여하기</span>
              </>
            )}
          </button>
        </form>

        {/* Bottom Actions: Admin Mode access & dismiss */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              if (onOpenAdminPrompt) {
                onOpenAdminPrompt();
              }
            }}
            className="text-slate-500 hover:text-emerald-700 font-semibold flex items-center gap-1 transition py-1.5 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>관리자 모드</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <span>둘러보기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
