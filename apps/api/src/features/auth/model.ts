import type { Collection, ObjectId } from 'mongodb';
import { getDb } from '../../db';

/** A login. Created by setup (first admin) or by an admin, never by self sign-up. */
export interface UserDoc {
  _id?: ObjectId;
  /** Lowercased, unique. */
  email: string;
  name: string;
  /** scrypt$<saltB64>$<hashB64>, see password.ts */
  passwordHash: string;
  isAdmin: boolean;
  createdAt: Date;
}

export interface SessionDoc {
  /** sha256 of the cookie token: the raw token is never stored. */
  _id: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export const usersCollection = (): Collection<UserDoc> => getDb().collection<UserDoc>('users');
export const sessionsCollection = (): Collection<SessionDoc> => getDb().collection<SessionDoc>('sessions');

export async function ensureAuthIndexes(): Promise<void> {
  await usersCollection().createIndex({ email: 1 }, { unique: true });
  // Mongo deletes expired sessions by itself.
  await sessionsCollection().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await sessionsCollection().createIndex({ userId: 1 });
}
