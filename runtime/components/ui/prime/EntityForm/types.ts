/**
 * Types for the EntityForm system
 *
 * Provides a reusable entity form infrastructure similar to SimpleGenericGrid
 * for handling create, edit, and view operations.
 */

import type { z } from 'zod';

/**
 * Utility type to infer entity type from Zod schema
 */
export type InferEntity<T> = T extends z.ZodType<infer U> ? U : never;

/**
 * Form mode determines field editability and available actions
 */
export type EntityFormMode = 'create' | 'edit' | 'view';

/**
 * Field type for rendering appropriate input control
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'url'
  | 'readonly'
  | 'images'
  | 'navigation'
  | 'complex';

/**
 * Metadata for a single field extracted from Zod schema
 */
export interface FieldMetadata {
  /** Field name (property key) */
  field: string;
  /** Display label */
  label: string;
  /** Field type for rendering */
  type: FieldType;
  /** Whether field is required */
  required: boolean;
  /** Whether field is read-only */
  readOnly: boolean;
  /** Whether field is nullable */
  nullable: boolean;
  /** Whether field should be hidden */
  hidden: boolean;
  /** Whether field is a complex object */
  isComplex: boolean;
  /** Fieldset name for grouping */
  fieldSet?: string;
  /** Sort order within fieldset */
  sortOrder?: number;
  /** Navigation target for lookup fields */
  navigationTarget?: string;
  /** Navigation relation (display field) */
  navigationRelation?: string;
  /** Format hint (date-time, email, etc.) */
  format?: string;
  /** Minimum value for numbers */
  minimum?: number;
  /** Maximum value for numbers */
  maximum?: number;
  /** Max length for strings */
  maxLength?: number;
  /** Custom renderer name */
  customRenderer?: string;
}

/**
 * Configuration for a fieldset (group of fields)
 */
export interface FieldSetConfig {
  /** Fieldset identifier */
  name: string;
  /** Display label */
  label: string;
  /** Whether the fieldset is initially collapsed */
  collapsed: boolean;
  /** Whether the fieldset can be toggled */
  collapsible: boolean;
  /** Sort order for fieldset ordering */
  sortOrder?: number;
  /** Fields in this fieldset */
  fields: FieldMetadata[];
}

/**
 * Client interface for entity operations
 *
 * Matches the generated client pattern with named parameters:
 * - Get({ id: ... })
 * - Save({ body: ... })
 */
export interface EntityClient<TEntity, TSaveModel = TEntity> {
  /** Get entity by ID */
  Get: (params: { id: number | string }) => Promise<TEntity | undefined | null>;
  /** Save (create or update) entity - uses body parameter for request payload */
  Save: (params: { body: TSaveModel }) => Promise<TEntity | undefined | null>;
  /** Optional delete operation */
  Delete?: (params: { id: number | string }) => Promise<boolean>;
}

/**
 * Props for the BaseEntityForm component
 *
 * Generic parameters:
 * - TQuerySchema: Zod schema for the query model (what we read from API)
 * - TSaveSchema: Zod schema for the save model (what we write to API)
 *
 * Entity types are inferred from schemas:
 * - TEntity = z.infer<TQuerySchema>
 * - TSaveModel = z.infer<TSaveSchema>
 */
export interface BaseEntityFormProps<
  TQuerySchema extends z.ZodObject<any> = z.ZodObject<any>,
  TSaveSchema extends z.ZodObject<any> = TQuerySchema,
  TEntity = z.infer<TQuerySchema>,
  TSaveModel = z.infer<TSaveSchema>
> {
  /** Form mode: create, edit, or view */
  mode: EntityFormMode;
  /** Entity ID for edit/view modes */
  entityId?: number | string;
  /** API client for entity operations */
  client: EntityClient<TEntity, TSaveModel>;
  /** Zod schema for the query model */
  querySchema?: TQuerySchema;
  /** Zod schema for the save model */
  saveSchema?: TSaveSchema;
  /** Name of the query model interface (e.g., 'IQueryCategoryModel') - optional if querySchema provided */
  queryModelName: string;
  /** Name of the save model interface (e.g., 'SaveCategoryModel') - derived if not provided */
  saveModelName?: string;
  /** Primary key field name */
  primaryKeyField: string;
  /** Display label for the entity type */
  entityLabel: string;
  /** Entity path for navigation (e.g., 'categories') */
  entityPath?: string;
  /** List path for back/cancel navigation */
  listPath?: string;
  /** Callback when save succeeds */
  onSaveSuccess?: (entity: TEntity) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Custom title override */
  title?: string;
  /** Whether to show the header/title bar */
  showHeader?: boolean;
  /** Whether to show action buttons (Save/Cancel) */
  showActions?: boolean;
  /** Custom CSS class */
  className?: string;
  /** Use React Router navigation for cancel */
  useReactRouter?: boolean;
  /** Default values for new entity */
  defaultValues?: Partial<TEntity>;
  /** Custom property editor component */
  PropertyEditor?: React.ComponentType<BasePropertyEditorProps<TEntity>>;
}

/**
 * Props for the BasePropertyEditor component
 */
export interface BasePropertyEditorProps<TEntity> {
  /** Entity being edited */
  entity?: TEntity | null;
  /** Form data state */
  formData: Partial<TEntity>;
  /** Callback when form data changes */
  onChange: (field: keyof TEntity, value: any) => void;
  /** Whether the form is in loading state */
  loading?: boolean;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** CSS class name */
  className?: string;
  /** Fields marked as editable (from Save model) */
  editableFields?: Set<string>;
  /** Render mode: 'edit' shows editable fields, 'view' shows all fields read-only */
  mode?: 'edit' | 'view';
  /** Name of the query model for schema lookup */
  queryModelName?: string;
  /** Fieldset configurations (if pre-computed) */
  fieldSets?: FieldSetConfig[];
}

/**
 * Props for EntityFormPage - the unified page component
 */
export interface EntityFormPageProps<TEntity, TSaveModel = TEntity> extends Omit<BaseEntityFormProps<TEntity, TSaveModel>, 'mode' | 'entityId'> {
  /** Page mode determined by route */
  mode?: EntityFormMode;
}
