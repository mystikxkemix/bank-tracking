import { ObjectId } from 'mongodb';
import { badRequest } from './errors';

/** Parses a route param into an ObjectId, 400 when malformed. */
export function parseId(raw: unknown): ObjectId {
  if (typeof raw !== 'string' || !/^[a-f\d]{24}$/i.test(raw)) {
    throw badRequest('invalid_id', 'Identifiant invalide');
  }
  return new ObjectId(raw);
}

/** Like parseId but for optional ids coming from a validated DTO (already well-formed). */
export function toObjectId(raw: string): ObjectId;
export function toObjectId(raw: string | null): ObjectId | null;
export function toObjectId(raw: string | null): ObjectId | null {
  return raw === null ? null : new ObjectId(raw);
}

/** Escapes user input for use inside a RegExp (search filters). */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
