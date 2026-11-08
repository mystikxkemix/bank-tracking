import { Flex, Spinner } from '@radix-ui/themes';
import { useEffect, useMemo } from 'react';
import { Navigate, Outlet, useParams } from 'react-router';
import type { Space } from '@bank/shared';
import { ErrorCallout } from '../../components/ErrorCallout';
import { CurrentSpaceContext, readLastSpaceId, spaceUrl, toCurrentSpace, writeLastSpaceId, type CurrentSpace } from '../../lib/space';
import { useSpaces } from './api';

/** Wraps every /s/:spaceId/* route: checks membership and provides useCurrentSpace(). */
export function SpaceRoute() {
  const { spaceId } = useParams();
  const spaces = useSpaces();
  const space: Space | undefined = spaces.data?.find((item: Space) => item.id === spaceId);
  const current: CurrentSpace | null = useMemo(() => (space ? toCurrentSpace(space) : null), [space]);

  useEffect(() => {
    if (space) {
      writeLastSpaceId(space.id);
    }
  }, [space]);

  if (spaces.isPending) {
    return (
      <Flex p="9" justify="center">
        <Spinner size="3" />
      </Flex>
    );
  }
  if (spaces.isError) {
    return <ErrorCallout error={spaces.error} />;
  }
  if (!current) {
    // Unknown or revoked space: go back to a valid one.
    return <Navigate to="/" replace />;
  }
  return (
    <CurrentSpaceContext.Provider value={current}>
      <Outlet />
    </CurrentSpaceContext.Provider>
  );
}

/** "/" -> last used space, else the first one. */
export function RedirectToDefaultSpace() {
  const spaces = useSpaces();
  if (spaces.isPending) {
    return null;
  }
  const list: Space[] = spaces.data ?? [];
  const lastId: string | null = readLastSpaceId();
  const target: Space | undefined = list.find((item: Space) => item.id === lastId) ?? list[0];
  return target ? <Navigate to={spaceUrl(target.id)} replace /> : <ErrorCallout error={new Error('Aucun espace disponible')} />;
}
