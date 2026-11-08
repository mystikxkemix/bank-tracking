import { parseAmountToCents, type CsvMapping } from '@bank/shared';
import { parseDate } from './dates';
import { CsvDedupKeyBuilder, cleanLabel } from './dedup';
import { MAX_IMPORT_ROWS, type ImportedRow, type ParseResult } from './types';

export type CsvDelimiter = CsvMapping['delimiter'];

/** Tie-break order: semicolon is the French bank default, comma last because it also appears in amounts. */
const DELIMITERS: readonly CsvDelimiter[] = [';', '\t', '|', ','];
const DETECTION_LINES: number = 50;

/** Delimiter occurrences outside double quotes. */
function countOutsideQuotes(line: string, delimiter: string): number {
  let count: number = 0;
  let quoted: boolean = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      count++;
    }
  }
  return count;
}

/**
 * Picks the delimiter with the most consistent count over the first lines. Score = lines sharing the most
 * frequent non-zero count, times (count + 1): metadata lines on top (Crédit Agricole) do not win against the
 * table body, and the decimal comma of "45,20" (one per line) loses against 3 or 4 semicolons per line.
 */
export function detectDelimiter(text: string): CsvDelimiter {
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() !== '') {
      lines.push(line);
    }
    if (lines.length >= DETECTION_LINES) {
      break;
    }
  }
  let best: CsvDelimiter = ';';
  let bestScore: number = 0;
  for (const delimiter of DELIMITERS) {
    const frequencies: Map<number, number> = new Map();
    for (const line of lines) {
      const count: number = countOutsideQuotes(line, delimiter);
      if (count > 0) {
        frequencies.set(count, (frequencies.get(count) ?? 0) + 1);
      }
    }
    let score: number = 0;
    for (const [count, lineCount] of frequencies) {
      score = Math.max(score, lineCount * (count + 1));
    }
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }
  return best;
}

/**
 * RFC 4180 reader: quoted cells may contain the delimiter, line breaks and doubled quotes ("").
 * Lenient on malformed quotes (a quote inside an unquoted cell is kept as text). Cells are trimmed,
 * blank lines and lines made only of empty cells (";;;") are dropped: row indexes (skipRows) refer to this output.
 */
export function readCsvRows(text: string, delimiter: CsvDelimiter): string[][] {
  const source: string = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell: string = '';
  let quoted: boolean = false;
  let cellStart: boolean = true;

  const endCell = (): void => {
    row.push(cell.trim());
    cell = '';
    cellStart = true;
  };
  const endRow = (): void => {
    endCell();
    let hasContent: boolean = false;
    for (const value of row) {
      if (value !== '') {
        hasContent = true;
        break;
      }
    }
    if (hasContent) {
      rows.push(row);
    }
    row = [];
  };

  for (let index: number = 0; index < source.length; index++) {
    const char: string = source.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (source.charAt(index + 1) === '"') {
          cell += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"' && cellStart && cell.trim() === '') {
      quoted = true;
      cell = '';
      cellStart = false;
    } else if (char === delimiter) {
      endCell();
    } else if (char === '\n') {
      endRow();
    } else if (char === '\r') {
      // CRLF: the \n that follows ends the row; a lone \r (old Mac) ends it too.
      if (source.charAt(index + 1) !== '\n') {
        endRow();
      }
    } else {
      cell += char;
      if (char !== ' ' && char !== '\t') {
        cellStart = false;
      }
    }
  }
  if (cell !== '' || row.length > 0) {
    endRow();
  }
  return rows;
}

function cellAt(row: readonly string[], column: number): string {
  return row[column] ?? '';
}

/** Amount of a row per the mapping, null when it cannot be read (row skipped). */
export function readAmount(row: readonly string[], mapping: CsvMapping): number | null {
  if (mapping.amount.mode === 'single') {
    return parseAmountToCents(cellAt(row, mapping.amount.column), mapping.decimalSeparator);
  }
  const debitRaw: string = cellAt(row, mapping.amount.debitColumn);
  const creditRaw: string = cellAt(row, mapping.amount.creditColumn);
  if (debitRaw === '' && creditRaw === '') {
    // Balance or title lines ("Solde au ...") have neither: not a transaction.
    return null;
  }
  const debit: number | null = debitRaw === '' ? 0 : parseAmountToCents(debitRaw, mapping.decimalSeparator);
  const credit: number | null = creditRaw === '' ? 0 : parseAmountToCents(creditRaw, mapping.decimalSeparator);
  if (debit === null || credit === null) {
    return null;
  }
  // Banks write the debit either positive or negative: it is always money out.
  return Math.abs(credit) - Math.abs(debit);
}

/** Label columns joined with a space, whitespace collapsed. */
export function readLabel(row: readonly string[], labelColumns: readonly number[]): string {
  const parts: string[] = [];
  for (const column of labelColumns) {
    const value: string = cellAt(row, column);
    if (value !== '') {
      parts.push(value);
    }
  }
  return cleanLabel(parts.join(' '));
}

/** Data rows: everything after skipRows and the optional header. */
export function dataRows(rows: readonly string[][], mapping: CsvMapping): readonly string[][] {
  return rows.slice(mapping.skipRows + (mapping.hasHeader ? 1 : 0));
}

/** Parses every data row with the mapping. Throws a RangeError above MAX_IMPORT_ROWS. */
export function parseCsvRows(rows: readonly string[][], mapping: CsvMapping): ParseResult {
  const lines: readonly string[][] = dataRows(rows, mapping);
  if (lines.length > MAX_IMPORT_ROWS) {
    throw new RangeError('too_many_rows');
  }
  const keys: CsvDedupKeyBuilder = new CsvDedupKeyBuilder();
  const parsed: ImportedRow[] = [];
  let skippedCount: number = 0;
  for (const row of lines) {
    const date: string | null = parseDate(cellAt(row, mapping.dateColumn), mapping.dateFormat);
    const amountCents: number | null = date === null ? null : readAmount(row, mapping);
    if (date === null || amountCents === null) {
      skippedCount++;
      continue;
    }
    const label: string = readLabel(row, mapping.labelColumns) || 'Sans libellé';
    parsed.push({ date, label, amountCents, dedupKey: keys.next(date, amountCents, label) });
  }
  return { rows: parsed, skippedCount };
}
