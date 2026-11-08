import type { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../db';

export interface TransactionDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  accountId: ObjectId;
  /** Calendar day at UTC midnight. */
  date: Date;
  label: string;
  rawLabel: string;
  /** Signed integer cents, negative = expense. */
  amountCents: number;
  categoryId: ObjectId | null;
  note: string | null;
  importId: ObjectId | null;
  /**
   * Idempotency key, unique per account. CSV: "<date>|<cents>|<normalized rawLabel>|<n>" where n is the
   * occurrence index of that triple inside the file. OFX: "ofx:<FITID>". Re-importing a file inserts nothing.
   */
  dedupKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export const transactionsCollection = (): Collection<TransactionDoc> => getDb().collection<TransactionDoc>('transactions');

export async function ensureTransactionsIndexes(): Promise<void> {
  const collection: Collection<TransactionDoc> = transactionsCollection();
  await collection.createIndex({ accountId: 1, dedupKey: 1 }, { unique: true });
  await collection.createIndex({ spaceId: 1, date: -1 });
  await collection.createIndex({ spaceId: 1, categoryId: 1, date: -1 });
  await collection.createIndex({ importId: 1 });
}
