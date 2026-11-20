import { existsSync } from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import express, { type Express, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { Health } from '@bank/shared';
import { config } from './config';
import { features } from './features';
import { requireAuth } from './features/auth/routes';
import { requireSpace } from './features/spaces/middleware';
import { errorHandler, notFound } from './lib/errors';

export function createApp(): Express {
  const app: Express = express();
  app.set('trust proxy', 'loopback');
  // Over plain HTTP (local machine / LAN) HSTS and upgrade-insecure-requests would break the app.
  app.use(
    helmet({
      strictTransportSecurity: config.HTTPS,
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: config.HTTPS ? [] : null } },
    }),
  );
  // Imports send the whole file as text: keep a generous limit.
  app.use(express.json({ limit: '12mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req: Request, res: Response) => {
    const health: Health = { ok: true, version: config.APP_VERSION };
    res.json(health);
  });

  for (const feature of features) {
    switch (feature.scope) {
      case 'public':
        app.use(feature.basePath, feature.router);
        break;
      case 'user':
        app.use(feature.basePath, requireAuth, feature.router);
        break;
      case 'space':
        app.use(`/api/spaces/:spaceId${feature.basePath}`, requireAuth, requireSpace, feature.router);
        break;
    }
  }

  app.use('/api', () => {
    throw notFound('Route');
  });

  // Prod: the same process serves the built SPA.
  if (existsSync(config.PUBLIC_DIR)) {
    app.use(express.static(config.PUBLIC_DIR, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      res.sendFile(path.join(config.PUBLIC_DIR, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
