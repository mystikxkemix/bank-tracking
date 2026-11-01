import {
  ObjectId,
  type AnyBulkWriteOperation,
  type BulkWriteResult,
  type DeleteResult,
  type Filter,
  type FindCursor,
  type InsertOneResult,
  type WithId,
} from 'mongodb';
import {
  normalizeText,
  type ApplyRulesResult,
  type Category,
  type CreateCategoryBody,
  type CreateRuleBody,
  type Rule,
  type UpdateCategoryBody,
  type UpdateRuleBody,
} from '@bank/shared';
import { conflict, notFound } from '../../lib/errors';
import { budgetsCollection } from '../budgets/model';
import { transactionsCollection, type TransactionDoc } from '../transactions/model';
import { matchCategory } from './matcher';
import { categoriesCollection, rulesCollection, type CategoryDoc, type RuleDoc } from './model';

const DUPLICATE_CATEGORY_MESSAGE: string = 'Une catégorie porte déjà ce nom';
const DUPLICATE_RULE_MESSAGE: string = 'Une règle existe déjà pour ce motif';

function toCategoryDto(doc: WithId<CategoryDoc>): Category {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    kind: doc.kind,
    color: doc.color,
    emoji: doc.emoji,
    createdAt: doc.createdAt.toISOString(),
  };
}

function toRuleDto(doc: WithId<RuleDoc>): Rule {
  return {
    id: doc._id.toHexString(),
    pattern: doc.pattern,
    categoryId: doc.categoryId.toHexString(),
    priority: doc.priority,
    createdAt: doc.createdAt.toISOString(),
  };
}

/* ------------------------------------------------------------------ categories */

/** Sorted by kind (expense, income, transfer: alphabetical happens to be the display order) then name. */
export async function listCategories(spaceId: ObjectId): Promise<Category[]> {
  const docs: WithId<CategoryDoc>[] = await categoriesCollection().find({ spaceId }).sort({ kind: 1, nameKey: 1 }).toArray();
  return docs.map(toCategoryDto);
}

/** Loads a category of the space, 404 otherwise. Other features use it to validate a categoryId from a body. */
export async function getCategoryDoc(spaceId: ObjectId, id: ObjectId): Promise<WithId<CategoryDoc>> {
  const doc: WithId<CategoryDoc> | null = await categoriesCollection().findOne({ _id: id, spaceId });
  if (!doc) {
    throw notFound('Catégorie');
  }
  return doc;
}

/** Pre-check for a French message; the unique index { spaceId, nameKey } stays the real guard. */
async function assertCategoryNameFree(spaceId: ObjectId, nameKey: string, exceptId: ObjectId | null): Promise<void> {
  const filter: Filter<CategoryDoc> = exceptId ? { spaceId, nameKey, _id: { $ne: exceptId } } : { spaceId, nameKey };
  if ((await categoriesCollection().countDocuments(filter, { limit: 1 })) > 0) {
    throw conflict('duplicate_category', DUPLICATE_CATEGORY_MESSAGE);
  }
}

export async function createCategory(spaceId: ObjectId, body: Required<CreateCategoryBody>): Promise<Category> {
  const nameKey: string = normalizeText(body.name);
  await assertCategoryNameFree(spaceId, nameKey, null);
  const doc: CategoryDoc = { spaceId, name: body.name, nameKey, kind: body.kind, color: body.color, emoji: body.emoji, createdAt: new Date() };
  const result: InsertOneResult<CategoryDoc> = await categoriesCollection().insertOne(doc);
  return toCategoryDto({ ...doc, _id: result.insertedId });
}

export async function updateCategory(spaceId: ObjectId, id: ObjectId, body: UpdateCategoryBody): Promise<Category> {
  const set: Partial<CategoryDoc> = {};
  if (body.name !== undefined) {
    set.name = body.name;
    set.nameKey = normalizeText(body.name);
    await assertCategoryNameFree(spaceId, set.nameKey, id);
  }
  if (body.kind !== undefined) {
    set.kind = body.kind;
  }
  if (body.color !== undefined) {
    set.color = body.color;
  }
  if (body.emoji !== undefined) {
    set.emoji = body.emoji;
  }
  const doc: WithId<CategoryDoc> | null = await categoriesCollection().findOneAndUpdate({ _id: id, spaceId }, { $set: set }, { returnDocument: 'after' });
  if (!doc) {
    throw notFound('Catégorie');
  }
  return toCategoryDto(doc);
}

/** Its transactions become uncategorized, its budget and its rules are deleted. */
export async function deleteCategory(spaceId: ObjectId, id: ObjectId): Promise<void> {
  await getCategoryDoc(spaceId, id);
  await Promise.all([
    transactionsCollection().updateMany({ spaceId, categoryId: id }, { $set: { categoryId: null, updatedAt: new Date() } }),
    budgetsCollection().deleteMany({ spaceId, categoryId: id }),
    rulesCollection().deleteMany({ spaceId, categoryId: id }),
  ]);
  await categoriesCollection().deleteOne({ _id: id, spaceId });
}

