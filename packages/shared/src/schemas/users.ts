import { z } from 'zod';
import { idSchema } from './common';
import { emailSchema, passwordSchema, personNameSchema } from './auth';

/** Admin-only user management. There is no self sign-up: the admin creates every login. */
export const userSchema = z.object({
  id: idSchema,
  email: z.string(),
  name: z.string(),
  isAdmin: z.boolean(),
  createdAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const createUserBodySchema = z.object({
  email: emailSchema,
  name: personNameSchema,
  /** Initial password, communicated by the admin to the person. */
  password: passwordSchema,
  isAdmin: z.boolean().default(false),
});
export type CreateUserBody = z.input<typeof createUserBodySchema>;

export const updateUserBodySchema = z.object({
  name: personNameSchema.optional(),
  isAdmin: z.boolean().optional(),
});
export type UpdateUserBody = z.infer<typeof updateUserBodySchema>;

export const resetPasswordBodySchema = z.object({ password: passwordSchema });
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
