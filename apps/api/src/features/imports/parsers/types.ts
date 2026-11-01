/** A parsed bank line, ready to become a TransactionDoc. */
export interface ImportedRow {
  /** "YYYY-MM-DD". */
  date: string;
  /** Collapsed whitespace, used as both label and rawLabel. */
  label: string;
  /** Signed integer cents. */
  amountCents: number;
  dedupKey: string;
}

export interface ParseResult {
  rows: ImportedRow[];
  /** Data lines that could not be parsed (bad date, bad or missing amount). */
  skippedCount: number;
}

/** Hard limit on data lines per file (the text itself is capped at 10 MB by the contract). */
export const MAX_IMPORT_ROWS: number = 50_000;
