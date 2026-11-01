import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { CreateContributionBody, CreateGoalBody, Goal, UpdateGoalBody } from '@bank/shared';
import { api } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';

export const goalsKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'goals'] as const,
};

export function useGoals(): UseQueryResult<Goal[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: goalsKeys.all(spaceId), queryFn: () => api.get<Goal[]>(spaceApiPath(spaceId, '/goals')) });
}

function useGoalsMutation<TVariables, TResult>(request: (spaceId: string, variables: TVariables) => Promise<TResult>): UseMutationResult<TResult, Error, TVariables> {
  const spaceId: string = useCurrentSpace().space.id;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: TVariables) => request(spaceId, variables),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: goalsKeys.all(spaceId) }),
  });
}

export function useCreateGoal(): UseMutationResult<Goal, Error, CreateGoalBody> {
  return useGoalsMutation((spaceId: string, body: CreateGoalBody) => api.post<Goal>(spaceApiPath(spaceId, '/goals'), body));
}

export function useUpdateGoal(): UseMutationResult<Goal, Error, { id: string; body: UpdateGoalBody }> {
  return useGoalsMutation((spaceId: string, { id, body }: { id: string; body: UpdateGoalBody }) => api.patch<Goal>(spaceApiPath(spaceId, `/goals/${id}`), body));
}

export function useDeleteGoal(): UseMutationResult<void, Error, string> {
  return useGoalsMutation((spaceId: string, id: string) => api.delete(spaceApiPath(spaceId, `/goals/${id}`)));
}

export function useAddContribution(): UseMutationResult<Goal, Error, { goalId: string; body: CreateContributionBody }> {
  return useGoalsMutation((spaceId: string, { goalId, body }: { goalId: string; body: CreateContributionBody }) =>
    api.post<Goal>(spaceApiPath(spaceId, `/goals/${goalId}/contributions`), body),
  );
}

export function useDeleteContribution(): UseMutationResult<Goal, Error, { goalId: string; contributionId: string }> {
  return useGoalsMutation((spaceId: string, { goalId, contributionId }: { goalId: string; contributionId: string }) =>
    api.delete<Goal>(spaceApiPath(spaceId, `/goals/${goalId}/contributions/${contributionId}`)),
  );
}
