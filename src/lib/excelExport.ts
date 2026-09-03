import * as XLSX from 'xlsx';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  PledgeItem,
  OXQuiz,
  GoldenBellQuestion,
  GoldenBellSubmission,
  AppSettings,
} from '../types';

export async function exportAllDataToExcel(
  users: UserProfile[],
  pledges: PledgeItem[],
  oxQuizzes: OXQuiz[],
  goldenBellQuestions: GoldenBellQuestion[],
  settings?: AppSettings
): Promise<string> {
  // 1. Fetch all Golden Bell Submissions from Firestore
  let submissions: GoldenBellSubmission[] = [];
  try {
    const submissionsSnap = await getDocs(collection(db, 'golden_bell_submissions'));
    submissions = submissionsSnap.docs.map((d) => d.data() as GoldenBellSubmission);
  } catch (err) {
    console.error('Failed to fetch submissions for excel export:', err);
  }

  // 2. Sheet 1: Participants (sorted by points descending)
  const sortedUsers = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
  const userRows = sortedUsers.map((u, idx) => ({
    '순위': idx + 1,
    '참가번호 (4자리)': u.code,
    '포인트 (P)': u.points || 0,
    '나무 등급': `Level ${u.treeLevel || 1}`,
    '보유 물방울': u.waterDrops || 0,
    '물주기 횟수': u.waterCount || 0,
    '실천 다짐 수': u.pledgeCount || 0,
    'OX 퀴즈 완료 수': u.completedOxIds ? u.completedOxIds.length : 0,
    '골든벨 참여 라운드': u.goldenBellRoundsPlayed ? u.goldenBellRoundsPlayed.length : 0,
    '최근 활동일': u.lastActive ? new Date(u.lastActive).toLocaleString('ko-KR') : '-',
    '등록일시': u.createdAt ? new Date(u.createdAt).toLocaleString('ko-KR') : '-',
  }));

  // 3. Sheet 2: Pledges (sorted by createdAt descending)
  const sortedPledges = [...pledges].sort((a, b) => b.createdAt - a.createdAt);
  const pledgeRows = sortedPledges.map((p, idx) => ({
    '순번': idx + 1,
    '참가번호 (4자리)': p.userCode,
    '실천 다짐 내용': p.content,
    '작성일시': new Date(p.createdAt).toLocaleString('ko-KR'),
  }));

  // 4. Sheet 3: Golden Bell Submissions
  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
    if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
    return a.totalTimeMs - b.totalTimeMs;
  });

  const submissionRows = sortedSubmissions.map((s, idx) => ({
    '순번': idx + 1,
    '골든벨 라운드': `제 ${((s.roundIndex ?? 0) + 1)} 라운드`,
    '참가번호 (4자리)': s.userCode,
    '정답 수': `${s.correctCount} / 5`,
    '소요 시간(초)': Number(((s.totalTimeMs || 0) / 1000).toFixed(2)),
    '기본 획득 점수': (s.correctCount || 0) * 10 + 5,
    '보너스 점수': s.bonusPoints || 0,
    '보너스 수령': s.bonusAwarded ? '지급 완료' : '미지급',
    '제출일시': s.submittedAt ? new Date(s.submittedAt).toLocaleString('ko-KR') : '-',
  }));

  // 5. Sheet 4: OX Quiz Questions
  const oxRows = oxQuizzes.map((q, idx) => ({
    '연번': idx + 1,
    '문항 ID': q.id,
    '분류': q.category,
    'OX 문제': q.question,
    '정답': q.answer ? 'O (참)' : 'X (거짓)',
    '해설': q.explanation,
    '보상 물방울': settings?.oxRewardDrops || 1,
  }));

  // 6. Sheet 5: Golden Bell Questions
  const gbRows = goldenBellQuestions.map((q, idx) => ({
    '연번': idx + 1,
    '라운드': `제 ${((q.roundIndex ?? 0) + 1)} 라운드`,
    '문항 번호': q.questionNumber,
    '문제': q.question,
    '보기 1': q.options?.[0] || '',
    '보기 2': q.options?.[1] || '',
    '보기 3': q.options?.[2] || '',
    '보기 4': q.options?.[3] || '',
    '정답 번호': (q.answerIndex ?? 0) + 1,
    '정답 보기': q.options?.[q.answerIndex] || '',
    '해설': q.explanation,
    '힌트': q.hint || '-',
  }));

  // Create workbook & append sheets
  const wb = XLSX.utils.book_new();

  const addSheetWithAutoWidth = (data: any[], sheetName: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      const colWidths = keys.map((key) => {
        let maxLen = key.length;
        data.forEach((row) => {
          const val = row[key];
          const len = val ? String(val).length : 0;
          if (len > maxLen) maxLen = len;
        });
        return { wch: Math.min(60, Math.max(10, maxLen + 3)) };
      });
      ws['!cols'] = colWidths;
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  addSheetWithAutoWidth(
    userRows.length > 0 ? userRows : [{ '알림': '등록된 참가자 데이터가 없습니다.' }],
    '참가자 랭킹'
  );
  addSheetWithAutoWidth(
    pledgeRows.length > 0 ? pledgeRows : [{ '알림': '등록된 실천 다짐이 없습니다.' }],
    '실천 다짐 목록'
  );
  addSheetWithAutoWidth(
    submissionRows.length > 0 ? submissionRows : [{ '알림': '제출된 골든벨 기록이 없습니다.' }],
    '골든벨 제출기록'
  );
  addSheetWithAutoWidth(oxRows, 'OX 퀴즈 문항');
  addSheetWithAutoWidth(gbRows, '골든벨 문항');

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const fileName = `개인정보보호_나무_참여현황_${yyyy}${mm}${dd}_${hh}${min}${ss}.xlsx`;

  XLSX.writeFile(wb, fileName);
  return fileName;
}
