import { ObjectId, type WithId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { updateGoalBodySchema, type Contribution, type Goal } from '@bank/shared';
import { buildGoalUpdate, toGoalDto } from './mapper';
import type { GoalDoc } from './model';

const goal: WithId<GoalDoc> = {
  _id: new ObjectId('64c000000000000000000001'),
  spaceId: new ObjectId('64c0000000000000000000ff'),
  name: 'Vacances été 2027',
  targetCents: 300_000,
  deadline: new Date('2027-06-30T00:00:00.000Z'),
  color: 'amber',
  emoji: '🏖️',
  contributions: [
    { _id: new ObjectId('64c000000000000000000010'), date: new Date('2026-05-05T00:00:00.000Z'), amountCents: 20_000, note: null },
    { _id: new ObjectId('64c000000000000000000012'), date: new Date('2026-10-05T00:00:00.000Z'), amountCents: -5_000, note: 'Billets de train' },
    { _id: new ObjectId('64c000000000000000000011'), date: new Date('2026-10-05T00:00:00.000Z'), amountCents: 20_000, note: null },
  ],
  createdAt: new Date('2026-05-01T08:00:00.000Z'),
};

describe('toGoalDto', () => {
  it('sums contributions (withdrawals included) and sorts them date desc', () => {
    const dto: Goal = toGoalDto(goal);
    expect(dto.savedCents).toBe(35_000);
    expect(dto.deadline).toBe('2027-06-30');
    expect(dto.contributions.map((contribution: Contribution) => contribution.id)).toEqual([
      '64c000000000000000000012',
      '64c000000000000000000011',
      '64c000000000000000000010',
    ]);
    expect(dto.contributions[0]).toEqual({ id: '64c000000000000000000012', date: '2026-10-05', amountCents: -5_000, note: 'Billets de train' });
  });

  it('handles a goal without deadline nor contributions', () => {
    const dto: Goal = toGoalDto({ ...goal, deadline: null, contributions: [] });
    expect(dto.deadline).toBeNull();
    expect(dto.savedCents).toBe(0);
    expect(dto.contributions).toEqual([]);
  });
});

describe('buildGoalUpdate', () => {
  it('keeps only the keys sent by the client (zod defaults would otherwise reset deadline and emoji)', () => {
    const raw: unknown = { name: 'Vacances 2027' };
    expect(buildGoalUpdate(updateGoalBodySchema.parse(raw), raw)).toEqual({ name: 'Vacances 2027' });
  });

  it('allows clearing the deadline and the emoji explicitly', () => {
    const raw: unknown = { deadline: null, emoji: null, targetCents: 250_000 };
    expect(buildGoalUpdate(updateGoalBodySchema.parse(raw), raw)).toEqual({ deadline: null, emoji: null, targetCents: 250_000 });
  });

  it('converts the deadline to a UTC date', () => {
    const raw: unknown = { deadline: '2027-07-14', color: 'teal' };
    expect(buildGoalUpdate(updateGoalBodySchema.parse(raw), raw)).toEqual({ deadline: new Date('2027-07-14T00:00:00.000Z'), color: 'teal' });
  });
});
