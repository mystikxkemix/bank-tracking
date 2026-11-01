import { BarChartIcon, DashboardIcon, GearIcon, Half2Icon, ListBulletIcon, TargetIcon, UploadIcon } from '@radix-ui/react-icons';
import type { ComponentType } from 'react';

export interface NavItem {
  /** Path relative to /s/:spaceId ('' = dashboard). */
  path: string;
  label: string;
  icon: ComponentType;
  /** Hidden for viewers (pages that only make sense when you can write). */
  requiresEdit?: boolean;
}

/** Space navigation, in display order. Add an entry here when a feature gets its own page. */
export const SPACE_NAV: NavItem[] = [
  { path: '', label: 'Tableau de bord', icon: DashboardIcon },
  { path: '/transactions', label: 'Transactions', icon: ListBulletIcon },
  { path: '/budgets', label: 'Budgets', icon: BarChartIcon },
  { path: '/goals', label: 'Objectifs', icon: TargetIcon },
  { path: '/split', label: 'Répartition du foyer', icon: Half2Icon },
  { path: '/import', label: 'Importer', icon: UploadIcon, requiresEdit: true },
  { path: '/settings', label: 'Réglages', icon: GearIcon },
];
