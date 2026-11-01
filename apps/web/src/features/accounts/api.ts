import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { Account, CreateAccountBody, UpdateAccountBody } from '@bank/shared';
import { api } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';

/**
 * Query keys always start with ['spaces', spaceId, <feature>] so switching space never shows stale data
 * and invalidating ['spaces', spaceId] refreshes everything of a space.
 */
export const accountsKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'accounts'] as const,
};

export function useAccounts(): UseQueryResult<Account[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: accountsKeys.all(spaceId), queryFn: () => api.get<Account[]>(spaceApiPath(spaceId, '/accounts')) });
}

export function useCreateAccount(): UseMutationResult<Account, Error, CreateAccountBody> {
  const spaceId: string = useCurrentSpace().space.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAccountBody) => api.post<Account>(spaceApiPath(spaceId, '/accounts'), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsKeys.all(spaceId) }),
  });
}

export function useUpdateAccount(): UseMutationResult<Account, Error, { id: string; body: UpdateAccountBody }> {
  const spaceId: string = useCurrentSpace().space.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }) => api.patch<Account>(spaceApiPath(spaceId, `/accounts/${id}`), body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsKeys.all(spaceId) }),
  });
}

export function useDeleteAccount(): UseMutationResult<void, Error, string> {
  const spaceId: string = useCurrentSpace().space.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(spaceApiPath(spaceId, `/accounts/${id}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountsKeys.all(spaceId) }),
  });
}

export const ACCOUNT_KIND_LABELS: Record<Account['kind'], string> = {
  checking: 'Compte courant',
  savings: 'Épargne',
  other: 'Autre',
};
