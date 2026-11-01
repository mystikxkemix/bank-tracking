import { createHash, randomBytes } from 'node:crypto';
import type { ObjectId, WithId } from 'mongodb';
import type { AuthStatus, ChangePasswordBody, CurrentUser, LoginBody, SetupBody } from '@bank/shared';
import { config } from '../../config';
import type { AuthContext } from '../../lib/context';
import { badRequest, conflict, tooManyRequests, unauthorized } from '../../lib/errors';
import { createSpace } from '../spaces/service';
import { sessionsCollection, usersCollection, type SessionDoc, type UserDoc } from './model';
import { hashPassword, verifyPassword } from './password';

const MAX_FAILED_ATTEMPTS: number = 10;
const FAILED_WINDOW_MS: number = 15 * 60 * 1000;

/** In-memory brute force guard, per client IP. Good enough for a single-instance self-hosted app. */
const failedAttempts: Map<string, { count: number; firstAt: number }> = new Map();

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function sessionTtlMs(): number {
  return config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function toCurrentUser(user: WithId<UserDoc>): CurrentUser {
  return { id: user._id.toHexString(), email: user.email, name: user.name, isAdmin: user.isAdmin };
}

/** Creates a session and returns the raw token to put in the cookie. */
async function createSession(userId: ObjectId): Promise<string> {
  const token: string = randomBytes(32).toString('base64url');
  const now: Date = new Date();
  await sessionsCollection().insertOne({ _id: hashToken(token), userId, createdAt: now, expiresAt: new Date(now.getTime() + sessionTtlMs()) });
  return token;
}

/** Resolves the cookie token to the user, null when missing/expired/deleted user. */
export async function resolveSession(token: string | undefined): Promise<WithId<UserDoc> | null> {
  if (!token) {
    return null;
  }
  const session: SessionDoc | null = await sessionsCollection().findOne({ _id: hashToken(token), expiresAt: { $gt: new Date() } });
  return session ? usersCollection().findOne({ _id: session.userId }) : null;
}

export async function getStatus(token: string | undefined): Promise<AuthStatus> {
  const configured: boolean = (await usersCollection().countDocuments({}, { limit: 1 })) > 0;
  const user: WithId<UserDoc> | null = configured ? await resolveSession(token) : null;
  return { configured, user: user ? toCurrentUser(user) : null };
}

/** Inserts a user and their personal space. Shared by setup and admin user creation. */
export async function insertUser(email: string, name: string, password: string, isAdmin: boolean): Promise<WithId<UserDoc>> {
  if (await usersCollection().findOne({ email })) {
    throw conflict('email_taken', 'Un utilisateur utilise déjà cet email');
  }
  const doc: UserDoc = { email, name, isAdmin, passwordHash: await hashPassword(password), createdAt: new Date() };
  const result = await usersCollection().insertOne(doc);
  await createSpace(result.insertedId, `Espace de ${name}`);
  return { ...doc, _id: result.insertedId };
}

/** First launch only: creates the admin and logs in. */
export async function setup(body: Required<SetupBody>): Promise<string> {
  if ((await usersCollection().countDocuments({}, { limit: 1 })) > 0) {
    throw conflict('already_configured', "L'application est déjà configurée");
  }
  const user: WithId<UserDoc> = await insertUser(body.email, body.name, body.password, true);
  return createSession(user._id);
}

export async function login(body: Required<LoginBody>, clientIp: string): Promise<string> {
  const now: number = Date.now();
  const attempts = failedAttempts.get(clientIp);
  if (attempts && now - attempts.firstAt < FAILED_WINDOW_MS && attempts.count >= MAX_FAILED_ATTEMPTS) {
    throw tooManyRequests('Trop de tentatives, réessaie dans quelques minutes');
  }

  const user: WithId<UserDoc> | null = await usersCollection().findOne({ email: body.email });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    if (!attempts || now - attempts.firstAt >= FAILED_WINDOW_MS) {
      failedAttempts.set(clientIp, { count: 1, firstAt: now });
    } else {
      attempts.count += 1;
    }
    throw unauthorized('Email ou mot de passe incorrect');
  }

  failedAttempts.delete(clientIp);
  return createSession(user._id);
}

export async function logout(token: string | undefined): Promise<void> {
  if (token) {
    await sessionsCollection().deleteOne({ _id: hashToken(token) });
  }
}

/** Changes the caller's password and revokes their other sessions. */
export async function changePassword(auth: AuthContext, body: ChangePasswordBody, currentToken: string | undefined): Promise<void> {
  const user: WithId<UserDoc> | null = await usersCollection().findOne({ _id: auth.userId });
  if (!user || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
    throw badRequest('wrong_password', 'Mot de passe actuel incorrect');
  }
  await usersCollection().updateOne({ _id: auth.userId }, { $set: { passwordHash: await hashPassword(body.newPassword) } });
  await sessionsCollection().deleteMany({ userId: auth.userId, _id: { $ne: currentToken ? hashToken(currentToken) : '' } });
}

/** Admin reset: sets a new password and logs the user out everywhere. */
export async function setPassword(userId: ObjectId, password: string): Promise<void> {
  await usersCollection().updateOne({ _id: userId }, { $set: { passwordHash: await hashPassword(password) } });
  await sessionsCollection().deleteMany({ userId });
}

export async function deleteSessions(userId: ObjectId): Promise<void> {
  await sessionsCollection().deleteMany({ userId });
}
