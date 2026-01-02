# Permissions & Roles Protocol

## Overview

The permissions system controls access to routes, menu items, and UI components based on user roles. It's designed to be flexible and integrate with your existing authentication system.

## Core Components

| File | Purpose |
|------|---------|
| `hooks/usePermissions.ts` | Permission checking hook |
| `types/roles.ts` | Role definitions and utilities |
| `utils/menuBuilder.ts` | Role-based menu filtering |
| `utils/routeBuilder.ts` | Role-based route filtering |

## Step 1: Define Roles

Edit `src/types/roles.ts`:

```typescript
// Role hierarchy (highest to lowest)
export const ROLE_HIERARCHY = [
  'Super Admin',
  'Admin',
  'Manager',
  'User',
  'Guest'
] as const;

export type UserRole = typeof ROLE_HIERARCHY[number];

// Role-based permissions
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'Super Admin': ['*'],  // All permissions
  'Admin': ['users.read', 'users.write', 'products.read', 'products.write'],
  'Manager': ['products.read', 'products.write', 'reports.read'],
  'User': ['products.read', 'reports.read'],
  'Guest': ['products.read']
};

// Check if role A is higher or equal to role B
export function isRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  return userIndex !== -1 && userIndex <= requiredIndex;
}

// Check if user has specific permission
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes('*') || permissions.includes(permission);
}
```

## Step 2: Configure usePermissions Hook

The `usePermissions` hook needs to be integrated with your auth system.

Edit `src/hooks/usePermissions.ts`:

```typescript
import { useContext, useMemo } from 'react';
import { AuthContext } from '@/contexts/AuthContext';  // Your auth context
import { isRoleAtLeast, hasPermission, UserRole } from '@/types/roles';

export interface UsePermissionsResult {
  /** Current user's role */
  userRole: UserRole | null;

  /** Check if user has at least the specified role */
  hasRole: (role: UserRole) => boolean;

  /** Check if user has specific permission */
  can: (permission: string) => boolean;

  /** Check if user can access entity (by requiredRoles array) */
  canAccessEntity: (requiredRoles?: string[]) => boolean;

  /** Check if user is authenticated */
  isAuthenticated: boolean;

  /** Current user object */
  user: User | null;
}

export function usePermissions(): UsePermissionsResult {
  // TODO: Replace with your auth context
  const { user, isAuthenticated } = useContext(AuthContext);

  const userRole = user?.role as UserRole | null;

  return useMemo(() => ({
    userRole,
    isAuthenticated,
    user,

    hasRole: (role: UserRole) => {
      if (!userRole) return false;
      return isRoleAtLeast(userRole, role);
    },

    can: (permission: string) => {
      if (!userRole) return false;
      return hasPermission(userRole, permission);
    },

    canAccessEntity: (requiredRoles?: string[]) => {
      // No required roles = public access
      if (!requiredRoles || requiredRoles.length === 0) return true;
      // No user role = deny
      if (!userRole) return false;
      // Check if user's role is in required roles
      return requiredRoles.includes(userRole);
    }
  }), [user, userRole, isAuthenticated]);
}
```

## Step 3: Protect Routes

### Using Route Builder

```typescript
import { buildAllEntityRoutes, filterRoutesByRole } from '@/utils/routeBuilder';
import { usePermissions } from '@/hooks/usePermissions';

const entityConfigs = [
  { entityName: 'Product', label: 'Product' },
  { entityName: 'User', label: 'User', requiredRoles: ['Admin', 'Super Admin'] },
  { entityName: 'System', label: 'System', requiredRoles: ['Super Admin'] },
];

function ProtectedRoutes() {
  const { userRole } = usePermissions();
  const allRoutes = buildAllEntityRoutes(entityConfigs, componentMap);
  const accessibleRoutes = filterRoutesByRole(allRoutes, userRole);

  return (
    <Routes>
      {accessibleRoutes.map(route => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}
```

### Using Route Guard Component

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';

interface RouteGuardProps {
  requiredRoles?: string[];
  requiredPermission?: string;
  redirectTo?: string;
}

function RouteGuard({
  requiredRoles,
  requiredPermission,
  redirectTo = '/unauthorized'
}: RouteGuardProps) {
  const { canAccessEntity, can, isAuthenticated } = usePermissions();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRoles && !canAccessEntity(requiredRoles)) {
    return <Navigate to={redirectTo} />;
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to={redirectTo} />;
  }

  return <Outlet />;
}

// Usage in routes
<Route element={<RouteGuard requiredRoles={['Admin']} />}>
  <Route path="/admin/*" element={<AdminLayout />} />
</Route>
```

## Step 4: Filter Menu Items

```typescript
import { filterMenuByRole } from '@/utils/menuBuilder';
import { usePermissions } from '@/hooks/usePermissions';

