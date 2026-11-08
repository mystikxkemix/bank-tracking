import type { DeleteResult, ObjectId, WithId } from 'mongodb';
import { computeSplit, type SplitHistoryItem, type SplitMonth, type SplitPlanData, type SplitResult } from '@bank/shared';
import { notFound } from '../../lib/errors';
import { resolveSplitMonth, savedSplitMonth, toHistoryItem } from './draft';
import { splitMonthsCollection, type SplitMonthDoc } from './model';

export async function listSplitHistory(spaceId: ObjectId): Promise<SplitHistoryItem[]> {
  const docs: WithId<SplitMonthDoc>[] = await splitMonthsCollection().find({ spaceId }).sort({ month: -1 }).toArray();
  return docs.map(toHistoryItem);
}

export async function getSplitMonth(spaceId: ObjectId, month: string): Promise<SplitMonth> {
  const saved: WithId<SplitMonthDoc> | null = await splitMonthsCollection().findOne({ spaceId, month });
  if (saved) {
    return savedSplitMonth(saved);
  }
  // "YYYY-MM" keys sort chronologically as strings.
  const previous: WithId<SplitMonthDoc> | null = await splitMonthsCollection().findOne({ spaceId, month: { $lt: month } }, { sort: { month: -1 } });
  return resolveSplitMonth(month, null, previous);
}

/** Full replace (upsert). The result is recomputed server-side, never trusted from the client. */
export async function putSplitMonth(spaceId: ObjectId, month: string, plan: SplitPlanData): Promise<SplitMonth> {
  const result: SplitResult = computeSplit(plan);
  const doc: WithId<SplitMonthDoc> | null = await splitMonthsCollection().findOneAndUpdate(
    { spaceId, month },
    { $set: { persons: plan.persons, incomes: plan.incomes, lines: plan.lines, note: plan.note, result, updatedAt: new Date() } },
    { upsert: true, returnDocument: 'after' },
  );
  if (!doc) {
    throw new Error('Split month upsert returned no document');
  }
  return savedSplitMonth(doc);
}

export async function deleteSplitMonth(spaceId: ObjectId, month: string): Promise<void> {
  const result: DeleteResult = await splitMonthsCollection().deleteOne({ spaceId, month });
  if (result.deletedCount === 0) {
    throw notFound('Répartition de ce mois');
  }
}
