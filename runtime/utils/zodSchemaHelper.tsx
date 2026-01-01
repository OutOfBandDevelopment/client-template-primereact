import React from 'react';
import { z } from 'zod';
import type { GenericGridColumn } from '@/components/ui/prime/GenericGrid/types';

/**
 * Helper to check if a metadata value is truthy
 * Handles both boolean true and string 'True'/'true' formats
 */
function isMetadataTrue(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

/**
 * Metadata that can be attached to Zod schema fields
 * Based on actual x- properties used in swagger.json
 */
export interface ZodFieldMetadata {
  // Navigation and relationships
  'x-navigation-key'?: boolean | string;     // Primary key on this model
  'x-navigation-target'?: string;            // Class name of related model
  'x-navigation-relation'?: string;          // Related field for navigation
  'x-navigation-description'?: string;       // Description for navigation target relationship
  'x-query-set'?: string;                    // Entity model this query model is associated with
  'x-query-action'?: string;                 // Query action type

  // Display and labeling
  'x-label'?: string;                        // Column header / field label
  'x-display-value'?: boolean | string;      // Field used as display value

  // Permissions and access
  'x-permissions'?: string | string[];       // Roles allowed to use related operation

  // Search, filter, and sort behavior
  'x-default-sort'?: string | string[];      // Default sort fields for this model
  'x-searchable'?: boolean | string;         // Field used with search term
  'x-not-searchable'?: boolean | string;     // Field does not support search term query
  'x-search-term-default'?: boolean | string; // Default search term field
  'x-filterable'?: boolean | string;         // Field supports filtering
  'x-not-filterable'?: boolean | string;     // Field does not support filtering
  'x-not-sortable'?: boolean | string;       // Field does not support sorting

  // Column display
  'x-hidden-column'?: boolean | string;      // Column hidden by default in grid
  'x-not-selectable'?: boolean | string;     // Entity not selectable in dropdowns
  'x-cell-renderer'?: string;                // Cell renderer name for registry lookup

  // Field sets
  'x-field-set'?: string;                    // Field set grouping

  // Standard OpenAPI properties
  'readOnly'?: boolean;                      // Field is read-only (standard OpenAPI property)

  // Schema metadata
  'full-name'?: string;                      // Original server-side class name

  [key: string]: any;
}

/**
 * Extract field information from a Zod schema
 */
export interface ZodFieldInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array' | 'unknown';
  isNullable: boolean;
  isOptional: boolean;
  metadata: ZodFieldMetadata;
  zodType: z.ZodTypeAny;
  /** For object types, contains the nested fields */
  nestedFields?: ZodFieldInfo[];
  /** For object types, the inner ZodObject schema */
  nestedSchema?: z.ZodObject<any>;
}

/**
 * Configuration options for converting Zod schema to grid columns
 */
export interface ZodToGridOptions {
  includeHidden?: boolean;
  excludeFields?: string[];
  /** Fields to include in columns but mark as hidden (for filtering only) */
  hiddenColumns?: string[];
  customRenderers?: Record<string, (value: any) => React.ReactNode>;
  columnOverrides?: Partial<Record<string, Partial<GenericGridColumn<any>>>>;
}

/**
 * Extract field information from a Zod object schema
 */
export function extractZodFields(schema: z.ZodObject<any>): ZodFieldInfo[] {
  // Defensive null/undefined check - return empty array if schema is invalid
  if (!schema || typeof schema !== 'object' || !schema.shape) {
    console.warn('extractZodFields: Invalid schema provided, returning empty array');
    return [];
  }

  const shape = schema.shape;
  const fields: ZodFieldInfo[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const fieldInfo = extractFieldInfo(key, value as z.ZodTypeAny);
    if (fieldInfo) {
      fields.push(fieldInfo);
    }
  }

  return fields;
}

/**
 * Extract information from a single Zod field
 */
