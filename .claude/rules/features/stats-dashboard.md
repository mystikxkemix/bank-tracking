---
paths:
  - "apps/api/src/features/stats/**"
  - "apps/web/src/features/dashboard/**"
  - "packages/shared/src/schemas/stats.ts"
---
# Feature: stats and dashboard

## Goal
Answer at a glance: how much came in, went out, and was saved this month; where the money goes; budget alerts; trend over 12 months.

## Definitions (single source of truth)
- Income = sum of positive amounts, Expense = sum of negative amounts (as positive number), both EXCLUDING transactions whose category kind is `transfer`. Uncategorized transactions count (by sign).
- Net (savings of the month) = income - expense. Savings rate = net / income (null when income is 0).
- Budget spent = - sum of the month's amounts in that category (refunds reduce spending).

## API (/api/spaces/:spaceId/stats)
- GET `/monthly?months=12&until=YYYY-MM` -> `MonthlyStat[]` oldest first, months with no data included as zeros. One aggregation (`$lookup` categories to exclude transfers, `$group` by month).
- GET `/months/:month` -> `MonthSummary` (+ `byCategory`, `budgets`, `uncategorizedCount`).

## UI (dashboard = home of a space)
MonthPicker; KPI cards (Revenus, Dépenses, Épargne du mois + taux); spending by category (donut or bar list with emoji/colors, click -> transactions filtered); budgets near/over limit; 12-month bar chart income vs expenses with net line (Recharts); call to action when there are uncategorized transactions or no account/import yet (onboarding empty state).

## Status
Contract done. API done (2026-11-01): `stats/compute.ts` (pure: zero-fill, savings rate, row to DTO mapping, tested), `service.ts` (aggregations: `$match { spaceId, date }`, `$lookup` categories restricted to the space, drop kind `transfer`, `$group` by `$dateToString '%Y-%m'` UTC or by categoryId), `routes.ts`. `until` defaults to the server's current month. `byCategory` excludes transfers, sorted biggest spending first (most negative total), uncategorized = `categoryId: null`. `budgets` lists every budget of the space (spent 0 when no transaction); spent follows the definition exactly so it can be negative if refunds exceed spending. Verified by hand on the seed (Oct 2026: income 562 340, expense 373 559, net 188 781, 5 uncategorized).
UI done (2026-11-01): `features/dashboard/DashboardPage.tsx` (MonthPicker in URL, uncategorized callout -> `/review` for editors, 4 KPI with delta vs previous month (arrow + sign), budgets at >= 80 % of their limit, goals summary, latest transactions, onboarding when the space has no account or no transaction, viewer variant), `SpendingDonut.tsx` (expense slices from `byCategory`, transfers dropped, top 5 + "Autres", slice or legend click -> `/transactions?month&categoryId`), `TrendChart.tsx` (Recharts ComposedChart, income/expense bars + net line, click a month to select it). Radix CSS variables work directly as Recharts `fill`/`stroke`.
