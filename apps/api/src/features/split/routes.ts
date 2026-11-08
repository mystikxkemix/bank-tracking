import { Router, type Request, type Response } from 'express';
import { monthKeySchema, splitPlanBodySchema } from '@bank/shared';
import { getSpace } from '../../lib/context';
import * as splitService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/split. Writes are already restricted to editors. */
export const splitRouter: Router = Router();

splitRouter.get('/months', async (req: Request, res: Response) => {
  res.json(await splitService.listSplitHistory(getSpace(req).spaceId));
});

splitRouter.get('/months/:month', async (req: Request, res: Response) => {
  res.json(await splitService.getSplitMonth(getSpace(req).spaceId, monthKeySchema.parse(req.params.month)));
});

splitRouter.put('/months/:month', async (req: Request, res: Response) => {
  const month: string = monthKeySchema.parse(req.params.month);
  res.json(await splitService.putSplitMonth(getSpace(req).spaceId, month, splitPlanBodySchema.parse(req.body)));
});

splitRouter.delete('/months/:month', async (req: Request, res: Response) => {
  await splitService.deleteSplitMonth(getSpace(req).spaceId, monthKeySchema.parse(req.params.month));
  res.status(204).end();
});
