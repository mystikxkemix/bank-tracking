import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import type { CommitImportBody, ImportPreview, ImportPreviewBody, ImportRecord } from '@bank/shared';
import { api } from '../../lib/api';
import { spaceApiPath, useCurrentSpace } from '../../lib/space';
import { useInvalidateSpace } from '../../lib/useInvalidateSpace';

export const importsKeys = {
  all: (spaceId: string) => ['spaces', spaceId, 'imports'] as const,
};

export function useImports(): UseQueryResult<ImportRecord[]> {
  const spaceId: string = useCurrentSpace().space.id;
  return useQuery({ queryKey: importsKeys.all(spaceId), queryFn: () => api.get<ImportRecord[]>(spaceApiPath(spaceId, '/imports')) });
}

/** Parses the file server-side (no write). Call again with `mapping` while the user adjusts a CSV mapping. */
export function useImportPreview(): UseMutationResult<ImportPreview, Error, ImportPreviewBody> {
  const spaceId: string = useCurrentSpace().space.id;
  return useMutation({ mutationFn: (body: ImportPreviewBody) => api.post<ImportPreview>(spaceApiPath(spaceId, '/imports/preview'), body) });
}

export function useCommitImport(): UseMutationResult<ImportRecord, Error, CommitImportBody> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (body: CommitImportBody) => api.post<ImportRecord>(spaceApiPath(spaceId, '/imports'), body), onSuccess: invalidate });
}

/** Undo: deletes the import and all its transactions. */
export function useUndoImport(): UseMutationResult<void, Error, string> {
  const spaceId: string = useCurrentSpace().space.id;
  const invalidate = useInvalidateSpace();
  return useMutation({ mutationFn: (id: string) => api.delete(spaceApiPath(spaceId, `/imports/${id}`)), onSuccess: invalidate });
}

/**
 * Reads a bank export as text. French banks often export Windows-1252: try strict UTF-8 first, fall back.
 * The UTF-8 BOM is stripped by TextDecoder.
 */
export async function readStatementFile(file: File): Promise<string> {
  const buffer: ArrayBuffer = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}
