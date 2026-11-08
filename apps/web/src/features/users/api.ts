import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { CreateUserBody, ResetPasswordBody, UpdateUserBody, User } from '@bank/shared';
import { api } from '../../lib/api';

/** Admin only (the API answers 403 otherwise). Not space scoped. */
export const usersKeys = {
  all: ['users'] as const,
};

export function useUsers(): UseQueryResult<User[]> {
  return useQuery({ queryKey: usersKeys.all, queryFn: () => api.get<User[]>('/users') });
}

function useUsersMutation<TVariables, TResult>(request: (variables: TVariables) => Promise<TResult>): UseMutationResult<TResult, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: () => queryClient.invalidateQueries({ queryKey: usersKeys.all }) });
}

export function useCreateUser(): UseMutationResult<User, Error, CreateUserBody> {
  return useUsersMutation((body: CreateUserBody) => api.post<User>('/users', body));
}

export function useUpdateUser(): UseMutationResult<User, Error, { id: string; body: UpdateUserBody }> {
  return useUsersMutation(({ id, body }: { id: string; body: UpdateUserBody }) => api.patch<User>(`/users/${id}`, body));
}

export function useResetUserPassword(): UseMutationResult<void, Error, { id: string; body: ResetPasswordBody }> {
  return useUsersMutation(({ id, body }: { id: string; body: ResetPasswordBody }) => api.post<void>(`/users/${id}/password`, body));
}

export function useDeleteUser(): UseMutationResult<void, Error, string> {
  return useUsersMutation((id: string) => api.delete(`/users/${id}`));
}
