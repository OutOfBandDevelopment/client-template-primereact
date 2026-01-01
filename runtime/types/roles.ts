/**
 * Role System for Green Onion Application
 *
 * Defines user roles and permission utilities used for access control.
 * Role names match the backend system and x-permissions in swagger.json.
 */

/**
 * User roles as string literals (matching backend names)
 */
export type UserRole =
  | 'Super Admin'
  | 'District Admin'
  | 'District User'
  | 'Coop Admin'
  | 'Coop User'
  | 'Manufacturer';

/**
 * Role ID to Role Name mapping (matches backend roleId values)
 */
export const ROLE_ID_MAP: Record<number, UserRole> = {
  1: 'Super Admin',
  2: 'Coop Admin',      // CA in routes
  3: 'District Admin',  // DA in routes
  4: 'District User',   // DU in routes
  5: 'Coop User',       // CU in routes
  6: 'Manufacturer',    // MU in routes
};

/**
 * Role Name to Role ID mapping (reverse lookup)
 */
export const ROLE_NAME_TO_ID: Record<UserRole, number> = {
  'Super Admin': 1,
  'Coop Admin': 2,
  'District Admin': 3,
  'District User': 4,
  'Coop User': 5,
  'Manufacturer': 6,
};

/**
 * Get role name from roleId
 */
export function getRoleNameFromId(roleId: number | null | undefined): UserRole | null {
  if (roleId == null) return null;
  return ROLE_ID_MAP[roleId] || null;
}

/**
 * Get roleId from role name
 */
export function getRoleIdFromName(roleName: UserRole | string | null | undefined): number | null {
  if (!roleName) return null;
  return ROLE_NAME_TO_ID[roleName as UserRole] ?? null;
}

/**
 * Role hierarchy levels - higher numbers have more access
 * This allows Super Admin to access everything, District Admin to access
 * District User content, etc.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'Super Admin': 100,
  'Coop Admin': 80,       // Higher than District Admin (manages coops)
  'District Admin': 70,
  'District User': 60,
  'Coop User': 50,
  'Manufacturer': 40,
};

/**
 * Check if a user role has permission based on role hierarchy
 * A higher-level role can access lower-level resources
 *
 * @param userRole - The user's current role
 * @param requiredRole - The role required for access
 * @returns true if user role is equal or higher in hierarchy
 */
export function hasRolePermission(userRole: UserRole | string, requiredRole: UserRole | string): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole as UserRole] ?? 0;

  // Special case: Super Admin can access everything
  if (userRole === 'Super Admin') return true;

  // User's role level must be >= required role level
  return userLevel >= requiredLevel;
}

/**
 * Check if a user role matches any of the allowed roles
 * Uses role hierarchy - a higher role can access lower role content
 *
 * @param userRole - The user's current role
 * @param allowedRoles - Array of roles that have access
 * @returns true if user has access based on any allowed role
 */
export function hasAnyRolePermission(userRole: UserRole | string, allowedRoles: (UserRole | string)[]): boolean {
  if (!allowedRoles || allowedRoles.length === 0) return true;

  // Super Admin always has access
  if (userRole === 'Super Admin') return true;

  // Check if user's role is in the allowed list or has higher permission
  return allowedRoles.some(role => hasRolePermission(userRole, role));
}

/**
 * Get all roles that a given role can access (roles at or below their level)
 *
 * @param userRole - The user's role
 * @returns Array of accessible roles
 */
export function getAccessibleRoles(userRole: UserRole | string): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole as UserRole] ?? 0;

  return (Object.keys(ROLE_HIERARCHY) as UserRole[]).filter(
    role => ROLE_HIERARCHY[role] <= userLevel
  );
}

/**
 * Check if a role is Super Admin
 */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'Super Admin';
}

/**
 * Check if a role is any type of admin (Super Admin, District Admin, or Coop Admin)
 */
export function isAdmin(role: string | null | undefined): boolean {
  return role === 'Super Admin' || role === 'District Admin' || role === 'Coop Admin';
}

/**
 * Permission configuration interface (matches x-permissions in swagger)
 */
