import type { FeatureModule } from '../../lib/feature';
import { ensureImportsIndexes } from './model';
import { importsRouter } from './routes';

export const importsFeature: FeatureModule = {
  name: 'imports',
  scope: 'space',
  basePath: '/imports',
  router: importsRouter,
  ensureIndexes: ensureImportsIndexes,
};
