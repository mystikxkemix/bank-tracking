import { Router, type Request, type Response } from 'express';
import { createContributionBodySchema, createGoalBodySchema, updateGoalBodySchema, type Goal } from '@bank/shared';
import { getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import { buildGoalUpdate, type GoalUpdate } from './mapper';
import * as goalsService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/goals. Writes are already restricted to editors. */
export const goalsRouter: Router = Router();

goalsRouter.get('/', async (req: Request, res: Response) => {
  res.json(await goalsService.listGoals(getSpace(req).spaceId));
});

goalsRouter.post('/', async (req: Request, res: Response) => {
  res.status(201).json(await goalsService.createGoal(getSpace(req).spaceId, createGoalBodySchema.parse(req.body)));
});

goalsRouter.patch('/:id', async (req: Request, res: Response) => {
  const update: GoalUpdate = buildGoalUpdate(updateGoalBodySchema.parse(req.body), req.body);
  res.json(await goalsService.updateGoal(getSpace(req).spaceId, parseId(req.params.id), update));
});

goalsRouter.delete('/:id', async (req: Request, res: Response) => {
  await goalsService.deleteGoal(getSpace(req).spaceId, parseId(req.params.id));
  res.status(204).end();
});

goalsRouter.post('/:id/contributions', async (req: Request, res: Response) => {
  const goal: Goal = await goalsService.addContribution(getSpace(req).spaceId, parseId(req.params.id), createContributionBodySchema.parse(req.body));
  res.status(201).json(goal);
});

goalsRouter.delete('/:id/contributions/:contributionId', async (req: Request, res: Response) => {
  res.json(await goalsService.deleteContribution(getSpace(req).spaceId, parseId(req.params.id), parseId(req.params.contributionId)));
});
