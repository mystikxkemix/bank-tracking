import type { FeatureModule } from '../../lib/feature';
import { ensureSpacesIndexes } from './model';
import { spacesRouter } from './routes';

export const spacesFeature: FeatureModule = {
  name: 'spaces',
  scope: 'user',
  basePath: '/api/spaces',
  router: spacesRouter,
  ensureIndexes: ensureSpacesIndexes,
};
