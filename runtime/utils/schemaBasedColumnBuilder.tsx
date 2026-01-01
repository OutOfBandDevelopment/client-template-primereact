import React from 'react';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import type { GenericGridColumn } from '@/components/ui/prime/GenericGrid/types';
import { zodRegistry } from '@/api/GreenOnion/Schema/Registry';
import { zodSchemaToGridColumns, type ZodToGridOptions } from '@/utils/zodSchemaHelper';
import type { z } from 'zod';

/**
 * Configuration for schema-based column generation
 */
export interface SchemaColumnBuilderOptions<TModel> extends ZodToGridOptions {
  /** Enable actions column with edit/view/delete buttons */
  enableActions?: boolean;
  /** Action handlers */
  onEditClick?: (id: number | string, row: TModel) => void;
  onViewClick?: (id: number | string, row: TModel) => void;
  onDeleteClick?: (id: number | string, row: TModel) => void;
  /** Primary key field name for action handlers */
  primaryKeyField?: keyof TModel;
  /** Custom column definitions that override schema-generated ones */
  customColumns?: Partial<Record<keyof TModel, Partial<GenericGridColumn<TModel>>>>;
  /** Additional columns to prepend or append */
  additionalColumns?: {
    prepend?: GenericGridColumn<TModel>[];
    append?: GenericGridColumn<TModel>[];
  };
}

/**
 * Build GenericGrid columns dynamically from a TModel interface's Zod schema
 * 
 * This function:
 * 1. Looks up the TModel interface in the Zod registry
 * 2. Uses zodSchemaToGridColumns to generate base column definitions
 * 3. Applies customizations and adds action columns as needed
 * 4. Returns properly typed GenericGridColumn array
 * 
 * @param interfaceName - The model interface name (e.g., 'IQuerySchoolDistrictModel')
 * @param options - Configuration options for column generation
 * @returns Promise<GenericGridColumn<TModel>[]> - Array of column definitions
 */
export async function buildColumnsFromSchema<TModel>(
  interfaceName: string,
  options: SchemaColumnBuilderOptions<TModel> = {}
): Promise<GenericGridColumn<TModel>[]> {
  try {
    // Look up schema from registry
    const schema = await zodRegistry.getSchemaByInterface(interfaceName);
    
    if (!schema) {
      console.warn(`[buildColumnsFromSchema] Schema not found for interface: ${interfaceName}`);
      return [];
    }

    // Generate base columns from schema
    const baseColumns = zodSchemaToGridColumns<TModel>(schema as z.ZodObject<any>, options);
    
    // Apply custom column overrides
    const columns = baseColumns.map(column => {
      const customColumn = options.customColumns?.[column.field];
      return customColumn ? { ...column, ...customColumn } : column;
    });

    // Add actions column if enabled
    if (options.enableActions) {
      const actionsColumn = createActionsColumn<TModel>(
        options.onEditClick,
        options.onViewClick,
        options.onDeleteClick,
        options.primaryKeyField
      );
      columns.unshift(actionsColumn); // Add at beginning
    }

    // Add additional columns
    const finalColumns = [
      ...(options.additionalColumns?.prepend || []),
      ...columns,
      ...(options.additionalColumns?.append || [])
    ];

    return finalColumns;
    
  } catch (error) {
    console.error(`[buildColumnsFromSchema] Error building columns for ${interfaceName}:`, error);
    return [];
  }
}

/**
 * Build columns from schema synchronously (for cases where schema is already loaded)
 */
export function buildColumnsFromLoadedSchema<TModel>(
  schema: z.ZodObject<any>,
  options: SchemaColumnBuilderOptions<TModel> = {}
): GenericGridColumn<TModel>[] {
  try {
    // Generate base columns from schema
    const baseColumns = zodSchemaToGridColumns<TModel>(schema, options);
    
    // Apply custom column overrides
    const columns = baseColumns.map(column => {
      const customColumn = options.customColumns?.[column.field];
      return customColumn ? { ...column, ...customColumn } : column;
    });

    // Add actions column if enabled
    if (options.enableActions) {
      const actionsColumn = createActionsColumn<TModel>(
        options.onEditClick,
        options.onViewClick,
        options.onDeleteClick,
        options.primaryKeyField
      );
      columns.unshift(actionsColumn); // Add at beginning
    }

    // Add additional columns
    const finalColumns = [
      ...(options.additionalColumns?.prepend || []),
      ...columns,
      ...(options.additionalColumns?.append || [])
    ];

    return finalColumns;
    
  } catch (error) {
    console.error(`[buildColumnsFromLoadedSchema] Error building columns:`, error);
    return [];
  }
}

