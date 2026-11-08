import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { ApplyRulesBody, ApplyRulesResult, Category, CreateCategoryBody, CreateRuleBody, Rule, UpdateCategoryBody, UpdateRuleBody } from '@bank/shared';
import { api } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';
import { useInvalidateSpace } from '../../lib/useInvalidateSpace';

export const categoriesKeys = {
  categories: (spaceId: string) => ['spaces', spaceId, 'categories'] as const,
  rules: (spaceId: string) => ['spaces', spaceId, 'rules'] as const,
};

export function useCategories(): UseQueryResult<Category[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: categoriesKeys.categories(spaceId), queryFn: () => api.get<Category[]>(spaceApiPath(spaceId, '/categories')) });
}

/** Map id -> category for badges and lookups in lists. */
export function useCategoriesById(): Map<string, Category> {
  const categories: Category[] | undefined = useCategories().data;
  const byId: Map<string, Category> = new Map();
  for (const category of categories ?? []) {
    byId.set(category.id, category);
  }
  return byId;
}

// Category and rule changes affect transactions, stats and budgets: invalidate the whole space.

export function useCreateCategory(): UseMutationResult<Category, Error, CreateCategoryBody> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (body: CreateCategoryBody) => api.post<Category>(spaceApiPath(spaceId, '/categories'), body), onSuccess: invalidate });
}

export function useUpdateCategory(): UseMutationResult<Category, Error, { id: string; body: UpdateCategoryBody }> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: ({ id, body }) => api.patch<Category>(spaceApiPath(spaceId, `/categories/${id}`), body), onSuccess: invalidate });
}

export function useDeleteCategory(): UseMutationResult<void, Error, string> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (id: string) => api.delete(spaceApiPath(spaceId, `/categories/${id}`)), onSuccess: invalidate });
}

export function useRules(): UseQueryResult<Rule[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: categoriesKeys.rules(spaceId), queryFn: () => api.get<Rule[]>(spaceApiPath(spaceId, '/rules')) });
}

export function useCreateRule(): UseMutationResult<Rule, Error, CreateRuleBody> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (body: CreateRuleBody) => api.post<Rule>(spaceApiPath(spaceId, '/rules'), body), onSuccess: invalidate });
}

export function useUpdateRule(): UseMutationResult<Rule, Error, { id: string; body: UpdateRuleBody }> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: ({ id, body }) => api.patch<Rule>(spaceApiPath(spaceId, `/rules/${id}`), body), onSuccess: invalidate });
}

export function useDeleteRule(): UseMutationResult<void, Error, string> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (id: string) => api.delete(spaceApiPath(spaceId, `/rules/${id}`)), onSuccess: invalidate });
}

export function useApplyRules(): UseMutationResult<ApplyRulesResult, Error, ApplyRulesBody> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (body: ApplyRulesBody) => api.post<ApplyRulesResult>(spaceApiPath(spaceId, '/rules/apply'), body), onSuccess: invalidate });
}

export const CATEGORY_KIND_LABELS: Record<Category['kind'], string> = {
  expense: 'Dépense',
  income: 'Revenu',
  transfer: 'Virement interne',
};
