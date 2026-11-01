import { currentMonthKey } from '@bank/shared';

export interface MonthProgress {
  /** Share of the month elapsed, today included (day 23 of 31 -> 0.74). */
  ratio: number;
  /** Days left until the end of the month, today included. */
  daysLeft: number;
  /** Number of days of the month (last day). */
  daysInMonth: number;
}

/** Where we are in `month`, or null when it is not the current month (no "today" marker on past / future months). */
export function monthProgress(month: string, now: Date = new Date()): MonthProgress | null {
  if (month !== currentMonthKey(now)) {
    return null;
  }
  const daysInMonth: number = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day: number = now.getDate();
  return { ratio: day / daysInMonth, daysLeft: daysInMonth - day + 1, daysInMonth };
}
