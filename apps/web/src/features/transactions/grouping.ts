import type { Transaction } from '@bank/shared';

export interface DayGroup {
  date: string;
  /** "Jeudi 23 octobre" */
  title: string;
  items: Transaction[];
}

const dayTitleFormatter: Intl.DateTimeFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** "2026-10-23" -> "Vendredi 23 octobre" (day headers of the transaction list). */
export function formatDayTitle(isoDate: string): string {
  const text: string = dayTitleFormatter.format(new Date(`${isoDate}T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Groups consecutive transactions of the same day. The API already sorts by date desc. */
export function groupByDay(items: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const last: DayGroup | undefined = groups[groups.length - 1];
    if (last && last.date === item.date) {
      last.items.push(item);
    } else {
      groups.push({ date: item.date, title: formatDayTitle(item.date), items: [item] });
    }
  }
  return groups;
}

/** URL params are untrusted: only pass well-formed ids to the API (it would answer 400 otherwise). */
export function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value);
}
