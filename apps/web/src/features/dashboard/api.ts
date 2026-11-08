import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { MonthlyStat, MonthSummary } from '@bank/shared';
import { api, toQueryString } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';

export const statsKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'stats'] as const,
  monthly: (spaceId: string, months: number, until: string | undefined) => ['spaces', spaceId, 'stats', 'monthly', months, until ?? null] as const,
  month: (spaceId: string, month: string) => ['spaces', spaceId, 'stats', 'month', month] as const,
};

/** Income / expense / net per month, oldest first, ending at `until` (default: current month). */
export function useMonthlyStats(months: number = 12, until?: string): UseQueryResult<MonthlyStat[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({
    queryKey: statsKeys.monthly(spaceId, months, until),
    queryFn: () => api.get<MonthlyStat[]>(spaceApiPath(spaceId, `/stats/monthly${toQueryString({ months, until })}`)),
  });
}

/** Totals, spending by category, budget status and uncategorized count for one month. */
export function useMonthSummary(month: string): UseQueryResult<MonthSummary> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: statsKeys.month(spaceId, month), queryFn: () => api.get<MonthSummary>(spaceApiPath(spaceId, `/stats/months/${month}`)) });
}
