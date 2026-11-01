import { z } from 'zod';
import { idSchema } from './common';
import { emailSchema } from './auth';

/**
 * Every piece of data (bank accounts, categories, rules, transactions, imports, budgets, goals) belongs to a space.
 * owner  : everything editor can do + rename/delete the space + manage members.
 * editor : read and write all data of the space.
 * viewer : read only.
 */
export const SPACE_ROLES = ['owner', 'editor', 'viewer'] as const;
export const spaceRoleSchema = z.enum(SPACE_ROLES);
export type SpaceRole = z.infer<typeof spaceRoleSchema>;

const ROLE_RANK: Record<SpaceRole, number> = { viewer: 0, editor: 1, owner: 2 };

/** true when `role` grants at least `required`. */
export function hasRole(role: SpaceRole, required: SpaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

/** A space as listed for the current user. */
export const spaceSchema = z.object({
  id: idSchema,
  name: z.string(),
  /** Role of the current user in this space. */
  role: spaceRoleSchema,
  memberCount: z.number().int(),
  createdAt: z.string(),
});
export type Space = z.infer<typeof spaceSchema>;

export const spaceNameSchema = z.string().trim().min(1, 'Nom requis').max(60);

export const createSpaceBodySchema = z.object({ name: spaceNameSchema });
export type CreateSpaceBody = z.infer<typeof createSpaceBodySchema>;

export const updateSpaceBodySchema = z.object({ name: spaceNameSchema });
export type UpdateSpaceBody = z.infer<typeof updateSpaceBodySchema>;

export const spaceMemberSchema = z.object({
  userId: idSchema,
  email: z.string(),
  name: z.string(),
  role: spaceRoleSchema,
});
export type SpaceMember = z.infer<typeof spaceMemberSchema>;

/** Shares the space with an existing user, found by email. */
export const addMemberBodySchema = z.object({
  email: emailSchema,
  role: spaceRoleSchema,
});
export type AddMemberBody = z.input<typeof addMemberBodySchema>;

export const updateMemberBodySchema = z.object({ role: spaceRoleSchema });
export type UpdateMemberBody = z.infer<typeof updateMemberBodySchema>;
