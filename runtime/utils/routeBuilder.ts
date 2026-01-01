/**
 * Route Builder Utilities
 *
 * Generate React Router routes from entity configurations.
 * Supports lazy loading, guards, and nested routes.
 */

import { lazy, Suspense, ComponentType, ReactNode } from 'react';
import { getNavigationConfig } from './navigation';

// =============================================================================
// TYPES
// =============================================================================

export interface EntityRouteConfig {
  /** Entity name (e.g., 'QueryProductModel') */
  entityName: string;
  /** Display label for breadcrumbs */
  label: string;
  /** Required roles for access */
  requiredRoles?: string[];
  /** Whether entity is read-only (no edit routes) */
  readOnly?: boolean;
  /** Whether to disable create */
  noCreate?: boolean;
  /** Custom list component path */
  listComponent?: string;
  /** Custom edit component path */
  editComponent?: string;
}

export interface RouteDefinition {
  path: string;
  element: ReactNode;
  loader?: () => Promise<any>;
  errorElement?: ReactNode;
  children?: RouteDefinition[];
  handle?: {
    entityName?: string;
    mode?: 'list' | 'create' | 'edit' | 'view';
    label?: string;
    requiredRoles?: string[];
  };
}

export interface LazyComponentMap {
  [key: string]: () => Promise<{ default: ComponentType<any> }>;
}

// =============================================================================
// COMPONENT LOADING
// =============================================================================

/**
 * Create a lazy-loaded component with suspense
 */
export function createLazyComponent(
  importFn: () => Promise<{ default: ComponentType<any> }>,
  fallback: ReactNode = null
): ReactNode {
  const LazyComponent = lazy(importFn);

  return (
    <Suspense fallback={fallback}>
      <LazyComponent />
    </Suspense>
  );
}

/**
 * Default loading fallback component
 */
