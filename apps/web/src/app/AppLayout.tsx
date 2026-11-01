import { EyeOpenIcon, HamburgerMenuIcon } from '@radix-ui/react-icons';
import { Avatar, Box, Callout, Container, DropdownMenu, Flex, IconButton, Separator, Text } from '@radix-ui/themes';
import { useContext } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import type { CurrentUser, Space } from '@bank/shared';
import { useAuthStatus, useLogout } from '../features/auth/api';
import { useSpaces } from '../features/spaces/api';
import { SpaceSwitcher } from '../features/spaces/SpaceSwitcher';
import { CurrentSpaceContext, readLastSpaceId, spaceUrl, toCurrentSpace, type CurrentSpace } from '../lib/space';
import { SPACE_NAV, type NavItem } from './nav';

const SIDEBAR_WIDTH: string = '248px';

/** App chrome: sidebar on desktop, top bar + menu on mobile. Works with or without a current space. */
export function AppLayout() {
  const routeSpace: CurrentSpace | null = useContext(CurrentSpaceContext);
  const spaces: Space[] | undefined = useSpaces().data;
  // Pages outside a space (/profile, /admin/users) keep the nav of the last used space, with its role.
  const fallbackSpace: Space | undefined = routeSpace ? undefined : (spaces?.find((space: Space) => space.id === readLastSpaceId()) ?? spaces?.[0]);
  const current: CurrentSpace | null = routeSpace ?? (fallbackSpace ? toCurrentSpace(fallbackSpace) : null);
  const spaceId: string | null = current?.space.id ?? null;
  const navItems: NavItem[] = SPACE_NAV.filter((item: NavItem) => !item.requiresEdit || (current?.canEdit ?? false));

  return (
    <Flex minHeight="100vh">
      <Box
        display={{ initial: 'none', md: 'block' }}
        width={SIDEBAR_WIDTH}
        p="4"
        style={{ borderRight: '1px solid var(--gray-a5)', position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}
      >
        <Flex direction="column" height="100%" gap="4">
          <Text weight="bold" size="4">
            💶 Mes comptes
          </Text>
          <SpaceSwitcher currentSpaceId={current?.space.id ?? null} />
          <Flex direction="column" gap="1" asChild>
            <nav aria-label="Navigation principale">
              {spaceId &&
                navItems.map((item: NavItem) => (
                  <NavLink key={item.path} to={spaceUrl(spaceId, item.path)} end={item.path === ''} className="nav-link">
                    <item.icon />
                    {item.label}
                  </NavLink>
                ))}
            </nav>
          </Flex>
          <Box flexGrow="1" />
          <Separator size="4" />
          <UserMenu />
        </Flex>
      </Box>

      <Flex direction="column" flexGrow="1" minWidth="0">
        <Flex display={{ initial: 'flex', md: 'none' }} align="center" gap="3" p="3" style={{ borderBottom: '1px solid var(--gray-a5)' }}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton variant="ghost" color="gray" aria-label="Menu">
                <HamburgerMenuIcon />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              {spaceId &&
                navItems.map((item: NavItem) => (
                  <DropdownMenu.Item key={item.path} asChild>
                    <NavLink to={spaceUrl(spaceId, item.path)} end={item.path === ''}>
                      {item.label}
                    </NavLink>
                  </DropdownMenu.Item>
                ))}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <Box flexGrow="1" minWidth="0">
            <SpaceSwitcher currentSpaceId={current?.space.id ?? null} />
          </Box>
          <UserMenu compact />
        </Flex>

        <Container size="4" px={{ initial: '4', md: '6' }} py={{ initial: '4', md: '6' }}>
          {routeSpace && !routeSpace.canEdit && (
            <Callout.Root color="gray" mb="4" size="1">
              <Callout.Icon>
                <EyeOpenIcon />
              </Callout.Icon>
              <Callout.Text>Tu consultes cet espace en lecture seule.</Callout.Text>
            </Callout.Root>
          )}
          <Outlet />
        </Container>
      </Flex>
    </Flex>
  );
}

function UserMenu({ compact = false }: { compact?: boolean }) {
  const user: CurrentUser | null | undefined = useAuthStatus().data?.user;
  const logout = useLogout();
  const navigate = useNavigate();
  if (!user) {
    return null;
  }
  const initial: string = user.name.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Flex align="center" gap="2" style={{ cursor: 'pointer' }} role="button" tabIndex={0} aria-label="Menu utilisateur">
          <Avatar size="2" radius="full" fallback={initial} />
          {!compact && (
            <Box minWidth="0">
              <Text as="div" size="2" weight="medium" truncate>
                {user.name}
              </Text>
              <Text as="div" size="1" color="gray" truncate>
                {user.email}
              </Text>
            </Box>
          )}
        </Flex>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onSelect={() => navigate('/profile')}>Mon profil</DropdownMenu.Item>
        {user.isAdmin && <DropdownMenu.Item onSelect={() => navigate('/admin/users')}>Utilisateurs</DropdownMenu.Item>}
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onSelect={() => logout.mutate()}>
          Se déconnecter
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