function extractFieldInfo(name: string, zodType: z.ZodTypeAny): ZodFieldInfo | null {
  let type: ZodFieldInfo['type'] = 'unknown';
  let isNullable = false;
  let isOptional = false;
  let metadata: ZodFieldMetadata = {};
  let currentType = zodType;

  // Extract metadata from the original type before unwrapping using Zod v4 .meta() method
  let metadataSource = zodType;
  while (metadataSource) {
    // Use Zod v4 .meta() method
    if (typeof metadataSource.meta === 'function') {
      const metaResult = metadataSource.meta();
      if (metaResult && typeof metaResult === 'object' && Object.keys(metaResult).length > 0) {
        metadata = metaResult;
        break;
      }
    }
    
    // Check inner type if current doesn't have metadata
    if (metadataSource._def && metadataSource._def.innerType) {
      metadataSource = metadataSource._def.innerType;
    } else {
      break;
    }
  }

  // Then unwrap nullable/optional/nullish modifiers to determine the base type
  while (true) {
    if (currentType instanceof z.ZodNullable) {
      isNullable = true;
      currentType = currentType._def.innerType;
    } else if (currentType instanceof z.ZodOptional) {
      isOptional = true;
      currentType = currentType._def.innerType;
    } else if (currentType._def?.typeName === 'ZodNullable') {
      isNullable = true;
      currentType = currentType._def.innerType;
    } else if (currentType._def?.typeName === 'ZodOptional') {
      isOptional = true;
      currentType = currentType._def.innerType;
    } else {
      break;
    }
  }

  // Variables for nested object fields
  let nestedFields: ZodFieldInfo[] | undefined;
  let nestedSchema: z.ZodObject<any> | undefined;

  // Determine the base type from the innermost type
  if (currentType instanceof z.ZodString) {
    type = 'string';
  } else if (currentType instanceof z.ZodNumber) {
    type = 'number';
  } else if (currentType instanceof z.ZodBoolean) {
    type = 'boolean';
  } else if (currentType instanceof z.ZodDate) {
    type = 'date';
  } else if (currentType instanceof z.ZodObject) {
    type = 'object';
    nestedSchema = currentType;
  } else if (currentType instanceof z.ZodArray) {
    type = 'array';
  } else if (currentType._def?.typeName) {
    // Handle cases where instanceof doesn't work due to bundling/version issues
    switch (currentType._def.typeName) {
      case 'ZodString': type = 'string'; break;
      case 'ZodNumber': type = 'number'; break;
      case 'ZodBoolean': type = 'boolean'; break;
      case 'ZodDate': type = 'date'; break;
      case 'ZodObject':
        type = 'object';
        nestedSchema = currentType as z.ZodObject<any>;
        break;
      case 'ZodArray': type = 'array'; break;
    }
  }

  // For object types, extract nested fields recursively
  if (type === 'object' && nestedSchema) {
    try {
      const shape = typeof nestedSchema.shape === 'function'
        ? nestedSchema.shape()
        : nestedSchema.shape;

      if (shape && typeof shape === 'object') {
        nestedFields = [];
        for (const [nestedKey, nestedValue] of Object.entries(shape)) {
          const nestedFieldInfo = extractFieldInfo(nestedKey, nestedValue as z.ZodTypeAny);
          if (nestedFieldInfo) {
            nestedFields.push(nestedFieldInfo);
          }
        }
      }
    } catch (e) {
      console.warn(`Failed to extract nested fields for ${name}:`, e);
    }
  }

  return {
    name,
    type,
    isNullable,
    isOptional,
    metadata,
    zodType,
    nestedFields,
    nestedSchema,
  };
}

/**
 * Convert a Zod schema to GenericGrid columns with automatic configuration
 */