/**
 * Create an actions column with edit/view/delete buttons
 */
function createActionsColumn<TModel>(
  onEditClick?: (id: number | string, row: TModel) => void,
  onViewClick?: (id: number | string, row: TModel) => void,
  onDeleteClick?: (id: number | string, row: TModel) => void,
  primaryKeyField?: keyof TModel
): GenericGridColumn<TModel> {
  return {
    field: "actions" as keyof TModel,
    header: "Actions",
    sortable: false,
    filterable: false,
    width: "120px",
    body: (rowData: TModel) => {
      const primaryKey = primaryKeyField ? rowData[primaryKeyField] : null;
      const id = (primaryKey as number | string) || 0;

      return (
        <div className="flex gap-2">
          {onViewClick && (
            <Button
              icon="pi pi-eye"
              className="p-button-rounded p-button-text"
              onClick={(e) => {
                e.stopPropagation();
                onViewClick(id, rowData);
              }}
              tooltip="View"
              size="small"
            />
          )}
          {onEditClick && (
            <Button
              icon="pi pi-pencil"
              className="p-button-rounded p-button-text"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(id, rowData);
              }}
              tooltip="Edit"
              size="small"
            />
          )}
          {onDeleteClick && (
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-text p-button-danger"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick(id, rowData);
              }}
              tooltip="Delete"
              size="small"
            />
          )}
        </div>
      );
    },
  };
}

/**
 * Common column renderers for typical field types
 */
export const ColumnRenderers = {
  /**
   * Boolean field renderer with success/secondary tags
   */
  boolean: (trueLabel = "Yes", falseLabel = "No") => (value: boolean) => (
    <Tag 
      severity={value ? "success" : "secondary"}
      value={value ? trueLabel : falseLabel}
    />
  ),

  /**
   * Status field renderer with active/inactive styling
   */
  status: (value: boolean) => (
    <Tag 
      severity={value ? "success" : "secondary"}
      value={value ? "Active" : "Inactive"}
    />
  ),

  /**
   * Count/number field renderer with info tag
   */
  count: (value: number | null | undefined) => (
    <Tag 
      severity="info"
      value={value?.toString() || "0"}
    />
  ),

  /**
   * Email field renderer with mailto link
   */
  email: (value: string) => value ? (
    <a href={`mailto:${value}`} className="text-primary">
      {value}
    </a>
  ) : "N/A",

  /**
   * Phone field renderer (could be enhanced with tel: link)
   */
  phone: (value: string) => value || "N/A",

  /**
   * Date field renderer
   */
  date: (value: string) => {
    if (!value) return "N/A";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  },

  /**
   * DateTime field renderer
   */
  dateTime: (value: string) => {
    if (!value) return "N/A";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  },

  /**
   * Text field renderer with fallback
   */
  text: (value: string | null | undefined, fallback = "N/A") => value || fallback,

  /**
   * Code/monospace field renderer
   */
  code: (value: string | null | undefined) => value ? (
    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
      {value}
    </span>
  ) : "N/A",

  /**
   * Object field renderer - displays as JSON or placeholder
   * Use this for complex nested objects that need explicit rendering
   */
  object: (value: object | null | undefined, compact = true) => {
    if (!value || typeof value !== 'object') return "N/A";
    try {
      const json = compact
        ? JSON.stringify(value).substring(0, 50) + (JSON.stringify(value).length > 50 ? '...' : '')
        : JSON.stringify(value, null, 2);
      return (
        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded" title={JSON.stringify(value, null, 2)}>
          {json}
        </span>
      );
    } catch {
      return "[Object]";
    }
  },

  /**
   * Array field renderer - displays count or items
   */
  array: (value: any[] | null | undefined) => {
    if (!value || !Array.isArray(value)) return "N/A";
    return (
      <Tag
        severity="info"
        value={`${value.length} item${value.length !== 1 ? 's' : ''}`}
      />
    );
  },
};