/* ------------------------------------------------------------------ rules */

export async function listRules(spaceId: ObjectId): Promise<Rule[]> {
  const docs: WithId<RuleDoc>[] = await rulesCollection().find({ spaceId }).sort({ priority: 1, patternKey: 1 }).toArray();
  return docs.map(toRuleDto);
}

/** Raw rule docs of the space, for the matcher (import and apply). */
export async function listRuleDocs(spaceId: ObjectId): Promise<WithId<RuleDoc>[]> {
  return rulesCollection().find({ spaceId }).toArray();
}

async function assertPatternFree(spaceId: ObjectId, patternKey: string, exceptId: ObjectId | null): Promise<void> {
  const filter: Filter<RuleDoc> = exceptId ? { spaceId, patternKey, _id: { $ne: exceptId } } : { spaceId, patternKey };
  if ((await rulesCollection().countDocuments(filter, { limit: 1 })) > 0) {
    throw conflict('duplicate_rule', DUPLICATE_RULE_MESSAGE);
  }
}

export async function createRule(spaceId: ObjectId, body: Required<CreateRuleBody>): Promise<Rule> {
  const categoryId: ObjectId = new ObjectId(body.categoryId);
  await getCategoryDoc(spaceId, categoryId);
  const patternKey: string = normalizeText(body.pattern);
  await assertPatternFree(spaceId, patternKey, null);
  const doc: RuleDoc = { spaceId, pattern: body.pattern, patternKey, categoryId, priority: body.priority, createdAt: new Date() };
  const result: InsertOneResult<RuleDoc> = await rulesCollection().insertOne(doc);
  return toRuleDto({ ...doc, _id: result.insertedId });
}

export async function updateRule(spaceId: ObjectId, id: ObjectId, body: UpdateRuleBody): Promise<Rule> {
  const set: Partial<RuleDoc> = {};
  if (body.pattern !== undefined) {
    set.pattern = body.pattern;
    set.patternKey = normalizeText(body.pattern);
    await assertPatternFree(spaceId, set.patternKey, id);
  }
  if (body.categoryId !== undefined) {
    set.categoryId = new ObjectId(body.categoryId);
    await getCategoryDoc(spaceId, set.categoryId);
  }
  if (body.priority !== undefined) {
    set.priority = body.priority;
  }
  const doc: WithId<RuleDoc> | null = await rulesCollection().findOneAndUpdate({ _id: id, spaceId }, { $set: set }, { returnDocument: 'after' });
  if (!doc) {
    throw notFound('Règle');
  }
  return toRuleDto(doc);
}

export async function deleteRule(spaceId: ObjectId, id: ObjectId): Promise<void> {
  const result: DeleteResult = await rulesCollection().deleteOne({ _id: id, spaceId });
  if (result.deletedCount === 0) {
    throw notFound('Règle');
  }
}

/**
 * Runs the rules over existing transactions. Transactions matching no rule are left as they are
 * (even with onlyUncategorized=false: a manual category is never removed, only replaced by a matching rule).
 * One updateMany per target category instead of one write per transaction.
 */
export async function applyRules(spaceId: ObjectId, onlyUncategorized: boolean): Promise<ApplyRulesResult> {
  const rules: WithId<RuleDoc>[] = await listRuleDocs(spaceId);
  if (rules.length === 0) {
    return { updated: 0 };
  }
  const filter: Filter<TransactionDoc> = onlyUncategorized ? { spaceId, categoryId: null } : { spaceId };
  const idsByCategory: Map<string, ObjectId[]> = new Map();
  const cursor: FindCursor<Pick<WithId<TransactionDoc>, '_id' | 'rawLabel' | 'categoryId'>> = transactionsCollection().find(filter, {
    projection: { _id: 1, rawLabel: 1, categoryId: 1 },
  });
  for await (const transaction of cursor) {
    const categoryId: ObjectId | null = matchCategory(rules, transaction.rawLabel);
    if (categoryId === null || (transaction.categoryId !== null && categoryId.equals(transaction.categoryId))) {
      continue;
    }
    const key: string = categoryId.toHexString();
    const ids: ObjectId[] | undefined = idsByCategory.get(key);
    if (ids) {
      ids.push(transaction._id);
    } else {
      idsByCategory.set(key, [transaction._id]);
    }
  }
  if (idsByCategory.size === 0) {
    return { updated: 0 };
  }
  const now: Date = new Date();
  const operations: AnyBulkWriteOperation<TransactionDoc>[] = [];
  for (const [categoryKey, ids] of idsByCategory) {
    operations.push({
      updateMany: { filter: { spaceId, _id: { $in: ids } }, update: { $set: { categoryId: new ObjectId(categoryKey), updatedAt: now } } },
    });
  }
  const result: BulkWriteResult = await transactionsCollection().bulkWrite(operations, { ordered: false });
  return { updated: result.modifiedCount };
}