function Sidebar() {
  const { userRole } = usePermissions();

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'pi pi-home' },
    { label: 'Products', path: '/products', icon: 'pi pi-box' },
    { label: 'Users', path: '/users', icon: 'pi pi-users', requiredRoles: ['Admin'] },
    { label: 'System', path: '/system', icon: 'pi pi-cog', requiredRoles: ['Super Admin'] },
  ];

  const visibleItems = filterMenuByRole(menuItems, userRole);

  return <PanelMenu model={visibleItems} />;
}
```

## Step 5: Conditional UI Rendering

### Hide Elements by Role

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function ProductActions({ product }) {
  const { hasRole, can } = usePermissions();

  return (
    <div className="flex gap-2">
      {/* Everyone can view */}
      <Button label="View" icon="pi pi-eye" />

      {/* Only users with products.write permission */}
      {can('products.write') && (
        <Button label="Edit" icon="pi pi-pencil" />
      )}

      {/* Only Admin or higher */}
      {hasRole('Admin') && (
        <Button label="Delete" icon="pi pi-trash" severity="danger" />
      )}
    </div>
  );
}
```

### Permission-Based Component

```typescript
interface RequirePermissionProps {
  permission?: string;
  role?: UserRole;
  roles?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

function RequirePermission({
  permission,
  role,
  roles,
  fallback = null,
  children
}: RequirePermissionProps) {
  const { can, hasRole, canAccessEntity } = usePermissions();

  if (permission && !can(permission)) return fallback;
  if (role && !hasRole(role)) return fallback;
  if (roles && !canAccessEntity(roles)) return fallback;

  return <>{children}</>;
}

// Usage
<RequirePermission role="Admin">
  <AdminPanel />
</RequirePermission>

<RequirePermission permission="users.delete" fallback={<span>No access</span>}>
  <DeleteUserButton />
</RequirePermission>
```

## Step 6: Bulk Action Permissions

```typescript
// In bulkActionRegistry.ts
import { usePermissions } from '@/hooks/usePermissions';

const bulkActions = [
  {
    id: 'approve',
    label: 'Approve Selected',
    icon: 'pi pi-check',
    requiredRoles: ['Admin', 'Super Admin'],
    handler: async (ids) => { /* ... */ }
  },
  {
    id: 'delete',
    label: 'Delete Selected',
    icon: 'pi pi-trash',
    requiredRoles: ['Super Admin'],
    handler: async (ids) => { /* ... */ }
  }
];

function BulkActionBar({ selectedIds, entityType }) {
  const { canAccessEntity } = usePermissions();

  const availableActions = bulkActions.filter(action =>
    canAccessEntity(action.requiredRoles)
  );

  return (
    <div className="flex gap-2">
      {availableActions.map(action => (
        <Button
          key={action.id}
          label={action.label}
          icon={action.icon}
          onClick={() => action.handler(selectedIds)}
        />
      ))}
    </div>
  );
}
```

## Step 7: DataGrid with Permissions

```typescript
function ProductGrid() {
  const { can, hasRole } = usePermissions();

  return (
    <QueryProductModelDataGrid
      title="Products"
      enableCreate={can('products.write')}
      enableBulkSelection={hasRole('Admin')}
      customColumns={{
        actions: {
          header: 'Actions',
          body: (row) => (
            <div className="flex gap-1">
              <Button icon="pi pi-eye" size="small" />
              {can('products.write') && (
                <Button icon="pi pi-pencil" size="small" />
              )}
              {hasRole('Admin') && (
                <Button icon="pi pi-trash" size="small" severity="danger" />
              )}
            </div>
          )
        }
      }}
    />
  );
}
```

## Role Hierarchy Patterns

### Implicit Permission Inheritance

```typescript
// Super Admin > Admin > Manager > User > Guest
// Higher roles automatically have lower role permissions

function hasImplicitPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const hierarchy = ['Super Admin', 'Admin', 'Manager', 'User', 'Guest'];
  return hierarchy.indexOf(userRole) <= hierarchy.indexOf(requiredRole);
}

// Super Admin has Admin permissions
hasImplicitPermission('Super Admin', 'Admin'); // true

// User does NOT have Admin permissions
hasImplicitPermission('User', 'Admin'); // false
```

### Explicit Permission Checking

```typescript
// Check specific permission strings
const PERMISSIONS = {
  PRODUCTS_READ: 'products.read',
  PRODUCTS_WRITE: 'products.write',
  PRODUCTS_DELETE: 'products.delete',
  USERS_MANAGE: 'users.manage',
  SYSTEM_ADMIN: 'system.admin'
};

// In component
if (can(PERMISSIONS.PRODUCTS_DELETE)) {
  // Show delete button
}
```

## Integration with Auth Providers

### JWT Token Example

```typescript
// Decode role from JWT
function getRoleFromToken(token: string): UserRole | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role as UserRole;
  } catch {
    return null;
  }
}

// In AuthContext
const userRole = getRoleFromToken(accessToken);
```

### OAuth/OIDC Example

```typescript
// Map OAuth scopes to roles
function mapScopesToRole(scopes: string[]): UserRole {
  if (scopes.includes('admin:full')) return 'Super Admin';
  if (scopes.includes('admin:limited')) return 'Admin';
  if (scopes.includes('write')) return 'Manager';
  if (scopes.includes('read')) return 'User';
  return 'Guest';
}
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Always unauthorized | Role not set | Check auth context provides role |
| Menu shows all items | Filter not applied | Use filterMenuByRole |
| Route accessible but shouldn't be | Missing guard | Add RouteGuard component |
| Permission check always false | Wrong permission string | Verify permission names match |

## Related Protocols

- [Navigation & Routing](./06-NAVIGATION-ROUTING.md) - Route setup
- [Project Setup](./01-PROJECT-SETUP.md) - Initial auth configuration
