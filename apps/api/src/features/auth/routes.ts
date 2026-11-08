import { Router, type NextFunction, type Request, type Response } from 'express';
import type { WithId } from 'mongodb';
import { changePasswordBodySchema, loginBodySchema, setupBodySchema, type AuthStatus } from '@bank/shared';
import { config } from '../../config';
import { getAuth } from '../../lib/context';
import { forbidden, unauthorized } from '../../lib/errors';
import type { UserDoc } from './model';
import * as authService from './service';

export const SESSION_COOKIE: string = 'bt_session';

function readToken(req: Request): string | undefined {
  const value: unknown = req.cookies?.[SESSION_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.HTTPS,
    path: '/',
    maxAge: authService.sessionTtlMs(),
  });
}

/** Guards every user and space scoped router (mounted in app.ts). Sets req.auth. */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const user: WithId<UserDoc> | null = await authService.resolveSession(readToken(req));
  if (!user) {
    throw unauthorized();
  }
  req.auth = { userId: user._id, isAdmin: user.isAdmin };
  next();
}

/** Admin-only routes (user management). Use after requireAuth. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!getAuth(req).isAdmin) {
    throw forbidden('Réservé aux administrateurs');
  }
  next();
}

/** Public: mounted at /api/auth without requireAuth. */
export const authRouter: Router = Router();

authRouter.get('/status', async (req: Request, res: Response) => {
  const status: AuthStatus = await authService.getStatus(readToken(req));
  res.json(status);
});

authRouter.post('/setup', async (req: Request, res: Response) => {
  setSessionCookie(res, await authService.setup(setupBodySchema.parse(req.body)));
  res.status(204).end();
});

authRouter.post('/login', async (req: Request, res: Response) => {
  setSessionCookie(res, await authService.login(loginBodySchema.parse(req.body), req.ip ?? 'unknown'));
  res.status(204).end();
});

authRouter.post('/logout', async (req: Request, res: Response) => {
  await authService.logout(readToken(req));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.status(204).end();
});

authRouter.post('/password', requireAuth, async (req: Request, res: Response) => {
  await authService.changePassword(getAuth(req), changePasswordBodySchema.parse(req.body), readToken(req));
  res.status(204).end();
});
