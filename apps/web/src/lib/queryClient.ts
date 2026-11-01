import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const AUTH_STATUS_KEY: readonly string[] = ['auth', 'status'];

function onError(error: unknown): void {
  // Session expired: let AuthGate re-check and show the login screen.
  if (error instanceof ApiError && error.status === 401) {
    void queryClient.invalidateQueries({ queryKey: AUTH_STATUS_KEY });
  }
}

export const queryClient: QueryClient = new QueryClient({
  queryCache: new QueryCache({ onError }),
  mutationCache: new MutationCache({ onError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount: number, error: Error) => !(error instanceof ApiError && error.status < 500) && failureCount < 2,
    },
  },
});
