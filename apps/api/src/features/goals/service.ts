import { ObjectId, type DeleteResult, type InsertOneResult, type WithId } from 'mongodb';
import { isoDateToUtc, type CreateContributionBody, type CreateGoalBody, type Goal } from '@bank/shared';
import { notFound } from '../../lib/errors';
import { toGoalDto, type GoalUpdate } from './mapper';
import { goalsCollection, type ContributionDoc, type GoalDoc } from './model';

export async function listGoals(spaceId: ObjectId): Promise<Goal[]> {
  const docs: WithId<GoalDoc>[] = await goalsCollection().find({ spaceId }).sort({ createdAt: 1, _id: 1 }).toArray();
  return docs.map(toGoalDto);
}

async function getGoalDoc(spaceId: ObjectId, id: ObjectId): Promise<WithId<GoalDoc>> {
  const doc: WithId<GoalDoc> | null = await goalsCollection().findOne({ _id: id, spaceId });
  if (!doc) {
    throw notFound('Objectif');
  }
  return doc;
}

export async function createGoal(spaceId: ObjectId, body: Required<CreateGoalBody>): Promise<Goal> {
  const doc: GoalDoc = {
    spaceId,
    name: body.name,
    targetCents: body.targetCents,
    deadline: body.deadline === null ? null : isoDateToUtc(body.deadline),
    color: body.color,
    emoji: body.emoji,
    contributions: [],
    createdAt: new Date(),
  };
  const result: InsertOneResult<GoalDoc> = await goalsCollection().insertOne(doc);
  return toGoalDto({ ...doc, _id: result.insertedId });
}

export async function updateGoal(spaceId: ObjectId, id: ObjectId, update: GoalUpdate): Promise<Goal> {
  if (Object.keys(update).length === 0) {
    return toGoalDto(await getGoalDoc(spaceId, id));
  }
  const doc: WithId<GoalDoc> | null = await goalsCollection().findOneAndUpdate({ _id: id, spaceId }, { $set: update }, { returnDocument: 'after' });
  if (!doc) {
    throw notFound('Objectif');
  }
  return toGoalDto(doc);
}

export async function deleteGoal(spaceId: ObjectId, id: ObjectId): Promise<void> {
  const result: DeleteResult = await goalsCollection().deleteOne({ _id: id, spaceId });
  if (result.deletedCount === 0) {
    throw notFound('Objectif');
  }
}

export async function addContribution(spaceId: ObjectId, id: ObjectId, body: Required<CreateContributionBody>): Promise<Goal> {
  const contribution: ContributionDoc = { _id: new ObjectId(), date: isoDateToUtc(body.date), amountCents: body.amountCents, note: body.note };
  const doc: WithId<GoalDoc> | null = await goalsCollection().findOneAndUpdate(
    { _id: id, spaceId },
    { $push: { contributions: contribution } },
    { returnDocument: 'after' },
  );
  if (!doc) {
    throw notFound('Objectif');
  }
  return toGoalDto(doc);
}

export async function deleteContribution(spaceId: ObjectId, id: ObjectId, contributionId: ObjectId): Promise<Goal> {
  const doc: WithId<GoalDoc> | null = await goalsCollection().findOneAndUpdate(
    { _id: id, spaceId, 'contributions._id': contributionId },
    { $pull: { contributions: { _id: contributionId } } },
    { returnDocument: 'after' },
  );
  if (!doc) {
    // Distinguish an unknown goal from an unknown contribution for a clearer message.
    await getGoalDoc(spaceId, id);
    throw notFound('Versement');
  }
  return toGoalDto(doc);
}
