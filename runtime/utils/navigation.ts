/**
 * Navigation Utilities
 *
 * Reusable navigation helpers for generated components.
 * Configure the namespace in your project's config.
 */

// =============================================================================
// CONFIGURATION - Update these for your project
// =============================================================================

export interface NavigationConfig {
  /** API namespace (e.g., 'GreenOnion', 'MyApp') */
  namespace: string;
  /** Route prefix (e.g., '/v2', '/admin') */
  routePrefix: string;
  /** Base API URL */
  apiBaseUrl: string;
  /** Use React Router navigation */
  useReactRouter: boolean;
}

// Default configuration - override in your app
let config: NavigationConfig = {
  namespace: 'GreenOnion',
  routePrefix: '/v2',
  apiBaseUrl: '/api',
  useReactRouter: true,
};

/**
 * Configure navigation settings
 */
export function configureNavigation(newConfig: Partial<NavigationConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Get current navigation configuration
 */
export function getNavigationConfig(): NavigationConfig {
  return { ...config };
}

// =============================================================================
// ROUTE GENERATION
// =============================================================================

export interface EntityRoutes {
  list: string;
  create: string;
  edit: (id: number | string) => string;
  view: (id: number | string) => string;
}

/**
 * Generate routes for an entity
 *
 * @example
 * const routes = getEntityRoutes('Product');
 * // routes.list = '/v2/Product/List'
 * // routes.edit(123) = '/v2/Product/Edit/123'
 */
export function getEntityRoutes(entityName: string): EntityRoutes {
  const base = `${config.routePrefix}/${entityName}`;

  return {
    list: `${base}/List`,
    create: `${base}/Edit`,
    edit: (id) => `${base}/Edit/${id}`,
    view: (id) => `${base}/View/${id}`,
  };
}

/**
 * Navigate to a route
 * Uses React Router if configured, otherwise window.location
 */
export function navigateTo(
  path: string,
  navigate?: (path: string) => void
): void {
  if (config.useReactRouter && navigate) {
    navigate(path);
  } else {
    window.location.href = path;
  }
}

/**
 * Navigate to entity list
 */
export function navigateToList(
  entityName: string,
  navigate?: (path: string) => void
): void {
  const routes = getEntityRoutes(entityName);
  navigateTo(routes.list, navigate);
}

/**
 * Navigate to entity edit
 */
export function navigateToEdit(
  entityName: string,
  id: number | string,
  navigate?: (path: string) => void
): void {
  const routes = getEntityRoutes(entityName);
  navigateTo(routes.edit(id), navigate);
}

/**
 * Navigate to entity create
 */
export function navigateToCreate(
  entityName: string,
  navigate?: (path: string) => void
): void {
  const routes = getEntityRoutes(entityName);
  navigateTo(routes.create, navigate);
}

/**
 * Navigate to entity view
 */
export function navigateToView(
  entityName: string,
  id: number | string,
  navigate?: (path: string) => void
): void {
  const routes = getEntityRoutes(entityName);
  navigateTo(routes.view(id), navigate);
}

// =============================================================================
// API ENDPOINTS
// =============================================================================

export interface EntityEndpoints {
  query: string;
  get: (id: number | string) => string;
  create: string;
  update: (id: number | string) => string;
  delete: (id: number | string) => string;
  bulk: (action: string) => string;
}

/**
 * Generate API endpoints for an entity
 */
export function getEntityEndpoints(entityName: string): EntityEndpoints {
  // Remove 'Query' prefix and 'Model' suffix for API path
  const apiName = entityName
    .replace(/^Query/, '')
    .replace(/Model$/, '')
    .toLowerCase();

  const base = `${config.apiBaseUrl}/${apiName}`;

  return {
    query: `${base}/query`,
    get: (id) => `${base}/${id}`,
    create: base,
    update: (id) => `${base}/${id}`,
    delete: (id) => `${base}/${id}`,
    bulk: (action) => `${base}/bulk/${action}`,
  };
}

// =============================================================================
// BREADCRUMB GENERATION
// =============================================================================

export interface Breadcrumb {
  label: string;
  path?: string;
  icon?: string;
}

/**
 * Generate breadcrumbs for an entity page
 */
export function getEntityBreadcrumbs(
  entityName: string,
  entityLabel: string,
  mode: 'list' | 'create' | 'edit' | 'view',
  entityId?: number | string
): Breadcrumb[] {
  const routes = getEntityRoutes(entityName);
  const crumbs: Breadcrumb[] = [
    { label: 'Home', path: '/', icon: 'pi pi-home' },
    { label: entityLabel, path: routes.list },
  ];

  switch (mode) {
    case 'create':
      crumbs.push({ label: `New ${entityLabel}` });
      break;
    case 'edit':
      crumbs.push({ label: `Edit ${entityLabel} #${entityId}` });
      break;
    case 'view':
      crumbs.push({ label: `View ${entityLabel} #${entityId}` });
      break;
    // 'list' doesn't need additional crumb
  }

  return crumbs;
}

// =============================================================================
// URL PARSING
// =============================================================================

/**
 * Parse entity info from current URL
 */
export function parseEntityFromUrl(pathname: string): {
  entityName: string | null;
  mode: 'list' | 'create' | 'edit' | 'view' | null;
  id: string | null;
} {
  const prefix = config.routePrefix.replace(/^\//, '');
  const pattern = new RegExp(`^/?${prefix}/([^/]+)/(List|Edit|View)(?:/(.+))?$`);
  const match = pathname.match(pattern);

  if (!match) {
    return { entityName: null, mode: null, id: null };
  }

  const [, entityName, modeStr, id] = match;
  const mode = modeStr.toLowerCase() as 'list' | 'edit' | 'view';

  return {
    entityName,
    mode: mode === 'edit' && !id ? 'create' : mode,
    id: id || null,
  };
}

export default {
  configureNavigation,
  getNavigationConfig,
  getEntityRoutes,
  navigateTo,
  navigateToList,
  navigateToEdit,
  navigateToCreate,
  navigateToView,
  getEntityEndpoints,
  getEntityBreadcrumbs,
  parseEntityFromUrl,
};