export function zodSchemaToGridColumns<TModel>(
  schema: z.ZodObject<any>,
  options: ZodToGridOptions = {}
): GenericGridColumn<TModel>[] {
  const fields = extractZodFields(schema);
  const columns: GenericGridColumn<TModel>[] = [];

  for (const field of fields) {
    // Skip hidden columns unless explicitly included
    if (isMetadataTrue(field.metadata['x-hidden-column']) && !options.includeHidden) {
      continue;
    }

    // Skip excluded fields
    if (options.excludeFields?.includes(field.name)) {
      continue;
    }

    // Skip object and array fields by default - they can't be rendered directly
    // unless a custom renderer is provided via customRenderers or columnOverrides
    if ((field.type === 'object' || field.type === 'array') &&
        !options.customRenderers?.[field.name] &&
        !options.columnOverrides?.[field.name]?.body) {
      continue;
    }

    // Navigation target fields (foreign key IDs) - include for filters but hidden from grid
    const isNavigationTarget = !!field.metadata['x-navigation-target'];
    const navigationVariant = field.metadata['x-navigation-variant'];
    // Navigation relation fields (display text) - visible in grid and sortable, but not filterable
    const isNavigationRelation = !!field.metadata['x-navigation-relation'];

    // Determine the header text
    // Priority: x-label > x-navigation-description > formatted field name
    let header = field.metadata['x-label'] || field.metadata['x-navigation-description'] || formatFieldName(field.name);
    // Navigation target fields (IDs) get "ID" suffix for clarity in column selector
    if (isNavigationTarget && !header.toLowerCase().endsWith(' id')) {
      header = `${header} ID`;
    }

    // Build the column configuration using proper metadata fields
    const column: GenericGridColumn<TModel> = {
      field: field.name as keyof TModel,
      header,
      // Navigation target fields (IDs) are not sortable; relation fields (text) are sortable
      sortable: !isMetadataTrue(field.metadata['x-not-sortable']) && !isNavigationTarget,
      // Navigation relation fields (text) are not filterable - use the target ID for filtering
      // Navigation target fields (IDs) are filterable via multiselect
      filterable: !isMetadataTrue(field.metadata['x-not-filterable']) && !isNavigationRelation,
      // Navigation targets use multiselect filter type
      filterType: isNavigationTarget ? 'multiselect' : getFilterType(field),
      // Navigation target fields (IDs) should be hidden by default
      // but still available in column selector for exports
      hidden: isNavigationTarget,
      // Include navigation target for loading related entity options
      navigationTarget: field.metadata['x-navigation-target'],
      // Include navigation variant for filtered combobox/multiselect
      navigationVariant: navigationVariant,
      // Include cell renderer name for registry lookup
      cellRenderer: field.metadata['x-cell-renderer'],
    };

    // Add custom renderer if specified
    if (options.customRenderers?.[field.name]) {
      column.body = options.customRenderers[field.name];
    } else if (field.metadata['x-format']) {
      column.body = createFormattedRenderer(field.metadata['x-format']);
    }

    // Apply column overrides
    if (options.columnOverrides?.[field.name]) {
      Object.assign(column, options.columnOverrides[field.name]);
    }

    columns.push(column);
  }

  return columns;
}

/**
 * Get the appropriate filter type for a field
 */
function getFilterType(field: ZodFieldInfo): GenericGridColumn<any>['filterType'] {
  if (field.metadata['x-column-type']) {
    return field.metadata['x-column-type'];
  }

  switch (field.type) {
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    default:
      return 'text';
  }
}

/**
 * Format a field name for display
 */
function formatFieldName(fieldName: string): string {
  // Convert camelCase or PascalCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(Id|Url|Api|Ui|Db)\b/gi, match => match.toUpperCase());
}

/**
 * Create a formatted renderer based on format type
 */
