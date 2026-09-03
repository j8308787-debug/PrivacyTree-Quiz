import React, { useState, useEffect } from 'react';
import {
  AppSettings,
  UserProfile,
  OXQuiz,
  GoldenBellQuestion,
  TreeLevelConfig,
  GoldenBellScheduleItem,
  PledgeItem,
} from '../types';
import { db, DEFAULT_TREE_LEVELS, DEFAULT_PRESET_PLEDGES } from '../lib/firebase';
import {
  awardGoldenBellRoundBonuses,
  seedDemoParticipants,
} from '../lib/dataService';
import { normalizeSchedule, getRoundTimeStatus } from '../lib/scheduleUtils';
import { exportAllDataToExcel } from '../lib/excelExport';
import {
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import {
  Shield,
  Layers,
  Clock,
  Award,
  Users,
  Database,
  Play,
  Square,
  RotateCcw,
  Check,
  AlertTriangle,
  X,
  FileQuestion,
  HelpCircle,
  KeyRound,
  Plus,
  Trash2,
  Edit2,
  Save,
  MessageSquare,
  Search,
  Download,
  FileSpreadsheet,
  Hash,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { playClickSound, playCorrectSound } from '../lib/sound';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  users: UserProfile[];
  pledges?: PledgeItem[];
  quizzes: OXQuiz[];
  goldenBellQuestions: GoldenBellQuestion[];
  onSettingsUpdated: (newSettings: AppSettings) => void;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  requiresTyping?: string;
  onConfirm: () => Promise<void> | void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  settings,
  users,
  pledges = [],
  quizzes,
  goldenBellQuestions,
  onSettingsUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<
    'status' | 'participants' | 'pledges_admin' | 'ox_content' | 'golden_content' | 'tree' | 'security' | 'database'
  >('status');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // In-app Confirmation Modal State
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmInputText, setConfirmInputText] = useState('');

  // Editable settings local copy
  const [editableTreeLevels, setEditableTreeLevels] = useState<TreeLevelConfig[]>(
    settings.treeLevels || DEFAULT_TREE_LEVELS
  );
  const [editableSchedule, setEditableSchedule] = useState<GoldenBellScheduleItem[]>(
    normalizeSchedule(settings.goldenBellSchedule)
  );

  // Admin password state
  const [newAdminPassword, setNewAdminPassword] = useState(settings.adminPassword || 'admin');

  // Participants manager state
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');

  // Pledge manager states
  const [pledgeSearchTerm, setPledgeSearchTerm] = useState('');
  const [editablePresetPledges, setEditablePresetPledges] = useState<string[]>(
    settings.presetPledges || DEFAULT_PRESET_PLEDGES
  );
  const [newPresetInput, setNewPresetInput] = useState('');
  const [editingPresetIdx, setEditingPresetIdx] = useState<number | null>(null);
  const [editingPresetText, setEditingPresetText] = useState('');

  // Content manager states
  const [editingOxQuiz, setEditingOxQuiz] = useState<OXQuiz | null>(null);
  const [editingGbQuestion, setEditingGbQuestion] = useState<GoldenBellQuestion | null>(null);
  const [selectedGbRound, setSelectedGbRound] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setEditableTreeLevels(settings.treeLevels || DEFAULT_TREE_LEVELS);
      setEditableSchedule(normalizeSchedule(settings.goldenBellSchedule));
      setNewAdminPassword(settings.adminPassword || 'admin');
      setEditablePresetPledges(settings.presetPledges || DEFAULT_PRESET_PLEDGES);
      setNewPresetInput('');
      setEditingPresetIdx(null);
      setEditingPresetText('');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Save Settings to Firestore
  const handleSaveGeneralSettings = async () => {
    setLoadingAction('save_settings');
    playClickSound();
    try {
      const updatedPayload: Partial<AppSettings> = {
        treeLevels: editableTreeLevels,
        goldenBellSchedule: editableSchedule,
        adminPassword: newAdminPassword,
        presetPledges: editablePresetPledges,
      };
      // Optimistic zero-delay local update
      onSettingsUpdated({ ...settings, ...updatedPayload });
      playCorrectSound();
      notify('설정이 성공적으로 저장되었습니다!');

      await updateDoc(doc(db, 'app_settings', 'config'), updatedPayload);
    } catch (err: unknown) {
      console.error('Settings save error:', err);
      notify('설정 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Live Round Controller
  const handleScheduleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const next = [...editableSchedule];
    next[index] = { ...next[index], [field]: value };
    setEditableSchedule(next);
  };

  const handleAddRound = () => {
    playClickSound();
    const nextRoundNumber = editableSchedule.length + 1;
    let startTime = '10:00';
    let endTime = '10:30';
    if (editableSchedule.length > 0) {
      const last = editableSchedule[editableSchedule.length - 1];
      const [lh, lm] = last.endTime.split(':').map(Number);
      const nextStartM = (lh || 0) * 60 + (lm || 0) + 30;
      const sh = Math.floor(nextStartM / 60) % 24;
      const sm = nextStartM % 60;
      startTime = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
      const eh = Math.floor((nextStartM + 30) / 60) % 24;
      const em = (nextStartM + 30) % 60;
      endTime = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
    }

    const newItem: GoldenBellScheduleItem = {
      round: nextRoundNumber,
      startTime,
      endTime,
    };
    const next = [...editableSchedule, newItem];
    setEditableSchedule(next);
    notify(`제 ${nextRoundNumber} 라운드가 추가되었습니다. [시간표 저장]을 눌러 적용해 주세요.`);
  };

  const handleDeleteRound = (index: number) => {
    if (editableSchedule.length <= 1) {
      notify('골든벨은 최소 1개 이상의 라운드가 필요합니다.', 'error');
      return;
    }
    const targetRound = editableSchedule[index].round;
    setConfirmDialog({
      isOpen: true,
      title: '골든벨 회차 삭제',
      message: `제 ${targetRound} 라운드를 삭제하시겠습니까? 회차 삭제 시 라운드 번호가 순서대로 자동 재정렬됩니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: () => {
        playClickSound();
        const filtered = editableSchedule.filter((_, i) => i !== index);
        const reindexed = filtered.map((item, i) => ({
          ...item,
          round: i + 1,
        }));
        setEditableSchedule(reindexed);
        notify(`제 ${targetRound} 라운드가 삭제되었습니다. [시간표 저장]을 눌러 저장해 주세요.`);
      },
    });
  };

  const handleSaveSchedule = async () => {
    setLoadingAction('save_schedule');
    playClickSound();
    try {
      const payload: Partial<AppSettings> = {
        goldenBellSchedule: editableSchedule,
      };
      onSettingsUpdated({ ...settings, ...payload });
      playCorrectSound();
      notify('골든벨 회차 및 시간표가 성공적으로 저장되었습니다!');

      await updateDoc(doc(db, 'app_settings', 'config'), payload);
    } catch (err) {
      console.error('Schedule save error:', err);
      notify('시간표 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Live Round Controller
  const handleStartRound = async (roundIdx: number) => {
    setLoadingAction(`start_r_${roundIdx}`);
    playClickSound();
    try {
      const payload: Partial<AppSettings> = {
        activeRound: roundIdx,
        roundStatus: 'in_progress',
        roundStartTime: Date.now(),
      };
      // Optimistic zero-delay local update
      onSettingsUpdated({ ...settings, ...payload });
      notify(`제 ${roundIdx + 1} 라운드 LIVE 시작되었습니다!`);

      await updateDoc(doc(db, 'app_settings', 'config'), payload);
    } catch (err) {
      console.error('Start round error:', err);
      notify('라운드 시작 오류', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleEndRound = async (targetRoundIdx?: number) => {
    const roundToAward = targetRoundIdx !== undefined ? targetRoundIdx : settings.activeRound;
    setLoadingAction('end_round');
    playClickSound();
    try {
      const payload: Partial<AppSettings> = {
        roundStatus: 'ended',
        activeRound: null,
      };
      // Optimistic zero-delay local update
      onSettingsUpdated({ ...settings, ...payload });

      await updateDoc(doc(db, 'app_settings', 'config'), payload);

      // Immediately award TOP 3 +50P bonus on round end
      if (roundToAward !== null && roundToAward !== undefined) {
        const { awardedUsers } = await awardGoldenBellRoundBonuses(
          roundToAward,
          { first: 50, second: 50, third: 50 },
          settings.treeLevels
        );
        if (awardedUsers.length > 0) {
          const codes = awardedUsers.map((u) => `${u.rank}위 ${u.userCode}(+${u.bonus}P)`).join(', ');
          notify(`제 ${roundToAward + 1} 라운드 종료! TOP 3 참가자에게 +50P가 즉시 지급되었습니다. (${codes})`);
        } else {
          notify(`제 ${roundToAward + 1} 라운드가 종료되었습니다. (지급 대상자가 없거나 이미 지급됨)`);
        }
      } else {
        notify('진행 중인 라운드가 종료되었습니다.');
      }
    } catch (err) {
      console.error('End round error:', err);
      notify('라운드 종료 오류', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Award TOP 3 Round Bonuses (+50P each)
  const handleAwardTop3 = async (roundIdx: number) => {
    setLoadingAction(`award_r_${roundIdx}`);
    playClickSound();
    try {
      const { awardedUsers } = await awardGoldenBellRoundBonuses(
        roundIdx,
        { first: 50, second: 50, third: 50 },
        settings.treeLevels
      );
      if (awardedUsers.length === 0) {
        notify(`제 ${roundIdx + 1} 라운드에 지급할 대상자가 없습니다. (제출자가 없거나 이미 지급 완료됨)`);
      } else {
        const codes = awardedUsers.map((u) => `${u.rank}위 ${u.userCode}(+${u.bonus}P)`).join(', ');
        notify(`제 ${roundIdx + 1} 라운드 TOP 3 보너스(+50P) 지급 완료! (${codes})`);
      }
    } catch (err) {
      console.error('Award bonus error:', err);
      notify('보너스 지급 오류', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Save/Update OX Quiz
  const handleSaveOxQuiz = async (quiz: OXQuiz) => {
    playClickSound();
    try {
      await setDoc(doc(db, 'ox_quizzes', quiz.id), quiz);
      setEditingOxQuiz(null);
      notify(`OX 퀴즈 [${quiz.id}] 저장 완료!`);
    } catch (err) {
      console.error('Save OX quiz error:', err);
      notify('OX 퀴즈 저장 실패', 'error');
    }
  };

  const handleDeleteOxQuiz = (quizId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'OX 퀴즈 삭제',
      message: '해당 OX 퀴즈를 삭제하시겠습니까?',
      confirmLabel: '삭제',
      danger: true,
      onConfirm: async () => {
        playClickSound();
        try {
          await deleteDoc(doc(db, 'ox_quizzes', quizId));
          notify('OX 퀴즈가 삭제되었습니다.');
        } catch (err) {
          console.error('Delete OX quiz error:', err);
          notify('OX 퀴즈 삭제 실패', 'error');
        }
      },
    });
  };

  // Save/Update Golden Bell Question
  const handleSaveGbQuestion = async (gbQ: GoldenBellQuestion) => {
    playClickSound();
    try {
      await setDoc(doc(db, 'golden_bell_questions', gbQ.id), gbQ);
      setEditingGbQuestion(null);
      notify(`골든벨 문항 [${gbQ.id}] 저장 완료!`);
    } catch (err) {
      console.error('Save GB question error:', err);
      notify('골든벨 문항 저장 실패', 'error');
    }
  };

  const handleDeleteGbQuestion = (qId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '골든벨 문항 삭제',
      message: '해당 골든벨 문항을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      danger: true,
      onConfirm: async () => {
        playClickSound();
        try {
          await deleteDoc(doc(db, 'golden_bell_questions', qId));
          notify('골든벨 문항이 삭제되었습니다.');
        } catch (err) {
          console.error('Delete GB question error:', err);
          notify('골든벨 문항 삭제 실패', 'error');
        }
      },
    });
  };

  // Delete Individual Pledge
  const handleDeletePledge = (pledgeId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '실천 약속 삭제',
      message: '해당 실천 약속을 삭제하시겠습니까?',
      confirmLabel: '삭제',
      danger: true,
      onConfirm: async () => {
        setLoadingAction(`del_pledge_${pledgeId}`);
        playClickSound();
        try {
          await deleteDoc(doc(db, 'pledges', pledgeId));
          notify('실천 약속이 삭제되었습니다.');
        } catch (err) {
          console.error('Delete pledge error:', err);
          notify('약속 삭제 오류', 'error');
        } finally {
          setLoadingAction(null);
        }
      },
    });
  };

  // Delete Single Participant
  const handleDeleteUser = (userId: string, code: string) => {
    setConfirmDialog({
      isOpen: true,
      title: '참여자 삭제',
      message: `참여 번호 [${code}] 사용자의 모든 데이터(점수, 물방울)를 삭제하시겠습니까?`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: async () => {
        playClickSound();
        try {
          await deleteDoc(doc(db, 'users', userId));
          notify(`참여 번호 [${code}] 사용자가 삭제되었습니다.`);
        } catch (err) {
          console.error('Delete user error:', err);
          notify('참여자 삭제 실패', 'error');
        }
      },
    });
  };

  // Seed Demo Participants
  const handleSeedDemo = async () => {
    setLoadingAction('seed_demo');
    playClickSound();
    try {
      const count = await seedDemoParticipants(settings.treeLevels || DEFAULT_TREE_LEVELS);
      playCorrectSound();
      notify(`테스트용 4자리 참가자 ${count}명이 자동 등록되었습니다!`);
    } catch (err) {
      console.error('Seed demo error:', err);
      notify('데모 참여자 생성 실패', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Delete All Pledges
  const handleDeleteAllPledges = () => {
    setConfirmDialog({
      isOpen: true,
      title: '모든 실천 약속 삭제',
      message: `현재 등록된 총 ${pledges.length}건의 실천 약속을 일괄 삭제하시겠습니까?`,
      confirmLabel: '일괄 삭제',
      danger: true,
      onConfirm: async () => {
        setLoadingAction('delete_all_pledges');
        playClickSound();
        try {
          const snap = await getDocs(collection(db, 'pledges'));
          const deletes = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);
          notify('모든 실천 약속이 삭제되었습니다.');
        } catch (err) {
          console.error('Delete all pledges error:', err);
          notify('약속 일괄 삭제 오류', 'error');
        } finally {
          setLoadingAction(null);
        }
      },
    });
  };

  // Preset Pledges (자동 선택 문구) Handlers
  const persistPresetPledges = async (updated: string[]) => {
    setEditablePresetPledges(updated);
    try {
      await updateDoc(doc(db, 'app_settings', 'config'), {
        presetPledges: updated,
      });
      onSettingsUpdated({ ...settings, presetPledges: updated });
      return true;
    } catch (err) {
      console.error('Save preset pledges error:', err);
      notify('추천 문구 저장 중 오류가 발생했습니다.', 'error');
      return false;
    }
  };

  const handleAddPreset = async () => {
    const trimmed = newPresetInput.trim();
    if (!trimmed) {
      notify('추천 약속 문구를 입력해 주세요.', 'error');
      return;
    }
    if (trimmed.length < 5) {
      notify('약속 문구를 5자 이상 입력해 주세요.', 'error');
      return;
    }
    if (editablePresetPledges.some((p) => p.trim().toLowerCase() === trimmed.toLowerCase())) {
      notify('이미 목록에 존재하는 추천 문구입니다.', 'error');
      return;
    }
    playClickSound();
    const next = [...editablePresetPledges, trimmed];
    const ok = await persistPresetPledges(next);
    if (ok) {
      setNewPresetInput('');
      playCorrectSound();
      notify('새 추천 실천 약속 문구가 추가되었습니다.');
    }
  };

  const handleStartEditPreset = (index: number) => {
    setEditingPresetIdx(index);
    setEditingPresetText(editablePresetPledges[index]);
  };

  const handleCancelEditPreset = () => {
    setEditingPresetIdx(null);
    setEditingPresetText('');
  };

  const handleSaveEditPreset = async (index: number) => {
    const trimmed = editingPresetText.trim();
    if (!trimmed) {
      notify('약속 문구를 입력해 주세요.', 'error');
      return;
    }
    if (trimmed.length < 5) {
      notify('문구를 5자 이상 입력해 주세요.', 'error');
      return;
    }
    const isDuplicate = editablePresetPledges.some(
      (p, i) => i !== index && p.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      notify('동일한 문구가 이미 존재합니다.', 'error');
      return;
    }

    playClickSound();
    const next = [...editablePresetPledges];
    next[index] = trimmed;
    const ok = await persistPresetPledges(next);
    if (ok) {
      setEditingPresetIdx(null);
      setEditingPresetText('');
      playCorrectSound();
      notify('추천 실천 약속 문구가 수정되었습니다.');
    }
  };

  const handleDeletePreset = (index: number) => {
    const targetText = editablePresetPledges[index];
    setConfirmDialog({
      isOpen: true,
      title: '추천 문구 삭제',
      message: `"${targetText}"\n\n해당 자동 선택 추천 문구를 삭제하시겠습니까?\n삭제 시 참여자 작성 모달의 추천 목록에서도 즉시 제거됩니다.`,
      confirmLabel: '삭제',
      danger: true,
      onConfirm: async () => {
        playClickSound();
        const next = editablePresetPledges.filter((_, i) => i !== index);
        const ok = await persistPresetPledges(next);
        if (ok) {
          if (editingPresetIdx === index) {
            setEditingPresetIdx(null);
            setEditingPresetText('');
          }
          notify('추천 실천 약속 문구가 삭제되었습니다.');
        }
      },
    });
  };

  const handleResetDefaultPresets = () => {
    setConfirmDialog({
      isOpen: true,
      title: '기본 추천 문구로 초기화',
      message: '기본으로 제공되는 7개의 추천 실천 약속 문구로 초기화하시겠습니까?',
      confirmLabel: '초기화',
      danger: false,
      onConfirm: async () => {
        playClickSound();
        const ok = await persistPresetPledges(DEFAULT_PRESET_PLEDGES);
        if (ok) {
          setEditingPresetIdx(null);
          setEditingPresetText('');
          notify('기본 추천 문구로 초기화되었습니다.');
        }
      },
    });
  };

  // Reset Submissions
  const handleResetSubmissions = () => {
    setConfirmDialog({
      isOpen: true,
      title: '골든벨 제출 기록 초기화',
      message: '모든 참여자의 골든벨 제출 기록을 초기화하시겠습니까?',
      confirmLabel: '기록 초기화',
      danger: true,
      onConfirm: async () => {
        setLoadingAction('reset_subs');
        playClickSound();
        try {
          const snap = await getDocs(collection(db, 'golden_bell_submissions'));
          const deletes = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);
          notify('골든벨 제출 기록이 초기화되었습니다.');
        } catch (err) {
          console.error('Reset submissions error:', err);
          notify('골든벨 기록 초기화 오류', 'error');
        } finally {
          setLoadingAction(null);
        }
      },
    });
  };

  // Reset All Users Only
  const handleResetUsers = () => {
    setConfirmDialog({
      isOpen: true,
      title: '전체 참여자 초기화',
      message: `현재 등록된 모든 참가자(${users.length}명)를 초기화하시겠습니까?`,
      confirmLabel: '참여자 초기화',
      danger: true,
      onConfirm: async () => {
        setLoadingAction('reset_users');
        playClickSound();
        try {
          const snap = await getDocs(collection(db, 'users'));
          const deletes = snap.docs.map((d) => deleteDoc(d.ref));
          await Promise.all(deletes);
          localStorage.removeItem('privacy_tree_user_code');
          notify('모든 참가자 데이터가 초기화되었습니다.');
        } catch (err) {
          console.error('Reset users error:', err);
          notify('참여자 초기화 오류', 'error');
        } finally {
          setLoadingAction(null);
        }
      },
    });
  };

  // Reset ALL Data (Total System Reset)
  const handleResetAllData = () => {
    setConfirmDialog({
      isOpen: true,
      title: '전체 시스템 초기화 (Total Reset)',
      message: '모든 참가자, 실천 약속, 골든벨 제출 기록이 영구 삭제됩니다.\n\n정말 진행하시겠습니까?',
      confirmLabel: '시스템 전체 초기화',
      danger: true,
      requiresTyping: '초기화',
      onConfirm: async () => {
        setLoadingAction('reset_all_data');
        playClickSound();
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          await Promise.all(usersSnap.docs.map((d) => deleteDoc(d.ref)));

          const pledgesSnap = await getDocs(collection(db, 'pledges'));
          await Promise.all(pledgesSnap.docs.map((d) => deleteDoc(d.ref)));

          const subsSnap = await getDocs(collection(db, 'golden_bell_submissions'));
          await Promise.all(subsSnap.docs.map((d) => deleteDoc(d.ref)));

          await updateDoc(doc(db, 'app_settings', 'config'), {
            activeRound: null,
            roundStatus: 'idle',
            roundStartTime: null,
          });

          localStorage.removeItem('privacy_tree_user_code');
          notify('시스템이 완전히 초기화되었습니다!');
        } catch (err) {
          console.error('Reset all data error:', err);
          notify('초기화 중 오류가 발생했습니다.', 'error');
        } finally {
          setLoadingAction(null);
        }
      },
    });
  };

  // Export Excel
  const handleExportExcel = async () => {
    setLoadingAction('export_excel');
    playClickSound();
    try {
      const fileName = await exportAllDataToExcel(
        users,
        pledges,
        quizzes,
        goldenBellQuestions,
        settings
      );
      playCorrectSound();
      notify(`엑셀 파일(${fileName}) 다운로드 완료!`);
    } catch (err) {
      console.error('Export excel error:', err);
      notify('엑셀 내보내기 실패', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const filteredPledgesForAdmin = pledges.filter((p) => {
    const term = pledgeSearchTerm.trim().toLowerCase();
    if (!term) return true;
    return (
      p.content.toLowerCase().includes(term) ||
      (p.userCode && p.userCode.includes(term))
    );
  });

  const filteredParticipants = users.filter((u) => {
    const term = participantSearchTerm.trim();
    if (!term) return true;
    return u.code.includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white border border-slate-200 rounded-3xl flex flex-col text-slate-800 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 truncate">
                관리자 제어 콘솔 (Admin)
              </h3>
              <p className="text-xs text-slate-500 truncate">
                숫자 4자리 고유 번호 참여자 관리 및 이벤트 운영
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={loadingAction === 'export_excel'}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition cursor-pointer"
              title="엑셀 다운로드"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">
                {loadingAction === 'export_excel' ? '추출 중...' : '엑셀 다운로드'}
              </span>
              <span className="sm:hidden">엑셀</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`py-2.5 px-4 text-xs font-bold flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{notification.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-slate-100/80 border-b border-slate-200 overflow-x-auto text-xs">
          {[
            { id: 'status', label: '골든벨 운영', icon: Play },
            { id: 'participants', label: '참여자 관리', icon: Users },
            { id: 'pledges_admin', label: '실천 약속 관리', icon: MessageSquare },
            { id: 'ox_content', label: 'OX 퀴즈 문항', icon: FileQuestion },
            { id: 'golden_content', label: '골든벨 문항', icon: HelpCircle },
            { id: 'tree', label: '나무 등급', icon: Layers },
            { id: 'security', label: '비밀번호', icon: KeyRound },
            { id: 'database', label: '데이터 관리', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playClickSound();
                  setActiveTab(tab.id as any);
                }}
                className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: GOLDEN BELL ROUNDS & SCHEDULE UNIFIED MANAGER */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Live status banner */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                settings.roundStatus === 'in_progress'
                  ? 'bg-emerald-50 border-emerald-300'
                  : 'bg-amber-50/70 border-amber-200'
              } flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${
                    settings.roundStatus === 'in_progress'
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-amber-200 text-amber-900'
                  }`}>
                    {settings.roundStatus === 'in_progress' ? (
                      <Play className="w-5 h-5 fill-white" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                        실시간 운영 상태
                      </span>
                      {settings.roundStatus === 'in_progress' && (
                        <span className="text-[11px] font-black text-emerald-700 animate-pulse flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          LIVE 진행 중
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">
                      {settings.roundStatus === 'in_progress'
                        ? `제 ${(settings.activeRound ?? 0) + 1} 라운드 LIVE 진행 중`
                        : '대기 상태 (시간표에 맞춰 자동 진행되며, 아래에서 수동 제어도 가능합니다)'}
                    </h4>
                  </div>
                </div>
                {settings.roundStatus === 'in_progress' && (
                  <button
                    type="button"
                    onClick={() => handleEndRound(settings.activeRound ?? undefined)}
                    disabled={loadingAction === 'end_round'}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>{loadingAction === 'end_round' ? '종료 중...' : '현재 라운드 종료 & TOP 3(+50P) 지급'}</span>
                  </button>
                )}
              </div>

              {/* Unified Round Management: Start, Time Adjustment & Delete in ONE */}
              <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>골든벨 회차별 운영 및 시간표 관리</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                        총 {editableSchedule.length}회차
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      수동 시작, 운영시간 조정, TOP 3 보너스(+50P) 지급 및 회차 삭제를 통합하여 관리합니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleAddRound}
                      className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                      <span>회차 추가</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveSchedule}
                      disabled={loadingAction === 'save_schedule'}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{loadingAction === 'save_schedule' ? '저장 중...' : '시간표 저장'}</span>
                    </button>
                  </div>
                </div>

                {/* Unified Round Cards */}
                <div className="space-y-3">
                  {editableSchedule.map((item, idx) => {
                    const isLiveActive = settings.roundStatus === 'in_progress' && settings.activeRound === idx;
                    const timeStatus = getRoundTimeStatus(item, settings.roundStatus, settings.activeRound);

                    // Calculate duration in minutes for clean visual cue
                    let durationText = '';
                    try {
                      const [sH, sM] = item.startTime.split(':').map(Number);
                      const [eH, eM] = item.endTime.split(':').map(Number);
                      let diff = (eH * 60 + eM) - (sH * 60 + sM);
                      if (diff < 0) diff += 24 * 60;
                      if (!isNaN(diff) && diff > 0) {
                        durationText = `${diff}분간 진행`;
                      }
                    } catch {
                      durationText = '';
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-4 sm:p-5 rounded-2xl border transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isLiveActive
                            ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* 1. Round Number & Status */}
                        <div className="flex items-center gap-3.5 min-w-[200px]">
                          <span
                            className={`w-11 h-11 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 shadow-2xs ${
                              isLiveActive
                                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                                : 'bg-amber-100 text-amber-900 border border-amber-200/70'
                            }`}
                          >
                            {item.round}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-base text-slate-900">
                                제 {item.round} 라운드
                              </span>
                              {isLiveActive ? (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black animate-pulse flex items-center gap-1 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                  LIVE 진행 중
                                </span>
                              ) : timeStatus === 'active' ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
                                  시간표 진행 중
                                </span>
                              ) : timeStatus === 'ended' ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                                  종료됨
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                                  진행 대기
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-medium block mt-0.5">
                              {durationText ? `${durationText} • 시간표 자동 연동` : '시간표 자동 연동'}
                            </span>
                          </div>
                        </div>

                        {/* 2. Visual Schedule Time Block */}
                        <div className="flex-1 max-w-md bg-slate-50/90 border border-slate-200 rounded-2xl p-3 sm:px-4 sm:py-3 shadow-2xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>운영 시간 설정</span>
                            </span>
                            {durationText && (
                              <span className="px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-mono">
                                {durationText}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 sm:gap-3">
                            <div className="flex-1 flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                              <span className="text-[11px] font-extrabold text-slate-400 shrink-0">시작</span>
                              <input
                                type="time"
                                value={item.startTime}
                                onChange={(e) => handleScheduleTimeChange(idx, 'startTime', e.target.value)}
                                className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 outline-none cursor-pointer"
                              />
                            </div>

                            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />

                            <div className="flex-1 flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition">
                              <span className="text-[11px] font-extrabold text-slate-400 shrink-0">종료</span>
                              <input
                                type="time"
                                value={item.endTime}
                                onChange={(e) => handleScheduleTimeChange(idx, 'endTime', e.target.value)}
                                className="w-full bg-transparent text-xs font-mono font-bold text-slate-800 outline-none cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 3. Control Actions (Vertically stacked: LIVE Button & TOP 3 Bonus, with Delete button) */}
                        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/80">
                          <div className="flex flex-col gap-1.5 w-full md:w-44">
                            {isLiveActive ? (
                              <button
                                type="button"
                                onClick={() => handleEndRound(idx)}
                                disabled={loadingAction === 'end_round'}
                                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                title="라운드를 종료하고 TOP 3 참가자에게 +50P를 바로 지급합니다"
                              >
                                <Square className="w-3.5 h-3.5 fill-white" />
                                <span>{loadingAction === 'end_round' ? '종료 중...' : 'LIVE 종료 & TOP3(+50P)'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartRound(idx)}
                                disabled={loadingAction === `start_r_${idx}`}
                                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                <span>{loadingAction === `start_r_${idx}` ? '시작 중...' : 'LIVE 수동 시작'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAwardTop3(idx)}
                              disabled={loadingAction === `award_r_${idx}`}
                              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                              title="해당 회차 TOP 3 참가자에게 +50P 보너스를 즉시 지급합니다"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>{loadingAction === `award_r_${idx}` ? '지급 중...' : 'TOP3(+50P) 보너스'}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteRound(idx)}
                            className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer border border-slate-200 hover:border-rose-200 shrink-0"
                            title="회차 삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARTICIPANTS (4-DIGIT CODE ONLY) */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <span>숫자 4자리 참여자 목록</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                      총 {users.length}명
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    부서와 이름 없이 고유 4자리 참여 번호로만 식별 관리됩니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSeedDemo}
                    disabled={loadingAction === 'seed_demo'}
                    className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                    <span>데모 4자리 참가자 생성</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={participantSearchTerm}
                  onChange={(e) => setParticipantSearchTerm(e.target.value.replace(/\D/g, ''))}
                  placeholder="참여 번호 4자리 검색..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 outline-none"
                />
              </div>

              {/* Participants Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[480px] overflow-y-auto">
                {filteredParticipants.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                    등록된 4자리 참여자가 없습니다.
                  </div>
                ) : (
                  filteredParticipants.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-xs hover:border-emerald-300 transition"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm text-slate-900 flex items-center">
                            <Hash className="w-3.5 h-3.5 text-emerald-600" />
                            {u.code}
                          </span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                            LV.{u.treeLevel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          누적 <strong className="text-emerald-700">{u.points.toLocaleString()}P</strong> | 물방울 {u.waterDrops}개
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id, u.code)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PLEDGES ADMIN */}
          {activeTab === 'pledges_admin' && (
            <div className="space-y-6">
              {/* SECTION 1: PRESET PLEDGES (AUTOMATIC SELECTION PHRASES) */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-emerald-50/50 to-white border border-emerald-200/80 rounded-3xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>추천 실천 약속 (자동 선택 문구) 관리</span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                        {editablePresetPledges.length}개
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      참여자가 약속 작성 모달에서 원클릭으로 선택할 수 있는 문구 목록입니다. 삭제 시 즉시 데이터베이스에서 삭제되며 실시간 반영됩니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDefaultPresets}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-2xs"
                    title="기본 7개 추천 문구로 되돌리기"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>기본 문구로 초기화</span>
                  </button>
                </div>

                {/* Add new preset input */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newPresetInput}
                      onChange={(e) => setNewPresetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPreset();
                        }
                      }}
                      placeholder="새 추천 실천 약속 문구를 입력해 주세요 (예: 자리 비울 때는 항상 Win + L 화면 잠금을 실천하겠습니다)..."
                      className="w-full px-3.5 py-2.5 bg-white border border-emerald-300/90 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPreset}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>문구 추가</span>
                  </button>
                </div>

                {/* Presets List */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {editablePresetPledges.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200">
                      등록된 추천 문구가 없습니다. 위 입력창에서 새로운 추천 문구를 추가해 주세요.
                    </div>
                  ) : (
                    editablePresetPledges.map((preset, idx) => {
                      const isEditing = editingPresetIdx === idx;
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition shadow-2xs flex items-center justify-between gap-3 ${
                            isEditing
                              ? 'bg-white border-emerald-400 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold text-[11px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            {isEditing ? (
                              <input
                                type="text"
                                value={editingPresetText}
                                onChange={(e) => setEditingPresetText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveEditPreset(idx);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditPreset();
                                  }
                                }}
                                autoFocus
                                className="w-full px-3 py-1.5 bg-slate-50 border border-emerald-300 rounded-xl text-xs text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                              />
                            ) : (
                              <p className="text-xs text-slate-800 font-medium truncate sm:whitespace-normal">
                                {preset}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditPreset(idx)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1 cursor-pointer shadow-xs"
                                  title="수정 내용 저장"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>저장</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditPreset}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="취소"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>취소</span>
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditPreset(idx)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition cursor-pointer"
                                  title="문구 수정"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePreset(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                                  title="문구 삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECTION 2: PARTICIPANTS' SUBMITTED PLEDGES */}
              <div className="p-4 sm:p-5 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-600" />
                      <span>참여자 등록 실천 약속 내역</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold">
                        {pledges.length}건
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      등록된 모든 4자리 참여자들의 실천 약속 내역입니다.
                    </p>
                  </div>
                  {pledges.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteAllPledges}
                      disabled={loadingAction === 'delete_all_pledges'}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>약속 전체 삭제</span>
                    </button>
                  )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pledgeSearchTerm}
                    onChange={(e) => setPledgeSearchTerm(e.target.value)}
                    placeholder="참여 번호 또는 약속 내용 검색..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Pledges List */}
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {filteredPledgesForAdmin.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                      등록된 실천 약속이 없습니다.
                    </div>
                  ) : (
                    filteredPledgesForAdmin.map((pledge) => (
                      <div
                        key={pledge.id}
                        className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-start justify-between gap-3 shadow-xs hover:border-emerald-300 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs mb-1">
                            <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                              {pledge.userCode}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(pledge.createdAt).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                            "{pledge.content}"
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePledge(pledge.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition flex-shrink-0 cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OX QUIZ CONTENT */}
          {activeTab === 'ox_content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    OX 퀴즈 문항 관리 (총 {quizzes.length}문항)
                  </h4>
                  <p className="text-xs text-slate-500">
                    참여자가 풀이할 개인정보보호 OX 문제와 정답을 관리합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = `ox_${Date.now()}`;
                    setEditingOxQuiz({
                      id: newId,
                      question: '신규 OX 문제를 입력하세요.',
                      answer: true,
                      explanation: '정답 해설을 입력하세요.',
                      category: '보안수칙',
                    });
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>문항 추가</span>
                </button>
              </div>

              {/* Editing Form */}
              {editingOxQuiz && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-extrabold text-emerald-900">
                    <span>문항 수정 [{editingOxQuiz.id}]</span>
                    <button
                      type="button"
                      onClick={() => setEditingOxQuiz(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">분류 카테고리</label>
                    <input
                      type="text"
                      value={editingOxQuiz.category}
                      onChange={(e) => setEditingOxQuiz({ ...editingOxQuiz, category: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">문제 내용</label>
                    <textarea
                      value={editingOxQuiz.question}
                      onChange={(e) => setEditingOxQuiz({ ...editingOxQuiz, question: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">정답 설정</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-1 text-xs font-bold">
                        <input
                          type="radio"
                          checked={editingOxQuiz.answer === true}
                          onChange={() => setEditingOxQuiz({ ...editingOxQuiz, answer: true })}
                        />
                        <span>정답: O (그렇다)</span>
                      </label>
                      <label className="flex items-center gap-1 text-xs font-bold">
                        <input
                          type="radio"
                          checked={editingOxQuiz.answer === false}
                          onChange={() => setEditingOxQuiz({ ...editingOxQuiz, answer: false })}
                        />
                        <span>정답: X (아니다)</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">정답 해설</label>
                    <textarea
                      value={editingOxQuiz.explanation}
                      onChange={(e) => setEditingOxQuiz({ ...editingOxQuiz, explanation: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingOxQuiz(null)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveOxQuiz(editingOxQuiz)}
                      className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-xs cursor-pointer"
                    >
                      저장하기
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto">
                {quizzes.map((quiz, idx) => (
                  <div
                    key={quiz.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-0.5">
                        <span className="font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                          Q{idx + 1}
                        </span>
                        <span>[{quiz.category}]</span>
                        <span className="font-bold text-slate-800">정답: {quiz.answer ? '⭕ O' : '❌ X'}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-1">{quiz.question}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingOxQuiz(quiz)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOxQuiz(quiz.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: GOLDEN BELL CONTENT */}
          {activeTab === 'golden_content' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    골든벨 4지선다 문항 관리
                  </h4>
                  <p className="text-xs text-slate-500">
                    각 라운드별 5문항 4지선다 문제를 관리합니다.
                  </p>
                </div>
              </div>

              {/* Dynamic Round Selector Tabs */}
              <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto">
                {editableSchedule.map((item, rIdx) => (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => setSelectedGbRound(rIdx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                      selectedGbRound === rIdx
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    제 {item.round} 라운드
                  </button>
                ))}
              </div>

              {/* Editing Form */}
              {editingGbQuestion && (
                <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
                    <span>
                      제 {editingGbQuestion.roundIndex + 1} 라운드 문항 수정 [{editingGbQuestion.id}]
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingGbQuestion(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      닫기
                    </button>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">문제 내용</label>
                    <textarea
                      value={editingGbQuestion.question}
                      onChange={(e) => setEditingGbQuestion({ ...editingGbQuestion, question: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 block">
                      4지선다 보기 및 정답 선택
                    </label>
                    {editingGbQuestion.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="gb_correct_option"
                          checked={editingGbQuestion.answerIndex === oIdx}
                          onChange={() => setEditingGbQuestion({ ...editingGbQuestion, answerIndex: oIdx })}
                        />
                        <span className="text-xs font-bold text-slate-600 w-5">{oIdx + 1}번</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const copy = [...editingGbQuestion.options];
                            copy[oIdx] = e.target.value;
                            setEditingGbQuestion({ ...editingGbQuestion, options: copy });
                          }}
                          className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs"
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">정답 해설</label>
                    <textarea
                      value={editingGbQuestion.explanation}
                      onChange={(e) => setEditingGbQuestion({ ...editingGbQuestion, explanation: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingGbQuestion(null)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveGbQuestion(editingGbQuestion)}
                      className="px-4 py-1.5 bg-amber-500 text-white rounded-xl text-xs font-extrabold shadow-xs cursor-pointer"
                    >
                      저장하기
                    </button>
                  </div>
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-2">
                {goldenBellQuestions
                  .filter((q) => q.roundIndex === selectedGbRound)
                  .map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
                          <span className="font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                            문항 {idx + 1}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            정답: {q.answerIndex + 1}번 ({q.options[q.answerIndex]})
                          </span>
                        </div>
                        <h5 className="text-xs font-extrabold text-slate-900 mb-1">{q.question}</h5>
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          해설: {q.explanation}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingGbQuestion(q)}
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg cursor-pointer"
                          title="수정"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGbQuestion(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* TAB 6: TREE LEVELS */}
          {activeTab === 'tree' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    수호목 등급 기준 설정 (1~5단계)
                  </h4>
                  <p className="text-xs text-slate-500">
                    레벨별 필요 누적 포인트를 조정합니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveGeneralSettings}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>설정 저장</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {editableTreeLevels.map((lvl, idx) => (
                  <div
                    key={lvl.level}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{lvl.badge}</span>
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-900">
                          LV.{lvl.level} {lvl.name}
                        </h5>
                        <span className="text-[10px] text-slate-500">{lvl.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] text-slate-500">필요 점수:</label>
                      <input
                        type="number"
                        value={lvl.minPoints}
                        onChange={(e) => {
                          const copy = [...editableTreeLevels];
                          copy[idx].minPoints = Number(e.target.value);
                          setEditableTreeLevels(copy);
                        }}
                        className="w-24 px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-xs font-bold text-right"
                      />
                      <span className="text-xs font-bold text-slate-600">P</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: SECURITY */}
          {activeTab === 'security' && (
            <div className="space-y-4 max-w-md">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  관리자 비밀번호 변경
                </h4>
                <p className="text-xs text-slate-500">
                  관리자 모드 접속 시 요구되는 암호를 설정합니다.
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  신규 관리자 비밀번호
                </label>
                <input
                  type="text"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveGeneralSettings}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs cursor-pointer"
              >
                비밀번호 저장
              </button>
            </div>
          )}

          {/* TAB 8: DATABASE & RESET */}
          {activeTab === 'database' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  전체 데이터베이스 및 초기화
                </h4>
                <p className="text-xs text-slate-500">
                  현재 등록 참여자: {users.length}명 / 실천 약속: {pledges.length}건
                </p>
              </div>

              {/* Excel Export Card */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50/70 border-2 border-emerald-200 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-emerald-900">
                    <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-sm font-extrabold text-slate-900">
                        전체 데이터 엑셀 내보내기 (.xlsx)
                      </h5>
                      <span className="text-[11px] text-emerald-700 font-bold block mt-0.5">
                        참여자 4자리 번호, 점수, 실천 약속, 골든벨 제출기록 일괄 추출
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={loadingAction === 'export_excel'}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-extrabold transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {loadingAction === 'export_excel'
                      ? '파일 생성 중...'
                      : '엑셀 파일 다운로드 (.xlsx)'}
                  </span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <h5 className="text-xs sm:text-sm font-extrabold">
                    위험 구역: 전체 시스템 초기화 (Total System Reset)
                  </h5>
                </div>
                <p className="text-xs text-rose-700 leading-relaxed font-medium">
                  모든 4자리 참가자 정보와 실천 약속, 골든벨 제출 기록이 완전히 삭제됩니다.
                </p>
                <button
                  type="button"
                  onClick={handleResetAllData}
                  disabled={loadingAction === 'reset_all_data'}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{loadingAction === 'reset_all_data' ? '초기화 진행 중...' : '시스템 전체 초기화'}</span>
                </button>
              </div>

              {/* Granular Reset Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h5 className="text-xs font-extrabold text-slate-900">
                    골든벨 제출 기록만 초기화
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    라운드별 문제 풀이 기록만 초기화합니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetSubmissions}
                    disabled={loadingAction === 'reset_subs'}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
                  >
                    {loadingAction === 'reset_subs' ? '초기화 중...' : '골든벨 기록 초기화'}
                  </button>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h5 className="text-xs font-extrabold text-slate-900">
                    참여자 데이터만 초기화
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    등록된 모든 4자리 사용자 계정을 초기화합니다.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetUsers}
                    disabled={loadingAction === 'reset_users'}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
                  >
                    {loadingAction === 'reset_users' ? '초기화 중...' : '참여자 초기화'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* In-App Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${confirmDialog.danger ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">{confirmDialog.title}</h4>
                <span className="text-xs text-slate-500 font-medium">관리자 확인 필요</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              {confirmDialog.message}
            </p>
            {confirmDialog.requiresTyping && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  확인을 위해 아래 입력창에 <span className="text-rose-600 font-black font-mono">"{confirmDialog.requiresTyping}"</span>을 입력하세요:
                </label>
                <input
                  type="text"
                  value={confirmInputText}
                  onChange={(e) => setConfirmInputText(e.target.value)}
                  placeholder={confirmDialog.requiresTyping}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-rose-300 focus:border-rose-600 rounded-xl text-sm font-bold text-slate-900 outline-none"
                  autoFocus
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmDialog(null);
                  setConfirmInputText('');
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={Boolean(confirmDialog.requiresTyping && confirmInputText !== confirmDialog.requiresTyping)}
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  setConfirmInputText('');
                  await action();
                }}
                className={`px-5 py-2.5 rounded-xl font-extrabold text-xs text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                  confirmDialog.requiresTyping && confirmInputText !== confirmDialog.requiresTyping
                    ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                    : confirmDialog.danger
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{confirmDialog.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
