import type { Request } from 'express';
import type { ObjectId } from 'mongodb';
import type { SpaceRole } from '@bank/shared';
import { unauthorized } from './errors';

/** Set by requireAuth. */
export interface AuthContext {
  userId: ObjectId;
  isAdmin: boolean;
}

/** Set by requireSpace on every space-scoped route. */
export interface SpaceContext {
  spaceId: ObjectId;
  role: SpaceRole;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
    space?: SpaceContext;
  }
}

/** The logged-in user. Only call behind requireAuth (user and space scopes). */
export function getAuth(req: Request): AuthContext {
  if (!req.auth) {
    throw unauthorized();
  }
  return req.auth;
}

/** The current space. Only call from space-scoped routes. Every query MUST filter on spaceId. */
export function getSpace(req: Request): SpaceContext {
  if (!req.space) {
    throw new Error('getSpace() called outside of a space-scoped route');
  }
  return req.space;
}
