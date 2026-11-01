import { ObjectId, type DeleteResult, type Filter, type UpdateResult, type WithId } from 'mongodb';
import type { z } from 'zod';
import {
  monthRange,
  utcToIsoDate,
  type ApplyRulesResult,
  type BulkCategorizeBody,
  type Transaction,
  type TransactionPage,
  type transactionQuerySchema,
  type UpdateTransactionBody,
} from '@bank/shared';
import { notFound } from '../../lib/errors';
import { escapeRegex, toObjectId } from '../../lib/http';
import { getCategoryDoc } from '../categories/service';
import { transactionsCollection, type TransactionDoc } from './model';

/** Query after zod parsing (page and pageSize defaulted). */
export type ParsedTransactionQuery = z.output<typeof transactionQuerySchema>;

export function toTransactionDto(doc: WithId<TransactionDoc>): Transaction {
  return {
    id: doc._id.toHexString(),
    accountId: doc.accountId.toHexString(),
    date: utcToIsoDate(doc.date),
    label: doc.label,
    rawLabel: doc.rawLabel,
    amountCents: doc.amountCents,
    categoryId: doc.categoryId ? doc.categoryId.toHexString() : null,
    note: doc.note,
    importId: doc.importId ? doc.importId.toHexString() : null,
    createdAt: doc.createdAt.toISOString(),
  };
}

function buildFilter(spaceId: ObjectId, query: ParsedTransactionQuery): Filter<TransactionDoc> {
  const filter: Filter<TransactionDoc> = { spaceId };
  if (query.month) {
    const range: { start: Date; end: Date } = monthRange(query.month);
    filter.date = { $gte: range.start, $lt: range.end };
  }
  if (query.accountId) {
    filter.accountId = new ObjectId(query.accountId);
  }
  if (query.categoryId) {
    filter.categoryId = query.categoryId === 'none' ? null : new ObjectId(query.categoryId);
  }
  if (query.importId) {
    filter.importId = new ObjectId(query.importId);
  }
  if (query.q) {
    const regex: RegExp = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ label: regex }, { rawLabel: regex }, { note: regex }];
  }
  return filter;
}

/** Sorted date desc then _id desc so pagination is stable inside a day. */
export async function listTransactions(spaceId: ObjectId, query: ParsedTransactionQuery): Promise<TransactionPage> {
  const filter: Filter<TransactionDoc> = buildFilter(spaceId, query);
  const [docs, total]: [WithId<TransactionDoc>[], number] = await Promise.all([
    transactionsCollection()
      .find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .toArray(),
    transactionsCollection().countDocuments(filter),
  ]);
  return { items: docs.map(toTransactionDto), total, page: query.page, pageSize: query.pageSize };
}

/** Validates a categoryId coming from a body: it must belong to the space (null = uncategorize). */
async function resolveCategoryId(spaceId: ObjectId, categoryId: string | null): Promise<ObjectId | null> {
  const id: ObjectId | null = toObjectId(categoryId);
  if (id !== null) {
    await getCategoryDoc(spaceId, id);
  }
  return id;
}

export async function updateTransaction(spaceId: ObjectId, id: ObjectId, body: UpdateTransactionBody): Promise<Transaction> {
  const set: Partial<TransactionDoc> = { updatedAt: new Date() };
  if (body.label !== undefined) {
    set.label = body.label;
  }
  if (body.categoryId !== undefined) {
    set.categoryId = await resolveCategoryId(spaceId, body.categoryId);
  }
  if (body.note !== undefined) {
    // An empty note is stored as null so the UI has a single "no note" state.
    set.note = body.note === null || body.note === '' ? null : body.note;
  }
  const doc: WithId<TransactionDoc> | null = await transactionsCollection().findOneAndUpdate(
    { _id: id, spaceId },
    { $set: set },
    { returnDocument: 'after' },
  );
  if (!doc) {
    throw notFound('Transaction');
  }
  return toTransactionDto(doc);
}

/** Ids of another space are silently ignored by the spaceId filter (they are not counted in `updated`). */
export async function bulkCategorize(spaceId: ObjectId, body: BulkCategorizeBody): Promise<ApplyRulesResult> {
  const categoryId: ObjectId | null = await resolveCategoryId(spaceId, body.categoryId);
  const ids: ObjectId[] = body.ids.map((value: string) => new ObjectId(value));
  const result: UpdateResult<TransactionDoc> = await transactionsCollection().updateMany(
    { spaceId, _id: { $in: ids } },
    { $set: { categoryId, updatedAt: new Date() } },
  );
  return { updated: result.modifiedCount };
}

export async function deleteTransaction(spaceId: ObjectId, id: ObjectId): Promise<void> {
  const result: DeleteResult = await transactionsCollection().deleteOne({ _id: id, spaceId });
  if (result.deletedCount === 0) {
    throw notFound('Transaction');
  }
}
