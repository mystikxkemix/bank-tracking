import { computeSplit, type SplitHistoryItem, type SplitMonth, type SplitPersonResult } from '@bank/shared';
import type { SplitMonthDoc } from './model';

/** Pure parts of the split feature (no Mongo access), unit tested in draft.test.ts. */

export type SplitMonthSource = Pick<SplitMonthDoc, 'month' | 'persons' | 'incomes' | 'lines' | 'note' | 'result' | 'updatedAt'>;

/** A saved month, returned as stored (its result is the snapshot computed at save time). */
export function savedSplitMonth(doc: SplitMonthSource): SplitMonth {
  return {
    month: doc.month,
    saved: true,
    copiedFrom: null,
    plan: { persons: doc.persons, incomes: doc.incomes, lines: doc.lines, note: doc.note },
    result: doc.result,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * GET /months/:month. `saved` is the month's own document, `previous` the latest saved month strictly before it.
 * Saved wins. Otherwise a draft (never stored) copied from `previous` with a fresh computeSplit, or an empty
 * plan with no persons. The note is not copied: it describes the month it was written for.
 */
export function resolveSplitMonth(month: string, saved: SplitMonthSource | null, previous: SplitMonthSource | null): SplitMonth {
  if (saved) {
    return savedSplitMonth(saved);
  }
  if (previous && previous.month < month) {
    const plan: SplitMonth['plan'] = { persons: previous.persons, incomes: previous.incomes, lines: previous.lines, note: null };
    return { month, saved: false, copiedFrom: previous.month, plan, result: computeSplit(plan), updatedAt: null };
  }
  const empty: SplitMonth['plan'] = { persons: [], incomes: [], lines: [], note: null };
  return { month, saved: false, copiedFrom: null, plan: empty, result: computeSplit(empty), updatedAt: null };
}

export function toHistoryItem(doc: Pick<SplitMonthDoc, 'month' | 'persons' | 'result'>): SplitHistoryItem {
  const namesById: Map<string, string> = new Map();
  for (const person of doc.persons) {
    namesById.set(person.id, person.name);
  }
  return {
    month: doc.month,
    keepOnJointCents: doc.result.keepOnJointCents,
    totalIncomeCents: doc.result.totalIncomeCents,
    persons: doc.result.persons.map((person: SplitPersonResult) => ({
      personId: person.personId,
      name: namesById.get(person.personId) ?? '',
      returnCents: person.returnCents,
    })),
  };
}

