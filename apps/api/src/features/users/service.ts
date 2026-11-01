import type { ObjectId, WithId } from 'mongodb';
import type { CreateUserBody, UpdateUserBody, User } from '@bank/shared';
import { conflict, notFound } from '../../lib/errors';
import { usersCollection, type UserDoc } from '../auth/model';
import { deleteSessions, insertUser, setPassword } from '../auth/service';
import { detachUserFromSpaces } from '../spaces/service';

function toDto(doc: WithId<UserDoc>): User {
  return { id: doc._id.toHexString(), email: doc.email, name: doc.name, isAdmin: doc.isAdmin, createdAt: doc.createdAt.toISOString() };
}

async function ensureAnotherAdmin(excludedId: ObjectId): Promise<void> {
  if ((await usersCollection().countDocuments({ isAdmin: true, _id: { $ne: excludedId } })) === 0) {
    throw conflict('last_admin', 'Il doit rester au moins un administrateur');
  }
}

export async function listUsers(): Promise<User[]> {
  const docs: WithId<UserDoc>[] = await usersCollection().find().sort({ createdAt: 1 }).toArray();
  return docs.map(toDto);
}

export async function createUser(body: Required<CreateUserBody>): Promise<User> {
  return toDto(await insertUser(body.email, body.name, body.password, body.isAdmin));
}

export async function updateUser(id: ObjectId, body: UpdateUserBody): Promise<User> {
  if (body.isAdmin === false) {
    await ensureAnotherAdmin(id);
  }
  const doc: WithId<UserDoc> | null = await usersCollection().findOneAndUpdate({ _id: id }, { $set: body }, { returnDocument: 'after' });
  if (!doc) {
    throw notFound('Utilisateur');
  }
  return toDto(doc);
}

export async function resetPassword(id: ObjectId, password: string): Promise<void> {
  if (!(await usersCollection().findOne({ _id: id }))) {
    throw notFound('Utilisateur');
  }
  await setPassword(id, password);
}

/** Deletes the login, its solo spaces (with their data) and its memberships. */
export async function deleteUser(id: ObjectId, callerId: ObjectId): Promise<void> {
  if (id.equals(callerId)) {
    throw conflict('self_delete', 'Tu ne peux pas supprimer ton propre compte');
  }
  const user: WithId<UserDoc> | null = await usersCollection().findOne({ _id: id });
  if (!user) {
    throw notFound('Utilisateur');
  }
  if (user.isAdmin) {
    await ensureAnotherAdmin(id);
  }
  await detachUserFromSpaces(id);
  await deleteSessions(id);
  await usersCollection().deleteOne({ _id: id });
}
