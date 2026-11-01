import { Router, type Request, type Response } from 'express';
import { currentMonthKey, monthKeySchema, monthlyStatsQuerySchema } from '@bank/shared';
import { getSpace } from '../../lib/context';
import * as statsService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/stats. Read only. */
export const statsRouter: Router = Router();

statsRouter.get('/monthly', async (req: Request, res: Response) => {
  const query: { months: number; until?: string } = monthlyStatsQuerySchema.parse(req.query);
  res.json(await statsService.getMonthlyStats(getSpace(req).spaceId, query.until ?? currentMonthKey(), query.months));
});

statsRouter.get('/months/:month', async (req: Request, res: Response) => {
  res.json(await statsService.getMonthSummary(getSpace(req).spaceId, monthKeySchema.parse(req.params.month)));
});
