---
paths:
  - "apps/api/src/features/accounts/**"
  - "apps/web/src/features/accounts/**"
  - "packages/shared/src/schemas/accounts.ts"
---
# Feature: bank accounts

## Goal
Bank accounts of a space (compte courant, livret, ...). Transactions are imported per account.

## Data model
`accounts { spaceId, name, kind: checking|savings|other, currency (EUR), importProfile: CsvMapping | null, createdAt }`.
`importProfile` = last CSV mapping that worked, reused to pre-fill the next import of that account.

## API (/api/spaces/:spaceId/accounts)
GET list (`Account[]` with `transactionCount` and `balanceCents` = sum of imported transactions), POST `CreateAccountBody`, PATCH `/:id` `UpdateAccountBody`, DELETE `/:id` (409 `account_not_empty` when it has transactions: undo its imports first).

## Business rules
- `balanceCents` is the sum of imported amounts, not the real bank balance (no opening balance yet). Label it "Solde importé".
- Other features validate an `accountId` with `getAccountDoc(spaceId, id)`.

## UI
Settings > Comptes: table, create/edit dialog, delete confirm, viewer read-only. **Reference implementation** for CRUD lists (`AccountsSection.tsx`).

## Status
Done (API smoke-tested, UI typechecked) 2026-11-01.

## Open questions
- Opening balance to show the real balance? Not requested yet.
