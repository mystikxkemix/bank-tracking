---
paths:
  - "packages/shared/**"
---
# Shared package rules (packages/shared)

This package is the contract between API and web. A change here is a contract change: update the feature context API section and both sides in the same task.

- One file per feature in `src/schemas/`, exported from `src/index.ts`.
- Naming: `xSchema` (DTO returned by the API), `createXBodySchema` / `updateXBodySchema` (request bodies), `xQuerySchema` (query strings, use `z.coerce` for numbers). Types: `X`, `CreateXBody` (`z.input` when the schema has defaults, so callers may omit them).
- DTO ids are 24-hex strings (`idSchema`), dates `isoDateSchema` / ISO strings, money `centsSchema` (integer).
- Validation messages in French (zod locale is set globally, custom messages for business rules).
- Pure logic only (no Node or DOM APIs): money, dates, text normalization, split computation. Every function has a vitest test.
- No runtime dependency other than zod.
