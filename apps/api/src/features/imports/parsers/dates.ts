import { DATE_FORMATS, type DateFormat } from '@bank/shared';

interface DateParts {
  year: number;
  month: number;
  day: number;
}

const DAY_FIRST: RegExp = /^(\d{1,2})([/.-])(\d{1,2})\2(\d{4}|\d{2})$/;
const YEAR_FIRST: RegExp = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

const SEPARATOR_BY_FORMAT: Record<DateFormat, string> = {
  'DD/MM/YYYY': '/',
  'DD-MM-YYYY': '-',
  'DD.MM.YYYY': '.',
  'YYYY-MM-DD': '-',
  'MM/DD/YYYY': '/',
};

function toYear(raw: string): number {
  // Two-digit years ("05/10/26") are always in this century for bank statements.
  return raw.length === 2 ? 2000 + Number(raw) : Number(raw);
}

function extractParts(value: string, format: DateFormat): DateParts | null {
  if (format === 'YYYY-MM-DD') {
    const match: RegExpExecArray | null = YEAR_FIRST.exec(value);
    return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null;
  }
  const match: RegExpExecArray | null = DAY_FIRST.exec(value);
  if (!match || match[2] !== SEPARATOR_BY_FORMAT[format]) {
    return null;
  }
  const first: number = Number(match[1]);
  const second: number = Number(match[3]);
  const year: number = toYear(match[4] ?? '');
  return format === 'MM/DD/YYYY' ? { year, month: first, day: second } : { year, month: second, day: first };
}

/** "05/10/2026" + "DD/MM/YYYY" -> "2026-10-05". Null for an invalid or impossible date (31/02). A trailing time is ignored. */
export function parseDate(raw: string, format: DateFormat): string | null {
  const value: string = (raw.trim().split(/[\sT]/)[0] ?? '').trim();
  const parts: DateParts | null = extractParts(value, format);
  if (!parts || parts.year < 1970 || parts.year > 2100) {
    return null;
  }
  const date: Date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (date.getUTCFullYear() !== parts.year || date.getUTCMonth() !== parts.month - 1 || date.getUTCDate() !== parts.day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Format that parses the most values. Ties keep the DATE_FORMATS order, so day-first (French) wins
 * over MM/DD/YYYY unless a value like "10/25/2026" proves the month comes first.
 */
export function guessDateFormat(values: readonly string[]): { format: DateFormat; matches: number } | null {
  let best: { format: DateFormat; matches: number } | null = null;
  for (const format of DATE_FORMATS) {
    let matches: number = 0;
    for (const value of values) {
      if (parseDate(value, format) !== null) {
        matches++;
      }
    }
    if (matches > 0 && (best === null || matches > best.matches)) {
      best = { format, matches };
    }
  }
  return best;
}
