import type { FeatureModule } from '../../lib/feature';
import { ensureSplitIndexes } from './model';
import { splitRouter } from './routes';

export const splitFeature: FeatureModule = {
  name: 'split',
  scope: 'space',
  basePath: '/split',
  router: splitRouter,
  ensureIndexes: ensureSplitIndexes,
};
