import { normalizeText, parseAmountToCents, type AmountMapping, type CsvMapping, type DateFormat } from '@bank/shared';
import type { CsvDelimiter } from './csv';
import { guessDateFormat } from './dates';

/** Rows scanned for a header (banks prepend up to ~10 metadata lines). */
const HEADER_SCAN_ROWS: number = 30;
/** Data rows sampled to guess formats and columns. */
const SAMPLE_ROWS: number = 100;
/** Header cells longer than this are sentences (metadata), not column names. */
const MAX_HEADER_CELL: number = 40;
const DATE_LIKE: RegExp = /^\d{1,4}[/.-]\d{1,2}[/.-]\d{2,4}([\sT].*)?$/;

interface HeaderColumns {
  date: number;
  labels: number[];
  amount: AmountMapping;
}

function isDateHeader(cell: string): boolean {
  return cell.includes('date');
}

/** "Date de valeur" / "dateVal" is the value date: the operation date is preferred. */
function isValueDateHeader(cell: string): boolean {
  return cell.includes('valeur') || cell === 'dateval' || cell === 'date val';
}

function isPrimaryLabelHeader(cell: string): boolean {
  return cell.includes('libelle') || cell === 'label' || cell.includes('description') || cell.includes('intitule') || cell === 'nature' || cell.includes("nature de l'operation");
}

/** Société Générale puts the useful part in "Détail de l'écriture" next to "Libellé": both are joined. */
function isDetailHeader(cell: string): boolean {
  return cell.includes('detail') || cell === 'memo';
}

function isDebitHeader(cell: string): boolean {
  return cell.includes('debit');
}

function isCreditHeader(cell: string): boolean {
  return cell.includes('credit');
}

function isAmountHeader(cell: string): boolean {
  return (cell.includes('montant') || cell.includes('amount')) && !cell.includes('solde') && !cell.includes('balance');
}

/** Recognizes French (and Boursorama English) column names in one row, null when the row is not a header. */
function readHeader(row: readonly string[]): HeaderColumns | null {
  const cells: string[] = [];
  for (const raw of row) {
    const cell: string = normalizeText(raw);
    if (cell.length > MAX_HEADER_CELL) {
      return null;
    }
    cells.push(cell);
  }
  let date: number = -1;
  let valueDate: number = -1;
  let debit: number = -1;
  let credit: number = -1;
  let amount: number = -1;
  const labels: number[] = [];
  const details: number[] = [];
  for (let index: number = 0; index < cells.length; index++) {
    const cell: string = cells[index] ?? '';
    if (cell === '') {
      continue;
    }
    if (isDateHeader(cell)) {
      if (isValueDateHeader(cell)) {
        valueDate = valueDate === -1 ? index : valueDate;
      } else if (date === -1) {
        date = index;
      }
    } else if (isDebitHeader(cell)) {
      debit = debit === -1 ? index : debit;
    } else if (isCreditHeader(cell)) {
      credit = credit === -1 ? index : credit;
    } else if (isAmountHeader(cell)) {
      amount = amount === -1 ? index : amount;
    } else if (isPrimaryLabelHeader(cell)) {
      labels.push(index);
    } else if (isDetailHeader(cell)) {
      details.push(index);
    }
  }
  const dateColumn: number = date !== -1 ? date : valueDate;
  if (dateColumn === -1) {
    return null;
  }
  let amountMapping: AmountMapping;
  if (debit !== -1 && credit !== -1) {
    amountMapping = { mode: 'split', debitColumn: debit, creditColumn: credit };
  } else if (amount !== -1) {
    amountMapping = { mode: 'single', column: amount };
  } else {
    return null;
  }
  // Only the first primary label column (BNP has "Libellé court" and "Libellé opération"), plus detail columns.
  const labelColumns: number[] = labels.length > 0 ? [labels[0] ?? 0, ...details] : details;
  return { date: dateColumn, labels: labelColumns, amount: amountMapping };
}

function columnValues(rows: readonly string[][], column: number): string[] {
  const values: string[] = [];
  for (const row of rows) {
    const value: string = row[column] ?? '';
    if (value !== '') {
      values.push(value);
    }
  }
  return values;
}

/** "," when most amounts end with ",dd", "." when they end with ".dd". Ties follow the delimiter. */
function guessDecimalSeparator(values: readonly string[], delimiter: CsvDelimiter): ',' | '.' {
  let comma: number = 0;
  let dot: number = 0;
  for (const value of values) {
    if (/,\d{1,2}(\D*)$/.test(value)) {
      comma++;
    } else if (/\.\d{1,2}(\D*)$/.test(value)) {
      dot++;
    }
  }
  if (comma === dot) {
    return delimiter === ',' ? '.' : ',';
  }
  return comma > dot ? ',' : '.';
}

function amountColumns(amount: AmountMapping): number[] {
  return amount.mode === 'single' ? [amount.column] : [amount.debitColumn, amount.creditColumn];
}

