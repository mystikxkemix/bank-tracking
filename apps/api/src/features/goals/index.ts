import type { FeatureModule } from '../../lib/feature';
import { ensureGoalsIndexes } from './model';
import { goalsRouter } from './routes';

export const goalsFeature: FeatureModule = {
  name: 'goals',
  scope: 'space',
  basePath: '/goals',
  router: goalsRouter,
  ensureIndexes: ensureGoalsIndexes,
};
