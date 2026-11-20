import type { Server } from 'node:http';
import { createApp } from './app';
import { config } from './config';
import { closeDb, connectDb } from './db';
import { features } from './features';

async function main(): Promise<void> {
  await connectDb();
  for (const feature of features) {
    await feature.ensureIndexes?.();
  }

  const server: Server = createApp().listen(config.PORT, () => {
    console.log(`[api] ${config.APP_VERSION} listening on http://localhost:${config.PORT} (db: ${config.MONGODB_DB})`);
  });

  const shutdown = (): void => {
    server.close(() => {
      void closeDb().then(() => process.exit(0));
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error: unknown) => {
  console.error('[api] failed to start', error);
  process.exit(1);
});
