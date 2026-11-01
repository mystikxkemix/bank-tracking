import type { Collection, ObjectId } from 'mongodb';
import type { ImportFormat } from '@bank/shared';
import { getDb } from '../../db';

/** One file import. Deleting it removes its transactions (undo). */
export interface ImportDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  accountId: ObjectId;
  fileName: string;
  format: ImportFormat;
  insertedCount: number;
  duplicateCount: number;
  skippedCount: number;
  categorizedCount: number;
  createdAt: Date;
}

export const importsCollection = (): Collection<ImportDoc> => getDb().collection<ImportDoc>('imports');

export async function ensureImportsIndexes(): Promise<void> {
  await importsCollection().createIndex({ spaceId: 1, createdAt: -1 });
}
