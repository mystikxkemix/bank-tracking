import { z } from 'zod';
import { idSchema, positiveCentsSchema } from './common';

/** A monthly spending limit for one expense category (same limit every month). */
export const budgetSchema = z.object({
  categoryId: idSchema,
  monthlyLimitCents: positiveCentsSchema,
});
export type Budget = z.infer<typeof budgetSchema>;

export const putBudgetBodySchema = z.object({
  monthlyLimitCents: positiveCentsSchema,
});
export type PutBudgetBody = z.infer<typeof putBudgetBodySchema>;
