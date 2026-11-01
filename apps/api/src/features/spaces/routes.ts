import { Router, type Request, type Response } from 'express';
import { addMemberBodySchema, createSpaceBodySchema, updateMemberBodySchema, updateSpaceBodySchema } from '@bank/shared';
import { getAuth, getSpace } from '../../lib/context';
import { parseId } from '../../lib/http';
import { requireMembership, requireOwner, requireSpace } from './middleware';
import * as spacesService from './service';

/** Mounted at /api/spaces (user scope). Routes with :spaceId apply requireSpace themselves. */
export const spacesRouter: Router = Router();

spacesRouter.get('/', async (req: Request, res: Response) => {
  res.json(await spacesService.listSpaces(getAuth(req).userId));
});

spacesRouter.post('/', async (req: Request, res: Response) => {
  const body = createSpaceBodySchema.parse(req.body);
  res.status(201).json(await spacesService.createSpace(getAuth(req).userId, body.name));
});

spacesRouter.patch('/:spaceId', requireSpace, requireOwner, async (req: Request, res: Response) => {
  const body = updateSpaceBodySchema.parse(req.body);
  res.json(await spacesService.renameSpace(getSpace(req).spaceId, getAuth(req).userId, body.name));
});

spacesRouter.delete('/:spaceId', requireSpace, requireOwner, async (req: Request, res: Response) => {
  await spacesService.deleteSpace(getSpace(req).spaceId, getAuth(req).userId);
  res.status(204).end();
});

spacesRouter.get('/:spaceId/members', requireSpace, async (req: Request, res: Response) => {
  res.json(await spacesService.listMembers(getSpace(req).spaceId));
});

spacesRouter.post('/:spaceId/members', requireSpace, requireOwner, async (req: Request, res: Response) => {
  res.status(201).json(await spacesService.addMember(getSpace(req).spaceId, addMemberBodySchema.parse(req.body)));
});

spacesRouter.patch('/:spaceId/members/:userId', requireSpace, requireOwner, async (req: Request, res: Response) => {
  const body = updateMemberBodySchema.parse(req.body);
  res.json(await spacesService.updateMemberRole(getSpace(req).spaceId, parseId(req.params.userId), body.role));
});

spacesRouter.delete('/:spaceId/members/:userId', requireSpace, requireOwner, async (req: Request, res: Response) => {
  await spacesService.removeMember(getSpace(req).spaceId, parseId(req.params.userId));
  res.status(204).end();
});

/** Any member (viewers included) can leave, except the last owner. */
spacesRouter.post('/:spaceId/leave', requireMembership, async (req: Request, res: Response) => {
  await spacesService.removeMember(getSpace(req).spaceId, getAuth(req).userId);
  res.status(204).end();
});
