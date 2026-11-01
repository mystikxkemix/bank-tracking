---
paths:
  - "apps/api/src/features/transactions/**"
  - "apps/web/src/features/transactions/**"
  - "packages/shared/src/schemas/transactions.ts"
---
# Feature: transactions

## Goal
See, search and categorize imported transactions quickly. Categorization quality drives every stat.

## Data model
`transactions { spaceId, accountId, date (UTC midnight), label (editable), rawLabel (as imported, immutable), amountCents (signed), categoryId|null, note|null, importId|null, dedupKey, createdAt, updatedAt }`.
Indexes: `{accountId, dedupKey}` unique, `{spaceId, date:-1}`, `{spaceId, categoryId, date:-1}`, `{importId}`.

## API (/api/spaces/:spaceId/transactions)
| Method | Path | Notes |
|---|---|---|
| GET | / | `TransactionQuery` (month, accountId, categoryId or "none", importId, q, page, pageSize<=200) -> `TransactionPage`, sorted date desc then _id desc |
| PATCH | /:id | `UpdateTransactionBody` (label, categoryId, note). categoryId must belong to the space |
| POST | /bulk-categorize | `BulkCategorizeBody { ids, categoryId }` -> `{ updated }`, only ids of the space |
| DELETE | /:id | single delete (rare: wrong line) |

## Business rules
- `q` searches label, rawLabel and note, case-insensitive, regex-escaped (`escapeRegex`).
- No manual creation in v1 (data comes from imports only).

## UI
- Review queue `/s/:spaceId/review?importId=` (design direction 3, see design/DECISION.md): uncategorized transactions of an import (or all uncategorized), one active row, one-click category, "Créer une règle" prefilled, banner with counts and "Annuler l'import".
- List grouped by day, columns: date, label (+ account name if several accounts), category badge (click = category picker popover with search), amount `<Money colored>`.
- Filters bar: MonthPicker (URL), account Select, category Select incl. "Non catégorisé", search field (debounced 300 ms). Filters in the URL.
- Multi-select + "Catégoriser" bulk action. "Créer une règle" from a row (prefilled pattern).
- Pagination ("Charger plus" or pages). Viewer: no edit controls.
- Mobile: stacked rows (label + category on the left, amount right).

## Status
Model done. API done and smoke-tested (2026-11-01): `service.ts` + `routes.ts` (GET with every `TransactionQuery` filter incl. `importId` and `categoryId=none`, PATCH, POST /bulk-categorize, DELETE). A body `categoryId` of another space -> 404 "Catégorie introuvable". Bulk: ids of another space are ignored (not counted in `updated`). An empty note is stored as null.
UI done (2026-11-01): `TransactionsPage.tsx` (grouped by day, filters `month`/`accountId`/`categoryId`(incl. `none`)/`q`/`page` in the URL, search debounced 300 ms, inline category via `components/CategoryPicker.tsx`, row menu: create rule / edit label and note / delete, multi-select + bulk categorize, 50 per page, stacked rows under `sm`, viewer read-only), `ReviewPage.tsx` (queue of `categoryId=none` [+ `importId`], one active row, one-click category buttons for the amount's kind + transfers, "Autre catégorie" picker, rule box prefilled by `categories/rulePattern.ts` (checked by default only when it matches other rows of the queue), create rule then `rules/apply`, import banner with counts and undo, done state, viewer message). Mutations of the review live in the page: the detail panel is keyed per transaction and unmounts, which drops `mutate` callbacks.
