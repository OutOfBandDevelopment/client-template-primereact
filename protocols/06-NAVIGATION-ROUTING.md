# Navigation & Routing Protocol

## Overview

The navigation system provides utilities for building routes, menus, and handling navigation in a consistent way across all generated entities.

## Core Utilities

| File | Purpose |
|------|---------|
| `utils/navigation.ts` | Navigation configuration and URL builders |
| `utils/routeBuilder.ts` | Route generation for React Router |
| `utils/menuBuilder.ts` | Menu item generation with role filtering |

## Step 1: Configure Navigation

In your app initialization (before rendering):

```typescript
// src/App.tsx or src/main.tsx
import { configureNavigation } from '@/utils/navigation';

configureNavigation({
  namespace: 'YourApp',
  routePrefix: '/app',
  apiBaseUrl: '/api/v1',
  useReactRouter: true,
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `namespace` | `string` | `'GreenOnion'` | API namespace |
| `routePrefix` | `string` | `''` | Base path for entity routes |
| `apiBaseUrl` | `string` | `'/api'` | API base URL |
| `useReactRouter` | `boolean` | `true` | Use React Router navigation |

## Step 2: Setup Routes

### Option A: Use Generated Routes.tsx

The generator creates `src/pages/{Namespace}/Routes.tsx`:

```typescript
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import YourAppRoutes from '@/pages/YourApp/Routes';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/app/*" element={<YourAppRoutes />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### Option B: Use Route Builder

For more control, use `routeBuilder.ts`:

```typescript
import {
  buildAllEntityRoutes,
  buildComponentMap,
  RouteDefinition
} from '@/utils/routeBuilder';

// Define entity configurations
const entityConfigs = [
  { entityName: 'QueryProductModel', label: 'Product' },
  { entityName: 'QueryCategoryModel', label: 'Category', readOnly: true },
  { entityName: 'QueryUserModel', label: 'User', requiredRoles: ['Admin'] },
];

// Build component map (lazy imports)
const componentMap = buildComponentMap('YourApp', [
  'QueryProductModel',
  'QueryCategoryModel',
  'QueryUserModel'
]);

// Generate routes
const routes = buildAllEntityRoutes(entityConfigs, componentMap);

// Use in React Router
function AppRoutes() {
  return (
    <Routes>
      {routes.map(route => (
        <Route
          key={route.path}
          path={route.path}
          element={route.element}
        />
      ))}
    </Routes>
  );
}
```

### Route Structure

Each entity gets three routes:

| Route | Path Pattern | Purpose |
|-------|--------------|---------|
| List | `/{prefix}/{Entity}/List` | Data grid view |
| Create | `/{prefix}/{Entity}/Edit` | Create new entity |
| Edit | `/{prefix}/{Entity}/Edit/:id` | Edit existing entity |
| View | `/{prefix}/{Entity}/View/:id` | Read-only view |

## Step 3: Setup Menu

### Option A: Use Generated Menu Items

The generated Routes.tsx includes menu configuration:

```typescript
// From generated Routes.tsx
export const menuItems = [
  {
    label: 'Products',
    icon: 'pi pi-box',
    path: '/app/QueryProductModel/List'
  },
  {
    label: 'Categories',
    icon: 'pi pi-tags',
    path: '/app/QueryCategoryModel/List'
  }
];
```

### Option B: Use Menu Builder

For role-based menus:

```typescript
import {
  buildEntityMenuItems,
  filterMenuByRole,
  toPrimeMenuModel
} from '@/utils/menuBuilder';

// Define menu configuration
const entityMenuConfigs = [
  {
    entityName: 'QueryProductModel',
    label: 'Products',
    icon: 'pi pi-box',
    group: 'Catalog'
  },
  {
    entityName: 'QueryCategoryModel',
    label: 'Categories',
    icon: 'pi pi-tags',
    group: 'Catalog'
  },
  {
    entityName: 'QueryUserModel',
    label: 'Users',
    icon: 'pi pi-users',
    group: 'Admin',
    requiredRoles: ['Super Admin', 'Admin']
  },
];

// Build menu items
const allMenuItems = buildEntityMenuItems(entityMenuConfigs);

// Filter by current user's role
const userRole = useCurrentUserRole();
const visibleItems = filterMenuByRole(allMenuItems, userRole);

// Convert to PrimeReact menu model
const navigate = useNavigate();
const primeMenuItems = toPrimeMenuModel(visibleItems, navigate);
```

### Using with PrimeReact Menu

```typescript
import { Menu } from 'primereact/menu';
import { Menubar } from 'primereact/menubar';
import { PanelMenu } from 'primereact/panelmenu';

function Sidebar() {
  const navigate = useNavigate();
  const primeItems = toPrimeMenuModel(visibleItems, navigate);

  return <PanelMenu model={primeItems} />;
}

function TopNav() {
  const navigate = useNavigate();
  const primeItems = toPrimeMenuModel(visibleItems, navigate);

  return <Menubar model={primeItems} />;
}
```

## URL Helpers

Get entity-specific URLs:

```typescript
import { getEntityRoutes, navigateTo } from '@/utils/navigation';

// Get route patterns
const productRoutes = getEntityRoutes('QueryProductModel');
// Returns:
// {
//   list: '/app/QueryProductModel/List',
//   create: '/app/QueryProductModel/Edit',
//   edit: (id) => `/app/QueryProductModel/Edit/${id}`,
//   view: (id) => `/app/QueryProductModel/View/${id}`
// }

// Navigate programmatically
navigateTo(productRoutes.edit(123));
```

## Grouped Menus

Menu items can be grouped:

```typescript
const menuConfigs = [
  { entityName: 'Product', label: 'Products', group: 'Catalog' },
  { entityName: 'Category', label: 'Categories', group: 'Catalog' },
  { entityName: 'User', label: 'Users', group: 'Admin' },
  { entityName: 'Role', label: 'Roles', group: 'Admin' },
];

const menuItems = buildEntityMenuItems(menuConfigs);
// Creates grouped structure:
// - Catalog
//   - Products
//   - Categories
// - Admin
//   - Users
//   - Roles
```

## Role-Based Menu Filtering

```typescript
const menuItems = [
  { label: 'Dashboard', path: '/dashboard' },  // No roles = public
  { label: 'Products', path: '/products' },
  { label: 'Users', path: '/users', requiredRoles: ['Admin'] },
  { label: 'System', path: '/system', requiredRoles: ['Super Admin'] },
];

// For regular user
const userMenu = filterMenuByRole(menuItems, 'User');
// Returns: Dashboard, Products

// For admin
const adminMenu = filterMenuByRole(menuItems, 'Admin');
// Returns: Dashboard, Products, Users

// For super admin
const superMenu = filterMenuByRole(menuItems, 'Super Admin');
// Returns: All items
```

## Breadcrumbs

Build breadcrumbs from route handle:

```typescript
import { useLocation, useMatches } from 'react-router-dom';

function Breadcrumbs() {
  const matches = useMatches();
  const crumbs = matches
    .filter(match => match.handle?.label)
    .map(match => ({
      label: match.handle.label,
      path: match.pathname
    }));

  return (
    <BreadCrumb model={crumbs.map(c => ({ label: c.label, url: c.path }))} />
  );
}
```

## Route Guards

Protect routes by role:

```typescript
import { canAccessRoute, filterRoutesByRole } from '@/utils/routeBuilder';

// Check single route
const route = findRouteByPath(routes, '/app/Users/List');
if (!canAccessRoute(route, currentUserRole)) {
  navigate('/unauthorized');
}

// Filter all routes for user
const accessibleRoutes = filterRoutesByRole(routes, currentUserRole);
```

## Complete Example

```typescript
// src/routes/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import {
  buildAllEntityRoutes,
  buildComponentMap,
  filterRoutesByRole
} from '@/utils/routeBuilder';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Loading from '@/components/Loading';

const entityConfigs = [
  { entityName: 'QueryProductModel', label: 'Product' },
  { entityName: 'QueryCategoryModel', label: 'Category' },
  { entityName: 'QueryUserModel', label: 'User', requiredRoles: ['Admin'] },
];

const componentMap = buildComponentMap('YourApp', [
  'QueryProductModel',
  'QueryCategoryModel',
  'QueryUserModel'
]);

const allRoutes = buildAllEntityRoutes(entityConfigs, componentMap);

export default function AppRoutes() {
  const { user } = useAuth();
  const accessibleRoutes = filterRoutesByRole(allRoutes, user?.role);

  return (
    <Routes>
      <Route element={<Layout />}>
        {accessibleRoutes.map(route => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <Suspense fallback={<Loading />}>
                {route.element}
              </Suspense>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/404" />} />
      </Route>
    </Routes>
  );
}
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Routes not matching | Wrong prefix | Check configureNavigation routePrefix |
| Menu items not showing | Role filtering | Verify user role matches requiredRoles |
| Lazy load fails | Wrong component path | Check buildComponentMap namespace |
| Navigation not working | Missing useReactRouter | Set useReactRouter: true |

## Related Protocols

- [Permissions & Roles](./08-PERMISSIONS-ROLES.md) - Role system
- [Project Setup](./01-PROJECT-SETUP.md) - Initial configuration
