import { GoldenBellScheduleItem } from '../types';

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

export function getRoundTimeStatus(
  scheduleItem: GoldenBellScheduleItem,
  adminForcedStatus?: 'idle' | 'countdown' | 'in_progress' | 'ended',
  adminActiveRound?: number | null
): 'active' | 'upcoming' | 'ended' {
  // If admin manually set round status
  if (adminForcedStatus === 'in_progress' && adminActiveRound === scheduleItem.round - 1) {
    return 'active';
  }
  if (adminForcedStatus === 'countdown' && adminActiveRound === scheduleItem.round - 1) {
    return 'active';
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
