import React, { useState } from 'react';
import { PledgeItem, UserProfile } from '../types';
import { Search, X, CheckCircle, Hash } from 'lucide-react';

interface PledgeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pledges: PledgeItem[];
  currentUser: UserProfile | null;
  onToggleLikePledge?: (pledgeId: string) => void;
}

export const PledgeBoardModal: React.FC<PledgeBoardModalProps> = ({
  isOpen,
  onClose,
  pledges,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredPledges = pledges.filter((p) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      p.content.toLowerCase().includes(term) ||
      (p.userCode && p.userCode.includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white border border-emerald-100 rounded-3xl flex flex-col text-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl p-2 rounded-2xl bg-emerald-50 border border-emerald-200 shrink-0">
              🌿
            </span>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 flex-nowrap">
                <span className="shrink-0">전체 실천 약속 게시판</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold whitespace-nowrap shrink-0">
                  총 {pledges.length}건
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed break-keep">
                모든 참가자들의 개인정보보호 실천 약속입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar (Search by 4-digit code or content) */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="참여 번호 또는 약속 내용 검색..."
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPledges.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-sm">
              {searchTerm ? '검색 결과가 없습니다.' : '아직 등록된 실천 약속이 없습니다.'}
            </div>
          ) : (
            filteredPledges.map((pledge) => {
              const isMe = currentUser && (pledge.userId === currentUser.id || pledge.userCode === currentUser.code);
              return (
                <div
                  key={pledge.id}
                  className={`bg-white hover:bg-emerald-50/40 border rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-all ${
                    isMe
                      ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-extrabold font-mono text-emerald-800 flex items-center gap-1">
                        <Hash className="w-3 h-3 text-emerald-600" />
                        <span>{pledge.userCode}</span>
                      </span>
                      {isMe && (
                        <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold">
                          내 약속
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium leading-relaxed my-1">
                      "{pledge.content}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-[11px]">
                    <span className="text-slate-400">
                      {new Date(pledge.createdAt).toLocaleDateString('ko-KR')}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                      <span>실천 약속</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
