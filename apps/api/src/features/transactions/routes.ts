import { Router, type Request, type Response } from 'express';
import { bulkCategorizeBodySchema, transactionQuerySchema, updateTransactionBodySchema } from '@bank/shared';
import { getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import * as transactionsService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/transactions. Writes are already restricted to editors. */
export const transactionsRouter: Router = Router();

transactionsRouter.get('/', async (req: Request, res: Response) => {
  res.json(await transactionsService.listTransactions(getSpace(req).spaceId, transactionQuerySchema.parse(req.query)));
});

transactionsRouter.post('/bulk-categorize', async (req: Request, res: Response) => {
  res.json(await transactionsService.bulkCategorize(getSpace(req).spaceId, bulkCategorizeBodySchema.parse(req.body)));
});

transactionsRouter.patch('/:id', async (req: Request, res: Response) => {
  res.json(await transactionsService.updateTransaction(getSpace(req).spaceId, parseId(req.params.id), updateTransactionBodySchema.parse(req.body)));
});

transactionsRouter.delete('/:id', async (req: Request, res: Response) => {
  await transactionsService.deleteTransaction(getSpace(req).spaceId, parseId(req.params.id));
  res.status(204).end();
});
