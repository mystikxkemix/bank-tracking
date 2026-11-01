---
paths:
  - "apps/api/src/features/split/**"
  - "apps/web/src/features/split/**"
  - "packages/shared/src/schemas/split.ts"
  - "packages/shared/src/split.ts"
---
# Feature: household split ("Répartition du foyer")

## Goal
Replaces the owner's Excel: both salaries land on the joint account; it must keep the joint charges (prêt, assurance, impôts, électricité...) and the joint savings, and send the rest back to each personal account. Each month: how much stays on the joint account, how much goes back to each person.

## Decisions (owner, 2026-11-01)
- Plan only: independent from imported transactions (no link, no actual-vs-planned).
- Shares are free percentages per person (sum 100), they split the joint total (charges + savings).
- Quarterly / yearly lines are smoothed per month (amount / 3 or / 12); the non-monthly part of charges is shown as "provision".
- Persons are plain names (not logins): the partner does not need an account.

## Computation (`computeSplit` in shared, unit tested, used by API and live in the UI)
- keepOnJoint = smoothed charges + smoothed savings.
- contribution(person) = round(keepOnJoint x share / 100), rounding remainder on the last person so contributions sum exactly.
- return(person) = their incomes - contribution. Negative = the person must top up the joint account (warn).

## Data model
`splitMonths { spaceId, month (unique per space), persons[{id,name,sharePercent}], incomes[{id,personId,label,amountCents}], lines[{id,label,kind: charge|savings,amountCents,frequency}], note, result (computeSplit snapshot), updatedAt }`. Line ids are client-generated (`crypto.randomUUID()`).

## API (/api/spaces/:spaceId/split)
| Method | Path | Notes |
|---|---|---|
| GET | /months | `SplitHistoryItem[]` saved months, newest first |
| GET | /months/:month | `SplitMonth`. Not saved: `saved=false`, plan copied from the latest saved month before it (`copiedFrom`), or an empty plan (no persons) |
| PUT | /months/:month | `SplitPlanBody` (full replace, validated: shares = 100 %, incomes reference persons), recomputes and stores `result` -> `SplitMonth` |
| DELETE | /months/:month | 204 |

## UI
Route `/s/:spaceId/split`, MonthPicker. Result first and big: "À garder sur le compte commun" + one card per person "À virer sur le compte de Sam" (warning color if negative). Editable sections: Personnes (name + share %, live check of the 100 % total), Revenus (per person), Charges communes and Épargne commune (label, amount, frequency Select, monthly equivalent shown). Live recompute with `computeSplit` while editing; "Enregistrer" (dirty state, unsaved banner when `saved=false`: "Pré-rempli depuis septembre, vérifie et enregistre"). History table of past months. Viewer read-only.

## Status
Contract + computation + tests + model done (2026-11-01). API done (2026-11-01): `split/draft.ts` (pure draft selection + history mapping, tested), `service.ts`, `routes.ts`. Draft = latest saved month strictly before (`month $lt`, sort desc), plan copied WITHOUT its note (month-specific), result recomputed with `computeSplit`; nothing saved before = empty plan, zero result. PUT is an upsert answering 200 with the saved `SplitMonth`; DELETE 404 when nothing is saved. Smoke tested.
UI done (2026-11-01): `SplitPage.tsx` (draft state resynced during render from the server version, dirty check, sticky status bar: "Pré-rempli depuis <mois>", unsaved edits with Annuler / Enregistrer, validation issues, saved date + delete month; confirm before changing month with unsaved edits; onboarding for an empty plan), `SplitResultCards.tsx` (keep on joint + one card per person, red "doit compléter le commun" when negative, `CopyAmountButton.tsx` copies "1953,33" with an execCommand fallback for plain HTTP), `PersonsCard.tsx` (names, shares, live 100 % badge, equal shares, prorata suggestion), `SplitPlanTable.tsx` (spreadsheet, one Grid per row, person columns from lg, stacked rows on mobile), `SplitHistoryCard.tsx`, `splitDraft.ts` (draft types, validation mirroring `splitPlanBodySchema`, `newLineId()` falls back to getRandomValues where `crypto.randomUUID` is missing, i.e. non-secure contexts). Verified in the browser (save / delete on a test month, viewer, 375 px, dark).
