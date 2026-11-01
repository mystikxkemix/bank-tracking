/**
 * Date helpers. Transaction dates are calendar days stored as UTC midnight in Mongo
 * and exchanged as "YYYY-MM-DD" strings over the API. Months are "YYYY-MM" keys.
 */

export const MONTH_KEY_REGEX: RegExp = /^\d{4}-(0[1-9]|1[0-2])$/;
export const ISO_DATE_REGEX: RegExp = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** "2026-10-05" -> Date at 2026-10-05T00:00:00.000Z */
export function isoDateToUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

/** Date -> "YYYY-MM-DD" using its UTC calendar day. */
export function utcToIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Date -> "YYYY-MM" using its UTC calendar day. */
export function toMonthKey(date: Date): string {
  return date.toISOString().slice(0, 7);
}

/** Current month key in the local timezone of the caller. */
export function currentMonthKey(now: Date = new Date()): string {
  const month: string = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

/** Adds (or subtracts) whole months to a "YYYY-MM" key. */
export function addMonths(monthKey: string, delta: number): string {
  const [yearPart, monthPart] = monthKey.split('-');
  const index: number = Number(yearPart) * 12 + (Number(monthPart) - 1) + delta;
  const year: number = Math.floor(index / 12);
  const month: number = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** UTC range [start, end) covering a "YYYY-MM" month. */
export function monthRange(monthKey: string): { start: Date; end: Date } {
  return { start: isoDateToUtc(`${monthKey}-01`), end: isoDateToUtc(`${addMonths(monthKey, 1)}-01`) };
}
