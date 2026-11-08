import { useQueryClient } from '@tanstack/react-query';
import { useCurrentSpace } from './space';

/**
 * Invalidates every query of the current space. Use after mutations that ripple through several features
 * (imports, transaction edits, category changes all change stats, budgets and lists).
 */
export function useInvalidateSpace(): () => Promise<void> {
  const queryClient = useQueryClient();
  const spaceId: string = useCurrentSpace().space.id;
  return () => queryClient.invalidateQueries({ queryKey: ['spaces', spaceId] });
}
