import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

// Dev: load the repo root .env (cwd is apps/api when run through npm workspaces).
// Prod: variables come from the container environment, no file needed.
for (const candidate of ['.env', '../../.env']) {
  const file: string = path.resolve(process.cwd(), candidate);
  if (existsSync(file)) {
    process.loadEnvFile(file);
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().default(3001),
  MONGODB_URI: z.string().default('mongodb://localhost:27017'),
  MONGODB_DB: z.string().default('bank-tracking-dev'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).default(30),
  /** true only when users reach the app over HTTPS (reverse proxy): secure cookie, HSTS, upgrade-insecure-requests. */
  HTTPS: z.stringbool().default(false),
  /** Version shown in the UI: the image's 1.N tag, set by the Dockerfile from the CI build. */
  APP_VERSION: z
    .string()
    .trim()
    .default('dev')
    .transform((value: string) => value || 'dev'),
  /** Folder holding the built web app. Only served when it exists (prod). */
  PUBLIC_DIR: z.string().default(path.resolve(process.cwd(), 'public')),
});

export type Config = z.infer<typeof envSchema>;

export const config: Config = envSchema.parse(process.env);
export const isProduction: boolean = config.NODE_ENV === 'production';
