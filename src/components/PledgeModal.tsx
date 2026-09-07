import React, { useState } from 'react';
import { UserProfile, TreeLevelConfig, PledgeItem } from '../types';
import { createPledge, calculateTreeLevel } from '../lib/dataService';
import { DEFAULT_PRESET_PLEDGES } from '../lib/firebase';
import { Sparkles, Check, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !user) return null;

  const activePresets = presetPledges !== undefined ? presetPledges : DEFAULT_PRESET_PLEDGES;

  // Get list of promises already registered by this 4-digit participant
  const myExistingPledges = existingPledges.filter((p) => p.userId === user.id || p.userCode === user.code);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = selectedPreset.trim();
    if (!trimmed) {
      setErrorMsg('목록에서 등록할 실천 약속을 하나 선택해 주세요.');
      return;
    }

    // Check for duplicate pledge by the same user
    const isDuplicate = myExistingPledges.some(
      (p) => p.content.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMsg('이미 등록하신 동일한 실천 약속입니다! 다른 약속을 선택해 주세요.');
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
    setSelectedPreset('');
    setErrorMsg('');
    onClose();

    // 3. Background non-blocking Firestore sync
    createPledge(user, pledgeText, randomColor, treeLevels, 30).catch((err: unknown) => {
      console.error('Pledge create background sync error:', err);
    });
  };

  const handleSelectPreset = (preset: string) => {
    playClickSound();
    setSelectedPreset(preset);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white border border-emerald-100 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-800 relative flex flex-col max-h-[92vh] overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-4 shrink-0">
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
          <div className="mb-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2 shrink-0">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* Presets Selection List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 mb-4">
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700">
              실천할 약속을 목록에서 선택해 주세요
            </label>
            {myExistingPledges.length > 0 && (
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                내 작성 약속 {myExistingPledges.length}건
              </span>
            )}
          </div>

          {activePresets.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
              등록된 실천 약속 문구가 없습니다.
            </div>
          ) : (
            activePresets.map((preset, idx) => {
              const alreadyUsed = myExistingPledges.some(
                (p) => p.content.trim().toLowerCase() === preset.trim().toLowerCase()
              );
              const isSelected = selectedPreset === preset;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={alreadyUsed}
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-bold ring-2 ring-emerald-500/20 shadow-xs'
                      : alreadyUsed
                      ? 'bg-slate-100/60 border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold mt-0.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-xs leading-relaxed break-keep">{preset}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {alreadyUsed ? (
                      <span className="text-[10px] text-slate-500 font-bold bg-slate-200 px-2 py-0.5 rounded-md">
                        이미 등록됨
                      </span>
                    ) : isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-300 bg-white" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Selected Preview & Submit */}
        <div className="pt-3 border-t border-slate-100 shrink-0 space-y-3">
          {selectedPreset ? (
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold truncate">선택됨: &ldquo;{selectedPreset}&rdquo;</span>
            </div>
          ) : (
            <p className="text-center text-[11px] text-slate-400">
              위 목록에서 실천할 약속을 1개 터치하여 선택해 주세요.
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!selectedPreset}
              className={`flex-1 py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition active:scale-98 ${
                selectedPreset
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-700/20 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>실천 약속 등록하기 (+30P)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
