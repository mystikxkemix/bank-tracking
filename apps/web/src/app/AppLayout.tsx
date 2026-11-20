import { DotsHorizontalIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import { Avatar, Badge, Box, Button, Callout, Container, DropdownMenu, Flex, Text, VisuallyHidden } from '@radix-ui/themes';
import { useContext, type CSSProperties } from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router';
import type { CurrentUser, Space } from '@bank/shared';
import { useAuthStatus, useLogout } from '../features/auth/api';
import { useHealth } from '../features/system/api';
import { useSpaces } from '../features/spaces/api';
import { SpaceSwitcher } from '../features/spaces/SpaceSwitcher';
import { useTransactions } from '../features/transactions/api';
import { CurrentSpaceContext, readLastSpaceId, spaceUrl, toCurrentSpace, type CurrentSpace } from '../lib/space';
import { isNavItemActive, SPACE_NAV, type NavItem } from './nav';

/**
 * App chrome (design direction 2): top bar with tabs on desktop, compact header + bottom tab bar on phones.
 * Works with or without a current space.
 */
export function AppLayout() {
  const routeSpace: CurrentSpace | null = useContext(CurrentSpaceContext);
  const spaces: Space[] | undefined = useSpaces().data;
  const { pathname } = useLocation();
  // Pages outside a space (/profile, /admin/users) keep the nav of the last used space, with its role.
  const fallbackSpace: Space | undefined = routeSpace ? undefined : (spaces?.find((space: Space) => space.id === readLastSpaceId()) ?? spaces?.[0]);
  const current: CurrentSpace | null = routeSpace ?? (fallbackSpace ? toCurrentSpace(fallbackSpace) : null);
  const canEdit: boolean = current?.canEdit ?? false;
  const navItems: NavItem[] = SPACE_NAV.filter((item: NavItem) => !item.requiresEdit || canEdit);
  const tabs: NavItem[] = navItems.filter((item: NavItem) => !item.primaryAction);
  const primaryAction: NavItem | undefined = navItems.find((item: NavItem) => item.primaryAction);
  const readOnly: boolean = routeSpace !== null && !routeSpace.canEdit;

  return (
    <Flex direction="column" minHeight="100vh" className="app-shell">
      {/* Desktop top bar */}
      <Box asChild display={{ initial: 'none', md: 'block' }}>
        <header className="topbar">
          <Flex align="center" gap="4" px="5" height="56px">
            <RouterLink to={current ? spaceUrl(current.space.id) : '/'} className="app-logo" aria-label="Tableau de bord">
              €
            </RouterLink>
            {current && (
              <nav aria-label="Navigation principale" className="topnav">
                {tabs.map((item: NavItem) => (
                  <RouterLink
                    key={item.path}
                    to={spaceUrl(current.space.id, item.path)}
                    className="topnav-link"
                    aria-current={isNavItemActive(item, pathname, current.space.id) ? 'page' : undefined}
                  >
                    {item.label}
                    {item.showsUncategorized && canEdit && <UncategorizedBadge current={current} />}
                  </RouterLink>
                ))}
              </nav>
            )}
            <Box flexGrow="1" />
            <SpaceSwitcher currentSpaceId={current?.space.id ?? null} />
            {current && primaryAction && (
              <Button asChild variant="surface">
                <RouterLink to={spaceUrl(current.space.id, primaryAction.path)} aria-label={primaryAction.label}>
                  <primaryAction.icon />
                  {/* Icon only on small laptops, so every tab keeps its room. */}
                  <Box as="span" display={{ initial: 'none', lg: 'inline' }}>
                    {primaryAction.label}
                  </Box>
                </RouterLink>
              </Button>
            )}
            <UserMenu />
          </Flex>
        </header>
      </Box>

      {/* Mobile header */}
      <Box asChild display={{ initial: 'block', md: 'none' }}>
        <header className="topbar">
          <Flex align="center" gap="2" px="4" py="2" minHeight="52px">
            <Box minWidth="0" flexShrink="1">
              <SpaceSwitcher currentSpaceId={current?.space.id ?? null} variant="pill" />
            </Box>
            {readOnly && (
              <Badge color="amber" radius="full" size="2" style={{ flexShrink: 0 }}>
                <EyeOpenIcon aria-hidden="true" /> Lecture seule
              </Badge>
            )}
            <Box flexGrow="1" />
            <UserMenu />
          </Flex>
        </header>
      </Box>

      <Container size="4" px={{ initial: '4', md: '6' }} pt={{ initial: '4', md: '6' }} className="app-main">
        {readOnly && (
          <Box display={{ initial: 'none', md: 'block' }} mb="4">
            <Callout.Root color="gray" size="1">
              <Callout.Icon>
                <EyeOpenIcon />
              </Callout.Icon>
              <Callout.Text>Tu consultes cet espace en lecture seule.</Callout.Text>
            </Callout.Root>
          </Box>
        )}
        <Outlet />
      </Container>

      {current && <MobileTabBar current={current} items={navItems} pathname={pathname} />}
    </Flex>
  );
}

/** Bottom bar on phones: the most used pages, the rest (objectives, import, settings) in "Plus". */
function MobileTabBar({ current, items, pathname }: { current: CurrentSpace; items: NavItem[]; pathname: string }) {
  const navigate = useNavigate();
  const spaceId: string = current.space.id;
  const tabs: NavItem[] = items.filter((item: NavItem) => item.mobileTab);
  const more: NavItem[] = items.filter((item: NavItem) => !item.mobileTab);
  const moreActive: boolean = more.some((item: NavItem) => isNavItemActive(item, pathname, spaceId));
  const style: CSSProperties = { ['--tab-count' as string]: String(tabs.length + (more.length > 0 ? 1 : 0)) };

  return (
    <Box asChild display={{ initial: 'block', md: 'none' }}>
      <nav aria-label="Navigation principale" className="tabbar">
        <div className="tabbar-grid" style={style}>
          {tabs.map((item: NavItem) => (
            <RouterLink
              key={item.path}
              to={spaceUrl(spaceId, item.path)}
              className="tabbar-item"
              aria-current={isNavItemActive(item, pathname, spaceId) ? 'page' : undefined}
            >
              <item.icon />
              <span className="tabbar-label">{item.shortLabel ?? item.label}</span>
              {item.showsUncategorized && current.canEdit && (
                <span className="tabbar-count">
                  <UncategorizedBadge current={current} />
                </span>
              )}
            </RouterLink>
          ))}
          {more.length > 0 && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button type="button" className="tabbar-item" data-active={moreActive ? '' : undefined}>
                  <DotsHorizontalIcon />
                  <span className="tabbar-label">Plus</span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content side="top" align="end">
                {more.map((item: NavItem) => (
                  <DropdownMenu.Item key={item.path} onSelect={() => navigate(spaceUrl(spaceId, item.path))}>
                    <item.icon /> {item.label}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </div>
      </nav>
    </Box>
  );
}

/**
 * Number of transactions waiting for a category. Same query as the dashboard callout (shared cache).
 * Provides the space itself because the shell also renders on /profile, outside SpaceRoute.
 */
function UncategorizedBadge({ current }: { current: CurrentSpace }) {
  return (
    <CurrentSpaceContext.Provider value={current}>
      <UncategorizedCount />
    </CurrentSpaceContext.Provider>
  );
}

function UncategorizedCount() {
  const count: number = useTransactions({ categoryId: 'none', pageSize: 1 }).data?.total ?? 0;
  if (count === 0) {
    return null;
  }
  return (
    <Badge color="amber" size="1" radius="full" className="tabular">
      {count}
      <VisuallyHidden> à catégoriser</VisuallyHidden>
    </Badge>
  );
}

function UserMenu() {
  const user: CurrentUser | null | undefined = useAuthStatus().data?.user;
  const logout = useLogout();
  const navigate = useNavigate();
  const version: string | undefined = useHealth().data?.version;
  if (!user) {
    return null;
  }
  const initial: string = user.name.slice(0, 1).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button type="button" className="avatar-button" aria-label={`Menu utilisateur (${user.name})`}>
          <Avatar size="2" radius="full" fallback={initial} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <Box px="3" py="2" maxWidth="260px">
          <Text as="div" size="2" weight="medium" truncate>
            {user.name}
          </Text>
          <Text as="div" size="1" color="gray" truncate>
            {user.email}
          </Text>
        </Box>
        <DropdownMenu.Separator />
        <DropdownMenu.Item onSelect={() => navigate('/profile')}>Mon profil</DropdownMenu.Item>
        {user.isAdmin && <DropdownMenu.Item onSelect={() => navigate('/admin/users')}>Utilisateurs</DropdownMenu.Item>}
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onSelect={() => logout.mutate()}>
          Se déconnecter
        </DropdownMenu.Item>
        {version && (
          <Box px="3" pt="2" pb="1">
            <Text as="div" size="1" color="gray" className="tabular">
              Version {version}
            </Text>
          </Box>
        )}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
