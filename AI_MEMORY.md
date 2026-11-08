# AI memory

Non-obvious learnings, workarounds and conventions. Read at the start of a task, append when you learn something.
Keep entries short and dated (YYYY-MM-DD).

## Environment
- 2026-11-01: The owner's local Mongo (Docker container `mongo-mongo-1`, port 27017) requires authentication. Credentials are only in `.env`, never read them from the container. For tests use a throwaway `mongo:8.0` container on 27019 (see CLAUDE.md).
- 2026-11-01: Another unrelated Mongo container (`agent-hub-mongo`, 27018) runs on the same machine: never use it.
- 2026-11-01: In zsh, an unquoted variable holding `-H Content-Type:...` is NOT word-split: curl then sends a broken header and Express answers 400. Use a bash script or a function for curl smoke tests.

## Libraries
- 2026-11-01: Express 5 types `req.params.x` as `string | string[]`: always go through `parseId(raw: unknown)`.
- 2026-11-01: Express 5 forwards rejected promises to the error middleware: no async wrapper needed. Catch-all route syntax is `'/{*splat}'`.
- 2026-11-01: zod 4: French messages via `z.config(z.locales.fr())` in `shared/src/zodConfig.ts`. Use `z.stringbool()` for env booleans, `z.email()` (not `z.string().email()`).
- 2026-11-01: Radix Themes `TextProps` is a discriminated union: do not `Omit<TextProps, ...>` (breaks the `as` discriminant), pick the props you need with `ComponentProps<typeof Text>['size']`.
- 2026-11-01: eslint-plugin-react-hooks 7 forbids `setState` inside effects: resync derived state during render (see `AmountField`).

## Security / deployment
- 2026-11-01: helmet defaults (HSTS + CSP `upgrade-insecure-requests`) break the app over plain HTTP: they are enabled only when `HTTPS=true`.
- 2026-11-01: zod 4 `createX.partial()` RE-APPLIES inner `.default()` values: `{ name }` parses to `{ name, emoji: null }` and a PATCH wipes fields. Build update schemas from a raw fields object without defaults (see `schemas/categories.ts`), regression test in `schemas/updateSchemas.test.ts`.
- 2026-11-01: `$lookup` with `localField`/`foreignField` also accepts `pipeline: [{ $match: { spaceId } }]`: keeps the space filter on joins.
- 2026-11-01: Write `0 - x` rather than `-x` when negating a possibly zero total, to avoid `-0` in JSON/UI.
- 2026-11-01: mongodb driver `WriteError` is type-only: `import { WriteError } from 'mongodb'` typechecks but crashes at load. Use `import type`. `MongoBulkWriteError.writeErrors` is one error or a readonly list: narrow with `Array.isArray`.
- 2026-11-01: After an unordered `insertMany` fails, the inserted count is `error.insertedCount`; each write error `.index` points to the doc that was not inserted.

## Import parsing
- 2026-11-01: CSV row indexes (`skipRows`, `rawRows`) are counted AFTER dropping blank lines and delimiter-only lines (";;;").
- 2026-11-01: Delimiter detection weights consistency by (count + 1): otherwise the single decimal comma of "45,20" ties with ";" in French exports.
- 2026-11-01: Some French banks write OFX `TRNAMT` with a decimal comma.
- 2026-11-01: Import behaviors decided: a CSV line with empty Débit AND Crédit (balance line) is skipped; a re-import with nothing new still records an import (0 new, N duplicates); apply-rules never clears a manual category; bulk-categorize silently ignores ids of other spaces.

## Web
- 2026-11-01: TanStack Query drops `mutate(vars, { onSuccess })` callbacks when the component unmounts. When a panel is keyed per item (review queue), keep mutations in a parent that stays mounted and chain with `mutateAsync`.
- 2026-11-01: Radix CSS variables work directly as Recharts `fill` / `stroke` (`var(--grass-9)`).
- 2026-11-01: Radix `Text` takes margin props but not padding props.
- 2026-11-01: Browser pane: always pass `tabId` inside `browser_batch` items (otherwise they act on the front tab). Drafts are reachable through Vite at `http://localhost:5173/@fs/<abs path>/design/drafts/index.html`. Two agents testing at once: use `http://localhost:5173` and `http://[::1]:5173` (separate cookie jars); `127.0.0.1` is not served by Vite here.
- 2026-11-01: Radix `Box` `display` only accepts none / inline / inline-block / block / contents: for a responsive grid use an inner element. Never set `display` on such an element in `styles.css` (loaded after Radix, it overrides the responsive `md:none` classes).
- 2026-11-01: Radix `Callout.Text` and `Text as="p"` render a `<p>`: no `Flex`/`Box` inside, use `<Flex asChild><span>`.
- 2026-11-01: Vite mirrors browser console errors in the dev server log (`[vite] (client) [console.error]`, with the React component stack): grep it after UI changes.
- 2026-11-01: Radix `Text` has no "accent" color value: use the `.text-accent` class (`var(--accent-11)`).
