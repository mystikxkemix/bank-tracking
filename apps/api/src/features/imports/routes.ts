import { Router, type Request, type Response } from 'express';
import { commitImportBodySchema, importPreviewBodySchema } from '@bank/shared';
import { getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import * as importsService from './service';

/** Space scope: mounted at /api/spaces/:spaceId/imports. Writes (preview included, it is a POST) need an editor. */
export const importsRouter: Router = Router();

importsRouter.get('/', async (req: Request, res: Response) => {
  res.json(await importsService.listImports(getSpace(req).spaceId));
});

importsRouter.post('/preview', async (req: Request, res: Response) => {
  res.json(await importsService.previewImport(getSpace(req).spaceId, importPreviewBodySchema.parse(req.body)));
});

importsRouter.post('/', async (req: Request, res: Response) => {
  res.status(201).json(await importsService.commitImport(getSpace(req).spaceId, commitImportBodySchema.parse(req.body)));
});

importsRouter.delete('/:id', async (req: Request, res: Response) => {
  await importsService.deleteImport(getSpace(req).spaceId, parseId(req.params.id));
  res.status(204).end();
});
