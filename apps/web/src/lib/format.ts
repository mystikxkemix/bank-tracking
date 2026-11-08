import { formatCents } from '@bank/shared';

export { formatCents };

const dayFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const shortMonthFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });
const todayFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const percentFormatter: Intl.NumberFormat = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 });

/** "2026-10-05" -> "5 oct. 2026" */
export function formatDay(isoDate: string): string {
  return dayFormatter.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-10" -> "octobre 2026" */
export function formatMonth(monthKey: string): string {
  return monthFormatter.format(new Date(`${monthKey}-01T00:00:00Z`));
}

/** Local date -> "dimanche 1 novembre" (the "today" chip of the month header). */
export function formatToday(date: Date): string {
  return todayFormatter.format(date);
}

/** "2026-10" -> "oct." (chart axes) */
export function formatShortMonth(monthKey: string): string {
  return shortMonthFormatter.format(new Date(`${monthKey}-01T00:00:00Z`));
}

/** 0.234 -> "23 %", null -> "-" */
export function formatPercent(ratio: number | null): string {
  return ratio === null ? '-' : percentFormatter.format(ratio);
}

/** Cents -> "12,50" for editable inputs (no currency symbol). */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
