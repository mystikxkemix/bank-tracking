import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Health } from '@bank/shared';
import { api } from '../../lib/api';

/** Running version of the app. It only changes with a new deploy, so it is fetched once per page load. */
export function useHealth(): UseQueryResult<Health> {
  return useQuery({ queryKey: ['health'], queryFn: () => api.get<Health>('/health'), staleTime: Infinity });
}
