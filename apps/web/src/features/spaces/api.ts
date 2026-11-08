import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { AddMemberBody, CreateSpaceBody, Space, SpaceMember, SpaceRole, UpdateSpaceBody } from '@bank/shared';
import { api } from '../../lib/api';

export const spacesKeys = {
  all: ['spaces'] as const,
  members: (spaceId: string) => ['spaces', spaceId, 'members'] as const,
};

export function useSpaces(): UseQueryResult<Space[]> {
  return useQuery({ queryKey: spacesKeys.all, queryFn: () => api.get<Space[]>('/spaces') });
}

export function useCreateSpace(): UseMutationResult<Space, Error, CreateSpaceBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSpaceBody) => api.post<Space>('/spaces', body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spacesKeys.all }),
  });
}

export function useRenameSpace(spaceId: string): UseMutationResult<Space, Error, UpdateSpaceBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSpaceBody) => api.patch<Space>(`/spaces/${spaceId}`, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spacesKeys.all }),
  });
}

export function useDeleteSpace(spaceId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(`/spaces/${spaceId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spacesKeys.all }),
  });
}

export function useLeaveSpace(spaceId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>(`/spaces/${spaceId}/leave`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spacesKeys.all }),
  });
}

export function useMembers(spaceId: string): UseQueryResult<SpaceMember[]> {
  return useQuery({ queryKey: spacesKeys.members(spaceId), queryFn: () => api.get<SpaceMember[]>(`/spaces/${spaceId}/members`) });
}

export function useAddMember(spaceId: string): UseMutationResult<SpaceMember[], Error, AddMemberBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AddMemberBody) => api.post<SpaceMember[]>(`/spaces/${spaceId}/members`, body),
    onSuccess: (members: SpaceMember[]) => queryClient.setQueryData(spacesKeys.members(spaceId), members),
  });
}

export function useUpdateMemberRole(spaceId: string): UseMutationResult<SpaceMember[], Error, { userId: string; role: SpaceRole }> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) => api.patch<SpaceMember[]>(`/spaces/${spaceId}/members/${userId}`, { role }),
    onSuccess: (members: SpaceMember[]) => queryClient.setQueryData(spacesKeys.members(spaceId), members),
  });
}

export function useRemoveMember(spaceId: string): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.delete(`/spaces/${spaceId}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: spacesKeys.members(spaceId) }),
  });
}

export const ROLE_LABELS: Record<SpaceRole, string> = {
  owner: 'Propriétaire',
  editor: 'Gestion',
  viewer: 'Lecture seule',
};
