import type { Router } from 'express';

/**
 * Where a feature router is mounted and which guard protects it:
 * - public : no session (auth endpoints only)            -> mounted at basePath
 * - user   : logged-in user, not tied to a space          -> mounted at basePath
 * - space  : logged-in member of the space in the URL     -> mounted at /api/spaces/:spaceId<basePath>
 *            (viewers are rejected on any non-GET request by requireSpace, routes do not re-check it)
 */
export type FeatureScope = 'public' | 'user' | 'space';

/**
 * Every feature folder exports one FeatureModule from its index.ts,
 * registered in src/features/index.ts. app.ts mounts the routers, server.ts runs indexes.
 */
export interface FeatureModule {
  name: string;
  scope: FeatureScope;
  /** "/api/auth" for public/user scopes, "/accounts" (relative to the space) for the space scope. */
  basePath: string;
  router: Router;
  ensureIndexes?: () => Promise<void>;
}
