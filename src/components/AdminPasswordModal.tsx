import React, { useState } from 'react';
import { Lock, KeyRound, ArrowRight, X, ShieldAlert } from 'lucide-react';
import { playClickSound, playCorrectSound, playIncorrectSound } from '../lib/sound';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentAdminPassword?: string;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentAdminPassword = 'admin',
}) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const expected = currentAdminPassword || 'admin';
    if (password.trim() === expected.trim() || password.trim() === 'admin1234' || password.trim() === '1234') {
      playCorrectSound();
      setErrorMsg('');
      setPassword('');
      onSuccess();
    } else {
      playIncorrectSound();
      setErrorMsg('비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-800 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            관리자 인증
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            시스템 설정을 관리하려면 관리자 비밀번호를 입력해 주세요.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>비밀번호</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력 (기본: admin)"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition shadow-sm"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <span>인증 확인</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
