import { apiErrorSchema } from '@bank/shared';

/** Thrown by every failing call. `message` is already user-facing French text from the API. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
type QueryValue = string | number | boolean | null | undefined;

/** Builds "?a=1&b=2", skipping empty values. */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search: URLSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const text: string = search.toString();
  return text ? `?${text}` : '';
}

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const response: Response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    if (parsed.success) {
      throw new ApiError(response.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.details);
    }
    throw new ApiError(response.status, 'http_error', `Erreur ${response.status}`);
  }
  return data as T;
}

/** Thin typed client. Paths are relative to /api, e.g. api.get<Account[]>('/accounts'). */
export const api = {
  get: <T>(path: string): Promise<T> => request<T>('GET', path),
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body: unknown): Promise<T> => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown): Promise<T> => request<T>('PUT', path, body),
  /** Most deletes answer 204 (void); a few return the updated parent (e.g. goal after removing a contribution). */
  delete: <T = void>(path: string): Promise<T> => request<T>('DELETE', path),
};
