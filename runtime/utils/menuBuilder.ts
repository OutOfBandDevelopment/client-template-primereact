/**
 * Menu Builder Utilities
 *
 * Build navigation menus from generated entity metadata.
 * Supports role-based filtering and hierarchical structures.
 */

import { getEntityRoutes, getNavigationConfig } from './navigation';

// =============================================================================
// TYPES
// =============================================================================

export interface MenuItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon class (PrimeIcons format: 'pi pi-home') */
  icon?: string;
  /** Navigation path */
  path?: string;
  /** Child menu items */
  children?: MenuItem[];
  /** Required roles to view this item */
  requiredRoles?: string[];
  /** Badge text (e.g., "New", count) */
  badge?: string;
  /** Badge severity */
  badgeSeverity?: 'success' | 'info' | 'warning' | 'danger';
  /** Whether item is disabled */
  disabled?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Sort order (lower = first) */
  order?: number;
  /** Group/category for organization */
  group?: string;
  /** Entity name for generated items */
  entityName?: string;
  /** Original entity label */
  entityLabel?: string;
}

export interface MenuGroup {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  items: MenuItem[];
}

export interface EntityMenuConfig {
  /** Entity name (e.g., 'QueryProductModel') */
  entityName: string;
  /** Display label */
  label: string;
  /** Menu icon */
  icon?: string;
  /** Required roles */
  requiredRoles?: string[];
  /** Group to place in */
  group?: string;
  /** Sort order */
  order?: number;
  /** Whether to show in menu */
  showInMenu?: boolean;
}

// =============================================================================
// MENU BUILDING
// =============================================================================

/**
 * Build a menu item from entity configuration
 */
export function buildEntityMenuItem(config: EntityMenuConfig): MenuItem {
  const routes = getEntityRoutes(config.entityName);

  return {
    id: `menu-${config.entityName}`,
    label: config.label,
    icon: config.icon || 'pi pi-list',
    path: routes.list,
    requiredRoles: config.requiredRoles,
    group: config.group,
    order: config.order,
    entityName: config.entityName,
    entityLabel: config.label,
  };
}

/**
 * Build menu items from an array of entity configs
 */
export function buildEntityMenuItems(configs: EntityMenuConfig[]): MenuItem[] {
  return configs
    .filter(c => c.showInMenu !== false)
    .map(buildEntityMenuItem)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Group menu items by their group property
 */
export function groupMenuItems(items: MenuItem[]): MenuGroup[] {
  const groups = new Map<string, MenuItem[]>();
  const ungrouped: MenuItem[] = [];

  for (const item of items) {
    if (item.group) {
      const existing = groups.get(item.group) || [];
      existing.push(item);
      groups.set(item.group, existing);
    } else {
      ungrouped.push(item);
    }
  }

  const result: MenuGroup[] = [];

  // Add grouped items
  groups.forEach((groupItems, groupId) => {
    result.push({
      id: `group-${groupId}`,
      label: groupId,
      items: groupItems.sort((a, b) => (a.order || 0) - (b.order || 0)),
    });
  });

  // Add ungrouped items as their own group
  if (ungrouped.length > 0) {
    result.unshift({
      id: 'group-ungrouped',
      label: 'Menu',
      items: ungrouped.sort((a, b) => (a.order || 0) - (b.order || 0)),
    });
  }

  return result;
}

// =============================================================================
// ROLE-BASED FILTERING
// =============================================================================

/**
 * Filter menu items based on user role
 */
export function filterMenuByRole(
  items: MenuItem[],
  userRole: string | null
): MenuItem[] {
  if (!userRole) return [];

  return items
    .filter(item => {
      // No required roles = everyone can see
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return true;
      }
      // Check if user has any required role
      return item.requiredRoles.includes(userRole);
    })
    .map(item => {
      // Recursively filter children
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: filterMenuByRole(item.children, userRole),
        };
      }
      return item;
    })
    // Remove parents with no visible children
    .filter(item => {
      if (item.children && item.children.length === 0 && !item.path) {
        return false;
      }
      return true;
    });
}

/**
 * Filter menu groups based on user role
 */
export function filterMenuGroupsByRole(
  groups: MenuGroup[],
  userRole: string | null
): MenuGroup[] {
  return groups
    .map(group => ({
      ...group,
      items: filterMenuByRole(group.items, userRole),
    }))
    .filter(group => group.items.length > 0);
}

// =============================================================================
// MENU SEARCH
// =============================================================================

