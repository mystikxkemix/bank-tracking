---
paths:
  - "apps/api/src/features/budgets/**"
  - "apps/web/src/features/budgets/**"
  - "packages/shared/src/schemas/budgets.ts"
---
# Feature: budgets

## Goal
A monthly spending limit per expense category, and how the selected month is going.

## Data model
`budgets { spaceId, categoryId (unique per space), monthlyLimitCents, updatedAt }`. Same limit every month (no per-month overrides in v1).

## API (/api/spaces/:spaceId/budgets)
GET `/` -> `Budget[]`; PUT `/:categoryId` `PutBudgetBody` (upsert, category must be of kind expense in the space, else 400); DELETE `/:categoryId`.
Spent amounts come from `GET /stats/months/:month` (`budgets: BudgetStatus[]`), not from this endpoint.

## UI
Budgets page with MonthPicker: one row per expense category: emoji + name, Progress bar (spent / limit, color: green < 80 %, amber < 100 %, red over), "X € restants" or "dépassé de X €", inline edit of the limit (AmountField). Categories without budget listed below with "Définir un budget". Total line. Viewer read-only.

## Status
Contract + model done. API done (2026-11-01): `budgets/service.ts` + `routes.ts`. GET sorted by creation; PUT upsert returns the `Budget` (200), unknown category or category of another space 404, non-expense category 400 `category_not_expense`; DELETE 204, 404 when no budget. Smoke tested (upsert, 400, 403 viewer, 404 other space). Known gap: deleting a category does not delete its budget (categories feature).
UI done (2026-11-01): `BudgetsPage.tsx` (direction 2): hero "Reste à dépenser" (budgeted, spent, per day left on the current month), month bar and per-row bars with a "today" tick (`BudgetBar.tsx`, current month only, `monthProgress.ts`), rows grouped Dépassé / Presque épuisé (>= 80 %) / Disponible, inline limit edit (save on blur / Enter, Escape restores), remove budget (ConfirmDialog), uncategorized callout linking to the review queue, "Hors budget" card with "Définir un budget" inline, total line. Mobile: stacked cards. Viewer: read-only amounts. Verified in the browser (desktop / 375 px, light / dark, owner / viewer).
