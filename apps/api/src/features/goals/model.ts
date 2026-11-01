import type { Collection, ObjectId } from 'mongodb';
import type { Color } from '@bank/shared';
import { getDb } from '../../db';

export interface ContributionDoc {
  _id: ObjectId;
  date: Date;
  amountCents: number;
  note: string | null;
}

/** Contributions are embedded: a goal rarely has more than a few hundred. */
export interface GoalDoc {
  _id?: ObjectId;
  /** Owning space: every query filters on it. */
  spaceId: ObjectId;
  name: string;
  targetCents: number;
  deadline: Date | null;
  color: Color;
  emoji: string | null;
  contributions: ContributionDoc[];
  createdAt: Date;
}

export const goalsCollection = (): Collection<GoalDoc> => getDb().collection<GoalDoc>('goals');

export async function ensureGoalsIndexes(): Promise<void> {
  await goalsCollection().createIndex({ spaceId: 1, createdAt: 1 });
}
