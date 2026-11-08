import { z } from 'zod';
import { monthKeySchema } from './common';

/**
 * "Répartition du foyer": a monthly plan, independent from imported transactions.
 * Salaries land on the joint account; it keeps the smoothed joint charges + joint savings,
 * and sends back to each person: their income - (that total x their share).
 */

export const SPLIT_FREQUENCIES = ['monthly', 'quarterly', 'yearly'] as const;
export const splitFrequencySchema = z.enum(SPLIT_FREQUENCIES);
export type SplitFrequency = z.infer<typeof splitFrequencySchema>;

/** charge = household expense (prêt, électricité...), savings = joint savings put aside every month. */
export const SPLIT_LINE_KINDS = ['charge', 'savings'] as const;
export const splitLineKindSchema = z.enum(SPLIT_LINE_KINDS);
export type SplitLineKind = z.infer<typeof splitLineKindSchema>;

/** Client-generated ids (crypto.randomUUID()) so lines can be edited before the first save. */
const lineIdSchema = z.string().min(1).max(64);

export const splitPersonSchema = z.object({
  id: lineIdSchema,
  name: z.string().trim().min(1, 'Nom requis').max(60),
  /** Share of the joint total paid by this person, in percent (2 decimals max). All shares sum to 100. */
  sharePercent: z.number().min(0).max(100),
});
export type SplitPerson = z.infer<typeof splitPersonSchema>;

export const splitIncomeSchema = z.object({
  id: lineIdSchema,
  personId: lineIdSchema,
  label: z.string().trim().min(1, 'Libellé requis').max(80),
  amountCents: z.number().int().min(0),
});
export type SplitIncome = z.infer<typeof splitIncomeSchema>;

export const splitLineSchema = z.object({
  id: lineIdSchema,
  label: z.string().trim().min(1, 'Libellé requis').max(80),
  kind: splitLineKindSchema,
  /** Amount per occurrence: 1 300 € for a yearly taxe foncière. */
  amountCents: z.number().int().min(0),
  frequency: splitFrequencySchema,
});
export type SplitLine = z.infer<typeof splitLineSchema>;

/** Body of PUT /api/spaces/:spaceId/split/months/:month (full replace). */
export const splitPlanBodySchema = z
  .object({
    persons: z.array(splitPersonSchema).min(1, 'Ajoute au moins une personne').max(10),
    incomes: z.array(splitIncomeSchema).max(50),
    lines: z.array(splitLineSchema).max(100),
    note: z.string().trim().max(500).nullable().default(null),
  })
  .superRefine((plan, context) => {
    let total: number = 0;
    const personIds: Set<string> = new Set();
    for (const [index, person] of plan.persons.entries()) {
      total += person.sharePercent;
      if (personIds.has(person.id)) {
        context.addIssue({ code: 'custom', path: ['persons', index, 'id'], message: 'Personne en double' });
      }
      personIds.add(person.id);
    }
    if (Math.abs(total - 100) > 0.001) {
      context.addIssue({ code: 'custom', path: ['persons'], message: 'Les parts doivent totaliser 100 %' });
    }
    for (const [index, income] of plan.incomes.entries()) {
      if (!personIds.has(income.personId)) {
        context.addIssue({ code: 'custom', path: ['incomes', index, 'personId'], message: 'Personne inconnue' });
      }
    }
  });
export type SplitPlanBody = z.input<typeof splitPlanBodySchema>;
export type SplitPlanData = z.output<typeof splitPlanBodySchema>;

export const splitPersonResultSchema = z.object({
  personId: lineIdSchema,
  incomeCents: z.number().int(),
  /** What this person leaves on the joint account. */
  contributionCents: z.number().int(),
  /** incomeCents - contributionCents. Negative = the person must top up the joint account. */
  returnCents: z.number().int(),
});
export type SplitPersonResult = z.infer<typeof splitPersonResultSchema>;

export const splitResultSchema = z.object({
  totalIncomeCents: z.number().int(),
  /** Smoothed monthly charges. */
  monthlyChargesCents: z.number().int(),
  /** Smoothed monthly joint savings. */
  monthlySavingsCents: z.number().int(),
  /** monthlyCharges + monthlySavings: what stays on the joint account. */
  keepOnJointCents: z.number().int(),
  /** Part of monthlyCharges coming from quarterly / yearly lines, set aside until they are due. */
  provisionCents: z.number().int(),
  persons: z.array(splitPersonResultSchema),
});
export type SplitResult = z.infer<typeof splitResultSchema>;

/** GET /api/spaces/:spaceId/split/months/:month */
export const splitMonthSchema = z.object({
  month: monthKeySchema,
  /**
   * false = nothing saved for this month yet: the plan is a copy of the latest previous saved month
   * (or an empty plan), shown so the user only has to adjust and save.
   */
  saved: z.boolean(),
  /** Month the draft was copied from, null when saved or when there was nothing to copy. */
  copiedFrom: monthKeySchema.nullable(),
  plan: z.object({
    persons: z.array(splitPersonSchema),
    incomes: z.array(splitIncomeSchema),
    lines: z.array(splitLineSchema),
    note: z.string().nullable(),
  }),
  result: splitResultSchema,
  updatedAt: z.string().nullable(),
});
export type SplitMonth = z.infer<typeof splitMonthSchema>;

/** GET /api/spaces/:spaceId/split/months: saved months, most recent first. */
export const splitHistoryItemSchema = z.object({
  month: monthKeySchema,
  keepOnJointCents: z.number().int(),
  totalIncomeCents: z.number().int(),
  persons: z.array(z.object({ personId: lineIdSchema, name: z.string(), returnCents: z.number().int() })),
});
export type SplitHistoryItem = z.infer<typeof splitHistoryItemSchema>;

