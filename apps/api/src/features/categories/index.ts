import type { FeatureModule } from '../../lib/feature';
import { categoriesRouter } from './categoriesRoutes';
import { ensureCategoriesIndexes } from './model';
import { rulesRouter } from './rulesRoutes';

export const categoriesFeature: FeatureModule = {
  name: 'categories',
  scope: 'space',
  basePath: '/categories',
  router: categoriesRouter,
  ensureIndexes: ensureCategoriesIndexes,
};

export const rulesFeature: FeatureModule = {
  name: 'rules',
  scope: 'space',
  basePath: '/rules',
  router: rulesRouter,
};
