import { describe, expect, it } from 'vitest';
import { computeSplit, monthlyAmountCents } from './split';
import { splitPlanBodySchema, type SplitIncome, type SplitLine, type SplitPerson } from './schemas/split';

const persons: SplitPerson[] = [
  { id: 'mike', name: 'Mike', sharePercent: 60 },
  { id: 'julie', name: 'Julie', sharePercent: 40 },
];
const incomes: SplitIncome[] = [
  { id: 'i1', personId: 'mike', label: 'Salaire', amountCents: 320_000 },
  { id: 'i2', personId: 'julie', label: 'Salaire', amountCents: 240_000 },
];
const lines: SplitLine[] = [
  { id: 'l1', label: 'Prêt', kind: 'charge', amountCents: 115_000, frequency: 'monthly' },
  { id: 'l2', label: 'Taxe foncière', kind: 'charge', amountCents: 130_000, frequency: 'yearly' },
  { id: 'l3', label: 'Épargne commune', kind: 'savings', amountCents: 40_000, frequency: 'monthly' },
];

describe('computeSplit', () => {
  it('smooths non monthly lines and splits by share', () => {
    const result = computeSplit({ persons, incomes, lines });
    expect(monthlyAmountCents(lines[1] as SplitLine)).toBe(10_833);
    expect(result.monthlyChargesCents).toBe(125_833);
    expect(result.provisionCents).toBe(10_833);
    expect(result.monthlySavingsCents).toBe(40_000);
    expect(result.keepOnJointCents).toBe(165_833);
    expect(result.persons).toEqual([
      { personId: 'mike', incomeCents: 320_000, contributionCents: 99_500, returnCents: 220_500 },
      { personId: 'julie', incomeCents: 240_000, contributionCents: 66_333, returnCents: 173_667 },
    ]);
  });

  it('contributions always sum to the joint total', () => {
    const thirds: SplitPerson[] = [
      { id: 'a', name: 'A', sharePercent: 33.33 },
      { id: 'b', name: 'B', sharePercent: 33.33 },
      { id: 'c', name: 'C', sharePercent: 33.34 },
    ];
    const result = computeSplit({ persons: thirds, incomes: [], lines: [{ id: 'x', label: 'X', kind: 'charge', amountCents: 10_001, frequency: 'monthly' }] });
    const sum: number = result.persons.reduce((total, person) => total + person.contributionCents, 0);
    expect(sum).toBe(10_001);
    expect(result.persons[0]?.returnCents).toBeLessThan(0);
  });

  it('validates shares and person references', () => {
    expect(splitPlanBodySchema.safeParse({ persons: [{ ...persons[0], sharePercent: 50 }], incomes: [], lines: [] }).success).toBe(false);
    expect(splitPlanBodySchema.safeParse({ persons, incomes: [{ ...incomes[0], personId: 'ghost' }], lines: [] }).success).toBe(false);
    expect(splitPlanBodySchema.safeParse({ persons, incomes, lines }).success).toBe(true);
  });
});
