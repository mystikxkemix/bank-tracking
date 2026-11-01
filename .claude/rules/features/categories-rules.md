---
paths:
  - "apps/api/src/features/categories/**"
  - "apps/web/src/features/categories/**"
  - "packages/shared/src/schemas/categories.ts"
---
# Feature: categories and rules

## Goal
Classify transactions. Rules auto-categorize on import ("label contains CARREFOUR => Courses").

## Data model
- `categories { spaceId, name, nameKey (normalizeText(name), unique per space), kind: expense|income|transfer, color (Radix color), emoji|null, createdAt }`
- `rules { spaceId, pattern, patternKey (normalizeText, unique per space), categoryId, priority (lowest wins), createdAt }`
- Defaults seeded per space in `categories/defaults.ts` (13 French categories incl. "Épargne" and "Virements internes" as transfer).

## API (/api/spaces/:spaceId)
| Method | Path | Notes |
|---|---|---|
| GET/POST | /categories | `Category[]` sorted by kind then name / `CreateCategoryBody` (409 duplicate name) |
| PATCH/DELETE | /categories/:id | delete: transactions of that category become uncategorized (`categoryId: null`), its budget and rules are deleted |
| GET/POST | /rules | `Rule[]` sorted by priority then pattern / `CreateRuleBody` (categoryId must belong to the space) |
| PATCH/DELETE | /rules/:id | |
| POST | /rules/apply | `ApplyRulesBody { onlyUncategorized=true }` -> `ApplyRulesResult { updated }` |

## Business rules
- Matching: `normalizeText(rawLabel).includes(rule.patternKey)`, rules sorted by priority asc then longest pattern first. First match wins.
- Export a pure `matchCategory(rules, rawLabel): ObjectId | null` (tested) reused by the import feature.
- `transfer` categories are excluded from income/expense stats and budgets (money moved between own accounts or to savings).
- Changing a category kind changes stats retroactively (it is a classification, not a snapshot).

## UI
Settings > "Catégories et règles": categories grouped by kind (badge with color + emoji, edit dialog with color swatches and emoji input), rules table (pattern, category, priority), "Appliquer les règles" button showing how many transactions were updated. Quick path: from a transaction, "Créer une règle" prefilled with its label (see transactions).

## Status
Model + defaults done. API done and smoke-tested (2026-11-01): `service.ts` (categories CRUD with 409 on duplicate nameKey, delete cascade: transactions -> `categoryId: null`, budget and rules deleted, all on `spaceId`; rules CRUD with category checked in the space, 409 on duplicate patternKey; `applyRules` = one `updateMany` per target category via `bulkWrite`), pure `matcher.ts` (`matchCategory(rules, rawLabel)`, single pass, ties: priority asc, longest pattern, then alphabetical) with vitest tests.
Apply with `onlyUncategorized=false` only replaces a category when a rule matches: a transaction matching no rule keeps its manual category. `getCategoryDoc(spaceId, id)` (404 "Catégorie introuvable") and `listRuleDocs(spaceId)` are exported for transactions and imports.
UI done (2026-11-01): `CategoriesSection.tsx` (categories grouped by kind, `CategoryDialog.tsx` with name, kind, 26 color swatches with French names, emoji, live preview; delete confirm explains the cascade; rules table, stacked rows on phones, `RuleDialog.tsx` create/edit with optional immediate apply, "Appliquer les règles" with the updated count). `RuleDialog` is reused from transactions and accepts controlled `open`.
