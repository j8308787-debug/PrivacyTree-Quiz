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
  activeRound: number | null; // 0~4 (Round 1~5) or null
  roundStatus: 'idle' | 'countdown' | 'in_progress' | 'ended';
  roundStartTime: number | null; // epoch timestamp
  presetPledges?: string[];
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
  userId: string;
  userCode: string; // 4자리 숫자
  correctCount: number;
  totalTimeMs: number;
  submittedAt: number;
  bonusAwarded: boolean;
  bonusPoints?: number;
  answers: {
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
    timeMs: number;
  }[];
}
