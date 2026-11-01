import type { DeleteResult, ObjectId, WithId } from 'mongodb';
import type { Budget, PutBudgetBody } from '@bank/shared';
import { badRequest, notFound } from '../../lib/errors';
import { categoriesCollection, type CategoryDoc } from '../categories/model';
import { budgetsCollection, type BudgetDoc } from './model';

function toDto(doc: Pick<BudgetDoc, 'categoryId' | 'monthlyLimitCents'>): Budget {
  return { categoryId: doc.categoryId.toHexString(), monthlyLimitCents: doc.monthlyLimitCents };
}

export async function listBudgets(spaceId: ObjectId): Promise<Budget[]> {
  const docs: WithId<BudgetDoc>[] = await budgetsCollection().find({ spaceId }).sort({ _id: 1 }).toArray();
  return docs.map(toDto);
}

/** Upsert: the category must belong to the space (404) and be an expense category (400). */
export async function putBudget(spaceId: ObjectId, categoryId: ObjectId, body: PutBudgetBody): Promise<Budget> {
  const category: WithId<CategoryDoc> | null = await categoriesCollection().findOne({ _id: categoryId, spaceId });
  if (!category) {
    throw notFound('Catégorie');
  }
  if (category.kind !== 'expense') {
    throw badRequest('category_not_expense', 'Un budget ne peut être défini que sur une catégorie de dépenses');
  }
  await budgetsCollection().updateOne(
    { spaceId, categoryId },
    { $set: { monthlyLimitCents: body.monthlyLimitCents, updatedAt: new Date() } },
    { upsert: true },
  );
  return toDto({ categoryId, monthlyLimitCents: body.monthlyLimitCents });
}

export async function deleteBudget(spaceId: ObjectId, categoryId: ObjectId): Promise<void> {
  const result: DeleteResult = await budgetsCollection().deleteOne({ spaceId, categoryId });
  if (result.deletedCount === 0) {
    throw notFound('Budget');
  }
}
