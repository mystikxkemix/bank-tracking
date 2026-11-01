import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { AuthStatus, ChangePasswordBody, LoginBody, SetupBody } from '@bank/shared';
import { api } from '../../lib/api';
import { AUTH_STATUS_KEY } from '../../lib/queryClient';

export function useAuthStatus(): UseQueryResult<AuthStatus> {
  return useQuery({ queryKey: AUTH_STATUS_KEY, queryFn: () => api.get<AuthStatus>('/auth/status'), staleTime: Infinity });
}

/** After login / setup / logout every cached query belongs to the previous user: drop them all. */
function useResetAfterAuthChange(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== AUTH_STATUS_KEY[0] });
    await queryClient.invalidateQueries({ queryKey: AUTH_STATUS_KEY });
  };
}

export function useLogin(): UseMutationResult<void, Error, LoginBody> {
  const reset = useResetAfterAuthChange();
  return useMutation({ mutationFn: (body: LoginBody) => api.post<void>('/auth/login', body), onSuccess: reset });
}

export function useSetup(): UseMutationResult<void, Error, SetupBody> {
  const reset = useResetAfterAuthChange();
  return useMutation({ mutationFn: (body: SetupBody) => api.post<void>('/auth/setup', body), onSuccess: reset });
}

export function useLogout(): UseMutationResult<void, Error, void> {
  const reset = useResetAfterAuthChange();
  return useMutation({ mutationFn: () => api.post<void>('/auth/logout'), onSuccess: reset });
}

export function useChangePassword(): UseMutationResult<void, Error, ChangePasswordBody> {
  return useMutation({ mutationFn: (body: ChangePasswordBody) => api.post<void>('/auth/password', body) });
}
