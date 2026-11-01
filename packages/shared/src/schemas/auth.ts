import { z } from 'zod';
import { idSchema } from './common';

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Email invalide')).pipe(z.string().max(200));
export const passwordSchema = z.string().min(8, '8 caractères minimum').max(200);
export const personNameSchema = z.string().trim().min(1, 'Nom requis').max(80);

/** The logged-in user as seen by the client. */
export const currentUserSchema = z.object({
  id: idSchema,
  email: z.string(),
  name: z.string(),
  isAdmin: z.boolean(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;

export const authStatusSchema = z.object({
  /** false until the first (admin) user has been created. */
  configured: z.boolean(),
  /** null when not logged in. */
  user: currentUserSchema.nullable(),
});
export type AuthStatus = z.infer<typeof authStatusSchema>;

/** First launch only: creates the admin user and logs in. */
export const setupBodySchema = z.object({
  email: emailSchema,
  name: personNameSchema,
  password: passwordSchema,
});
export type SetupBody = z.input<typeof setupBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis').max(200),
});
export type LoginBody = z.input<typeof loginBodySchema>;

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
