---
paths:
  - "apps/api/src/features/spaces/**"
  - "apps/web/src/features/spaces/**"
  - "apps/web/src/lib/space.ts"
  - "packages/shared/src/schemas/spaces.ts"
---
# Feature: spaces and sharing

## Goal
All data belongs to a space. Each user has a personal space and can create others (e.g. "Foyer") and share them with existing users as owner / editor / viewer. "Share an account with someone" = put the account in a shared space.

## Data model
`spaces { name, members: [{ userId, role, addedAt }], createdAt }`, index on `members.userId`. Invariant: at least one owner.

## Roles
| | viewer | editor | owner |
|---|---|---|---|
| Read all space data | yes | yes | yes |
| Create / edit / delete data, import | no | yes | yes |
| Rename / delete space, manage members | no | no | yes |
Enforced in `requireSpace` (any non-GET needs editor) and `requireOwner`. Non-members get 404.

## API
| Method | Path | Notes |
|---|---|---|
| GET | /api/spaces | spaces of the current user, with their `role` and `memberCount` |
| POST | /api/spaces | `CreateSpaceBody`, caller is owner, default categories seeded |
| PATCH | /api/spaces/:spaceId | owner, rename |
| DELETE | /api/spaces/:spaceId | owner, cascades ALL data (`deleteSpaceData`), 409 if it is the caller's only space |
| GET | /api/spaces/:spaceId/members | any member |
| POST | /api/spaces/:spaceId/members | owner, `AddMemberBody { email, role }`, 400 unknown email, 409 already member |
| PATCH | /api/spaces/:spaceId/members/:userId | owner, `{ role }`, 409 demoting the last owner |
| DELETE | /api/spaces/:spaceId/members/:userId | owner, 409 last owner |
| POST | /api/spaces/:spaceId/leave | any member incl. viewer, 409 last owner |

## UI
- URLs `/s/:spaceId/...`; `SpaceRoute` checks membership and provides `useCurrentSpace()` (`space`, `canEdit`, `isOwner`). `/` redirects to the last used space (localStorage). Done.
- `SpaceSwitcher` in the sidebar with role badges + "Nouvel espace" dialog. Done.
- Read-only banner in AppLayout for viewers. Done.
- Settings > "Partage" tab (`MembersSection.tsx`): members list with role Select (owner only), add by email + role, remove (ConfirmDialog), roles explanation, "Quitter cet espace" (non-owners, or owners when another owner exists). Done.
- Settings > "Espace" tab (`SpaceSettingsSection.tsx`): rename, delete (ConfirmDialog listing what is deleted, then navigate to `/`); non-owners see their role. Done.

## Status
API done and smoke-tested (2026-11-01). Web: switcher, routing, read-only banner, Partage and Espace tabs done (2026-11-01), verified in the browser (owner, viewer, rename + delete on a throwaway space).
