import type { Document, ObjectId, WithId } from 'mongodb';
import { monthRange, type MonthlyStat, type MonthSummary } from '@bank/shared';
import { budgetsCollection, type BudgetDoc } from '../budgets/model';
import { transactionsCollection } from '../transactions/model';
import { monthSeries, toMonthSummary, zeroFillMonthly, type CategoryTotalsRow, type MonthTotalsRow } from './compute';

/**
 * First stages of every stats aggregation: the space and date range (index { spaceId, date }),
 * then drop transactions whose category is a transfer. Uncategorized ones (categoryId null) are kept.
 */
function nonTransferStages(spaceId: ObjectId, start: Date, end: Date): Document[] {
  return [
    { $match: { spaceId, date: { $gte: start, $lt: end } } },
    {
      $lookup: {
        from: 'categories',
        localField: 'categoryId',
        foreignField: '_id',
        pipeline: [{ $match: { spaceId } }, { $project: { kind: 1 } }],
        as: 'category',
      },
    },
    { $match: { 'category.kind': { $ne: 'transfer' } } },
  ];
}

/** Sums of positive amounts and of negative amounts (as a positive number). */
const SIGNED_SUMS: Document = {
  incomeCents: { $sum: { $cond: [{ $gt: ['$amountCents', 0] }, '$amountCents', 0] } },
  expenseCents: { $sum: { $cond: [{ $lt: ['$amountCents', 0] }, { $subtract: [0, '$amountCents'] }, 0] } },
};

export async function getMonthlyStats(spaceId: ObjectId, until: string, months: number): Promise<MonthlyStat[]> {
  const series: string[] = monthSeries(until, months);
  const start: Date = monthRange(series[0] as string).start;
  const end: Date = monthRange(until).end;
  const rows: MonthTotalsRow[] = await transactionsCollection()
    .aggregate<MonthTotalsRow>([
      ...nonTransferStages(spaceId, start, end),
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$date' } }, ...SIGNED_SUMS } },
    ])
    .toArray();
  return zeroFillMonthly(rows, until, months);
}

export async function getMonthSummary(spaceId: ObjectId, month: string): Promise<MonthSummary> {
  const { start, end }: { start: Date; end: Date } = monthRange(month);
  const [rows, budgets]: [CategoryTotalsRow[], WithId<BudgetDoc>[]] = await Promise.all([
    transactionsCollection()
      .aggregate<CategoryTotalsRow>([
        ...nonTransferStages(spaceId, start, end),
        { $group: { _id: '$categoryId', totalCents: { $sum: '$amountCents' }, count: { $sum: 1 }, ...SIGNED_SUMS } },
      ])
      .toArray(),
    budgetsCollection().find({ spaceId }).sort({ _id: 1 }).toArray(),
  ]);
  return toMonthSummary(month, rows, budgets);
}
