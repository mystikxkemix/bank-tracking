import type { FeatureModule } from '../../lib/feature';
import { statsRouter } from './routes';

export const statsFeature: FeatureModule = {
  name: 'stats',
  scope: 'space',
  basePath: '/stats',
  router: statsRouter,
};
