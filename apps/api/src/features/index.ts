import type { FeatureModule } from '../lib/feature';
import { accountsFeature } from './accounts';
import { authFeature } from './auth';
import { budgetsFeature } from './budgets';
import { categoriesFeature, rulesFeature } from './categories';
import { goalsFeature } from './goals';
import { importsFeature } from './imports';
import { spacesFeature } from './spaces';
import { splitFeature } from './split';
import { statsFeature } from './stats';
import { transactionsFeature } from './transactions';
import { usersFeature } from './users';

/**
 * Feature registry. To add a feature: create src/features/<name>/{model,service,routes,index}.ts
 * and append its FeatureModule here. See .claude/rules/api.md.
 */
export const features: FeatureModule[] = [
  authFeature,
  usersFeature,
  spacesFeature,
  accountsFeature,
  categoriesFeature,
  rulesFeature,
  transactionsFeature,
  importsFeature,
  budgetsFeature,
  goalsFeature,
  statsFeature,
  splitFeature,
];
