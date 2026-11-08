import { z } from 'zod';
import { idSchema, monthKeySchema } from './common';

/** Income / expenses / savings for one month. Transfer categories are excluded. */
export const monthlyStatSchema = z.object({
  month: monthKeySchema,
  /** Sum of positive non-transfer amounts. */
  incomeCents: z.number().int(),
  /** Sum of negative non-transfer amounts, as a POSITIVE number. */
  expenseCents: z.number().int(),
  /** incomeCents - expenseCents. This is the "savings" of the month. */
  netCents: z.number().int(),
  /** netCents / incomeCents, null when there is no income. Can be negative. */
  savingsRate: z.number().nullable(),
});
export type MonthlyStat = z.infer<typeof monthlyStatSchema>;

/** GET /api/stats/monthly?months=12 (oldest first, ends with the current month). */
export const monthlyStatsQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(60).default(12),
  /** Last month of the series, defaults to the current month. */
  until: monthKeySchema.optional(),
});
export type MonthlyStatsQuery = { months?: number; until?: string };

export const categoryTotalSchema = z.object({
  /** null = uncategorized. */
  categoryId: idSchema.nullable(),
  /** Signed sum (expenses negative). */
  totalCents: z.number().int(),
  count: z.number().int(),
});
export type CategoryTotal = z.infer<typeof categoryTotalSchema>;

export const budgetStatusSchema = z.object({
  categoryId: idSchema,
  monthlyLimitCents: z.number().int(),
  /** Spent in the month, as a POSITIVE number. */
  spentCents: z.number().int(),
});
export type BudgetStatus = z.infer<typeof budgetStatusSchema>;

/** GET /api/stats/months/:month */
export const monthSummarySchema = monthlyStatSchema.extend({
  byCategory: z.array(categoryTotalSchema),
  budgets: z.array(budgetStatusSchema),
  uncategorizedCount: z.number().int(),
});
export type MonthSummary = z.infer<typeof monthSummarySchema>;
