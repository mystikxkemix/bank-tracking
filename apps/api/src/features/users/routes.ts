import { Router, type Request, type Response } from 'express';
import { createUserBodySchema, resetPasswordBodySchema, updateUserBodySchema } from '@bank/shared';
import { getAuth } from '../../lib/context';
import { parseId } from '../../lib/http';
import { requireAdmin } from '../auth/routes';
import * as usersService from './service';

/** Admin user management, mounted at /api/users. */
export const usersRouter: Router = Router();
usersRouter.use(requireAdmin);

usersRouter.get('/', async (_req: Request, res: Response) => {
  res.json(await usersService.listUsers());
});

usersRouter.post('/', async (req: Request, res: Response) => {
  res.status(201).json(await usersService.createUser(createUserBodySchema.parse(req.body)));
});

usersRouter.patch('/:id', async (req: Request, res: Response) => {
  res.json(await usersService.updateUser(parseId(req.params.id), updateUserBodySchema.parse(req.body)));
});

usersRouter.post('/:id/password', async (req: Request, res: Response) => {
  await usersService.resetPassword(parseId(req.params.id), resetPasswordBodySchema.parse(req.body).password);
  res.status(204).end();
});

usersRouter.delete('/:id', async (req: Request, res: Response) => {
  await usersService.deleteUser(parseId(req.params.id), getAuth(req).userId);
  res.status(204).end();
});
