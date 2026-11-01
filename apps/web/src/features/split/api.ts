import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { SplitHistoryItem, SplitMonth, SplitPlanBody } from '@bank/shared';
import { api } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';

export const splitKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'split'] as const,
  history: (spaceId: string) => ['spaces', spaceId, 'split', 'history'] as const,
  month: (spaceId: string, month: string) => ['spaces', spaceId, 'split', 'month', month] as const,
};

/** Saved plan of the month, or a draft copied from the latest previous saved month (`saved: false`). */
export function useSplitMonth(month: string): UseQueryResult<SplitMonth> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: splitKeys.month(spaceId, month), queryFn: () => api.get<SplitMonth>(spaceApiPath(spaceId, `/split/months/${month}`)) });
}

export function useSplitHistory(): UseQueryResult<SplitHistoryItem[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: splitKeys.history(spaceId), queryFn: () => api.get<SplitHistoryItem[]>(spaceApiPath(spaceId, '/split/months')) });
}

export function useSaveSplitMonth(month: string): UseMutationResult<SplitMonth, Error, SplitPlanBody> {
  const spaceId: string = useCurrentSpace().space.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SplitPlanBody) => api.put<SplitMonth>(spaceApiPath(spaceId, `/split/months/${month}`), body),
    onSuccess: async (saved: SplitMonth) => {
      queryClient.setQueryData(splitKeys.month(spaceId, month), saved);
      // Later unsaved months are drafts copied from this one: refresh them too.
      await queryClient.invalidateQueries({ queryKey: splitKeys.all(spaceId) });
    },
  });
}

export function useDeleteSplitMonth(month: string): UseMutationResult<void, Error, void> {
  const spaceId: string = useCurrentSpace().space.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete(spaceApiPath(spaceId, `/split/months/${month}`)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: splitKeys.all(spaceId) }),
  });
}
