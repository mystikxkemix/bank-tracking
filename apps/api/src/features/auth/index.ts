import type { FeatureModule } from '../../lib/feature';
import { ensureAuthIndexes } from './model';
import { authRouter } from './routes';

export const authFeature: FeatureModule = {
  name: 'auth',
  scope: 'public',
  basePath: '/api/auth',
  router: authRouter,
  ensureIndexes: ensureAuthIndexes,
};
