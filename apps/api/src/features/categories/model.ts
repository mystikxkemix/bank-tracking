import type { Collection, ObjectId } from 'mongodb';
import type { CategoryKind, Color } from '@bank/shared';
import { getDb } from '../../db';

export interface CategoryDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  name: string;
  /** normalizeText(name), unique per space: prevents "Courses" and "courses". */
  nameKey: string;
  kind: CategoryKind;
  color: Color;
  emoji: string | null;
  createdAt: Date;
}

export interface RuleDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  /** As typed by the user (displayed). */
  pattern: string;
  /** normalizeText(pattern), matched as a substring of normalizeText(rawLabel). */
  patternKey: string;
  categoryId: ObjectId;
  /** Lowest wins when several rules match. */
  priority: number;
  createdAt: Date;
}

export const categoriesCollection = (): Collection<CategoryDoc> => getDb().collection<CategoryDoc>('categories');
export const rulesCollection = (): Collection<RuleDoc> => getDb().collection<RuleDoc>('rules');

export async function ensureCategoriesIndexes(): Promise<void> {
  await categoriesCollection().createIndex({ spaceId: 1, nameKey: 1 }, { unique: true });
  await rulesCollection().createIndex({ spaceId: 1, patternKey: 1 }, { unique: true });
  await rulesCollection().createIndex({ categoryId: 1 });
}
