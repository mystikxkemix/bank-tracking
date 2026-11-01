import { z } from 'zod';
import { idSchema } from './common';
import { csvMappingSchema } from './imports';

export const ACCOUNT_KINDS = ['checking', 'savings', 'other'] as const;
export const accountKindSchema = z.enum(ACCOUNT_KINDS);
export type AccountKind = z.infer<typeof accountKindSchema>;

export const accountSchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: accountKindSchema,
  currency: z.string().length(3),
  /** Last CSV mapping that worked for this account, reused on the next import. */
  importProfile: csvMappingSchema.nullable(),
  transactionCount: z.number().int(),
  /** Sum of all transactions of the account, in cents. */
  balanceCents: z.number().int(),
  createdAt: z.string(),
});
export type Account = z.infer<typeof accountSchema>;

export const createAccountBodySchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(80),
  kind: accountKindSchema,
  currency: z.string().length(3).default('EUR'),
});
export type CreateAccountBody = z.input<typeof createAccountBodySchema>;

export const updateAccountBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  kind: accountKindSchema.optional(),
});
export type UpdateAccountBody = z.infer<typeof updateAccountBodySchema>;
