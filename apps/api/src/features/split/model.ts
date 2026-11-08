import type { Collection, ObjectId } from 'mongodb';
import type { SplitIncome, SplitLine, SplitPerson, SplitResult } from '@bank/shared';
import { getDb } from '../../db';

/** One saved monthly household split plan. Unsaved months are drafts computed on the fly (never stored). */
export interface SplitMonthDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  /** "YYYY-MM", unique per space. */
  month: string;
  persons: SplitPerson[];
  incomes: SplitIncome[];
  lines: SplitLine[];
  note: string | null;
  /** computeSplit() snapshot at save time, used by the history list without recomputing. */
  result: SplitResult;
  updatedAt: Date;
}

export const splitMonthsCollection = (): Collection<SplitMonthDoc> => getDb().collection<SplitMonthDoc>('splitMonths');

export async function ensureSplitIndexes(): Promise<void> {
  await splitMonthsCollection().createIndex({ spaceId: 1, month: -1 }, { unique: true });
}
