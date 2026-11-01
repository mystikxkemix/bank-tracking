import { z } from 'zod';
import { ISO_DATE_REGEX, MONTH_KEY_REGEX } from '../dates';

/** Mongo ObjectId serialized as a 24-char hex string. */
export const idSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

/** Calendar day "YYYY-MM-DD". */
export const isoDateSchema = z.string().regex(ISO_DATE_REGEX, 'Date invalide (AAAA-MM-JJ)');

/** Month key "YYYY-MM". */
export const monthKeySchema = z.string().regex(MONTH_KEY_REGEX, 'Mois invalide (AAAA-MM)');

/** Signed integer cents. */
export const centsSchema = z.number().int();

/** Strictly positive integer cents (limits, targets). */
export const positiveCentsSchema = z.number().int().positive();

/** Radix Themes accent colors usable for categories and goals. */
export const COLORS = [
  'gray', 'tomato', 'red', 'ruby', 'crimson', 'pink', 'plum', 'purple', 'violet', 'iris', 'indigo', 'blue',
  'cyan', 'teal', 'jade', 'green', 'grass', 'brown', 'orange', 'amber', 'yellow', 'lime', 'mint', 'sky', 'gold', 'bronze',
] as const;
export const colorSchema = z.enum(COLORS);
export type Color = z.infer<typeof colorSchema>;

/** Error payload returned by every failing API call. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