export interface PermissionConfig {
  /** Allow anonymous/unauthenticated access */
  anonymous?: boolean;
  /** Roles that have access */
  role?: string[];
  /** Rights/permissions that have access */
  right?: string[];
}

/**
 * Check if user can access based on permission config
 *
 * @param userRole - User's current role (null if not authenticated)
 * @param permissions - Permission configuration
 * @returns true if user has access
 */
export function canAccessWithPermissions(
  userRole: string | null | undefined,
  permissions: PermissionConfig | null | undefined
): boolean {
  // If no permissions defined, allow access (open by default)
  if (!permissions) return true;

  // If anonymous allowed, everyone can access
  if (permissions.anonymous) return true;

  // If no user role, deny access (not authenticated)
  if (!userRole) return false;

  // If no specific roles required, allow authenticated users
  if (!permissions.role || permissions.role.length === 0) return true;

  // Check if user has any of the required roles
  return hasAnyRolePermission(userRole, permissions.role);
}

/**
 * All available roles for dropdowns/selectors
 */
export const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Coop Admin',
  'District Admin',
  'District User',
  'Coop User',
  'Manufacturer',
];

// ============================================================================
// MENU FILTERING UTILITIES
// ============================================================================

/**
 * Menu item interface with optional permission requirements
 */
export interface MenuItemWithPermissions {
  path?: string;
  name?: string;
  label?: string;
  icon?: string | any;
  hover?: string | any;
  menuIcon?: string;
  /** Roles that can see this menu item (if empty, all authenticated users can see it) */
  requiredRoles?: UserRole[];
  /** Children menu items */
  children?: MenuItemWithPermissions[];
  /** Any other properties */
  [key: string]: any;
}

/**
 * Filter menu items based on user's role
 * Removes items the user doesn't have permission to see
 *
 * @param items - Menu items to filter
 * @param userRole - User's role name (or roleId which will be converted)
 * @returns Filtered menu items
 */
export function filterMenuItemsByRole<T extends MenuItemWithPermissions>(
  items: T[],
  userRole: UserRole | string | number | null | undefined
): T[] {
  // Convert roleId to role name if needed
  const roleName: UserRole | null = typeof userRole === 'number'
    ? getRoleNameFromId(userRole)
    : (userRole as UserRole | null);

  if (!roleName) return [];

  return items
    .filter(item => {
      // If no required roles specified, allow access
      if (!item.requiredRoles || item.requiredRoles.length === 0) {
        return true;
      }
      // Check if user has any of the required roles
      return hasAnyRolePermission(roleName, item.requiredRoles);
    })
    .map(item => {
      // Recursively filter children
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: filterMenuItemsByRole(item.children, roleName),
        };
      }
      return item;
    })
    // Remove parent items that have no visible children (unless they have their own path)
    .filter(item => {
      if (item.children && item.children.length === 0 && !item.path) {
        return false;
      }
      return true;
    });
}

/**
 * Check if a user can access a specific menu item
 *
 * @param item - Menu item to check
 * @param userRole - User's role (name or ID)
 * @returns true if user can access the item
 */
export function canAccessMenuItem(
  item: MenuItemWithPermissions,
  userRole: UserRole | string | number | null | undefined
): boolean {
  // Convert roleId to role name if needed
  const roleName: UserRole | null = typeof userRole === 'number'
    ? getRoleNameFromId(userRole)
    : (userRole as UserRole | null);

  if (!roleName) return false;

  // If no required roles specified, allow access
  if (!item.requiredRoles || item.requiredRoles.length === 0) {
    return true;
  }

  return hasAnyRolePermission(roleName, item.requiredRoles);
}

export default {
  hasRolePermission,
  hasAnyRolePermission,
  getAccessibleRoles,
  isSuperAdmin,
  isAdmin,
  canAccessWithPermissions,
  getRoleNameFromId,
  getRoleIdFromName,
  filterMenuItemsByRole,
  canAccessMenuItem,
  ALL_ROLES,
  ROLE_ID_MAP,
  ROLE_NAME_TO_ID,
};
