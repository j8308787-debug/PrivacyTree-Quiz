import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  PledgeItem,
  GoldenBellSubmission,
  TreeLevelConfig,
} from '../types';

export function calculateTreeLevel(points: number, treeLevels: TreeLevelConfig[]): number {
  if (!treeLevels || treeLevels.length === 0) return 1;
  const sorted = [...treeLevels].sort((a, b) => b.minPoints - a.minPoints);
  for (const levelConfig of sorted) {
    if (points >= levelConfig.minPoints) {
      return levelConfig.level;
    }
  }
  return 1;
}

export function sanitizeUserId(code: string): string {
  const cleanCode = code.trim().replace(/\D/g, '').slice(0, 4);
  return `user_${cleanCode}`;
}

// Check if a 4-digit code is already registered
export async function checkCodeRegistration(code: string): Promise<{ exists: boolean; user?: UserProfile }> {
  const cleanCode = code.trim().replace(/\D/g, '').slice(0, 4);
  const userId = sanitizeUserId(cleanCode);
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return { exists: true, user: snap.data() as UserProfile };
  }
  return { exists: false };
}

// User Profile Operations with 4-digit code
export async function getOrCreateUserProfile(
  code: string,
  treeLevels: TreeLevelConfig[],
  forceCreateNew: boolean = false
): Promise<{ user: UserProfile; isExisting: boolean }> {
  const cleanCode = code.trim().replace(/\D/g, '').slice(0, 4);
  if (cleanCode.length !== 4) {
    throw new Error('참여 번호는 숫자 4자리여야 합니다.');
  }

  const userId = sanitizeUserId(cleanCode);
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    if (forceCreateNew) {
      throw new Error(`이미 등록된 4자리 참여 번호(${cleanCode})입니다. 중복 사용이 불가능합니다.`);
    }
    const existing = snap.data() as UserProfile;
    const currentLevel = calculateTreeLevel(existing.points, treeLevels);
    if (currentLevel !== existing.treeLevel) {
      updateDoc(userRef, { treeLevel: currentLevel, lastActive: Date.now() }).catch(() => {});
      existing.treeLevel = currentLevel;
    } else {
      updateDoc(userRef, { lastActive: Date.now() }).catch(() => {});
    }
    return { user: existing, isExisting: true };
  }

  const newUser: UserProfile = {
    id: userId,
    code: cleanCode,
    points: 0,
    waterDrops: 1, // 최초 참여 환영 물방울 1개
    waterCount: 0,
    pledgeCount: 0,
    lastActive: Date.now(),
    treeLevel: calculateTreeLevel(0, treeLevels),
    completedOxIds: [],
    goldenBellRoundsPlayed: [],
    createdAt: Date.now(),
  };

  await setDoc(userRef, newUser);
  return { user: newUser, isExisting: false };
}

// Watering Action
export async function performWatering(
  userId: string,
  treeLevels: TreeLevelConfig[],
  pointsPerWater: number = 10
): Promise<{ user: UserProfile; levelUp: boolean; previousLevel: number }> {
  const userRef = doc(db, 'users', userId);
  let result = { user: {} as UserProfile, levelUp: false, previousLevel: 1 };

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error('참여자를 찾을 수 없습니다.');
    const data = userDoc.data() as UserProfile;
    if (data.waterDrops <= 0) {
      throw new Error('물방울이 부족합니다. OX 퀴즈를 풀고 물방울을 충전하세요!');
    }

    const prevLevel = data.treeLevel || 1;
    const newPoints = (data.points || 0) + pointsPerWater;
    const newWaterDrops = Math.max(0, data.waterDrops - 1);
    const newLevel = calculateTreeLevel(newPoints, treeLevels);
    const isLevelUp = newLevel > prevLevel;

    const payload: Partial<UserProfile> = {
      points: newPoints,
      waterDrops: newWaterDrops,
      waterCount: (data.waterCount || 0) + 1,
      treeLevel: newLevel,
      lastActive: Date.now(),
    };

    transaction.update(userRef, payload);
    result = {
      user: { ...data, ...payload },
      levelUp: isLevelUp,
      previousLevel: prevLevel,
    };
  });

  return result;
}

