import type { Goal } from '@bank/shared';

/** Today as "YYYY-MM-DD" in the local timezone (default date of a new contribution). */
export function todayIsoDate(now: Date = new Date()): string {
  const month: string = String(now.getMonth() + 1).padStart(2, '0');
  const day: string = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export interface GoalProgress {
  /** 0..1, clamped (withdrawals can make the saved amount negative). */
  ratio: number;
  remainingCents: number;
  done: boolean;
  /** Deadline in the past and target not reached. */
  late: boolean;
  /** What to put aside every month to reach the target by the deadline, null without deadline / when done / late. */
  monthlyNeededCents: number | null;
}

/** Whole months between today and the deadline, at least 1 (a deadline this month still needs one transfer). */
function monthsUntil(deadline: string, now: Date): number {
  const year: number = Number(deadline.slice(0, 4));
  const month: number = Number(deadline.slice(5, 7));
  const day: number = Number(deadline.slice(8, 10));
  let months: number = (year - now.getFullYear()) * 12 + (month - 1 - now.getMonth());
  if (day < now.getDate()) {
    months -= 1;
  }
  return Math.max(1, months);
}

export function goalProgress(goal: Goal, now: Date = new Date()): GoalProgress {
  const remainingCents: number = Math.max(0, goal.targetCents - goal.savedCents);
  const done: boolean = remainingCents === 0;
  const late: boolean = !done && goal.deadline !== null && goal.deadline < todayIsoDate(now);
  const monthlyNeededCents: number | null = !done && !late && goal.deadline ? Math.ceil(remainingCents / monthsUntil(goal.deadline, now)) : null;
  return { ratio: Math.min(1, Math.max(0, goal.savedCents / goal.targetCents)), remainingCents, done, late, monthlyNeededCents };
}
