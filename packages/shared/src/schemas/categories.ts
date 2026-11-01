import { z } from 'zod';
import { colorSchema, idSchema } from './common';

/**
 * expense / income count in stats. transfer = money moved between own accounts
 * (e.g. to the savings account): excluded from income and expense totals.
 */
export const CATEGORY_KINDS = ['expense', 'income', 'transfer'] as const;
export const categoryKindSchema = z.enum(CATEGORY_KINDS);
export type CategoryKind = z.infer<typeof categoryKindSchema>;

export const categorySchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: categoryKindSchema,
  color: colorSchema,
  emoji: z.string().nullable(),
  createdAt: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

const categoryFields = {
  name: z.string().trim().min(1, 'Nom requis').max(60),
  kind: categoryKindSchema,
  color: colorSchema,
  emoji: z.string().trim().max(16).nullable(),
};

export const createCategoryBodySchema = z.object({ ...categoryFields, emoji: categoryFields.emoji.default(null) });
export type CreateCategoryBody = z.input<typeof createCategoryBodySchema>;

// Built from the raw fields, NOT createX.partial(): zod 4 would re-apply the defaults and wipe absent keys on update.
export const updateCategoryBodySchema = z.object(categoryFields).partial();
export type UpdateCategoryBody = z.input<typeof updateCategoryBodySchema>;

/** "If the label contains <pattern> (case and accent insensitive), set <category>". Lowest priority number wins. */
export const ruleSchema = z.object({
  id: idSchema,
  pattern: z.string(),
  categoryId: idSchema,
  priority: z.number().int(),
  createdAt: z.string(),
});
export type Rule = z.infer<typeof ruleSchema>;

const ruleFields = {
  pattern: z.string().trim().min(2, '2 caractères minimum').max(100),
  categoryId: idSchema,
  priority: z.number().int().min(0).max(10_000),
};

export const createRuleBodySchema = z.object({ ...ruleFields, priority: ruleFields.priority.default(100) });
export type CreateRuleBody = z.input<typeof createRuleBodySchema>;

/** No defaults on update (see updateCategoryBodySchema). */
export const updateRuleBodySchema = z.object(ruleFields).partial();
export type UpdateRuleBody = z.input<typeof updateRuleBodySchema>;

export const applyRulesBodySchema = z.object({
  /** When true (default), only transactions without category are touched. */
  onlyUncategorized: z.boolean().default(true),
});
export type ApplyRulesBody = z.input<typeof applyRulesBodySchema>;

export const applyRulesResultSchema = z.object({ updated: z.number().int() });
export type ApplyRulesResult = z.infer<typeof applyRulesResultSchema>;
