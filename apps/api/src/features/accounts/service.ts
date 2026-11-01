import type { ObjectId, WithId } from 'mongodb';
import type { Account, CreateAccountBody, CsvMapping, UpdateAccountBody } from '@bank/shared';
import { conflict, notFound } from '../../lib/errors';
import { transactionsCollection } from '../transactions/model';
import { accountsCollection, type AccountDoc } from './model';

interface AccountTotals {
  _id: ObjectId;
  count: number;
  balance: number;
}

function toDto(doc: WithId<AccountDoc>, totals: AccountTotals | undefined): Account {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    kind: doc.kind,
    currency: doc.currency,
    importProfile: doc.importProfile,
    transactionCount: totals?.count ?? 0,
    balanceCents: totals?.balance ?? 0,
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function listAccounts(spaceId: ObjectId): Promise<Account[]> {
  const docs: WithId<AccountDoc>[] = await accountsCollection().find({ spaceId }).sort({ createdAt: 1 }).toArray();
  const totals: AccountTotals[] = await transactionsCollection()
    .aggregate<AccountTotals>([
      { $match: { spaceId } },
      { $group: { _id: '$accountId', count: { $sum: 1 }, balance: { $sum: '$amountCents' } } },
    ])
    .toArray();
  const totalsById: Map<string, AccountTotals> = new Map();
  for (const total of totals) {
    totalsById.set(total._id.toHexString(), total);
  }
  return docs.map((doc: WithId<AccountDoc>) => toDto(doc, totalsById.get(doc._id.toHexString())));
}

/** Loads an account of the space, 404 otherwise. Other features use it to validate an accountId. */
export async function getAccountDoc(spaceId: ObjectId, id: ObjectId): Promise<WithId<AccountDoc>> {
  const doc: WithId<AccountDoc> | null = await accountsCollection().findOne({ _id: id, spaceId });
  if (!doc) {
    throw notFound('Compte');
  }
  return doc;
}

export async function createAccount(spaceId: ObjectId, body: Required<CreateAccountBody>): Promise<Account> {
  const doc: AccountDoc = { spaceId, name: body.name, kind: body.kind, currency: body.currency, importProfile: null, createdAt: new Date() };
  const result = await accountsCollection().insertOne(doc);
  return toDto({ ...doc, _id: result.insertedId }, undefined);
}

export async function updateAccount(spaceId: ObjectId, id: ObjectId, body: UpdateAccountBody): Promise<Account> {
  const doc: WithId<AccountDoc> | null = await accountsCollection().findOneAndUpdate({ _id: id, spaceId }, { $set: body }, { returnDocument: 'after' });
  if (!doc) {
    throw notFound('Compte');
  }
  const account: Account | undefined = (await listAccounts(spaceId)).find((item: Account) => item.id === id.toHexString());
  return account ?? toDto(doc, undefined);
}

/** Saved after a successful CSV import so the next one is pre-filled. */
export async function saveImportProfile(spaceId: ObjectId, id: ObjectId, mapping: CsvMapping): Promise<void> {
  await accountsCollection().updateOne({ _id: id, spaceId }, { $set: { importProfile: mapping } });
}

/** Refuses when transactions exist: the user must undo imports first, nothing is deleted silently. */
export async function deleteAccount(spaceId: ObjectId, id: ObjectId): Promise<void> {
  if ((await transactionsCollection().countDocuments({ spaceId, accountId: id }, { limit: 1 })) > 0) {
    throw conflict('account_not_empty', 'Ce compte contient des transactions : annule ses imports avant de le supprimer');
  }
  const result = await accountsCollection().deleteOne({ _id: id, spaceId });
  if (result.deletedCount === 0) {
    throw notFound('Compte');
  }
}
