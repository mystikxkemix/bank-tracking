import { z } from 'zod';
import { idSchema } from './common';

export const DATE_FORMATS = ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'] as const;
export const dateFormatSchema = z.enum(DATE_FORMATS);
export type DateFormat = z.infer<typeof dateFormatSchema>;

/** How amounts are laid out in a CSV export. */
export const amountMappingSchema = z.discriminatedUnion('mode', [
  /** One signed amount column. */
  z.object({ mode: z.literal('single'), column: z.number().int().min(0) }),
  /** Separate debit and credit columns (debit may be written positive, it is always stored negative). */
  z.object({ mode: z.literal('split'), debitColumn: z.number().int().min(0), creditColumn: z.number().int().min(0) }),
]);
export type AmountMapping = z.infer<typeof amountMappingSchema>;

/** Describes how to read a bank CSV. Saved on the account after a successful import and reused. */
export const csvMappingSchema = z.object({
  delimiter: z.enum([';', ',', '\t', '|']),
  /** Lines to ignore before the header (banks often prepend account metadata). */
  skipRows: z.number().int().min(0).max(50),
  hasHeader: z.boolean(),
  dateColumn: z.number().int().min(0),
  dateFormat: dateFormatSchema,
  /** Columns concatenated (with " ") to build the label. */
  labelColumns: z.array(z.number().int().min(0)).min(1),
  amount: amountMappingSchema,
  decimalSeparator: z.enum([',', '.']),
});
export type CsvMapping = z.infer<typeof csvMappingSchema>;

export const IMPORT_FORMATS = ['csv', 'ofx'] as const;
export const importFormatSchema = z.enum(IMPORT_FORMATS);
export type ImportFormat = z.infer<typeof importFormatSchema>;

/** File content is decoded client-side (UTF-8 with Windows-1252 fallback) and sent as text. */
export const importPreviewBodySchema = z.object({
  accountId: idSchema,
  fileName: z.string().min(1).max(255),
  content: z.string().min(1).max(10_000_000),
  /** CSV only. Omitted on the first preview (server suggests one), sent again while the user adjusts it. */
  mapping: csvMappingSchema.optional(),
});
export type ImportPreviewBody = z.infer<typeof importPreviewBodySchema>;

/** A parsed transaction before insertion. */
export const parsedTransactionSchema = z.object({
  date: z.string(),
  label: z.string(),
  amountCents: z.number().int(),
});
export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;

export const importPreviewSchema = z.discriminatedUnion('format', [
  z.object({
    format: z.literal('csv'),
    /** Raw rows after delimiter detection (first ~20 lines, header included), for the mapping UI. */
    rawRows: z.array(z.array(z.string())),
    /** The mapping sent in the body, else the account's saved profile if it parses, else auto-detection. Null if nothing usable. */
    suggestedMapping: csvMappingSchema.nullable(),
    /** Transactions parsed with suggestedMapping (first 20), empty when no mapping. */
    sample: z.array(parsedTransactionSchema),
    /** Rows that parse / fail with suggestedMapping over the WHOLE file, to warn before committing. */
    validCount: z.number().int(),
    skippedCount: z.number().int(),
  }),
  z.object({
    format: z.literal('ofx'),
    sample: z.array(parsedTransactionSchema),
    totalCount: z.number().int(),
  }),
]);
export type ImportPreview = z.infer<typeof importPreviewSchema>;

/** Same body as the preview. `mapping` is required for CSV (400 otherwise), ignored for OFX. */
export const commitImportBodySchema = importPreviewBodySchema;
export type CommitImportBody = z.infer<typeof commitImportBodySchema>;

export const importRecordSchema = z.object({
  id: idSchema,
  accountId: idSchema,
  fileName: z.string(),
  format: importFormatSchema,
  insertedCount: z.number().int(),
  duplicateCount: z.number().int(),
  /** Rows that could not be parsed (bad date / amount). */
  skippedCount: z.number().int(),
  /** Inserted rows that matched a categorization rule. */
  categorizedCount: z.number().int(),
  createdAt: z.string(),
});
export type ImportRecord = z.infer<typeof importRecordSchema>;
