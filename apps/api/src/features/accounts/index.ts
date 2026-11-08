import type { FeatureModule } from '../../lib/feature';
import { ensureAccountsIndexes } from './model';
import { accountsRouter } from './routes';

export const accountsFeature: FeatureModule = {
  name: 'accounts',
  scope: 'space',
  basePath: '/accounts',
  router: accountsRouter,
  ensureIndexes: ensureAccountsIndexes,
};
