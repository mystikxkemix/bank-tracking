import { BarChartIcon, DashboardIcon, GearIcon, Half2Icon, ListBulletIcon, TargetIcon, UploadIcon } from '@radix-ui/react-icons';
import type { ComponentType } from 'react';

export interface NavItem {
  /** Path relative to /s/:spaceId ('' = dashboard). */
  path: string;
  label: string;
  /** Label of the mobile bottom bar, where room is tight. Defaults to `label`. */
  shortLabel?: string;
  icon: ComponentType;
  /** Hidden for viewers (pages that only make sense when you can write). */
  requiresEdit?: boolean;
  /** Desktop: the primary button on the right of the top bar instead of a tab. */
  primaryAction?: boolean;
  /** Mobile: own tab in the bottom bar. The other items go in the "Plus" menu. */
  mobileTab?: boolean;
  /** Other pages that belong to this tab (the review queue is part of Transactions). */
  alsoActiveOn?: string[];
  /** Shows the number of transactions waiting for a category (editors only). */
  showsUncategorized?: boolean;
}

/** Space navigation, in display order. Add an entry here when a feature gets its own page. */
export const SPACE_NAV: NavItem[] = [
  { path: '', label: 'Tableau de bord', shortLabel: 'Accueil', icon: DashboardIcon, mobileTab: true },
  { path: '/transactions', label: 'Transactions', icon: ListBulletIcon, mobileTab: true, alsoActiveOn: ['/review'], showsUncategorized: true },
  { path: '/budgets', label: 'Budgets', icon: BarChartIcon, mobileTab: true },
  { path: '/split', label: 'Répartition', icon: Half2Icon, mobileTab: true },
  { path: '/goals', label: 'Objectifs', icon: TargetIcon },
  { path: '/import', label: 'Importer', icon: UploadIcon, requiresEdit: true, primaryAction: true },
  { path: '/settings', label: 'Réglages', icon: GearIcon },
];

/** True when `pathname` is the page of `item` (or one of the pages that belong to it) in space `spaceId`. */
export function isNavItemActive(item: NavItem, pathname: string, spaceId: string): boolean {
  const base: string = `/s/${spaceId}`;
  const paths: string[] = [item.path, ...(item.alsoActiveOn ?? [])];
  for (const path of paths) {
    const target: string = `${base}${path}`;
    if (path === '' ? pathname === base || pathname === `${base}/` : pathname === target || pathname.startsWith(`${target}/`)) {
      return true;
    }
  }
  return false;
}