function createFormattedRenderer(format: string): (value: any) => React.ReactNode {
  switch (format) {
    case 'currency':
      return (value: any) => {
        if (value == null) return '';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value);
      };
    
    case 'percentage':
      return (value: any) => {
        if (value == null) return '';
        return `${(value * 100).toFixed(2)}%`;
      };
    
    case 'date':
      return (value: any) => {
        if (!value) return '';
        return new Date(value).toLocaleDateString();
      };
    
    case 'datetime':
      return (value: any) => {
        if (!value) return '';
        return new Date(value).toLocaleString();
      };
    
    case 'email':
      return (value: any) => {
        if (!value) return '';
        return <a href={`mailto:${value}`} className="text-primary">{value}</a>;
      };
    
    case 'phone':
      return (value: any) => {
        if (!value) return '';
        return <a href={`tel:${value}`} className="text-primary">{value}</a>;
      };
    
    default:
      return (value: any) => value;
  }
}

/**
 * Get comprehensive schema metadata for creating relationships, navigation, and configuration
 */
export function getSchemaMetadata(schema: z.ZodObject<any>): {
  // Core identification
  fullName?: string;
  primaryKey?: string;
  querySet?: string;

  // Relationships
  navigationTargets: Record<string, string>;

  // Search and filter behavior
  searchableFields: string[];
  searchTermFields: string[];
  filterableFields: string[];
  sortableFields: string[];

  // Default behavior
  defaultSortFields: string[];

  // Field categorization
  requiredFields: string[];
  hiddenFields: string[];

  // Permissions
  fieldPermissions: Record<string, string[]>;

  // Labels
  fieldLabels: Record<string, string>;
} {
  // Defensive null/undefined check - return empty metadata if schema is invalid
  if (!schema || typeof schema !== 'object') {
    console.warn('getSchemaMetadata: Invalid schema provided, returning empty metadata');
    return {
      navigationTargets: {},
      searchableFields: [],
      searchTermFields: [],
      filterableFields: [],
      sortableFields: [],
      defaultSortFields: [],
      requiredFields: [],
      hiddenFields: [],
      fieldPermissions: {},
      fieldLabels: {},
    };
  }

  const fields = extractZodFields(schema);
  let primaryKey: string | undefined;
  let querySet: string | undefined;
  let fullName: string | undefined;
  
  const navigationTargets: Record<string, string> = {};
  const searchableFields: string[] = [];
  const searchTermFields: string[] = [];
  const filterableFields: string[] = [];
  const sortableFields: string[] = [];
  const defaultSortFields: string[] = [];
  const requiredFields: string[] = [];
  const hiddenFields: string[] = [];
  const fieldPermissions: Record<string, string[]> = {};
  const fieldLabels: Record<string, string> = {};

  // Check schema-level metadata using Zod v4 .meta() method
  let schemaMeta: any = null;
  
  // Use Zod v4 .meta() method
  if (typeof schema.meta === 'function') {
    schemaMeta = schema.meta();
  }
  
  if (schemaMeta) {
    if (schemaMeta['full-name']) {
      fullName = schemaMeta['full-name'];
    }
    if (schemaMeta['x-query-set']) {
      querySet = schemaMeta['x-query-set'];
    }
    if (schemaMeta['x-default-sort']) {
      const defaultSort = schemaMeta['x-default-sort'];
      if (Array.isArray(defaultSort)) {
        defaultSortFields.push(...defaultSort);
      } else if (typeof defaultSort === 'string') {
        defaultSortFields.push(defaultSort);
      }
    }
  }

  for (const field of fields) {
    // Primary key identification
    if (isMetadataTrue(field.metadata['x-navigation-key'])) {
      primaryKey = field.name;
    }

    // Query set (entity association)
    if (field.metadata['x-query-set'] && !querySet) {
      querySet = field.metadata['x-query-set'];
    }

    // Navigation targets (foreign keys)
    if (field.metadata['x-navigation-target']) {
      navigationTargets[field.name] = field.metadata['x-navigation-target'];
    }

    // Search behavior
    if (!isMetadataTrue(field.metadata['x-not-searchable'])) {
      searchableFields.push(field.name);
    }

    if (isMetadataTrue(field.metadata['x-searchable'])) {
      searchTermFields.push(field.name);
    }

    // Filter behavior - exclude navigation relation fields (text) - use target ID for filtering
    if (!isMetadataTrue(field.metadata['x-not-filterable']) && !field.metadata['x-navigation-relation']) {
      filterableFields.push(field.name);
    }

    // Sort behavior - exclude navigation target fields (IDs) from sorting
    // Navigation relation fields (text) ARE sortable
    if (!isMetadataTrue(field.metadata['x-not-sortable']) && !field.metadata['x-navigation-target']) {
      sortableFields.push(field.name);
    }

    // Default sort fields
    if (field.metadata['x-default-sort']) {
      const defaultSort = field.metadata['x-default-sort'];
      if (Array.isArray(defaultSort)) {
        defaultSortFields.push(...defaultSort);
      } else if (typeof defaultSort === 'string') {
        defaultSortFields.push(defaultSort);
      }
    }

    // Field states
    if (!field.isOptional && !field.isNullable) {
      requiredFields.push(field.name);
    }

    if (isMetadataTrue(field.metadata['x-hidden-column'])) {
      hiddenFields.push(field.name);
    }

    // Permissions
    if (field.metadata['x-permissions']) {
      const permissions = field.metadata['x-permissions'];
      if (Array.isArray(permissions)) {
        fieldPermissions[field.name] = permissions;
      } else if (typeof permissions === 'string') {
        fieldPermissions[field.name] = permissions.split(',').map(p => p.trim());
      }
    }

    // Labels - use x-label first, then x-navigation-description as fallback
    if (field.metadata['x-label']) {
      fieldLabels[field.name] = field.metadata['x-label'];
    } else if (field.metadata['x-navigation-description']) {
      fieldLabels[field.name] = field.metadata['x-navigation-description'];
    }
  }

  return {
    fullName,
    primaryKey,
    querySet,
    navigationTargets,
    searchableFields,
    searchTermFields,
    filterableFields,
    sortableFields,
    defaultSortFields: [...new Set(defaultSortFields)], // Remove duplicates
    requiredFields,
    hiddenFields,
    fieldPermissions,
    fieldLabels,
  };
}

