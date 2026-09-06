import { GoldenBellScheduleItem, UserProfile } from '../types';

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

export function isRoundPlayedToday(user: UserProfile | null | undefined, roundIndex: number): boolean {
  if (!user) return false;
  const today = getTodayDateString();
  if (user.goldenBellPlayDate !== today) {
    // If play date is not today, the user can play any round today
    return false;
  }
  return user.goldenBellRoundsPlayed?.includes(roundIndex) ?? false;
}

export function normalizeSchedule(schedule: (GoldenBellScheduleItem | string)[] | undefined): GoldenBellScheduleItem[] {
  if (schedule && Array.isArray(schedule)) {
    if (schedule.length === 0) return [];
    return schedule.map((item, idx) => {
      if (typeof item === 'string') {
        const [hStr, mStr] = item.split(':');
        const h = parseInt(hStr, 10) || 0;
        const m = parseInt(mStr, 10) || 0;
        const endTotalM = h * 60 + m + 30;
        const endH = Math.floor(endTotalM / 60) % 24;
        const endM = endTotalM % 60;
        const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        return {
          round: idx + 1,
          startTime: item,
          endTime,
        };
      }
      return {
        ...item,
        round: idx + 1,
      };
    });
  }

  // Default initial schedule
  return [
    { round: 1, startTime: '10:00', endTime: '10:30' },
    { round: 2, startTime: '11:00', endTime: '11:30' },
    { round: 3, startTime: '13:00', endTime: '13:30' },
    { round: 4, startTime: '14:00', endTime: '14:30' },
    { round: 5, startTime: '15:00', endTime: '15:30' },
  ];
}

export function isScheduleWithinTimeWindow(scheduleItem: GoldenBellScheduleItem): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = scheduleItem.startTime.split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);

  const [endH, endM] = scheduleItem.endTime.split(':').map(Number);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

export function getRoundTimeStatus(
  scheduleItem: GoldenBellScheduleItem,
  adminForcedStatus?: 'idle' | 'countdown' | 'in_progress' | 'ended',
  adminActiveRound?: number | null,
  forceStopped?: boolean
): 'active' | 'upcoming' | 'ended' {
  // If this round was explicitly force-stopped by admin
  if (forceStopped) {
    return 'ended';
  }

  // If admin manually ended this round
  if (adminForcedStatus === 'ended' && adminActiveRound === scheduleItem.round - 1) {
    return 'ended';
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = scheduleItem.startTime.split(':').map(Number);
  const startMinutes = (startH || 0) * 60 + (startM || 0);

  const [endH, endM] = scheduleItem.endTime.split(':').map(Number);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
    return 'active';
  } else if (currentMinutes < startMinutes) {
    return 'upcoming';
  } else {
    return 'ended';
  }
}

