import { createContext, useContext } from 'react';
import { hasRole, type Space } from '@bank/shared';

export interface CurrentSpace {
  space: Space;
  /** editor or owner: show create / edit / delete controls. Viewers get a read-only UI. */
  canEdit: boolean;
  isOwner: boolean;
}

export const CurrentSpaceContext = createContext<CurrentSpace | null>(null);

/** Current space of a /s/:spaceId/* page. Only usable under SpaceRoute. */
export function useCurrentSpace(): CurrentSpace {
  const value: CurrentSpace | null = useContext(CurrentSpaceContext);
  if (!value) {
    throw new Error('useCurrentSpace() must be used under <SpaceRoute>');
  }
  return value;
}

export function toCurrentSpace(space: Space): CurrentSpace {
  return { space, canEdit: hasRole(space.role, 'editor'), isOwner: space.role === 'owner' };
}

/** API path of a space-scoped resource: spaceApiPath(id, '/accounts') -> '/spaces/<id>/accounts'. */
export function spaceApiPath(spaceId: string, path: string): string {
  return `/spaces/${spaceId}${path}`;
}

/** App URL of a space page: spaceUrl(id, '/transactions') -> '/s/<id>/transactions'. */
export function spaceUrl(spaceId: string, path: string = ''): string {
  return `/s/${spaceId}${path}`;
}

const LAST_SPACE_KEY: string = 'bt:lastSpaceId';

export function readLastSpaceId(): string | null {
  try {
    return localStorage.getItem(LAST_SPACE_KEY);
  } catch {
    return null;
  }
}

export function writeLastSpaceId(spaceId: string): void {
  try {
    localStorage.setItem(LAST_SPACE_KEY, spaceId);
  } catch {
    // Private mode: not remembering the last space is fine.
  }
}
