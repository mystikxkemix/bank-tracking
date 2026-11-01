import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import type { MonthlyStat, MonthSummary } from '@bank/shared';
import { monthSeries, savingsRate, toMonthlyStat, toMonthSummary, zeroFillMonthly, type CategoryTotalsRow } from './compute';

const courses: ObjectId = new ObjectId('64b000000000000000000001');
const salaire: ObjectId = new ObjectId('64b000000000000000000002');
const restaurants: ObjectId = new ObjectId('64b000000000000000000003');
const shopping: ObjectId = new ObjectId('64b000000000000000000004');

describe('savingsRate', () => {
  it('is net / income and null without income', () => {
    expect(savingsRate(560_000, 140_000)).toBe(0.25);
    expect(savingsRate(0, -12_000)).toBeNull();
    expect(savingsRate(200_000, -50_000)).toBe(-0.25);
  });
});

describe('toMonthlyStat', () => {
  it('derives net and savings rate', () => {
    expect(toMonthlyStat('2026-10', 562_340, 421_700)).toEqual({
      month: '2026-10',
      incomeCents: 562_340,
      expenseCents: 421_700,
      netCents: 140_640,
      savingsRate: 140_640 / 562_340,
    });
  });
});

describe('monthSeries / zeroFillMonthly', () => {
  it('lists months oldest first across a year boundary', () => {
    expect(monthSeries('2027-02', 4)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthSeries('2026-10', 1)).toEqual(['2026-10']);
  });

  it('fills months without transactions with zeros', () => {
    const stats: MonthlyStat[] = zeroFillMonthly(
      [
        { _id: '2026-10', incomeCents: 560_000, expenseCents: 420_000 },
        { _id: '2026-08', incomeCents: 560_000, expenseCents: 610_000 },
        // Outside the series (should not happen, ignored if it does).
        { _id: '2025-01', incomeCents: 1, expenseCents: 1 },
      ],
      '2026-11',
      4,
    );
    expect(stats).toEqual([
      { month: '2026-08', incomeCents: 560_000, expenseCents: 610_000, netCents: -50_000, savingsRate: -50_000 / 560_000 },
      { month: '2026-09', incomeCents: 0, expenseCents: 0, netCents: 0, savingsRate: null },
      { month: '2026-10', incomeCents: 560_000, expenseCents: 420_000, netCents: 140_000, savingsRate: 0.25 },
      { month: '2026-11', incomeCents: 0, expenseCents: 0, netCents: 0, savingsRate: null },
    ]);
  });
});

describe('toMonthSummary', () => {
  const rows: CategoryTotalsRow[] = [
    { _id: salaire, totalCents: 560_000, count: 2, incomeCents: 560_000, expenseCents: 0 },
    // Courses with a 25,00 € refund: spent = 412,30 - 25,00.
    { _id: courses, totalCents: -38_730, count: 5, incomeCents: 2_500, expenseCents: 41_230 },
    { _id: restaurants, totalCents: -8_920, count: 2, incomeCents: 0, expenseCents: 8_920 },
    { _id: null, totalCents: -18_678, count: 5, incomeCents: 2_340, expenseCents: 21_018 },
  ];

  it('sums income / expense across categories and counts uncategorized transactions', () => {
    const summary: MonthSummary = toMonthSummary('2026-10', rows, []);
    expect(summary.month).toBe('2026-10');
    expect(summary.incomeCents).toBe(564_840);
    expect(summary.expenseCents).toBe(71_168);
    expect(summary.netCents).toBe(493_672);
    expect(summary.savingsRate).toBe(493_672 / 564_840);
    expect(summary.uncategorizedCount).toBe(5);
  });

  it('sorts byCategory biggest spending first and keeps uncategorized as null', () => {
    const summary: MonthSummary = toMonthSummary('2026-10', rows, []);
    expect(summary.byCategory).toEqual([
      { categoryId: courses.toHexString(), totalCents: -38_730, count: 5 },
      { categoryId: null, totalCents: -18_678, count: 5 },
      { categoryId: restaurants.toHexString(), totalCents: -8_920, count: 2 },
      { categoryId: salaire.toHexString(), totalCents: 560_000, count: 2 },
    ]);
  });

  it('computes budget spent as minus the signed category total, 0 without transactions', () => {
    const summary: MonthSummary = toMonthSummary('2026-10', rows, [
      { categoryId: courses, monthlyLimitCents: 60_000 },
      { categoryId: shopping, monthlyLimitCents: 10_000 },
    ]);
    expect(summary.budgets).toEqual([
      { categoryId: courses.toHexString(), monthlyLimitCents: 60_000, spentCents: 38_730 },
      { categoryId: shopping.toHexString(), monthlyLimitCents: 10_000, spentCents: 0 },
    ]);
    expect(Object.is(summary.budgets[1]?.spentCents, -0)).toBe(false);
  });

  it('returns zeros for an empty month', () => {
    expect(toMonthSummary('2026-12', [], [])).toEqual({
      month: '2026-12',
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      savingsRate: null,
      byCategory: [],
      budgets: [],
      uncategorizedCount: 0,
    });
  });
});
