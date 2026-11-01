import { Router, type Request, type Response } from 'express';
import { createCategoryBodySchema, updateCategoryBodySchema } from '@bank/shared';
import { getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import * as categoriesService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/categories. Writes are already restricted to editors. */
export const categoriesRouter: Router = Router();

categoriesRouter.get('/', async (req: Request, res: Response) => {
  res.json(await categoriesService.listCategories(getSpace(req).spaceId));
});

categoriesRouter.post('/', async (req: Request, res: Response) => {
  res.status(201).json(await categoriesService.createCategory(getSpace(req).spaceId, createCategoryBodySchema.parse(req.body)));
});

categoriesRouter.patch('/:id', async (req: Request, res: Response) => {
  res.json(await categoriesService.updateCategory(getSpace(req).spaceId, parseId(req.params.id), updateCategoryBodySchema.parse(req.body)));
});

categoriesRouter.delete('/:id', async (req: Request, res: Response) => {
  await categoriesService.deleteCategory(getSpace(req).spaceId, parseId(req.params.id));
  res.status(204).end();
});
