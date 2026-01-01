/**
 * usePermissions Hook - Portable Version
 *
 * Provides permission checking utilities based on user role.
 * Uses x-permissions metadata from swagger.json for access control.
 *
 * INTEGRATION REQUIRED:
 * This hook needs to be connected to your authentication system.
 * Replace the TODO comments with your project's auth context/state.
 */

import { useCallback, useMemo } from 'react';
import {
  hasRolePermission,
  hasAnyRolePermission,
  canAccessWithPermissions,
  isSuperAdmin,
  isAdmin,
  getRoleNameFromId,
  filterMenuItemsByRole,
  canAccessMenuItem,
  type PermissionConfig,
  type MenuItemWithPermissions,
  type UserRole,
} from '@/types/roles';

// =============================================================================
// TODO: Connect to your authentication system
// =============================================================================
// Replace these with your project's auth state
// Example implementations:
//
// 1. Using React Context:
//    import { useAuth } from '@/contexts/AuthContext';
//    const auth = useAuth();
//    const roleId = auth.user?.roleId ?? null;
//
// 2. Using Redux:
//    import { useSelector } from 'react-redux';
//    const roleId = useSelector((state) => state.auth.user?.roleId);
//
// 3. Using Zustand:
//    import { useAuthStore } from '@/stores/authStore';
//    const roleId = useAuthStore((state) => state.user?.roleId);
// =============================================================================

/**
 * Get impersonation state from localStorage (optional feature)
 */
function getImpersonationState(): { roleId: number; roleName: UserRole } | null {
  if (typeof window === 'undefined') return null;

  const impersonateRoleId = localStorage.getItem('X-Impersonate-Role-ID');
  if (!impersonateRoleId) return null;

  const roleId = parseInt(impersonateRoleId, 10);
  if (isNaN(roleId)) return null;

  const roleName = getRoleNameFromId(roleId);
  if (!roleName) return null;

  return { roleId, roleName };
}

export interface UsePermissionsReturn {
  /** Current user's role name (null if not authenticated) */
  userRole: string | null;

  /** Current user's role ID (null if not authenticated) */
  roleId: number | null;

  /** Effective role for UI filtering (impersonated role if active, otherwise actual role) */
  effectiveRole: string | null;

  /** Effective role ID for UI filtering */
  effectiveRoleId: number | null;

  /** Whether user is currently impersonating another role */
  isImpersonating: boolean;

  /** Check if user has a specific role */
  hasRole: (roleName: string) => boolean;

  /** Check if user has any of the specified roles */
  hasAnyRole: (roleNames: string[]) => boolean;

  /** Check if user can access based on x-permissions config (uses effective role) */
  canAccess: (permissions: PermissionConfig | null | undefined) => boolean;

  /** Filter menu items based on effective role (respects impersonation) */
  filterMenu: <T extends MenuItemWithPermissions>(items: T[]) => T[];

  /** Check if user can access a specific menu item (uses effective role) */
  canAccessMenu: (item: MenuItemWithPermissions) => boolean;

  /** Check if user is Super Admin (actual role, not impersonated) */
  isSuperAdmin: boolean;

  /** Check if user is any type of admin (actual role, not impersonated) */
  isAdmin: boolean;

  /** Whether user is authenticated */
  isAuthenticated: boolean;

  /** Whether auth state is still loading */
  isLoading: boolean;
}

/**
 * Hook for checking user permissions based on role
 *
 * @example
 * ```typescript
 * const { canAccess, isSuperAdmin, userRole } = usePermissions();
 *
 * // Check if user can perform an action
 * if (canAccess({ role: ['Super Admin'] })) {
 *   // Show admin controls
 * }
 *
 * // Simple role check
 * if (isSuperAdmin) {
 *   // Show super admin content
 * }
 * ```
 */
export function usePermissions(): UsePermissionsReturn {
  // ==========================================================================
  // TODO: Replace these with your authentication state
  // ==========================================================================
  // Example: const { user, isAuthenticated, isLoading } = useAuth();
  // const roleId = user?.roleId ?? null;
  // const userRoleName = user?.roleName ?? null;

  // Placeholder implementation - replace with your auth system
  const roleId: number | null = null;
  const userRoleName: string | null = null;
  const isAuthenticated = false;
  const isLoading = false;
  // ==========================================================================

  // Get role name from profile or convert from roleId
  const userRole = useMemo(() => {
    if (userRoleName) {
      return userRoleName;
    }
    // Fallback: convert roleId to name
    if (roleId) {
      return getRoleNameFromId(roleId);
    }
    return null;
  }, [userRoleName, roleId]);

  // Check for impersonation state
  const impersonation = useMemo(() => {
    return getImpersonationState();
  }, []);

  const isImpersonating = impersonation !== null;

  // Effective role for UI filtering (impersonated or actual)
  const effectiveRole = useMemo(() => {
    if (impersonation) {
      return impersonation.roleName;
    }
    return userRole;
  }, [impersonation, userRole]);

  const effectiveRoleId = useMemo(() => {
    if (impersonation) {
      return impersonation.roleId;
    }
    return roleId;
  }, [impersonation, roleId]);

  // hasRole checks actual role (for things like showing impersonation banner)
  const hasRole = useCallback(
    (roleName: string): boolean => {
      if (!userRole) return false;
      return hasRolePermission(userRole, roleName);
    },
    [userRole]
  );

  // hasAnyRole uses effective role for permission checks
  const hasAnyRole = useCallback(
    (roleNames: string[]): boolean => {
      if (!effectiveRole) return false;
      if (roleNames.length === 0) return true;
      return hasAnyRolePermission(effectiveRole, roleNames);
    },
    [effectiveRole]
  );

  // canAccess uses effective role
  const canAccess = useCallback(
    (permissions: PermissionConfig | null | undefined): boolean => {
      return canAccessWithPermissions(effectiveRole, permissions);
    },
    [effectiveRole]
  );

  // filterMenu uses effective role
  const filterMenu = useCallback(
    <T extends MenuItemWithPermissions>(items: T[]): T[] => {
      return filterMenuItemsByRole(items, effectiveRole);
    },
    [effectiveRole]
  );

  // canAccessMenu uses effective role
  const canAccessMenu = useCallback(
    (item: MenuItemWithPermissions): boolean => {
      return canAccessMenuItem(item, effectiveRole);
    },
    [effectiveRole]
  );

  return {
    userRole,
    roleId,
    effectiveRole,
    effectiveRoleId,
    isImpersonating,
    hasRole,
    hasAnyRole,
    canAccess,
    filterMenu,
    canAccessMenu,
    isSuperAdmin: isSuperAdmin(userRole), // Actual role, not impersonated
    isAdmin: isAdmin(userRole), // Actual role, not impersonated
    isAuthenticated,
    isLoading,
  };
}

export default usePermissions;
