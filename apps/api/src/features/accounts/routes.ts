import { Router, type Request, type Response } from 'express';
import { createAccountBodySchema, updateAccountBodySchema } from '@bank/shared';
import { getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import * as accountsService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/accounts. Writes are already restricted to editors. */
export const accountsRouter: Router = Router();

accountsRouter.get('/', async (req: Request, res: Response) => {
  res.json(await accountsService.listAccounts(getSpace(req).spaceId));
});

accountsRouter.post('/', async (req: Request, res: Response) => {
  res.status(201).json(await accountsService.createAccount(getSpace(req).spaceId, createAccountBodySchema.parse(req.body)));
});

accountsRouter.patch('/:id', async (req: Request, res: Response) => {
  res.json(await accountsService.updateAccount(getSpace(req).spaceId, parseId(req.params.id), updateAccountBodySchema.parse(req.body)));
});

accountsRouter.delete('/:id', async (req: Request, res: Response) => {
  await accountsService.deleteAccount(getSpace(req).spaceId, parseId(req.params.id));
  res.status(204).end();
});
