import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { Budget, PutBudgetBody } from '@bank/shared';
import { api } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';
import { statsKeys } from '../dashboard/api';

export const budgetsKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'budgets'] as const,
};

/** Limits only. Spent amounts of a month come from useMonthSummary(month).budgets. */
export function useBudgets(): UseQueryResult<Budget[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: budgetsKeys.all(spaceId), queryFn: () => api.get<Budget[]>(spaceApiPath(spaceId, '/budgets')) });
}

function useInvalidateBudgets(): () => Promise<void> {
  const spaceId: string = useCurrentSpace().space.id;
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: budgetsKeys.all(spaceId) });
    await queryClient.invalidateQueries({ queryKey: statsKeys.all(spaceId) });
  };
}

export function usePutBudget(): UseMutationResult<Budget, Error, { categoryId: string; body: PutBudgetBody }> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateBudgets();
  return useMutation({ mutationFn: ({ categoryId, body }) => api.put<Budget>(spaceApiPath(spaceId, `/budgets/${categoryId}`), body), onSuccess: invalidate });
}

export function useDeleteBudget(): UseMutationResult<void, Error, string> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateBudgets();
  return useMutation({ mutationFn: (categoryId: string) => api.delete(spaceApiPath(spaceId, `/budgets/${categoryId}`)), onSuccess: invalidate });
}
