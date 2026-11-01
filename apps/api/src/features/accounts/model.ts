import type { Collection, ObjectId } from 'mongodb';
import type { AccountKind, CsvMapping } from '@bank/shared';
import { getDb } from '../../db';

export interface AccountDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  name: string;
  kind: AccountKind;
  currency: string;
  importProfile: CsvMapping | null;
  createdAt: Date;
}

export const accountsCollection = (): Collection<AccountDoc> => getDb().collection<AccountDoc>('accounts');

export async function ensureAccountsIndexes(): Promise<void> {
  await accountsCollection().createIndex({ spaceId: 1, createdAt: 1 });
}
