export interface TreeLevelConfig {
  level: number;
  name: string;
  minPoints: number;
  description: string;
  badge: string;
  color: string;
}

export interface GoldenBellScheduleItem {
  round: number; // 1~5
  startTime: string; // "10:00"
  endTime: string; // "10:30"
}

export interface BonusRoundItem {
  id: string; // e.g. "bonus_1"
  name: string; // "보너스 라운드", "보너스 라운드 2"
  roundIndex: number; // 100, 101...
  status: 'active' | 'ended';
  createdAt: number;
  endedAt?: number;
}

export interface AppSettings {
  treeLevels: TreeLevelConfig[];
  goldenBellSchedule: (GoldenBellScheduleItem | string)[];
  goldenBellRewards: {
    first: number;
    second: number;
    third: number;
  };
  adminPassword?: string;
  oxRewardDrops: number;
  wateringRewardPoints: number;
  pledgeRewardPoints: number;
  activeRound: number | null; // 0~4 (Round 1~5) or 100+ (Bonus) or null
  roundStatus: 'idle' | 'countdown' | 'in_progress' | 'ended';
  roundStartTime: number | null; // epoch timestamp
  isManualLive?: boolean; // whether currently running a manual bonus round
  manualRoundTitle?: string; // e.g. "보너스 라운드"
  bonusRounds?: BonusRoundItem[];
  lastAwardedRoundKeys?: string[]; // to prevent duplicate auto rewards
  forceStoppedRounds?: { [roundKey: string]: boolean };
  presetPledges?: string[];
  lastResetUsersAt?: number;
  lastResetSystemAt?: number;
}

export interface UserProfile {
  id: string; // `user_${code}`
  code: string; // 4자리 숫자 (예: "1234")
  points: number;
  waterDrops: number;
  waterCount: number;
  pledgeCount: number;
  lastActive: number;
  treeLevel: number;
  completedOxIds: string[];
  goldenBellRoundsPlayed: number[];
  goldenBellPlayDate?: string; // YYYY-MM-DD to auto-reset play record daily at midnight
  createdAt: number;
}

export interface PledgeItem {
  id: string;
  userId: string;
  userCode: string; // 4자리 숫자
  content: string;
  createdAt: number;
  color: string;
  likes: number;
  likedBy?: string[];
}

export interface OXQuiz {
  id: string;
  question: string;
  answer: boolean; // true for O, false for X
  explanation: string;
  category: string;
}

export interface GoldenBellQuestion {
  id: string;
  roundIndex: number; // 0~4
  questionNumber: number; // 1~5
  question: string;
  options: string[];
  answerIndex: number; // 0~3
  explanation: string;
  hint?: string;
}

export interface GoldenBellSubmission {
  id: string;
  roundIndex: number;
  roundName?: string;
  userId: string;
  userCode: string; // 4자리 숫자
  correctCount: number;
  totalTimeMs: number;
  submittedAt: number;
  date?: string; // YYYY-MM-DD
  bonusAwarded: boolean;
  bonusPoints?: number;
  answers: {
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
    timeMs: number;
  }[];
}
