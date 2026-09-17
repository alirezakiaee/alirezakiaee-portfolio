import type { AiFrequency } from '@prisma/client';

// Computes the next run time (UTC) for a schedule, strictly after `from`.
export function computeNextRunAt(
  frequency: AiFrequency,
  runHour: number,
  runWeekday: number,
  runMonthDay: number,
  from: Date = new Date()
): Date {
  const hour = Math.min(23, Math.max(0, runHour));
  const candidate = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), hour, 0, 0, 0));

  switch (frequency) {
    case 'DAILY': {
      if (candidate <= from) candidate.setUTCDate(candidate.getUTCDate() + 1);
      return candidate;
    }
    case 'WEEKLY': {
      const wd = Math.min(6, Math.max(0, runWeekday));
      const diff = (wd - candidate.getUTCDay() + 7) % 7;
      candidate.setUTCDate(candidate.getUTCDate() + diff);
      if (candidate <= from) candidate.setUTCDate(candidate.getUTCDate() + 7);
      return candidate;
    }
    case 'MONTHLY': {
      const day = Math.min(28, Math.max(1, runMonthDay));
      candidate.setUTCDate(day);
      if (candidate <= from) {
        candidate.setUTCMonth(candidate.getUTCMonth() + 1, 1);
        candidate.setUTCDate(day);
      }
      return candidate;
    }
  }
}

export function describeSchedule(
  frequency: AiFrequency,
  runHour: number,
  runWeekday: number,
  runMonthDay: number
): string {
  const hh = String(runHour).padStart(2, '0');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (frequency) {
    case 'DAILY':
      return `Daily at ${hh}:00 UTC`;
    case 'WEEKLY':
      return `Weekly on ${days[runWeekday] ?? '?'} at ${hh}:00 UTC`;
    case 'MONTHLY':
      return `Monthly on day ${runMonthDay} at ${hh}:00 UTC`;
  }
}
