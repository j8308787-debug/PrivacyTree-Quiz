import React, { useState } from 'react';
import { UserProfile, TreeLevelConfig, PledgeItem } from '../types';
import { createPledge, calculateTreeLevel } from '../lib/dataService';
import { DEFAULT_PRESET_PLEDGES } from '../lib/firebase';
import { Sparkles, Check, X, ShieldAlert, Hash } from 'lucide-react';
import { playCorrectSound, playClickSound } from '../lib/sound';

interface PledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  treeLevels: TreeLevelConfig[];
  existingPledges?: PledgeItem[];
  presetPledges?: string[];
  onPledgeCreated: (updatedUser: UserProfile) => void;
}

export const PledgeModal: React.FC<PledgeModalProps> = ({
  isOpen,
  onClose,
  user,
  treeLevels,
  existingPledges = [],
  presetPledges,
  onPledgeCreated,
}) => {
  const [content, setContent] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const activePresets = presetPledges !== undefined ? presetPledges : DEFAULT_PRESET_PLEDGES;

  // Get list of promises already registered by this 4-digit participant
  const myExistingPledges = existingPledges.filter((p) => p.userId === user.id || p.userCode === user.code);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setErrorMsg('실천 약속 내용을 입력해 주세요.');
      return;
    }
    if (trimmed.length < 5) {
      setErrorMsg('약속 내용을 5자 이상 성실히 작성해 주세요.');
      return;
    }

    // Check for duplicate pledge by the same user
    const isDuplicate = myExistingPledges.some(
      (p) => p.content.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg('이미 등록하신 동일한 실천 약속입니다! 다른 약속을 작성해 주세요.');
      return;
    }

    playClickSound();
    const colorChoices = ['#ECFDF5', '#EFF6FF', '#FEF3C7', '#FCE7F3', '#F3E8FF'];
    const randomColor = colorChoices[Math.floor(Math.random() * colorChoices.length)];

    // 1. Instant optimistic user profile update (+30P and level check)
    const newPoints = (user.points || 0) + 30;
    const newLevel = calculateTreeLevel(newPoints, treeLevels);
    const optimisticUser: UserProfile = {
      ...user,
      points: newPoints,
      pledgeCount: (user.pledgeCount || 0) + 1,
      treeLevel: newLevel,
      lastActive: Date.now(),
    };

    // 2. Instant visual completion (0ms delay)
    playCorrectSound();
    onPledgeCreated(optimisticUser);
    const pledgeText = trimmed;
    setContent('');
    setErrorMsg('');
    onClose();

    // 3. Background non-blocking Firestore sync
    createPledge(user, pledgeText, randomColor, treeLevels, 30).catch((err: unknown) => {
      console.error('Pledge create background sync error:', err);
    });
  };

  const handleSelectPreset = (preset: string) => {
    playClickSound();
    setContent(preset);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-emerald-100 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-800 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2">
            <Sparkles className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            개인정보보호 실천 약속
          </h3>
          <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
            <span>참여 번호</span>
            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {user.code}
            </span>
            <span>| 등록 시 +30P 적립</span>
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700">
              추천 실천 약속 (클릭 시 자동 입력)
            </label>
            {myExistingPledges.length > 0 && (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                내 작성 약속 {myExistingPledges.length}건
              </span>
            )}
          </div>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {activePresets.length === 0 ? (
              <div className="text-center py-3 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                등록된 추천 실천 약속 문구가 없습니다.
              </div>
            ) : (
              activePresets.map((preset, idx) => {
                const alreadyUsed = myExistingPledges.some(
                  (p) => p.content.trim().toLowerCase() === preset.trim().toLowerCase()
                );
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left text-xs p-2 rounded-xl border transition flex items-center justify-between gap-2 cursor-pointer ${
                      content === preset
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                        : alreadyUsed
                        ? 'bg-slate-100/70 border-slate-200 text-slate-400 hover:bg-slate-100'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="truncate">{preset}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {alreadyUsed && (
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-200/80 px-1.5 py-0.5 rounded">
                          이미 작성함
                        </span>
                      )}
                      {content === preset && <Check className="w-3.5 h-3.5 text-emerald-600 ml-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Custom Textarea Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              실천 약속 직접 작성
            </label>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              rows={3}
              maxLength={120}
              placeholder="나만의 개인정보보호 실천 약속을 작성해 주세요..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:bg-white rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition resize-none shadow-xs"
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">
              {content.length} / 120자
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-200" />
              <span>약속 등록 (+30P)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
