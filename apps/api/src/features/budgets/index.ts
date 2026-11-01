import type { FeatureModule } from '../../lib/feature';
import { ensureBudgetsIndexes } from './model';
import { budgetsRouter } from './routes';

export const budgetsFeature: FeatureModule = {
  name: 'budgets',
  scope: 'space',
  basePath: '/budgets',
  router: budgetsRouter,
  ensureIndexes: ensureBudgetsIndexes,
};