/**
 * Create numeric columns array from schema
 */
export function getNumericColumns(schema: z.ZodObject<any>): string[] {
  const fields = extractZodFields(schema);
  return fields
    .filter(field => field.type === 'number')
    .map(field => field.name);
}

/**
 * Check if a user has permission to access a field based on role
 */
export function hasFieldPermission(fieldPermissions: string[], userRoleId: number): boolean {
  if (!fieldPermissions || fieldPermissions.length === 0) {
    return true; // No restrictions means everyone has access
  }
  
  // Convert role ID to string for comparison (assuming permissions are stored as strings)
  const roleStr = userRoleId.toString();
  return fieldPermissions.includes(roleStr);
}

/**
 * Filter columns based on user permissions
 */
export function filterColumnsByPermissions<TModel>(
  columns: GenericGridColumn<TModel>[],
  schemaMetadata: ReturnType<typeof getSchemaMetadata>,
  userRoleId: number
): GenericGridColumn<TModel>[] {
  return columns.filter(column => {
    const fieldName = column.field as string;
    const permissions = schemaMetadata.fieldPermissions[fieldName];
    return hasFieldPermission(permissions, userRoleId);
  });
}

/**
 * Get default sorting configuration from schema metadata
 */
export function getDefaultSortConfig(schemaMetadata: ReturnType<typeof getSchemaMetadata>): Array<{field: string, direction: 'asc' | 'desc'}> {
  return schemaMetadata.defaultSortFields.map(field => {
    // Check if field has direction specified (e.g., "fieldName:desc")
    if (field.includes(':')) {
      const [fieldName, direction] = field.split(':');
      return {
        field: fieldName,
        direction: direction.toLowerCase() === 'desc' ? 'desc' : 'asc'
      };
    }
    
    return {
      field,
      direction: 'asc' as const
    };
  });
}

