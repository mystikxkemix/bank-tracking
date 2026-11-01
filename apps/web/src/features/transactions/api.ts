import { keepPreviousData, useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { BulkCategorizeBody, Transaction, TransactionPage, TransactionQuery, UpdateTransactionBody } from '@bank/shared';
import { api, toQueryString } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';
import { useInvalidateSpace } from '../../lib/useInvalidateSpace';

export const transactionsKeys = {
  list: (spaceId: string, query: TransactionQuery) => ['spaces', spaceId, 'transactions', query] as const,
};

/** Paginated, filtered list. Keeps the previous page on screen while the next filter loads. */
export function useTransactions(query: TransactionQuery): UseQueryResult<TransactionPage> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({
    queryKey: transactionsKeys.list(spaceId, query),
    queryFn: () => api.get<TransactionPage>(spaceApiPath(spaceId, `/transactions${toQueryString({ ...query })}`)),
    placeholderData: keepPreviousData,
  });
}

// A transaction edit changes stats, budgets and possibly the review queue: invalidate the whole space.

export function useUpdateTransaction(): UseMutationResult<Transaction, Error, { id: string; body: UpdateTransactionBody }> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: ({ id, body }) => api.patch<Transaction>(spaceApiPath(spaceId, `/transactions/${id}`), body), onSuccess: invalidate });
}

export function useBulkCategorize(): UseMutationResult<{ updated: number }, Error, BulkCategorizeBody> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({
    mutationFn: (body: BulkCategorizeBody) => api.post<{ updated: number }>(spaceApiPath(spaceId, '/transactions/bulk-categorize'), body),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction(): UseMutationResult<void, Error, string> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (id: string) => api.delete(spaceApiPath(spaceId, `/transactions/${id}`)), onSuccess: invalidate });
}
