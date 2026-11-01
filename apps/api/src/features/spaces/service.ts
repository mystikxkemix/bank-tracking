import type { ObjectId, WithId } from 'mongodb';
import type { AddMemberBody, Space, SpaceMember, SpaceRole } from '@bank/shared';
import { badRequest, conflict, notFound } from '../../lib/errors';
import { accountsCollection } from '../accounts/model';
import { usersCollection, type UserDoc } from '../auth/model';
import { budgetsCollection } from '../budgets/model';
import { seedDefaultCategories } from '../categories/defaults';
import { categoriesCollection, rulesCollection } from '../categories/model';
import { goalsCollection } from '../goals/model';
import { importsCollection } from '../imports/model';
import { splitMonthsCollection } from '../split/model';
import { transactionsCollection } from '../transactions/model';
import { spacesCollection, type SpaceDoc, type SpaceMemberDoc } from './model';

function roleOf(space: SpaceDoc, userId: ObjectId): SpaceRole | null {
  const member: SpaceMemberDoc | undefined = space.members.find((item: SpaceMemberDoc) => item.userId.equals(userId));
  return member?.role ?? null;
}

function ownerCount(space: SpaceDoc): number {
  return space.members.filter((item: SpaceMemberDoc) => item.role === 'owner').length;
}

function toDto(doc: WithId<SpaceDoc>, userId: ObjectId): Space {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    role: roleOf(doc, userId) ?? 'viewer',
    memberCount: doc.members.length,
    createdAt: doc.createdAt.toISOString(),
  };
}

async function getSpaceDoc(spaceId: ObjectId): Promise<WithId<SpaceDoc>> {
  const doc: WithId<SpaceDoc> | null = await spacesCollection().findOne({ _id: spaceId });
  if (!doc) {
    throw notFound('Espace');
  }
  return doc;
}

/** Role of a user in a space, null when not a member (or space missing). Used by requireSpace. */
export async function getRole(spaceId: ObjectId, userId: ObjectId): Promise<SpaceRole | null> {
  const doc: WithId<SpaceDoc> | null = await spacesCollection().findOne({ _id: spaceId, 'members.userId': userId });
  return doc ? roleOf(doc, userId) : null;
}

export async function listSpaces(userId: ObjectId): Promise<Space[]> {
  const docs: WithId<SpaceDoc>[] = await spacesCollection().find({ 'members.userId': userId }).sort({ createdAt: 1 }).toArray();
  return docs.map((doc: WithId<SpaceDoc>) => toDto(doc, userId));
}

/** Creates a space owned by `userId`, with the default categories. */
export async function createSpace(userId: ObjectId, name: string): Promise<Space> {
  const now: Date = new Date();
  const doc: SpaceDoc = { name, members: [{ userId, role: 'owner', addedAt: now }], createdAt: now };
  const result = await spacesCollection().insertOne(doc);
  await seedDefaultCategories(result.insertedId);
  return toDto({ ...doc, _id: result.insertedId }, userId);
}

export async function renameSpace(spaceId: ObjectId, userId: ObjectId, name: string): Promise<Space> {
  const doc: WithId<SpaceDoc> | null = await spacesCollection().findOneAndUpdate({ _id: spaceId }, { $set: { name } }, { returnDocument: 'after' });
  if (!doc) {
    throw notFound('Espace');
  }
  return toDto(doc, userId);
}

/** Deletes the space and ALL its data. Refused when it is the caller's only space. */
export async function deleteSpace(spaceId: ObjectId, userId: ObjectId): Promise<void> {
  if ((await spacesCollection().countDocuments({ 'members.userId': userId })) <= 1) {
    throw conflict('last_space', 'Impossible de supprimer ton seul espace');
  }
  await deleteSpaceData(spaceId);
}

/** Cascade used by deleteSpace and by user deletion. Keep in sync when a new collection gets a spaceId. */
export async function deleteSpaceData(spaceId: ObjectId): Promise<void> {
  await Promise.all([
    accountsCollection().deleteMany({ spaceId }),
    categoriesCollection().deleteMany({ spaceId }),
    rulesCollection().deleteMany({ spaceId }),
    transactionsCollection().deleteMany({ spaceId }),
    importsCollection().deleteMany({ spaceId }),
    budgetsCollection().deleteMany({ spaceId }),
    goalsCollection().deleteMany({ spaceId }),
    splitMonthsCollection().deleteMany({ spaceId }),
  ]);
  await spacesCollection().deleteOne({ _id: spaceId });
}

