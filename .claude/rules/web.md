---
paths:
  - "apps/web/**"
---
# Web rules (apps/web)

## Layout
- `src/app/`: shell (App, routes, AppLayout, nav). `src/components/`: generic UI pieces reused by 2+ features.
- `src/features/<feature>/`: `api.ts` (TanStack Query hooks), pages `XPage.tsx`, feature components.
- `src/lib/`: api client, formatting, space context, hooks.

## Data
- Only through hooks in `features/<f>/api.ts`, using `api` from `lib/api.ts` and `spaceApiPath(spaceId, path)`.
- Query keys: `['spaces', spaceId, '<feature>', ...params]`. After a mutation, invalidate what changed. Imports and transaction edits also change stats: invalidate `['spaces', spaceId]` broadly when unsure.
- Types come from `@bank/shared`, never redeclared.
- Errors: `ApiError.message` is French and user-facing: show it with `<ErrorCallout>`.

## UI conventions
- Radix Themes components and props first (`Flex`, `Grid`, `Card`, `Table`, `Dialog`, `gap`, `p`, `size`, `color`). Custom CSS only in `styles.css` with Radix tokens (`var(--gray-a5)`, `var(--space-3)`). No CSS framework, no inline hex colors.
- Amounts: always `<Money cents=...>`; inputs: `<AmountField>`. Dates via `formatDay` / `formatMonth`.
- Selected month in the URL: `useMonthParam()` + `<MonthHeader>` on monthly pages (D2 big month title + today chip; `MonthPicker` is its inner control).
- Shell (D2): top navigation bar on desktop, compact header + bottom tab bar on mobile, built from `app/nav.ts`. Sticky elements use `var(--app-background)`. Headline figures use `<HeroStrip>`, accent text uses the `.text-accent` class.
- Every list/page handles: loading (Skeleton), empty (`<EmptyState>` with the next action), error (`<ErrorCallout>`), **viewer read-only** (`useCurrentSpace().canEdit` false: hide create/edit/delete controls, never show a control that will 403).
- Destructive actions: `<ConfirmDialog>` stating consequences.
- Responsive: usable at 375px. Tables that do not fit become stacked cards on mobile (`display={{ initial: 'none', sm: 'block' }}`).
- Accessibility: every IconButton has `aria-label`, forms use `<label>`, focus stays visible, color is never the only signal (sign or icon too).
- Copy: French, tutoiement, short, concrete ("Importer un relevé", not "Procéder à l'import"). No em dash.
- Follow `design/DECISION.md` (page by page mix of the drafts in `design/drafts/index.html`): open the referenced mockup before building a page.
