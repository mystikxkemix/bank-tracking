import type { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../db';

export interface BudgetDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  /** One budget per expense category (category belongs to the same space). */
  categoryId: ObjectId;
  monthlyLimitCents: number;
  updatedAt: Date;
}

export const budgetsCollection = (): Collection<BudgetDoc> => getDb().collection<BudgetDoc>('budgets');

export async function ensureBudgetsIndexes(): Promise<void> {
  await budgetsCollection().createIndex({ spaceId: 1, categoryId: 1 }, { unique: true });
}