/**
 * Get related model information for navigation
 */
export function getRelatedModelInfo(
  fieldName: string,
  schemaMetadata: ReturnType<typeof getSchemaMetadata>
): {
  targetModel?: string;
  isNavigation: boolean;
  isPrimaryKey: boolean;
} {
  return {
    targetModel: schemaMetadata.navigationTargets[fieldName],
    isNavigation: !!schemaMetadata.navigationTargets[fieldName],
    isPrimaryKey: schemaMetadata.primaryKey === fieldName
  };
}

/**
 * Create enhanced column configuration with full metadata support
 */
export function createEnhancedColumns<TModel>(
  schema: z.ZodObject<any>,
  options: ZodToGridOptions & {
    userRoleId?: number;
    includeTooltips?: boolean;
    applyPermissions?: boolean;
  } = {}
): {
  columns: GenericGridColumn<TModel>[];
  metadata: ReturnType<typeof getSchemaMetadata>;
  defaultSort: Array<{field: string, direction: 'asc' | 'desc'}>;
} {
  const metadata = getSchemaMetadata(schema);
  let columns = zodSchemaToGridColumns<TModel>(schema, options);
  
  // Apply tooltips from metadata if enabled
  if (options.includeTooltips) {
    columns = columns.map(col => {
      const fieldName = col.field as string;
      const tooltip = metadata.fieldTooltips[fieldName];
      return tooltip ? { ...col, tooltip } : col;
    });
  }
  
  // Filter by permissions if user role is provided and permission filtering is enabled
  if (options.applyPermissions && options.userRoleId !== undefined) {
    columns = filterColumnsByPermissions(columns, metadata, options.userRoleId);
  }
  
  const defaultSort = getDefaultSortConfig(metadata);
  
  return {
    columns,
    metadata,
    defaultSort
  };
}

/**
 * Create a lookup function to get Zod schema by interface name
 */
export function createSchemaLookup(): (interfaceName: string) => Promise<z.ZodObject<any> | null> {
  // Dynamic import map for schemas
  const schemaMap: Record<string, () => Promise<{ default: z.ZodObject<any> }>> = {
    'IQueryManufacturerModel': () => import('@/api/GreenOnion/Schema/ZQueryManufacturerModel'),
    'IQueryAllergenModel': () => import('@/api/GreenOnion/Schema/ZQueryAllergenModel'),
    'IQueryDistrictModel': () => import('@/api/GreenOnion/Schema/ZQuerySchoolDistrictModel'),
    'IQueryUserModel': () => import('@/api/GreenOnion/Schema/ZQueryUserModel'),
    'IQueryProductModel': () => import('@/api/GreenOnion/Schema/ZQueryProductModel'),
    'IQueryIngredientModel': () => import('@/api/GreenOnion/Schema/ZQueryIngredientModel'),
    'IQueryErrorLogModel': () => import('@/api/GreenOnion/Schema/ZQueryErrorLogModel'),
    'IQueryUserActionLogModel': () => import('@/api/GreenOnion/Schema/ZQueryUserActionLogModel'),
    'IQueryDefinedFilterModel': () => import('@/api/GreenOnion/Schema/ZQueryDefinedFilterModel'),
    // Add more mappings as needed
  };

  return async (interfaceName: string): Promise<z.ZodObject<any> | null> => {
    const loader = schemaMap[interfaceName];
    if (!loader) {
      console.warn(`No schema mapping found for interface: ${interfaceName}`);
      return null;
    }

    try {
      const module = await loader();
      return module.default;
    } catch (error) {
      console.error(`Failed to load schema for ${interfaceName}:`, error);
      return null;
    }
  };
}