/** Share of non-empty values of a column that parse as amounts, and how many look like decimals. */
function amountStats(values: readonly string[]): { ratio: number; decimals: number } {
  if (values.length === 0) {
    return { ratio: 0, decimals: 0 };
  }
  let parsed: number = 0;
  let decimals: number = 0;
  for (const value of values) {
    if (DATE_LIKE.test(value)) {
      continue;
    }
    if (parseAmountToCents(value, ',') !== null || parseAmountToCents(value, '.') !== null) {
      parsed++;
      if (/[.,]\d{2}(\D*)$/.test(value)) {
        decimals++;
      }
    }
  }
  return { ratio: parsed / values.length, decimals };
}

/** Longest average text among columns that are neither the date nor an amount. */
function guessLabelColumn(rows: readonly string[][], excluded: ReadonlySet<number>, columnCount: number): number | null {
  let best: number | null = null;
  let bestLength: number = 0;
  for (let column: number = 0; column < columnCount; column++) {
    if (excluded.has(column)) {
      continue;
    }
    const values: string[] = columnValues(rows, column);
    if (values.length === 0 || amountStats(values).ratio > 0.5) {
      continue;
    }
    let total: number = 0;
    for (const value of values) {
      total += value.length;
    }
    const average: number = total / values.length;
    if (average > bestLength) {
      best = column;
      bestLength = average;
    }
  }
  return best;
}

function maxColumnCount(rows: readonly string[][]): number {
  let max: number = 0;
  for (const row of rows) {
    max = Math.max(max, row.length);
  }
  return max;
}

/** Headerless file (LCL style): columns guessed from content. */
function detectFromContent(rows: readonly string[][], delimiter: CsvDelimiter): CsvMapping | null {
  let skipRows: number = -1;
  for (let index: number = 0; index < Math.min(rows.length, HEADER_SCAN_ROWS); index++) {
    const row: readonly string[] = rows[index] ?? [];
    if (row.length >= 3 && row.some((cell: string) => DATE_LIKE.test(cell))) {
      skipRows = index;
      break;
    }
  }
  if (skipRows === -1) {
    return null;
  }
  const sample: readonly string[][] = rows.slice(skipRows, skipRows + SAMPLE_ROWS);
  const columnCount: number = maxColumnCount(sample);
  let dateColumn: number = -1;
  let dateFormat: DateFormat | null = null;
  let dateMatches: number = 0;
  for (let column: number = 0; column < columnCount; column++) {
    const guess: { format: DateFormat; matches: number } | null = guessDateFormat(columnValues(sample, column));
    if (guess && guess.matches > dateMatches) {
      dateColumn = column;
      dateFormat = guess.format;
      dateMatches = guess.matches;
    }
  }
  if (dateColumn === -1 || dateFormat === null) {
    return null;
  }
  let amountColumn: number = -1;
  let amountDecimals: number = 0;
  for (let column: number = 0; column < columnCount; column++) {
    if (column === dateColumn) {
      continue;
    }
    const stats: { ratio: number; decimals: number } = amountStats(columnValues(sample, column));
    if (stats.ratio >= 0.8 && stats.decimals > amountDecimals) {
      amountColumn = column;
      amountDecimals = stats.decimals;
    }
  }
  if (amountColumn === -1) {
    return null;
  }
  const labelColumn: number | null = guessLabelColumn(sample, new Set<number>([dateColumn, amountColumn]), columnCount);
  if (labelColumn === null) {
    return null;
  }
  return {
    delimiter,
    skipRows,
    hasHeader: false,
    dateColumn,
    dateFormat,
    labelColumns: [labelColumn],
    amount: { mode: 'single', column: amountColumn },
    decimalSeparator: guessDecimalSeparator(columnValues(sample, amountColumn), delimiter),
  };
}

/**
 * Suggests a mapping for rows read with `delimiter`: a header row with known French column names
 * (Date, Libellé, Montant, Débit, Crédit...) after optional metadata lines, else content-based guessing.
 * Null when nothing usable is found (the user maps the columns by hand).
 */
export function detectMapping(rows: readonly string[][], delimiter: CsvDelimiter): CsvMapping | null {
  const scanned: number = Math.min(rows.length, HEADER_SCAN_ROWS);
  for (let index: number = 0; index < scanned; index++) {
    const header: HeaderColumns | null = readHeader(rows[index] ?? []);
    if (!header) {
      continue;
    }
    const sample: readonly string[][] = rows.slice(index + 1, index + 1 + SAMPLE_ROWS);
    const guess: { format: DateFormat; matches: number } | null = guessDateFormat(columnValues(sample, header.date));
    if (!guess) {
      continue;
    }
    let labelColumns: number[] = header.labels;
    if (labelColumns.length === 0) {
      const excluded: Set<number> = new Set<number>([header.date, ...amountColumns(header.amount)]);
      const labelColumn: number | null = guessLabelColumn(sample, excluded, maxColumnCount(sample));
      if (labelColumn === null) {
        continue;
      }
      labelColumns = [labelColumn];
    }
    const amountValues: string[] = [];
    for (const column of amountColumns(header.amount)) {
      amountValues.push(...columnValues(sample, column));
    }
    return {
      delimiter,
      skipRows: index,
      hasHeader: true,
      dateColumn: header.date,
      dateFormat: guess.format,
      labelColumns,
      amount: header.amount,
      decimalSeparator: guessDecimalSeparator(amountValues, delimiter),
    };
  }
  return detectFromContent(rows, delimiter);
}
