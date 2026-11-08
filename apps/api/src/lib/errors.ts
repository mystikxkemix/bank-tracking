import type { NextFunction, Request, Response } from 'express';
import { MongoServerError } from 'mongodb';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@bank/shared';

/** Throw this from services/routes; the error middleware turns it into { error: { code, message } }. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (code: string, message: string, details?: unknown): HttpError => new HttpError(400, code, message, details);
export const unauthorized = (message: string = 'Authentification requise'): HttpError => new HttpError(401, 'unauthorized', message);
export const forbidden = (message: string = 'Action non autorisée'): HttpError => new HttpError(403, 'forbidden', message);
export const notFound = (what: string): HttpError => new HttpError(404, 'not_found', `${what} introuvable`);
export const conflict = (code: string, message: string): HttpError => new HttpError(409, code, message);
export const tooManyRequests = (message: string): HttpError => new HttpError(429, 'too_many_requests', message);

function send(res: Response, status: number, body: ApiErrorBody): void {
  res.status(status).json(body);
}

/** Last middleware of the app. Express 5 forwards rejected promises here automatically. */
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof HttpError) {
    send(res, error.status, { error: { code: error.code, message: error.message, details: error.details } });
    return;
  }
  if (error instanceof ZodError) {
    const details: { path: string; message: string }[] = error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    send(res, 400, { error: { code: 'validation_error', message: details[0]?.message ?? 'Requête invalide', details } });
    return;
  }
  if (error instanceof MongoServerError && error.code === 11000) {
    send(res, 409, { error: { code: 'duplicate', message: 'Cet élément existe déjà' } });
    return;
  }
  if (error instanceof SyntaxError && 'body' in error) {
    send(res, 400, { error: { code: 'invalid_json', message: 'JSON invalide' } });
    return;
  }
  console.error(error);
  send(res, 500, { error: { code: 'internal_error', message: 'Erreur interne' } });
}
