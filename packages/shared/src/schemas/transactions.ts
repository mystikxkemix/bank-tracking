import { z } from 'zod';
import { centsSchema, idSchema, isoDateSchema, monthKeySchema } from './common';

export const transactionSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  date: isoDateSchema,
  /** Editable display label. */
  label: z.string(),
  /** Label exactly as imported, never edited (used by rules and dedup). */
  rawLabel: z.string(),
  amountCents: centsSchema,
  categoryId: idSchema.nullable(),
  note: z.string().nullable(),
  importId: idSchema.nullable(),
  createdAt: z.string(),
});
export type Transaction = z.infer<typeof transactionSchema>;

/** GET /api/transactions query string. All filters optional. */
export const transactionQuerySchema = z.object({
  month: monthKeySchema.optional(),
  accountId: idSchema.optional(),
  /** A category id, or "none" for uncategorized transactions. */
  categoryId: z.union([idSchema, z.literal('none')]).optional(),
  /** Only transactions created by this import (review queue after an import). */
  importId: idSchema.optional(),
  /** Case-insensitive search in label, rawLabel and note. */
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
/** Client-side shape (z.coerce makes the raw input `unknown`, the client always sends numbers). */
export type TransactionQuery = Omit<z.input<typeof transactionQuerySchema>, 'page' | 'pageSize'> & { page?: number; pageSize?: number };

export const transactionPageSchema = z.object({
  items: z.array(transactionSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type TransactionPage = z.infer<typeof transactionPageSchema>;

export const updateTransactionBodySchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  categoryId: idSchema.nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type UpdateTransactionBody = z.infer<typeof updateTransactionBodySchema>;

/** Bulk categorization from the transaction list (multi-select). */
export const bulkCategorizeBodySchema = z.object({
  ids: z.array(idSchema).min(1).max(500),
  categoryId: idSchema.nullable(),
});
export type BulkCategorizeBody = z.infer<typeof bulkCategorizeBodySchema>;
