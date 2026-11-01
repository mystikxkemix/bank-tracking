---
paths:
  - "apps/api/**"
---
# API rules (apps/api)

## Feature folder layout
`src/features/<feature>/`
- `model.ts`: `XDoc` interface (Mongo shape, `ObjectId`s, `Date`s), `xCollection()` getter, `ensureXIndexes()`. Owned by the developer agent; changing it is a data model change: update the feature context.
- `service.ts`: business logic, Mongo access, `toDto()` mappers (ObjectId -> hex string, Date -> ISO / "YYYY-MM-DD"). Takes `spaceId: ObjectId` as first param for space data.
- `routes.ts`: thin Express router. Parse with the shared zod schema, call the service, `res.json(dto)`. No Mongo here.
- `index.ts`: exports the `FeatureModule` (`scope`, `basePath`, `router`, `ensureIndexes`). Register it in `src/features/index.ts`.
- `*.test.ts`: vitest next to the code. Pure logic (parsers, mappers) always tested.

## Scopes (see `src/lib/feature.ts`)
- `public` (auth only), `user` (logged in, e.g. `/api/spaces`, `/api/users`), `space` (mounted at `/api/spaces/:spaceId<basePath>`).
- Space routes: `getSpace(req)` gives `{ spaceId, role }`. `requireSpace` already rejects non-members (404) and viewers on any non-GET (403). Do not re-check roles in routes except owner-only actions (`requireOwner`).
- Admin-only: `requireAdmin`.

## Rules
- Every filter on space data includes `spaceId`, also in `updateOne`, `deleteMany`, `findOneAndUpdate` and aggregation `$match` (first stage).
- When a body references another document (`accountId`, `categoryId`), load it with `{ _id, spaceId }` to prove it belongs to the space (e.g. `getAccountDoc(spaceId, id)`), 400/404 otherwise.
- New collection with `spaceId`: add it to `deleteSpaceData()` in `features/spaces/service.ts`.
- Status codes: 200 json, 201 created (return the DTO), 204 no content, 400 validation, 401, 403, 404, 409 conflict / business rule.
- Uniqueness: rely on unique indexes (11000 is mapped to 409 by `errorHandler`), and pre-check only to give a better French message.
- Bulk writes: `insertMany(..., { ordered: false })` / `bulkWrite`, never N round trips in a loop.
- No secrets or personal data in logs.
- Types: `WithId<XDoc>` for read docs, explicit return types on every function.
