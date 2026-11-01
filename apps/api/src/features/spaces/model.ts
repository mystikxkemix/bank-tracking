import type { Collection, ObjectId } from 'mongodb';
import type { SpaceRole } from '@bank/shared';
import { getDb } from '../../db';

export interface SpaceMemberDoc {
  userId: ObjectId;
  role: SpaceRole;
  addedAt: Date;
}

/** Sharing unit. Members are embedded (a handful per space). A space always keeps at least one owner. */
export interface SpaceDoc {
  _id?: ObjectId;
  name: string;
  members: SpaceMemberDoc[];
  createdAt: Date;
}

export const spacesCollection = (): Collection<SpaceDoc> => getDb().collection<SpaceDoc>('spaces');

export async function ensureSpacesIndexes(): Promise<void> {
  await spacesCollection().createIndex({ 'members.userId': 1 });
}
