import { z } from 'zod';
import { colorSchema, idSchema, isoDateSchema, positiveCentsSchema } from './common';

export const contributionSchema = z.object({
  id: idSchema,
  date: isoDateSchema,
  /** Negative to record a withdrawal from the goal. */
  amountCents: z.number().int().refine((value: number) => value !== 0, 'Montant non nul requis'),
  note: z.string().nullable(),
});
export type Contribution = z.infer<typeof contributionSchema>;

export const goalSchema = z.object({
  id: idSchema,
  name: z.string(),
  targetCents: positiveCentsSchema,
  deadline: isoDateSchema.nullable(),
  color: colorSchema,
  emoji: z.string().nullable(),
  /** Sorted by date descending. */
  contributions: z.array(contributionSchema),
  /** Sum of contributions, computed server-side. */
  savedCents: z.number().int(),
  createdAt: z.string(),
});
export type Goal = z.infer<typeof goalSchema>;

const goalFields = {
  name: z.string().trim().min(1, 'Nom requis').max(80),
  targetCents: positiveCentsSchema,
  deadline: isoDateSchema.nullable(),
  color: colorSchema,
  emoji: z.string().trim().max(16).nullable(),
};

export const createGoalBodySchema = z.object({
  ...goalFields,
  deadline: goalFields.deadline.default(null),
  emoji: goalFields.emoji.default(null),
});
export type CreateGoalBody = z.input<typeof createGoalBodySchema>;

/** No defaults on update (see updateCategoryBodySchema in categories.ts). */
export const updateGoalBodySchema = z.object(goalFields).partial();
export type UpdateGoalBody = z.input<typeof updateGoalBodySchema>;

export const createContributionBodySchema = contributionSchema.omit({ id: true, note: true }).extend({
  note: z.string().trim().max(200).nullable().default(null),
});
export type CreateContributionBody = z.input<typeof createContributionBodySchema>;
