/**
 * EntityPage - Generic page component for entity CRUD operations
 *
 * A fully generic page component that can handle create, edit, and view
 * operations for any entity. Works with route parameters to determine mode.
 *
 * Usage in generated pages:
 * ```tsx
 * import { EntityPage } from '@/components/ui/prime/EntityForm';
 * import CategoryClient from '@/api/GreenOnion/Clients/CategoryClient';
 *
 * const client = new CategoryClient();
 *
 * export default function CategoryEdit() {
 *   return (
 *     <EntityPage
 *       client={client}
 *       queryModelName="IQueryCategoryModel"
 *       primaryKeyField="categoryId"
 *       entityLabel="Category"
 *       entityPath="v2/Category"
 *       listPath="/v2/Category/List"
 *     />
 *   );
 * }
 * ```
 */

import React, { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import BaseEntityForm from './BaseEntityForm';
import type { EntityClient, EntityFormMode, BasePropertyEditorProps } from './types';

/**
 * Props for EntityPage
 */
export interface EntityPageProps<TEntity extends Record<string, any>, TSaveModel = TEntity> {
  /** API client for entity operations */
  client: EntityClient<TEntity, TSaveModel>;
  /** Name of the query model interface (e.g., 'IQueryCategoryModel') */
  queryModelName: string;
  /** Name of the save model interface - derived if not provided */
  saveModelName?: string;
  /** Primary key field name */
  primaryKeyField: string;
  /** Display label for the entity type */
  entityLabel: string;
  /** Base path for entity pages (e.g., 'v2/Category') */
  entityPath: string;
  /** Path to the list page for cancel/back navigation */
  listPath: string;
  /** Optional explicit mode override (otherwise derived from route) */
  mode?: EntityFormMode;
  /** Optional explicit entity ID override (otherwise from route params) */
  entityId?: string | number;
  /** Custom property editor component */
  PropertyEditor?: React.ComponentType<BasePropertyEditorProps<TEntity>>;
  /** Default values for new entity */
  defaultValues?: Partial<TEntity>;
  /** Custom title override */
  title?: string;
  /** Additional CSS class */
  className?: string;
  /** Callback after successful save */
  onSaveSuccess?: (entity: TEntity) => void;
  /** Callback after cancel */
  onCancel?: () => void;
}

/**
 * Determine form mode from route path
 */
function getModeFromPath(pathname: string): EntityFormMode {
  const lowerPath = pathname.toLowerCase();
  if (lowerPath.includes('/create') || lowerPath.includes('/new') || lowerPath.endsWith('/edit/new')) {
    return 'create';
  }
  if (lowerPath.includes('/view')) {
    return 'view';
  }
  return 'edit';
}

/**
 * EntityPage component
 */
function EntityPage<TEntity extends Record<string, any>, TSaveModel = TEntity>({
  client,
  queryModelName,
  saveModelName,
  primaryKeyField,
  entityLabel,
  entityPath,
  listPath,
  mode: explicitMode,
  entityId: explicitEntityId,
  PropertyEditor,
  defaultValues,
  title,
  className = '',
  onSaveSuccess,
  onCancel,
}: EntityPageProps<TEntity, TSaveModel>) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine mode
  const mode = useMemo(() => {
    if (explicitMode) return explicitMode;
    // Check if ID is 'new' or route path indicates create
    if (id === 'new') return 'create';
    return getModeFromPath(location.pathname);
  }, [explicitMode, id, location.pathname]);

  // Determine entity ID
  const entityId = useMemo(() => {
    if (explicitEntityId !== undefined) return explicitEntityId;
    if (mode === 'create' || id === 'new') return undefined;
    return id;
  }, [explicitEntityId, mode, id]);

  // Handle save success - navigate to edit page after create
  const handleSaveSuccess = (entity: TEntity) => {
    if (onSaveSuccess) {
      onSaveSuccess(entity);
    } else if (mode === 'create') {
      // Navigate to edit mode after creating
      const newId = (entity as any)[primaryKeyField];
      if (newId) {
        // Normalize path to avoid double slashes (entityPath may or may not have leading slash)
        const normalizedPath = entityPath.startsWith('/') ? entityPath : `/${entityPath}`;
        navigate(`${normalizedPath}/Edit/${newId}`, { replace: true });
      }
    }
  };

  // Handle cancel - navigate back to list
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(listPath);
    }
  };

  // Generate page title based on mode if not provided
  const pageTitle = title || (
    mode === 'create'
      ? `Create ${entityLabel}`
      : mode === 'view'
        ? `${entityLabel} Details`
        : `Edit ${entityLabel}`
  );

  // CSS class based on mode
  const pageClassName = `${entityLabel.toLowerCase().replace(/\s+/g, '-')}-${mode}-page p-4 ${className}`;

  return (
    <ErrorBoundary level="component" componentName={`${entityLabel}${mode.charAt(0).toUpperCase() + mode.slice(1)}`}>
      <div className={pageClassName}>
        <BaseEntityForm<TEntity, TSaveModel>
          mode={mode}
          entityId={entityId}
          client={client}
          queryModelName={queryModelName}
          saveModelName={saveModelName}
          primaryKeyField={primaryKeyField}
          entityLabel={entityLabel}
          entityPath={entityPath}
          listPath={listPath}
          onSaveSuccess={handleSaveSuccess}
          onCancel={handleCancel}
          title={pageTitle}
          useReactRouter={false}
          defaultValues={defaultValues}
          PropertyEditor={PropertyEditor}
        />
      </div>
    </ErrorBoundary>
  );
}

export default EntityPage;
