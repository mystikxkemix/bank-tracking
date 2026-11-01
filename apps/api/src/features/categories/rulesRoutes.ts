import { Router, type Request, type Response } from 'express';
import { applyRulesBodySchema, createRuleBodySchema, updateRuleBodySchema, type ApplyRulesBody } from '@bank/shared';
import { getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import * as categoriesService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/rules. Writes are already restricted to editors. */
export const rulesRouter: Router = Router();

rulesRouter.get('/', async (req: Request, res: Response) => {
  res.json(await categoriesService.listRules(getSpace(req).spaceId));
});

rulesRouter.post('/', async (req: Request, res: Response) => {
  res.status(201).json(await categoriesService.createRule(getSpace(req).spaceId, createRuleBodySchema.parse(req.body)));
});

/** Declared before "/:id" routes for readability (different method anyway). */
rulesRouter.post('/apply', async (req: Request, res: Response) => {
  const body: Required<ApplyRulesBody> = applyRulesBodySchema.parse(req.body ?? {});
  res.json(await categoriesService.applyRules(getSpace(req).spaceId, body.onlyUncategorized));
});

rulesRouter.patch('/:id', async (req: Request, res: Response) => {
  res.json(await categoriesService.updateRule(getSpace(req).spaceId, parseId(req.params.id), updateRuleBodySchema.parse(req.body)));
});

rulesRouter.delete('/:id', async (req: Request, res: Response) => {
  await categoriesService.deleteRule(getSpace(req).spaceId, parseId(req.params.id));
  res.status(204).end();
});
