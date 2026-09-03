import React, { useState } from 'react';
import { UserProfile, TreeLevelConfig } from '../types';
import { Trophy, Search, X, Hash } from 'lucide-react';

interface HallOfFameModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserProfile[];
  currentUser: UserProfile | null;
  treeLevels: TreeLevelConfig[];
}

export const HallOfFameModal: React.FC<HallOfFameModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  treeLevels,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Sort users by points DESC
  const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));

  // Filter users by 4-digit code search
  const filteredUsers = sortedUsers.filter((u) => {
    if (!searchTerm.trim()) return true;
    return u.code.includes(searchTerm.trim());
  });

  const top3 = sortedUsers.slice(0, 3);
  const myRankIndex = sortedUsers.findIndex((u) => u.id === currentUser?.id);

  const getLevelBadge = (level: number) => {
    const found = treeLevels.find((l) => l.level === level);
    return found ? `${found.badge} LV.${found.level}` : `LV.${level}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white border border-amber-200 rounded-3xl flex flex-col text-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-100 bg-gradient-to-r from-amber-50 via-white to-amber-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 shadow-xs shrink-0">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-sm sm:text-lg font-extrabold text-slate-900 leading-tight">
                  명예의 전당
                </h3>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-extrabold whitespace-nowrap shrink-0">
                  전체 개인 순위
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-relaxed break-keep">
                실천 약속, OX 퀴즈, 골든벨 종합 점수 랭킹입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* TOP 3 PODIUM (Individual 4-digit rankings) */}
          {top3.length > 0 && (
            <div className="pt-1 pb-1">
              <div className="flex items-end justify-center gap-2 sm:gap-3.5 max-w-md mx-auto">
                {/* 2nd Place (Silver) */}
                {top3[1] && (
                  <div className="flex-1 flex flex-col items-center animate-fade-in order-1">
                    <div className="text-xl sm:text-2xl mb-0.5">🥈</div>
                    <div className="w-full bg-gradient-to-b from-slate-100 to-slate-200 border-2 border-slate-300 rounded-t-2xl p-2 sm:p-2.5 text-center shadow-md h-24 sm:h-28 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 rounded-bl-xl shadow-sm border-b border-l border-slate-600 flex items-center gap-0.5">
                        <span>2위</span>
                      </div>
                      <div className="pt-2">
                        <span className="text-[10px] text-slate-400 block font-medium">참여 번호</span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono tracking-wider">
                          {top3[1].code}
                        </h4>
                        <span className="text-[10px] text-emerald-700 font-bold">{getLevelBadge(top3[1].treeLevel)}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-extrabold text-slate-800 pb-0.5">
                        {top3[1].points.toLocaleString()} <span className="text-[10px] font-normal">P</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place (Gold) */}
                {top3[0] && (
                  <div className="flex-1 flex flex-col items-center animate-fade-in order-2">
                    <div className="text-2xl sm:text-3xl mb-0.5 animate-bounce">👑</div>
                    <div className="w-full bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-400 rounded-t-2xl p-2 sm:p-2.5 text-center shadow-lg h-28 sm:h-34 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-white text-xs sm:text-sm font-black px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-bl-2xl shadow-md border-b border-l border-amber-600 flex items-center gap-1">
                        <span>1위</span>
                      </div>
                      <div className="pt-3">
                        <span className="text-[10px] text-amber-900 block font-semibold">최고 수호자</span>
                        <h4 className="text-sm sm:text-base md:text-lg font-black text-slate-900 font-mono tracking-wider">
                          {top3[0].code}
                        </h4>
                        <span className="text-[10px] sm:text-[11px] text-amber-800 font-bold">{getLevelBadge(top3[0].treeLevel)}</span>
                      </div>
                      <div className="text-xs sm:text-sm md:text-base font-extrabold text-amber-900 pb-0.5">
                        {top3[0].points.toLocaleString()} <span className="text-[10px] sm:text-xs font-normal">P</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place (Bronze) */}
                {top3[2] && (
                  <div className="flex-1 flex flex-col items-center animate-fade-in order-3">
                    <div className="text-xl sm:text-2xl mb-0.5">🥉</div>
                    <div className="w-full bg-gradient-to-b from-amber-50 to-orange-100 border-2 border-orange-200 rounded-t-2xl p-2 sm:p-2.5 text-center shadow-md h-22 sm:h-26 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-700 to-amber-800 text-white text-[10px] sm:text-xs font-black px-2 sm:px-2.5 py-0.5 rounded-bl-xl shadow-sm border-b border-l border-amber-900 flex items-center gap-0.5">
                        <span>3위</span>
                      </div>
                      <div className="pt-2">
                        <span className="text-[10px] text-slate-400 block font-medium">참여 번호</span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono tracking-wider">
                          {top3[2].code}
                        </h4>
                        <span className="text-[10px] text-emerald-700 font-bold">{getLevelBadge(top3[2].treeLevel)}</span>
                      </div>
                      <div className="text-xs sm:text-sm font-extrabold text-amber-800 pb-0.5">
                        {top3[2].points.toLocaleString()} <span className="text-[10px] font-normal">P</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current User Standing Banner */}
          {currentUser && myRankIndex >= 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-extrabold text-sm shadow-xs">
                  {myRankIndex + 1}위
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <span className="font-mono text-emerald-800 text-sm">{currentUser.code}</span>
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-normal">내 번호</span>
                    <span className="text-emerald-700 text-[11px] font-extrabold">{getLevelBadge(currentUser.treeLevel)}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    전체 {sortedUsers.length}명 중 {myRankIndex + 1}위 달성 중
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-extrabold text-emerald-700">
                  {currentUser.points.toLocaleString()} P
                </span>
              </div>
            </div>
          )}

          {/* Search Bar (Search by 4-digit code) */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="참여 번호 4자리 검색..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none shadow-xs font-mono"
              />
            </div>
          </div>

          {/* Full Individual Ranking Table (No department column, No name column) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[300px]">
                <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 whitespace-nowrap">순위</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">참여 번호</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">나무 등급</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">누적 포인트</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        {searchTerm ? '해당 번호의 참가자가 없습니다.' : '아직 등록된 참가자가 없습니다.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const actualRank = sortedUsers.findIndex((user) => user.id === u.id) + 1;
                      const isMe = u.id === currentUser?.id;
                      return (
                        <tr
                          key={u.id}
                          className={`transition ${
                            isMe
                              ? 'bg-emerald-50/80 font-bold text-emerald-900'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {actualRank === 1 ? (
                              <span className="font-extrabold text-amber-600 flex items-center gap-1">
                                🥇 1위
                              </span>
                            ) : actualRank === 2 ? (
                              <span className="font-extrabold text-slate-600 flex items-center gap-1">
                                🥈 2위
                              </span>
                            ) : actualRank === 3 ? (
                              <span className="font-extrabold text-amber-700 flex items-center gap-1">
                                🥉 3위
                              </span>
                            ) : (
                              <span className="text-slate-500 font-medium pl-1">{actualRank}위</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-900 tracking-wider">{u.code}</span>
                              {isMe && (
                                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-normal">
                                  내 번호
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] text-emerald-800 font-semibold inline-block">
                              {getLevelBadge(u.treeLevel)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                            {u.points.toLocaleString()} P
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
      </div>
    </div>
  );
};