export async function listMembers(spaceId: ObjectId): Promise<SpaceMember[]> {
  const space: WithId<SpaceDoc> = await getSpaceDoc(spaceId);
  const users: WithId<UserDoc>[] = await usersCollection()
    .find({ _id: { $in: space.members.map((member: SpaceMemberDoc) => member.userId) } })
    .toArray();
  const usersById: Map<string, WithId<UserDoc>> = new Map();
  for (const user of users) {
    usersById.set(user._id.toHexString(), user);
  }
  const members: SpaceMember[] = [];
  for (const member of space.members) {
    const user: WithId<UserDoc> | undefined = usersById.get(member.userId.toHexString());
    if (user) {
      members.push({ userId: user._id.toHexString(), email: user.email, name: user.name, role: member.role });
    }
  }
  return members;
}

/** Shares the space with an existing user (the admin creates logins, see users feature). */
export async function addMember(spaceId: ObjectId, body: Required<AddMemberBody>): Promise<SpaceMember[]> {
  const user: WithId<UserDoc> | null = await usersCollection().findOne({ email: body.email });
  if (!user) {
    throw badRequest('unknown_user', "Aucun utilisateur avec cet email : demande à l'admin de le créer");
  }
  const space: WithId<SpaceDoc> = await getSpaceDoc(spaceId);
  if (roleOf(space, user._id) !== null) {
    throw conflict('already_member', 'Cette personne a déjà accès à cet espace');
  }
  await spacesCollection().updateOne({ _id: spaceId }, { $push: { members: { userId: user._id, role: body.role, addedAt: new Date() } } });
  return listMembers(spaceId);
}

export async function updateMemberRole(spaceId: ObjectId, memberId: ObjectId, role: SpaceRole): Promise<SpaceMember[]> {
  const space: WithId<SpaceDoc> = await getSpaceDoc(spaceId);
  const current: SpaceRole | null = roleOf(space, memberId);
  if (current === null) {
    throw notFound('Membre');
  }
  if (current === 'owner' && role !== 'owner' && ownerCount(space) === 1) {
    throw conflict('last_owner', "L'espace doit garder au moins un propriétaire");
  }
  await spacesCollection().updateOne({ _id: spaceId, 'members.userId': memberId }, { $set: { 'members.$.role': role } });
  return listMembers(spaceId);
}

/** Used by owners (remove someone) and by members leaving. The last owner can never be removed. */
export async function removeMember(spaceId: ObjectId, memberId: ObjectId): Promise<void> {
  const space: WithId<SpaceDoc> = await getSpaceDoc(spaceId);
  const current: SpaceRole | null = roleOf(space, memberId);
  if (current === null) {
    throw notFound('Membre');
  }
  if (current === 'owner' && ownerCount(space) === 1) {
    throw conflict('last_owner', "L'espace doit garder au moins un propriétaire");
  }
  await spacesCollection().updateOne({ _id: spaceId }, { $pull: { members: { userId: memberId } } });
}

/** For user deletion: spaces where the user is the only member are deleted, sole-owner shared spaces block. */
export async function detachUserFromSpaces(userId: ObjectId): Promise<void> {
  const spaces: WithId<SpaceDoc>[] = await spacesCollection().find({ 'members.userId': userId }).toArray();
  for (const space of spaces) {
    if (space.members.length > 1 && roleOf(space, userId) === 'owner' && ownerCount(space) === 1) {
      throw conflict('sole_owner', `Cette personne est seule propriétaire de l'espace « ${space.name} » partagé : transfère la propriété d'abord`);
    }
  }
  for (const space of spaces) {
    if (space.members.length === 1) {
      await deleteSpaceData(space._id);
    } else {
      await spacesCollection().updateOne({ _id: space._id }, { $pull: { members: { userId } } });
    }
  }
}
