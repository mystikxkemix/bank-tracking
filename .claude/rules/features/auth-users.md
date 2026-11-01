---
paths:
  - "apps/api/src/features/auth/**"
  - "apps/api/src/features/users/**"
  - "apps/web/src/features/auth/**"
  - "apps/web/src/features/users/**"
  - "apps/web/src/features/profile/**"
  - "packages/shared/src/schemas/auth.ts"
  - "packages/shared/src/schemas/users.ts"
---
# Feature: auth and users

## Goal
Several people use the app, each with their own login. No self sign-up: the first launch creates the admin, then an admin creates the other logins and gives them their initial password.

## Data model
- `users { email (lowercased, unique), name, passwordHash (scrypt, node:crypto), isAdmin, createdAt }`
- `sessions { _id: sha256(token), userId, expiresAt (TTL index), createdAt }`. Cookie `bt_session`, httpOnly, sameSite lax, secure when `HTTPS=true`.
- Creating a user (setup or admin) also creates their personal space "Espace de <name>" (owner) with default categories.

## API
| Method | Path | Scope | Notes |
|---|---|---|---|
| GET | /api/auth/status | public | `AuthStatus { configured, user }` |
| POST | /api/auth/setup | public | `SetupBody`, 409 once configured, sets cookie |
| POST | /api/auth/login | public | `LoginBody`, 401 wrong creds, 429 after 10 failures / 15 min / IP |
| POST | /api/auth/logout | public | clears cookie |
| POST | /api/auth/password | user | `ChangePasswordBody`, revokes the user's other sessions |
| GET/POST | /api/users | admin | `User[]` / `CreateUserBody` (409 email taken) |
| PATCH | /api/users/:id | admin | `UpdateUserBody` (name, isAdmin), 409 if it removes the last admin |
| POST | /api/users/:id/password | admin | `ResetPasswordBody`, logs the user out everywhere |
| DELETE | /api/users/:id | admin | 409 self-delete, last admin, or sole owner of a shared space. Deletes their solo spaces (all data) |

## UI
- `AuthGate`: setup screen (first launch), login screen, else the app. Done.
- `/profile`: name/email display, change password form (length and confirmation checked live). Done.
- `/admin/users` (admins only, link in the user menu): list, create (email, name, initial password with "Générer", admin switch, success screen with the credentials to hand over), rename, toggle admin (not on yourself), reset password, delete with a ConfirmDialog that explains the data impact. Non-admins see "Réservé aux administrateurs". Done.

## Status
- API: done and smoke-tested (2026-11-01).
- Web: AuthGate, profile and admin users pages done (2026-11-01), verified in the browser (create / reset / toggle / delete on throwaway users, password change success and error).
