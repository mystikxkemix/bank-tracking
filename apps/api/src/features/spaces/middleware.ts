import type { NextFunction, Request, Response } from 'express';
import type { ObjectId } from 'mongodb';
import { hasRole, type SpaceRole } from '@bank/shared';
import { getAuth } from '../../lib/context';
import { forbidden, notFound } from '../../lib/errors';
import { parseId } from '../../lib/http';
import { getRole } from './service';

const READ_METHODS: Set<string> = new Set(['GET', 'HEAD', 'OPTIONS']);

type Middleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

function spaceGuard(enforceWriteRole: boolean): Middleware {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const spaceId: ObjectId = parseId(req.params.spaceId);
    const role: SpaceRole | null = await getRole(spaceId, getAuth(req).userId);
    if (role === null) {
      throw notFound('Espace');
    }
    if (enforceWriteRole && !READ_METHODS.has(req.method) && !hasRole(role, 'editor')) {
      throw forbidden('Accès en lecture seule à cet espace');
    }
    req.space = { spaceId, role };
    next();
  };
}

/**
 * Mounted on /api/spaces/:spaceId/* by app.ts. Resolves req.space and enforces the role:
 * viewers can only read, any write needs editor. Non-members get 404 (do not leak existence).
 */
export const requireSpace: Middleware = spaceGuard(true);

/** Membership only, writes allowed whatever the role. Only for "leave the space". */
export const requireMembership: Middleware = spaceGuard(false);

/** Extra guard for owner-only routes (members, rename, delete). Use after requireSpace. */
export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (!req.space || !hasRole(req.space.role, 'owner')) {
    throw forbidden("Réservé aux propriétaires de l'espace");
  }
  next();
}
