import { Router, type Request, type Response } from 'express';
import { putBudgetBodySchema } from '@bank/shared';
import { getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import * as budgetsService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/budgets. Writes are already restricted to editors. */
export const budgetsRouter: Router = Router();

budgetsRouter.get('/', async (req: Request, res: Response) => {
  res.json(await budgetsService.listBudgets(getSpace(req).spaceId));
});

budgetsRouter.put('/:categoryId', async (req: Request, res: Response) => {
  res.json(await budgetsService.putBudget(getSpace(req).spaceId, parseId(req.params.categoryId), putBudgetBodySchema.parse(req.body)));
});

budgetsRouter.delete('/:categoryId', async (req: Request, res: Response) => {
  await budgetsService.deleteBudget(getSpace(req).spaceId, parseId(req.params.categoryId));
  res.status(204).end();
});
