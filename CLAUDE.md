# Bank tracking

Self-hosted web app to track bank account spending, savings, budgets, goals and the monthly household split
("Répartition du foyer"). Multi-user, data shared through **spaces** with roles. UI in French.

## Stack
- npm workspaces monorepo, TypeScript 6 strict everywhere, Node 22.
- `packages/shared`: THE API contract (zod 4 schemas + inferred types) and pure logic (money, dates, split). Imported as TS source by both apps.
- `apps/api`: Express 5 + official `mongodb` driver 7 (no Mongoose). Bundled by esbuild into one file for prod.
- `apps/web`: Vite 8 + React 19 + Radix Themes 3 + TanStack Query 5 + React Router 7 + Recharts 3.

## Commands
| Command | What |
|---|---|
| `npm run dev` | API on :3001 (tsx watch) + web on :5173 (proxies `/api`) |
| `npm run check` | typecheck + lint + tests. **Must pass before you say a task is done.** |
| `npm test -w @bank/shared` / `-w @bank/api` | vitest per workspace |
| `docker build -t bank-tracking:local .` | builds the production image. CI publishes it to ghcr.io on every push to `main` (see `deploy/README.md`) |

Dev needs a MongoDB: `.env` `MONGODB_URI` (the owner's local Docker Mongo requires auth, credentials live only in `.env`).
For throwaway testing use `docker run -d --rm --name bt-test-mongo -p 127.0.0.1:27019:27017 mongo:8.0` and
`MONGODB_URI=mongodb://127.0.0.1:27019`. Never point tests at the owner's real databases.

Demo data: `MONGODB_URI=mongodb://127.0.0.1:27019 MONGODB_DB=bank-tracking-demo npm run seed:demo -w @bank/api` (wipes that db;
refuses names without demo/seed/test/smoke). Logins `alex@demo.local` (admin, owner), `sam@demo.local` (editor),
`lecteur@demo.local` (viewer), password `demo-password`. Space "Foyer" has 6 months of transactions, rules, budgets, goals, a split month.

## Non-negotiable rules
1. **Money is integer cents** (`amountCents`), signed: negative = money out. Never floats, never euros in storage or API.
   Format only through `formatCents` / `<Money>`. Parse user input only through `parseAmountToCents`.
2. **Every space-scoped query filters on `spaceId`**, including updates and deletes (`{ _id, spaceId }`). Missing this is a data leak between users.
3. **Contract first**: request/response shapes live in `packages/shared/src/schemas/*`. The API parses every body/query with them,
   the web imports their types. Never redeclare a DTO type locally.
4. Dates: calendar days are `"YYYY-MM-DD"` strings over the API and UTC midnight `Date` in Mongo; months are `"YYYY-MM"`. Helpers in `shared/src/dates.ts`.
5. Errors: API throws `HttpError` helpers (`badRequest`, `notFound`, `conflict`, `forbidden`), messages in French, user-facing.
6. Explicit types on variables, parameters and return types (no reliance on inference for declarations). No `var`. No `any`.
7. Prefer plain loops / Map / Set over chained array helpers in hot paths (aggregations, imports). Use Mongo aggregation for stats, not JS loops over all transactions.
8. Comments explain *why*, match the existing density. Never use the em dash character anywhere (code, comments, docs, UI copy).
9. Stay scoped: do not refactor or "improve" unrelated code; propose it instead.
10. Never commit, push or open a PR unless asked.

## Domain model (one paragraph)
`users` (logins created by an admin, first one via setup) → `spaces` (embedded `members[{userId, role}]`, roles `owner` > `editor` > `viewer`)
→ space data: `accounts`, `categories` (kind expense/income/transfer, transfers excluded from stats), `rules` (label contains → category),
`transactions` (imported from CSV/OFX, `dedupKey` unique per account), `imports` (undo = delete its transactions), `budgets`
(monthly limit per category), `goals` (embedded contributions), `splitMonths` (household split plan per month).

## Where to look
- Feature contexts (read the relevant one BEFORE touching a feature, update its **Status** section after): `.claude/rules/features/<feature>.md`
  auth-users, spaces, accounts, categories-rules, transactions, import, budgets, goals, stats-dashboard, split.
- Layer rules: `.claude/rules/api.md`, `.claude/rules/web.md`, `.claude/rules/shared.md` (auto-loaded for matching paths).
- Learnings and gotchas: `AI_MEMORY.md` (read it at the start of a task, append non-obvious findings).
- UI/UX direction: `design/` (drafts and the chosen direction).

## Agents and coordination
Two project agents in `.claude/agents/`:
- **developer**: owns `packages/shared` (contract, pure logic), `apps/api`, data model, tests, build, Docker image and CI, and web data hooks (`features/*/api.ts`).
- **ux-designer**: owns everything the user sees in `apps/web` (pages, components, copy, layout, accessibility) and verifies it in a browser.

Protocol (the `ship-feature` skill runs it end to end):
1. **Contract**: developer updates `packages/shared` + the feature context (API section). This is the only sync point.
2. **Build in parallel**: developer implements the API + hooks; ux-designer builds the screens against the shared types (mock with the types if the API is not ready).
3. **Integrate**: run the app, ux-designer checks every state in the browser (loading, empty, error, viewer read-only, mobile).
4. **Close**: `npm run check` green, feature context Status updated, AI_MEMORY.md updated if something non-obvious was learned.
If the ux-designer needs a field or endpoint, it asks the developer (through the orchestrator) instead of changing the contract itself.