// Pledge Action
export async function createPledge(
  user: UserProfile,
  content: string,
  color: string,
  treeLevels: TreeLevelConfig[],
  pledgeRewardPoints: number = 30
): Promise<{ pledge: PledgeItem; updatedUser: UserProfile }> {
  const trimmedContent = content.trim();

  // Check for duplicate pledge by the same 4-digit user in Firestore
  const pledgesCol = collection(db, 'pledges');
  const existingUserPledgesQuery = query(pledgesCol, where('userId', '==', user.id));
  const userPledgesSnap = await getDocs(existingUserPledgesQuery);

  const isDuplicate = userPledgesSnap.docs.some((d) => {
    const data = d.data() as PledgeItem;
    return data.content.trim().toLowerCase() === trimmedContent.toLowerCase();
  });

  if (isDuplicate) {
    throw new Error('이미 등록한 동일한 실천 다짐입니다.');
  }

  const pledgeId = `pledge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const pledgeRef = doc(db, 'pledges', pledgeId);

  const newPledge: PledgeItem = {
    id: pledgeId,
    userId: user.id,
    userCode: user.code,
    content: trimmedContent,
    createdAt: Date.now(),
    color,
    likes: 0,
    likedBy: [],
  };

  await setDoc(pledgeRef, newPledge);

  // Give point reward on writing pledge
  const userRef = doc(db, 'users', user.id);
  const newPoints = user.points + pledgeRewardPoints;
  const newLevel = calculateTreeLevel(newPoints, treeLevels);

  const updatedPayload: Partial<UserProfile> = {
    points: newPoints,
    pledgeCount: (user.pledgeCount || 0) + 1,
    treeLevel: newLevel,
    lastActive: Date.now(),
  };

  await updateDoc(userRef, updatedPayload);
  const updatedUser: UserProfile = { ...user, ...updatedPayload };

  return { pledge: newPledge, updatedUser };
}

// Like Pledge (1 person 1 heart, real-time aggregate sum)
export async function toggleLikePledge(pledgeId: string, userId: string): Promise<void> {
  const pledgeRef = doc(db, 'pledges', pledgeId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(pledgeRef);
    if (!snap.exists()) return;
    const data = snap.data() as PledgeItem;
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(userId);

    let newLikedBy: string[];
    if (hasLiked) {
      newLikedBy = likedBy.filter((id) => id !== userId);
    } else {
      newLikedBy = [...likedBy, userId];
    }

    const newLikes = newLikedBy.length;
    transaction.update(pledgeRef, {
      likes: newLikes,
      likedBy: newLikedBy,
    });
  });
}

// OX Quiz completion
export async function completeOxQuizQuestion(
  user: UserProfile,
  quizId: string,
  isCorrect: boolean,
  rewardDrops: number = 1
): Promise<{ updatedUser: UserProfile; dropsEarned: number }> {
  const userRef = doc(db, 'users', user.id);
  const completed = user.completedOxIds || [];
  const alreadyCompleted = completed.includes(quizId);

  let dropsEarned = 0;
  if (isCorrect && !alreadyCompleted) {
    dropsEarned = rewardDrops;
  }

  const updatedPayload: Partial<UserProfile> = {
    waterDrops: (user.waterDrops || 0) + dropsEarned,
    completedOxIds: alreadyCompleted ? completed : [...completed, quizId],
    lastActive: Date.now(),
  };

  await updateDoc(userRef, updatedPayload);
  return {
    updatedUser: { ...user, ...updatedPayload },
    dropsEarned,
  };
}

// Golden Bell Submission
export async function submitGoldenBellAnswers(
  user: UserProfile,
  roundIndex: number,
  answers: { questionId: string; selectedOption: number; isCorrect: boolean; timeMs: number }[],
  treeLevels: TreeLevelConfig[]
): Promise<{ submission: GoldenBellSubmission; updatedUser: UserProfile; correctCount: number; totalTimeMs: number }> {
  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalTimeMs = answers.reduce((acc, curr) => acc + curr.timeMs, 0);

  const submissionId = `sub_r${roundIndex}_${user.id}`;
  const subRef = doc(db, 'golden_bell_submissions', submissionId);

  const submission: GoldenBellSubmission = {
    id: submissionId,
    roundIndex,
    userId: user.id,
    userCode: user.code,
    correctCount,
    totalTimeMs,
    submittedAt: Date.now(),
    bonusAwarded: false,
    answers,
  };

  await setDoc(subRef, submission);

  // Give base participation points: 10 points per correct question + 5 base
  const baseEarned = correctCount * 10 + 5;
  const newPoints = (user.points || 0) + baseEarned;
  const newLevel = calculateTreeLevel(newPoints, treeLevels);
  const playedRounds = user.goldenBellRoundsPlayed || [];

  const userRef = doc(db, 'users', user.id);
  const userPayload: Partial<UserProfile> = {
    points: newPoints,
    treeLevel: newLevel,
    goldenBellRoundsPlayed: playedRounds.includes(roundIndex) ? playedRounds : [...playedRounds, roundIndex],
    lastActive: Date.now(),
  };

  await updateDoc(userRef, userPayload);

  return {
    submission,
    updatedUser: { ...user, ...userPayload },
    correctCount,
    totalTimeMs,
  };
}

// Calculate & Award Top 3 Round Bonuses (+50P each)
export async function awardGoldenBellRoundBonuses(
  roundIndex: number,
  rewards: { first: number; second: number; third: number } = { first: 50, second: 50, third: 50 },
  treeLevels: TreeLevelConfig[]
): Promise<{ awardedUsers: { userCode: string; rank: number; bonus: number }[] }> {
  const submissionsSnap = await getDocs(
    query(
      collection(db, 'golden_bell_submissions'),
      where('roundIndex', '==', roundIndex)
    )
  );

  const submissions = submissionsSnap.docs.map((d) => d.data() as GoldenBellSubmission);

  // Sort by correctCount DESC, then totalTimeMs ASC
  submissions.sort((a, b) => {
    if (b.correctCount !== a.correctCount) {
      return b.correctCount - a.correctCount;
    }
    return a.totalTimeMs - b.totalTimeMs;
  });

  const bonusTiers = [rewards.first, rewards.second, rewards.third];
  const awardedUsers: { userCode: string; rank: number; bonus: number }[] = [];

  for (let i = 0; i < Math.min(3, submissions.length); i++) {
    const sub = submissions[i];
    const bonus = bonusTiers[i];
    if (!sub.bonusAwarded && bonus > 0) {
      const userRef = doc(db, 'users', sub.userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const uData = userDoc.data() as UserProfile;
        const newPoints = (uData.points || 0) + bonus;
        const newLevel = calculateTreeLevel(newPoints, treeLevels);
        await updateDoc(userRef, {
          points: newPoints,
          treeLevel: newLevel,
        });

        // Mark submission as bonus awarded
        await updateDoc(doc(db, 'golden_bell_submissions', sub.id), {
          bonusAwarded: true,
          bonusPoints: bonus,
        });

        awardedUsers.push({
          userCode: sub.userCode,
          rank: i + 1,
          bonus,
        });
      }
    }
  }

  return { awardedUsers };
}

// Seed Demo 4-digit participants for realistic leaderboard
export async function seedDemoParticipants(
  treeLevels: TreeLevelConfig[]
): Promise<number> {
  const sampleCodes = [
    '1024', '2048', '3312', '4096', '5521', '6012', '7709', '8823', '9015', '1122',
    '3344', '5566', '7788', '9900', '1357', '2468', '3579', '4680', '5791', '6802',
    '1234', '5678', '4321', '8765', '1004', '7777', '8888', '9999', '2026', '3030',
  ];

  let count = 0;
  for (let i = 0; i < sampleCodes.length; i++) {
    const code = sampleCodes[i];
    const userId = sanitizeUserId(code);
    const randomPoints = Math.floor(Math.random() * 280) + 20;
    const randomWaterDrops = Math.floor(Math.random() * 3);
    const randomWaterCount = Math.floor(randomPoints / 12);
    const randomPledge = Math.random() > 0.3 ? 1 : 0;
    const treeLevel = calculateTreeLevel(randomPoints, treeLevels);

    const user: UserProfile = {
      id: userId,
      code,
      points: randomPoints,
      waterDrops: randomWaterDrops,
      waterCount: randomWaterCount,
      pledgeCount: randomPledge,
      lastActive: Date.now() - Math.floor(Math.random() * 86400000),
      treeLevel,
      completedOxIds: ['ox_1', 'ox_2'],
      goldenBellRoundsPlayed: [0],
      createdAt: Date.now() - 86400000 * 2,
    };

    await setDoc(doc(db, 'users', userId), user);
    count++;
  }
  return count;
}
