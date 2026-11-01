import type { FeatureModule } from '../../lib/feature';
import { usersRouter } from './routes';

export const usersFeature: FeatureModule = {
  name: 'users',
  scope: 'user',
  basePath: '/api/users',
  router: usersRouter,
};
