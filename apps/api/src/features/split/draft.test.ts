import { describe, expect, it } from 'vitest';
import { computeSplit, type SplitIncome, type SplitLine, type SplitMonth, type SplitPerson } from '@bank/shared';
import { resolveSplitMonth, toHistoryItem, type SplitMonthSource } from './draft';

const persons: SplitPerson[] = [
  { id: 'p-mike', name: 'Mike', sharePercent: 60 },
  { id: 'p-julie', name: 'Julie', sharePercent: 40 },
];
const incomes: SplitIncome[] = [
  { id: 'i-mike', personId: 'p-mike', label: 'Salaire', amountCents: 320_000 },
  { id: 'i-julie', personId: 'p-julie', label: 'Salaire', amountCents: 240_000 },
];
const lines: SplitLine[] = [
  { id: 'l-pret', label: 'Prêt immobilier', kind: 'charge', amountCents: 115_000, frequency: 'monthly' },
  { id: 'l-fonciere', label: 'Taxe foncière', kind: 'charge', amountCents: 130_000, frequency: 'yearly' },
  { id: 'l-epargne', label: 'Épargne commune', kind: 'savings', amountCents: 40_000, frequency: 'monthly' },
];

function savedMonth(month: string, note: string | null): SplitMonthSource {
  return { month, persons, incomes, lines, note, result: computeSplit({ persons, incomes, lines }), updatedAt: new Date('2026-09-30T18:00:00.000Z') };
}

describe('resolveSplitMonth', () => {
  it('returns the saved month as stored', () => {
    const month: SplitMonth = resolveSplitMonth('2026-09', savedMonth('2026-09', 'Prime de rentrée'), savedMonth('2026-08', null));
    expect(month.saved).toBe(true);
    expect(month.copiedFrom).toBeNull();
    expect(month.plan.note).toBe('Prime de rentrée');
    expect(month.updatedAt).toBe('2026-09-30T18:00:00.000Z');
  });

  it('copies the latest previous saved month into an unsaved draft without its note', () => {
    const month: SplitMonth = resolveSplitMonth('2026-10', null, savedMonth('2026-09', 'Prime de rentrée'));
    expect(month).toEqual({
      month: '2026-10',
      saved: false,
      copiedFrom: '2026-09',
      plan: { persons, incomes, lines, note: null },
      result: computeSplit({ persons, incomes, lines }),
      updatedAt: null,
    });
  });

  it('recomputes the draft result instead of reusing the stored snapshot', () => {
    const previous: SplitMonthSource = { ...savedMonth('2026-09', null), result: { ...computeSplit({ persons: [], incomes: [], lines: [] }) } };
    expect(resolveSplitMonth('2026-10', null, previous).result.keepOnJointCents).toBe(165_833);
  });

  it('returns an empty plan when nothing was saved before', () => {
    const month: SplitMonth = resolveSplitMonth('2026-08', null, null);
    expect(month.saved).toBe(false);
    expect(month.copiedFrom).toBeNull();
    expect(month.plan).toEqual({ persons: [], incomes: [], lines: [], note: null });
    expect(month.result).toEqual({
      totalIncomeCents: 0,
      monthlyChargesCents: 0,
      monthlySavingsCents: 0,
      keepOnJointCents: 0,
      provisionCents: 0,
      persons: [],
    });
  });

  it('never copies from a later month', () => {
    expect(resolveSplitMonth('2026-08', null, savedMonth('2026-09', null)).copiedFrom).toBeNull();
  });
});

describe('toHistoryItem', () => {
  it('joins person names to the stored result', () => {
    expect(toHistoryItem(savedMonth('2026-09', null))).toEqual({
      month: '2026-09',
      keepOnJointCents: 165_833,
      totalIncomeCents: 560_000,
      persons: [
        { personId: 'p-mike', name: 'Mike', returnCents: 220_500 },
        { personId: 'p-julie', name: 'Julie', returnCents: 173_667 },
      ],
    });
  });
});
