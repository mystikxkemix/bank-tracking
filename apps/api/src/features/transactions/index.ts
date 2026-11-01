import type { FeatureModule } from '../../lib/feature';
import { ensureTransactionsIndexes } from './model';
import { transactionsRouter } from './routes';

export const transactionsFeature: FeatureModule = {
  name: 'transactions',
  scope: 'space',
  basePath: '/transactions',
  router: transactionsRouter,
  ensureIndexes: ensureTransactionsIndexes,
};