/**
 * Search menu items by label
 */
export function searchMenuItems(
  items: MenuItem[],
  searchTerm: string
): MenuItem[] {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return items;

  const results: MenuItem[] = [];

  for (const item of items) {
    // Check current item
    if (item.label.toLowerCase().includes(term)) {
      results.push(item);
      continue;
    }

    // Check children
    if (item.children && item.children.length > 0) {
      const matchingChildren = searchMenuItems(item.children, term);
      if (matchingChildren.length > 0) {
        results.push({
          ...item,
          children: matchingChildren,
        });
      }
    }
  }

  return results;
}

// =============================================================================
// ACTIVE STATE
// =============================================================================

/**
 * Find the active menu item based on current path
 */
export function findActiveMenuItem(
  items: MenuItem[],
  currentPath: string
): MenuItem | null {
  for (const item of items) {
    if (item.path === currentPath) {
      return item;
    }

    if (item.children && item.children.length > 0) {
      const childMatch = findActiveMenuItem(item.children, currentPath);
      if (childMatch) return childMatch;
    }
  }

  return null;
}

/**
 * Get the path of active item IDs (for tree expansion)
 */
export function getActiveMenuPath(
  items: MenuItem[],
  currentPath: string,
  parentIds: string[] = []
): string[] | null {
  for (const item of items) {
    if (item.path === currentPath) {
      return [...parentIds, item.id];
    }

    if (item.children && item.children.length > 0) {
      const childPath = getActiveMenuPath(
        item.children,
        currentPath,
        [...parentIds, item.id]
      );
      if (childPath) return childPath;
    }
  }

  return null;
}

// =============================================================================
// PRIMEREACT MENU MODEL CONVERSION
// =============================================================================

export interface PrimeMenuItem {
  label?: string;
  icon?: string;
  command?: () => void;
  url?: string;
  items?: PrimeMenuItem[];
  separator?: boolean;
  disabled?: boolean;
  visible?: boolean;
  className?: string;
  badge?: string;
  badgeClassName?: string;
}

/**
 * Convert menu items to PrimeReact menu model format
 */
export function toPrimeMenuModel(
  items: MenuItem[],
  navigate?: (path: string) => void
): PrimeMenuItem[] {
  return items.map(item => {
    const primeItem: PrimeMenuItem = {
      label: item.label,
      icon: item.icon,
      disabled: item.disabled,
      className: item.className,
      badge: item.badge,
    };

    if (item.path) {
      if (navigate) {
        primeItem.command = () => navigate(item.path!);
      } else {
        primeItem.url = item.path;
      }
    }

    if (item.children && item.children.length > 0) {
      primeItem.items = toPrimeMenuModel(item.children, navigate);
    }

    return primeItem;
  });
}

// =============================================================================
// QUICK ACCESS FAVORITES
// =============================================================================

const FAVORITES_KEY = 'menu-favorites';

/**
 * Get favorited menu item IDs from localStorage
 */
export function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a menu item to favorites
 */
export function addFavorite(itemId: string): void {
  const favorites = getFavorites();
  if (!favorites.includes(itemId)) {
    favorites.push(itemId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
}

/**
 * Remove a menu item from favorites
 */
export function removeFavorite(itemId: string): void {
  const favorites = getFavorites().filter(id => id !== itemId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/**
 * Toggle favorite status
 */
export function toggleFavorite(itemId: string): boolean {
  const favorites = getFavorites();
  if (favorites.includes(itemId)) {
    removeFavorite(itemId);
    return false;
  } else {
    addFavorite(itemId);
    return true;
  }
}

/**
 * Get favorite menu items
 */
export function getFavoriteItems(items: MenuItem[]): MenuItem[] {
  const favoriteIds = getFavorites();

  const findItems = (menuItems: MenuItem[]): MenuItem[] => {
    const results: MenuItem[] = [];

    for (const item of menuItems) {
      if (favoriteIds.includes(item.id)) {
        results.push(item);
      }
      if (item.children) {
        results.push(...findItems(item.children));
      }
    }

    return results;
  };

  return findItems(items);
}

export default {
  buildEntityMenuItem,
  buildEntityMenuItems,
  groupMenuItems,
  filterMenuByRole,
  filterMenuGroupsByRole,
  searchMenuItems,
  findActiveMenuItem,
  getActiveMenuPath,
  toPrimeMenuModel,
  getFavorites,
  addFavorite,
  removeFavorite,
  toggleFavorite,
  getFavoriteItems,
};
