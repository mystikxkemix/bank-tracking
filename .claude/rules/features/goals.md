---
paths:
  - "apps/api/src/features/goals/**"
  - "apps/web/src/features/goals/**"
  - "packages/shared/src/schemas/goals.ts"
---
# Feature: savings goals

## Goal
Named targets ("Vacances 2027: 2 000 €") with manual contributions and progress.

## Data model
`goals { spaceId, name, targetCents, deadline|null, color, emoji|null, contributions: [{ _id, date, amountCents (non zero, negative = withdrawal), note }], createdAt }`.

## API (/api/spaces/:spaceId/goals)
GET `/` (`Goal[]` with `savedCents` and contributions sorted date desc), POST `/`, PATCH `/:id`, DELETE `/:id`,
POST `/:id/contributions` (`CreateContributionBody`) -> `Goal`, DELETE `/:id/contributions/:contributionId` -> `Goal`.

## UI
Cards grid: emoji, name, Progress, "1 250 € sur 2 000 €", deadline + "≈ X €/mois pour y arriver" when a deadline exists. Card click opens a detail dialog with contributions list and "Ajouter un versement" form. Completed goals styled as done.

## Status
Contract + model done. API done (2026-11-01): `goals/mapper.ts` (pure, tested), `service.ts`, `routes.ts`. Goals sorted by createdAt. POST `/` and POST `/:id/contributions` answer 201 (contribution returns the whole `Goal`), DELETE contribution 200 with the `Goal`, 404 `Versement introuvable` when unknown. PATCH only applies keys present in the raw body: `updateGoalBodySchema` (`.partial()` of the create schema) still fills `deadline`/`emoji` with their `null` defaults in zod 4. Smoke tested.
UI done (2026-11-01): `GoalsPage.tsx` (summary: saved, left to save, monthly effort; active cards grid then "Objectifs atteints"), `GoalDetailDialog.tsx` (progress, deposit / withdrawal form sent as a negative amount, contributions list with delete, edit mode, delete goal), `GoalFormDialog.tsx` (name, target, optional deadline, emoji suggestions, `ColorSwatchPicker`), `goalMath.ts` (monthly amount needed = ceil(remaining / whole months left, min 1)). The edit form always sends every field so the PATCH default gotcha does not bite. Viewer read-only. Verified in the browser.
