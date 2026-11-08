import type { WithId } from 'mongodb';
import { isoDateToUtc, utcToIsoDate, type Contribution, type Goal, type UpdateGoalBody } from '@bank/shared';
import type { ContributionDoc, GoalDoc } from './model';

/** Pure mapping, no Mongo access: unit tested in mapper.test.ts. */

function compareContributions(left: ContributionDoc, right: ContributionDoc): number {
  const byDate: number = right.date.getTime() - left.date.getTime();
  // Same day: the most recently added first (ObjectIds grow with time).
  return byDate !== 0 ? byDate : right._id.toHexString().localeCompare(left._id.toHexString());
}

export function toGoalDto(doc: WithId<GoalDoc>): Goal {
  const sorted: ContributionDoc[] = [...doc.contributions].sort(compareContributions);
  const contributions: Contribution[] = [];
  let savedCents: number = 0;
  for (const contribution of sorted) {
    savedCents += contribution.amountCents;
    contributions.push({
      id: contribution._id.toHexString(),
      date: utcToIsoDate(contribution.date),
      amountCents: contribution.amountCents,
      note: contribution.note,
    });
  }
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    targetCents: doc.targetCents,
    deadline: doc.deadline ? utcToIsoDate(doc.deadline) : null,
    color: doc.color,
    emoji: doc.emoji,
    contributions,
    savedCents,
    createdAt: doc.createdAt.toISOString(),
  };
}

export type GoalUpdate = Partial<Pick<GoalDoc, 'name' | 'targetCents' | 'deadline' | 'color' | 'emoji'>>;

/**
 * Builds the $set of a PATCH. updateGoalBodySchema is createGoalBodySchema.partial(), and zod 4 still applies
 * the inner defaults (deadline, emoji = null) to absent keys: only the keys present in the raw request body
 * are kept, so a PATCH { name } does not wipe the deadline.
 */
export function buildGoalUpdate(parsed: UpdateGoalBody, rawBody: unknown): GoalUpdate {
  const provided: Set<string> = new Set(typeof rawBody === 'object' && rawBody !== null ? Object.keys(rawBody) : []);
  const update: GoalUpdate = {};
  if (provided.has('name') && parsed.name !== undefined) {
    update.name = parsed.name;
  }
  if (provided.has('targetCents') && parsed.targetCents !== undefined) {
    update.targetCents = parsed.targetCents;
  }
  if (provided.has('deadline') && parsed.deadline !== undefined) {
    update.deadline = parsed.deadline === null ? null : isoDateToUtc(parsed.deadline);
  }
  if (provided.has('color') && parsed.color !== undefined) {
    update.color = parsed.color;
  }
  if (provided.has('emoji') && parsed.emoji !== undefined) {
    update.emoji = parsed.emoji;
  }
  return update;
}