export function DefaultLoadingFallback(): ReactNode {
  return (
    <div className="flex align-items-center justify-content-center h-full p-4">
      <div className="text-center">
        <i className="pi pi-spin pi-spinner text-4xl text-primary mb-2" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// =============================================================================
// ROUTE GENERATION
// =============================================================================

/**
 * Generate route path for an entity and mode
 */
export function getRoutePath(
  entityName: string,
  mode: 'list' | 'create' | 'edit' | 'view'
): string {
  const config = getNavigationConfig();
  const prefix = config.routePrefix;

  switch (mode) {
    case 'list':
      return `${prefix}/${entityName}/List`;
    case 'create':
      return `${prefix}/${entityName}/Edit`;
    case 'edit':
      return `${prefix}/${entityName}/Edit/:id`;
    case 'view':
      return `${prefix}/${entityName}/View/:id`;
  }
}

/**
 * Build routes for a single entity
 */
export function buildEntityRoutes(
  config: EntityRouteConfig,
  componentMap: LazyComponentMap,
  loadingFallback: ReactNode = <DefaultLoadingFallback />
): RouteDefinition[] {
  const { entityName, label, requiredRoles, readOnly, noCreate } = config;
  const routes: RouteDefinition[] = [];

  // List route
  const listPath = getRoutePath(entityName, 'list');
  const listComponentKey = config.listComponent || `${entityName}/List`;

  if (componentMap[listComponentKey]) {
    routes.push({
      path: listPath,
      element: createLazyComponent(componentMap[listComponentKey], loadingFallback),
      handle: {
        entityName,
        mode: 'list',
        label,
        requiredRoles,
      },
    });
  }

  // Edit routes (if not read-only)
  if (!readOnly) {
    const editComponentKey = config.editComponent || `${entityName}/Edit`;

    if (componentMap[editComponentKey]) {
      // Create route (no ID)
      if (!noCreate) {
        routes.push({
          path: getRoutePath(entityName, 'create'),
          element: createLazyComponent(componentMap[editComponentKey], loadingFallback),
          handle: {
            entityName,
            mode: 'create',
            label: `New ${label}`,
            requiredRoles,
          },
        });
      }

      // Edit route (with ID)
      routes.push({
        path: getRoutePath(entityName, 'edit'),
        element: createLazyComponent(componentMap[editComponentKey], loadingFallback),
        handle: {
          entityName,
          mode: 'edit',
          label: `Edit ${label}`,
          requiredRoles,
        },
      });
    }
  }

  // View route
  const viewComponentKey = `${entityName}/View`;
  const editComponentKey = config.editComponent || `${entityName}/Edit`;

  // Use view component if available, otherwise edit component in view mode
  const viewComponent = componentMap[viewComponentKey] || componentMap[editComponentKey];

  if (viewComponent) {
    routes.push({
      path: getRoutePath(entityName, 'view'),
      element: createLazyComponent(viewComponent, loadingFallback),
      handle: {
        entityName,
        mode: 'view',
        label: `View ${label}`,
        requiredRoles,
      },
    });
  }

  return routes;
}

/**
 * Build routes for multiple entities
 */
export function buildAllEntityRoutes(
  configs: EntityRouteConfig[],
  componentMap: LazyComponentMap,
  loadingFallback?: ReactNode
): RouteDefinition[] {
  return configs.flatMap(config =>
    buildEntityRoutes(config, componentMap, loadingFallback)
  );
}

// =============================================================================
// ROUTE MATCHING
// =============================================================================

/**
 * Find route definition by path
 */
export function findRouteByPath(
  routes: RouteDefinition[],
  path: string
): RouteDefinition | null {
  for (const route of routes) {
    // Check exact match first
    if (route.path === path) {
      return route;
    }

    // Check pattern match (for :id params)
    const pattern = route.path
      .replace(/:[^/]+/g, '[^/]+')
      .replace(/\//g, '\\/');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(path)) {
      return route;
    }

    // Check children
    if (route.children) {
      const childMatch = findRouteByPath(route.children, path);
      if (childMatch) return childMatch;
    }
  }

  return null;
}

/**
 * Get route handle (metadata) for current path
 */
export function getRouteHandle(
  routes: RouteDefinition[],
  path: string
): RouteDefinition['handle'] | null {
  const route = findRouteByPath(routes, path);
  return route?.handle || null;
}

// =============================================================================
// GUARD UTILITIES
// =============================================================================

/**
 * Check if user can access a route
 */
export function canAccessRoute(
  route: RouteDefinition,
  userRole: string | null
): boolean {
  const requiredRoles = route.handle?.requiredRoles;

  // No required roles = public access
  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  // No user role = deny access to protected routes
  if (!userRole) {
    return false;
  }

  // Check if user has any required role
  return requiredRoles.includes(userRole);
}

/**
 * Filter routes by user role
 */
export function filterRoutesByRole(
  routes: RouteDefinition[],
  userRole: string | null
): RouteDefinition[] {
  return routes
    .filter(route => canAccessRoute(route, userRole))
    .map(route => {
      if (route.children) {
        return {
          ...route,
          children: filterRoutesByRole(route.children, userRole),
        };
      }
      return route;
    });
}

// =============================================================================
// DYNAMIC COMPONENT MAP BUILDER
// =============================================================================

/**
 * Build component map from generated structure
 *
 * @param namespace - API namespace (e.g., 'GreenOnion')
 * @param entities - Entity names to include
 */
export function buildComponentMap(
  namespace: string,
  entities: string[]
): LazyComponentMap {
  const map: LazyComponentMap = {};

  for (const entity of entities) {
    // List page
    map[`${entity}/List`] = () =>
      import(`@/pages/${namespace}/${entity}/List`);

    // Edit page
    map[`${entity}/Edit`] = () =>
      import(`@/pages/${namespace}/${entity}/Edit`);
  }

  return map;
}

export default {
  createLazyComponent,
  DefaultLoadingFallback,
  getRoutePath,
  buildEntityRoutes,
  buildAllEntityRoutes,
  findRouteByPath,
  getRouteHandle,
  canAccessRoute,
  filterRoutesByRole,
  buildComponentMap,
};
