import type { ObjectId } from 'mongodb';
import { addMonths, type BudgetStatus, type CategoryTotal, type MonthlyStat, type MonthSummary } from '@bank/shared';

/**
 * Pure parts of the stats feature (no Mongo access), unit tested in compute.test.ts.
 * Definitions: .claude/rules/features/stats-dashboard.md. Transfers are already excluded by the aggregations.
 */

/** One row of the monthly aggregation (`$group` by "YYYY-MM"). */
export interface MonthTotalsRow {
  _id: string;
  incomeCents: number;
  expenseCents: number;
}

/** One row of the month summary aggregation (`$group` by categoryId, null = uncategorized). */
export interface CategoryTotalsRow {
  _id: ObjectId | null;
  totalCents: number;
  count: number;
  incomeCents: number;
  expenseCents: number;
}

export interface BudgetLimit {
  categoryId: ObjectId;
  monthlyLimitCents: number;
}

/** net / income, null when there is no income (a rate over nothing is meaningless). Can be negative. */
export function savingsRate(incomeCents: number, netCents: number): number | null {
  return incomeCents === 0 ? null : netCents / incomeCents;
}

export function toMonthlyStat(month: string, incomeCents: number, expenseCents: number): MonthlyStat {
  const netCents: number = incomeCents - expenseCents;
  return { month, incomeCents, expenseCents, netCents, savingsRate: savingsRate(incomeCents, netCents) };
}

/** The `count` month keys ending with `until`, oldest first. */
export function monthSeries(until: string, count: number): string[] {
  const months: string[] = [];
  for (let offset: number = count - 1; offset >= 0; offset -= 1) {
    months.push(addMonths(until, -offset));
  }
  return months;
}

/** One MonthlyStat per month of the series, oldest first; months without transactions are zeros. */
export function zeroFillMonthly(rows: MonthTotalsRow[], until: string, count: number): MonthlyStat[] {
  const rowsByMonth: Map<string, MonthTotalsRow> = new Map();
  for (const row of rows) {
    rowsByMonth.set(row._id, row);
  }
  const stats: MonthlyStat[] = [];
  for (const month of monthSeries(until, count)) {
    const row: MonthTotalsRow | undefined = rowsByMonth.get(month);
    stats.push(toMonthlyStat(month, row?.incomeCents ?? 0, row?.expenseCents ?? 0));
  }
  return stats;
}

/** Biggest spending first (most negative total), then by id so the order is stable. */
function compareCategoryTotals(left: CategoryTotal, right: CategoryTotal): number {
  if (left.totalCents !== right.totalCents) {
    return left.totalCents - right.totalCents;
  }
  return (left.categoryId ?? '').localeCompare(right.categoryId ?? '');
}

export function toMonthSummary(month: string, rows: CategoryTotalsRow[], budgets: BudgetLimit[]): MonthSummary {
  let incomeCents: number = 0;
  let expenseCents: number = 0;
  let uncategorizedCount: number = 0;
  const byCategory: CategoryTotal[] = [];
  const totalByCategory: Map<string, number> = new Map();
  for (const row of rows) {
    incomeCents += row.incomeCents;
    expenseCents += row.expenseCents;
    const categoryId: string | null = row._id === null ? null : row._id.toHexString();
    if (categoryId === null) {
      uncategorizedCount += row.count;
    } else {
      totalByCategory.set(categoryId, row.totalCents);
    }
    byCategory.push({ categoryId, totalCents: row.totalCents, count: row.count });
  }
  byCategory.sort(compareCategoryTotals);

  const budgetStatuses: BudgetStatus[] = [];
  for (const budget of budgets) {
    const categoryId: string = budget.categoryId.toHexString();
    // Spent = minus the signed sum: refunds in the category reduce spending (0 - x avoids a -0).
    const spentCents: number = 0 - (totalByCategory.get(categoryId) ?? 0);
    budgetStatuses.push({ categoryId, monthlyLimitCents: budget.monthlyLimitCents, spentCents });
  }

  return { ...toMonthlyStat(month, incomeCents, expenseCents), byCategory, budgets: budgetStatuses, uncategorizedCount };
}
