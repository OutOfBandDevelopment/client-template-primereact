/**
 * Schema Builder - Builds EntityFormSchema from Zod schemas
 *
 * This module provides utilities to convert Zod schemas into pre-computed
 * EntityFormSchema definitions. FULLY METADATA-DRIVEN - all field configuration
 * comes from schema metadata (x-field-set, x-label, x-sort-order, etc.)
 *
 * NO HARD-CODED FIELD NAMES OR GROUPINGS - everything is driven by metadata.
 *
 * Used both:
 * 1. At generation time (by Handlebars templates)
 * 2. At runtime (as a fallback when pre-computed schema isn't available)
 */

import { z } from 'zod';
import type {
  EntityFormSchema,
  EntityMetadata,
  FieldSetDefinition,
  FieldDefinition,
  FieldEditorType,
  FieldDataType,
  FieldValidation,
  FieldDisplay,
  NavigationConfig,
} from './EntityFormSchema';
import { getSchema, SCHEMA_REGISTRY } from '@/api/GreenOnion/Schema/Registry';

// =============================================================================
// Constants - Only structural defaults, NO hard-coded field names
// =============================================================================

/** Default fieldset ID for fields without explicit x-field-set metadata */
const DEFAULT_FIELDSET = 'general';
const DEFAULT_FIELDSET_LABEL = 'General';

/**
 * Check if a metadata value is truthy (handles boolean and string 'true'/'True')
 */
function isMetadataTrue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

/** Common abbreviations for label formatting */
const ABBREVIATIONS: Record<string, string> = {
  id: 'ID',
  url: 'URL',
  gln: 'GLN',
  api: 'API',
  ioc: 'IOC',
  upc: 'UPC',
  gtin: 'GTIN',
  sku: 'SKU',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  xml: 'XML',
  pdf: 'PDF',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a schema exists in the registry
 */
function hasSchema(interfaceName: string): boolean {
  return SCHEMA_REGISTRY.some(entry => entry.interfaceName === interfaceName);
}

/**
 * Format a field name into a display label
 */
export function formatFieldLabel(fieldName: string): string {
  return fieldName
    // Insert space before uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Handle consecutive uppercase (like GLN, URL)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    // Handle known abbreviations
    .replace(/\b(\w+)\b/gi, match => {
      const lower = match.toLowerCase();
      return ABBREVIATIONS[lower] || match;
    })
    .trim();
}

/**
 * Generate fieldset ID from label
 */
function fieldSetIdFromLabel(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Extract the underlying type from optional/nullable wrappers
 * Uses instanceof and unwrap methods (Zod v4 pattern)
 */
function unwrapZodType(zodType: z.ZodTypeAny): {
  type: z.ZodTypeAny;
  isOptional: boolean;
  isNullable: boolean;
} {
  let current: z.ZodTypeAny = zodType;
  let isOptional = false;
  let isNullable = false;

  // Keep unwrapping until we hit the base type
  let maxIterations = 10; // Safety limit
  while (maxIterations-- > 0) {
    if (current instanceof z.ZodOptional) {
      isOptional = true;
      current = (current as z.ZodOptional<any>).unwrap();
    } else if (current instanceof z.ZodNullable) {
      isNullable = true;
      current = (current as z.ZodNullable<any>).unwrap();
    } else if (current instanceof z.ZodDefault) {
      current = (current as z.ZodDefault<any>).removeDefault();
    } else {
      break;
    }
  }

  return { type: current, isOptional, isNullable };
}

/**
 * Get schema shape safely
 * Uses instanceof and .shape property (Zod v4 pattern)
 */
function getSchemaShape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  let current: z.ZodTypeAny = schema;

  // Unwrap wrapper types to get to ZodObject
  let maxIterations = 10;
  while (maxIterations-- > 0) {
    if (current instanceof z.ZodObject) {
      return current.shape;
    }
    if (current instanceof z.ZodOptional) {
      current = (current as z.ZodOptional<any>).unwrap();
    } else if (current instanceof z.ZodNullable) {
      current = (current as z.ZodNullable<any>).unwrap();
    } else if (current instanceof z.ZodDefault) {
      current = (current as z.ZodDefault<any>).removeDefault();
    } else {
      break;
    }
  }

  return {};
}

/**
 * Get schema-level metadata
 * Uses .meta() method (Zod v4 pattern)
 */
function getSchemaMetadata(schema: z.ZodTypeAny): Record<string, unknown> {
  let current: z.ZodTypeAny = schema;

  let maxIterations = 10;
  while (maxIterations-- > 0) {
    if (typeof current.meta === 'function') {
      const meta = current.meta();
      if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
        return meta;
      }
    }

    if (current instanceof z.ZodOptional) {
      current = (current as z.ZodOptional<any>).unwrap();
    } else if (current instanceof z.ZodNullable) {
      current = (current as z.ZodNullable<any>).unwrap();
    } else if (current instanceof z.ZodDefault) {
      current = (current as z.ZodDefault<any>).removeDefault();
    } else {
      break;
    }
  }

  return {};
}

/**
 * Get field-level metadata using Zod v4 .meta() method
 */
function getFieldMetadata(zodType: z.ZodTypeAny): Record<string, unknown> {
  let current: z.ZodTypeAny = zodType;

  // Traverse through wrapper types to find metadata
  let maxIterations = 10;
  while (maxIterations-- > 0) {
    // Zod v4: use .meta() method to get metadata
    if (typeof current.meta === 'function') {
      const meta = current.meta();
      if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
        return meta;
      }
    }

    // Unwrap using instanceof (Zod v4 pattern)
    if (current instanceof z.ZodOptional) {
      current = (current as z.ZodOptional<any>).unwrap();
    } else if (current instanceof z.ZodNullable) {
      current = (current as z.ZodNullable<any>).unwrap();
    } else if (current instanceof z.ZodDefault) {
      current = (current as z.ZodDefault<any>).removeDefault();
    } else {
      break;
    }
  }

  return {};
}

/**
 * Determine data type from Zod type
 * Uses instanceof (Zod v4 pattern)
 */
function getDataType(zodType: z.ZodTypeAny): FieldDataType {
  const { type: unwrapped } = unwrapZodType(zodType);

  if (unwrapped instanceof z.ZodString) return 'string';
  if (unwrapped instanceof z.ZodNumber) return 'number';
  if (unwrapped instanceof z.ZodBigInt) return 'integer';
  if (unwrapped instanceof z.ZodBoolean) return 'boolean';
  if (unwrapped instanceof z.ZodDate) return 'datetime';
  if (unwrapped instanceof z.ZodArray) return 'array';
  if (unwrapped instanceof z.ZodObject) return 'object';
  if (unwrapped instanceof z.ZodNull) return 'null';

  return 'any';
}

/**
 * Determine editor type from field metadata and data type
 */
function getEditorType(
  fieldName: string,
  zodType: z.ZodTypeAny,
  meta: Record<string, unknown>,
  isEditable: boolean
): FieldEditorType {
  // Check for explicit custom renderer
  if (meta['x-custom-renderer']) {
    const renderer = meta['x-custom-renderer'] as string;
    switch (renderer) {
      case 'images':
      case 'image':
        return 'images';
      case 'textarea':
        return 'textarea';
      case 'editor':
      case 'richtext':
        return 'editor';
      case 'markdown':
        return 'markdown';
      case 'code':
        return 'code';
      case 'color':
        return 'color';
      case 'rating':
        return 'rating';
      case 'slider':
        return 'slider';
      case 'switch':
        return 'switch';
      case 'chips':
        return 'chips';
      default:
        return 'custom';
    }
  }

  // Check for navigation target (lookup field)
  if (meta['x-navigation-target']) {
    const isMultiple = meta['x-multiple'] === true;
    return isMultiple ? 'multicombobox' : 'combobox';
  }

  // Check for static options
  if (meta['x-options'] || meta['x-enum']) {
    const isMultiple = meta['x-multiple'] === true;
    return isMultiple ? 'multiselect' : 'select';
  }

  // Check for read-only
  if (!isEditable || isMetadataTrue(meta.readOnly)) {
    return 'readonly';
  }

  // Check format hints
  const format = meta.format as string | undefined;
  if (format) {
    switch (format) {
      case 'date-time':
        return 'datetime';
      case 'date':
        return 'date';
      case 'time':
        return 'time';
      case 'email':
        return 'email';
      case 'phone':
      case 'tel':
        return 'phone';
      case 'uri':
      case 'url':
        return 'url';
      case 'password':
        return 'password';
    }
  }

  // Determine from Zod type
  const dataType = getDataType(zodType);
  const maxLength = meta.maxLength as number | undefined;

  switch (dataType) {
    case 'string':
      // Use textarea for long text fields
      if (maxLength && maxLength > 255) return 'textarea';
      return 'text';

    case 'number':
      // Check for currency hint
      if (meta['x-currency'] || fieldName.toLowerCase().includes('price') || fieldName.toLowerCase().includes('cost')) {
        return 'currency';
      }
      return 'number';

    case 'integer':
      return 'integer';

    case 'boolean':
      return 'boolean';

    case 'datetime':
      return 'datetime';

    case 'array':
      // Check if array of primitives (chips) or complex objects
      const { type: unwrappedArray } = unwrapZodType(zodType);
      if (unwrappedArray instanceof z.ZodArray) {
        const element = unwrappedArray.element;
        if (element instanceof z.ZodString) {
          return 'chips';
        }
      }
      return 'custom'; // Complex arrays need custom handling

    case 'object':
      return 'custom'; // Complex objects need custom handling

    default:
      return 'text';
  }
}

/**
 * Build validation configuration from field metadata
 * Validation rules come from metadata (min, max, minLength, maxLength, pattern)
 */
function buildValidation(
  zodType: z.ZodTypeAny,
  meta: Record<string, unknown>,
  isEditable: boolean
): FieldValidation {
  const { isOptional, isNullable } = unwrapZodType(zodType);

  const validation: FieldValidation = {
    required: !isOptional && !isNullable && isEditable,
    min: meta.minimum as number | undefined,
    max: meta.maximum as number | undefined,
    minLength: meta.minLength as number | undefined,
    maxLength: meta.maxLength as number | undefined,
    pattern: meta.pattern as string | undefined,
    patternDescription: meta['x-pattern-description'] as string | undefined,
  };

  // Note: In Zod v4, validation checks are set via metadata from schema generation
  // The metadata already contains min/max/minLength/maxLength from the Zod schema
  // No need to access internal _def.checks

  return validation;
}

/**
 * Build display configuration from field metadata
 */
function buildDisplay(
  fieldName: string,
  meta: Record<string, unknown>,
  editorType: FieldEditorType
): FieldDisplay {
  const display: FieldDisplay = {};

  // Column span
  if (meta['x-col-span']) {
    display.colSpan = meta['x-col-span'] as number;
  } else if (editorType === 'textarea' || editorType === 'editor' || editorType === 'markdown' || editorType === 'code') {
    display.colSpan = 12; // Full width for text areas
  }

  // Placeholder
  if (meta['x-placeholder']) {
    display.placeholder = meta['x-placeholder'] as string;
  }

  // Help text
  if (meta['x-help-text'] || meta.description) {
    display.helpText = (meta['x-help-text'] || meta.description) as string;
  }

  // Tooltip
  if (meta['x-tooltip']) {
    display.tooltip = meta['x-tooltip'] as string;
  }

  // Icon
  if (meta['x-icon']) {
    display.icon = meta['x-icon'] as string;
    display.iconPosition = (meta['x-icon-position'] as 'left' | 'right') || 'left';
  }

  // CSS classes
  if (meta['x-class']) {
    display.className = meta['x-class'] as string;
  }
  if (meta['x-input-class']) {
    display.inputClassName = meta['x-input-class'] as string;
  }

  // Date format
  if (meta['x-date-format']) {
    display.dateFormat = meta['x-date-format'] as string;
  }

  // Boolean display
  if (editorType === 'boolean' || editorType === 'switch') {
    display.booleanDisplay = {
      trueLabel: (meta['x-tag-true-label'] || 'Yes') as string,
      falseLabel: (meta['x-tag-false-label'] || 'No') as string,
      trueSeverity: (meta['x-tag-true-severity'] || 'success') as any,
      falseSeverity: (meta['x-tag-false-severity'] || 'danger') as any,
    };
  }

  // Number format
  if (editorType === 'number' || editorType === 'integer' || editorType === 'decimal' || editorType === 'currency') {
    if (meta['x-number-format'] || editorType === 'currency') {
      display.numberFormat = {
        style: editorType === 'currency' ? 'currency' : 'decimal',
        currency: (meta['x-currency'] as string) || 'USD',
        minimumFractionDigits: meta['x-min-fraction-digits'] as number | undefined,
        maximumFractionDigits: meta['x-max-fraction-digits'] as number | undefined,
      };
    }
  }

  return display;
}

/**
 * Build navigation configuration from field metadata
 */
function buildNavigation(meta: Record<string, unknown>): NavigationConfig | undefined {
  const target = meta['x-navigation-target'] as string | undefined;
  if (!target) return undefined;

  // Extract model name from full path
  const modelName = target.includes('.') ? target.split('.').pop()! : target;

  return {
    target,
    modelName,
    displayField: meta['x-navigation-relation'] as string | undefined,
    valueField: meta['x-navigation-value-field'] as string | undefined,
    parentField: meta['x-parent-field'] as string | undefined,
    filter: meta['x-navigation-filter'] as Record<string, unknown> | undefined,
  };
}

/**
 * Detect which fieldset a field belongs to - FULLY METADATA-DRIVEN
 *
 * Fieldset assignment is determined by:
 * 1. Explicit x-field-set metadata (highest priority)
 * 2. Complex object types get their own fieldset (uses x-label or formatted field name)
 * 3. Default "General" fieldset for everything else
 *
 * NO hard-coded field name checks - all grouping comes from metadata.
 */
function detectFieldSet(
  _fieldName: string,
  meta: Record<string, unknown>,
  dataType?: FieldDataType
): { id: string; label: string } {
  // 1. Check for explicit fieldset from x-field-set metadata
  if (meta['x-field-set']) {
    const label = meta['x-field-set'] as string;
    return { id: fieldSetIdFromLabel(label), label };
  }

  // 2. Complex nested objects (dataType === 'object') get their own fieldset
  // Uses x-label if available, otherwise formats the field name
  if (dataType === 'object') {
    const label = (meta['x-label'] as string) || formatFieldLabel(_fieldName);
    return { id: fieldSetIdFromLabel(label), label };
  }

  // 3. Default fieldset for fields without explicit grouping
  return { id: DEFAULT_FIELDSET, label: DEFAULT_FIELDSET_LABEL };
}

// =============================================================================
// Main Builder Functions
// =============================================================================

/**
 * Build a FieldDefinition from a Zod field
 */
export function buildFieldDefinition(
  fieldName: string,
  zodType: z.ZodTypeAny,
  editableFields: Set<string>,
  primaryKeyField: string
): FieldDefinition {
  const meta = getFieldMetadata(zodType);
  const { isOptional, isNullable } = unwrapZodType(zodType);
  const isEditable = editableFields.has(fieldName);
  const isPrimaryKey = fieldName === primaryKeyField;
  const dataType = getDataType(zodType);
  const fieldSet = detectFieldSet(fieldName, meta, dataType);
  const editorType = getEditorType(fieldName, zodType, meta, isEditable);

  return {
    name: fieldName,
    label: (meta['x-label'] as string) || formatFieldLabel(fieldName),
    dataType,
    editorType,
    sortOrder: (meta['x-sort-order'] as number) ?? 1000,
    fieldSet: fieldSet.id,

    // State flags
    required: !isOptional && !isNullable && isEditable && !isPrimaryKey,
    readOnly: !isEditable || isMetadataTrue(meta.readOnly),
    nullable: isNullable,
    hidden: isMetadataTrue(meta['x-hidden']) || isMetadataTrue(meta['x-hidden-field']),
    editable: isEditable,
    isPrimaryKey,

    // Navigation
    navigation: buildNavigation(meta),

    // Navigation relation - this field displays the value for a FK field
    // e.g., manufacturerName displays the value for manufacturerId
    navigationRelation: meta['x-navigation-relation'] as string | undefined,

    // Static options
    options: meta['x-options'] as any[] | undefined,

    // Validation
    validation: buildValidation(zodType, meta, isEditable),

    // Display
    display: buildDisplay(fieldName, meta, editorType),

    // Custom rendering
    customRenderer: meta['x-custom-renderer'] as string | undefined,
    customProps: meta['x-custom-props'] as Record<string, unknown> | undefined,

    // Default value
    defaultValue: meta['x-default'] ?? meta.default,
  };
}

/**
 * Build EntityFormSchema from a Zod schema
 */
export async function buildEntityFormSchema(
  queryModelName: string,
  options?: {
    saveModelName?: string;
    label?: string;
    pluralLabel?: string;
    primaryKeyField?: string;
    routePath?: string;
    listPath?: string;
  }
): Promise<EntityFormSchema> {
  // Load the query schema
  const querySchema = await getSchema(queryModelName);
  if (!querySchema) {
    throw new Error(`Schema not found for ${queryModelName}`);
  }

  const schemaMeta = getSchemaMetadata(querySchema);
  const queryShape = getSchemaShape(querySchema);

  // Determine save model name
  let saveModelName = options?.saveModelName;
  if (!saveModelName && schemaMeta['x-save-model']) {
    const fullPath = schemaMeta['x-save-model'] as string;
    saveModelName = fullPath.includes('.') ? fullPath.split('.').pop() : fullPath;
  }
  if (!saveModelName) {
    saveModelName = queryModelName.replace(/^I?Query/, 'Save');
  }

  // Build set of navigation-key fields and FK field navigation info
  // We need to collect FK navigation info BEFORE skipping hidden fields
  // so display fields with x-navigation-relation can find their FK's navigation target
  const navigationKeyFields = new Set<string>();
  const fkFieldNavigationMap = new Map<string, { target: string; modelName: string }>();

  for (const [fieldName, zodType] of Object.entries(queryShape)) {
    const meta = getFieldMetadata(zodType as z.ZodTypeAny);
    if (isMetadataTrue(meta['x-navigation-key'])) {
      navigationKeyFields.add(fieldName);
    }
    // Store navigation target info for FK fields (even hidden ones)
    if (meta['x-navigation-target']) {
      const target = meta['x-navigation-target'] as string;
      const modelName = target.includes('.') ? target.split('.').pop()! : target;
      fkFieldNavigationMap.set(fieldName.toLowerCase(), { target, modelName });
    }
  }

  // Load editable fields from save model
  // A field is editable if: it exists in save model AND is not a navigation-key
  const editableFields = new Set<string>();
  if (hasSchema(saveModelName)) {
    const saveSchema = await getSchema(saveModelName);
    if (saveSchema) {
      const saveShape = getSchemaShape(saveSchema);
      Object.keys(saveShape).forEach(key => {
        // Only add to editable if not a navigation-key field
        if (!navigationKeyFields.has(key)) {
          editableFields.add(key);
        }
      });
    }
  } else {
    // Fallback: fields not marked readOnly and not navigation-key are editable
    Object.entries(queryShape).forEach(([key, field]) => {
      const meta = getFieldMetadata(field as z.ZodTypeAny);
      if (!isMetadataTrue(meta.readOnly) && !navigationKeyFields.has(key)) {
        editableFields.add(key);
      }
    });
  }

  // Derive entity label from model name if not provided
  let label = options?.label;
  if (!label) {
    // IQueryCategoryModel -> Category
    label = queryModelName
      .replace(/^I?Query/, '')
      .replace(/Model$/, '');
  }

  // Detect primary key field
  let primaryKeyField = options?.primaryKeyField;
  if (!primaryKeyField) {
    // Look for field ending with 'Id' that matches entity name
    const entityIdField = `${label.charAt(0).toLowerCase()}${label.slice(1)}Id`;
    if (queryShape[entityIdField]) {
      primaryKeyField = entityIdField;
    } else {
      // Fall back to first field ending in 'Id'
      primaryKeyField = Object.keys(queryShape).find(k => k.endsWith('Id')) || 'id';
    }
  }

  // Build field definitions
  const fields: Record<string, FieldDefinition> = {};
  const fieldSetMap = new Map<string, { label: string; fields: string[]; sortOrder: number }>();

  for (const [fieldName, zodType] of Object.entries(queryShape)) {
    const dataType = getDataType(zodType as z.ZodTypeAny);
    const meta = getFieldMetadata(zodType as z.ZodTypeAny);

    // Check if this is a nested object that should be expanded
    if (dataType === 'object') {
      // Get the nested object's shape
      const nestedShape = getSchemaShape(zodType as z.ZodTypeAny);

      if (Object.keys(nestedShape).length > 0) {
        // Determine fieldset for nested fields
        const fieldSetLabel = (meta['x-field-set'] as string) || (meta['x-label'] as string) || formatFieldLabel(fieldName);
        const fieldSetId = fieldSetIdFromLabel(fieldSetLabel);

        // Create fieldset for nested fields if it doesn't exist
        if (!fieldSetMap.has(fieldSetId)) {
          fieldSetMap.set(fieldSetId, {
            label: fieldSetLabel,
            fields: [],
            sortOrder: 1000, // Nested fieldsets come after default
          });
        }

        // Expand nested fields with dot-notation names
        for (const [nestedFieldName, nestedZodType] of Object.entries(nestedShape)) {
          const fullFieldName = `${fieldName}.${nestedFieldName}`;
          const nestedMeta = getFieldMetadata(nestedZodType as z.ZodTypeAny);

          // Skip hidden nested fields
          if (isMetadataTrue(nestedMeta['x-hidden']) || isMetadataTrue(nestedMeta['x-hidden-field'])) {
            continue;
          }

          // Check if parent field is editable (nested fields inherit editability)
          const isNestedEditable = editableFields.has(fieldName) || editableFields.has(fullFieldName);
          const nestedEditableFields = isNestedEditable ? new Set([fullFieldName]) : new Set<string>();

          const nestedFieldDef = buildFieldDefinition(
            fullFieldName,
            nestedZodType as z.ZodTypeAny,
            nestedEditableFields,
            primaryKeyField
          );

          // Override fieldset to use the parent's fieldset
          nestedFieldDef.fieldSet = fieldSetId;

          // Use just the nested field name for the label (parent is implied by fieldset)
          nestedFieldDef.label = (nestedMeta['x-label'] as string) || formatFieldLabel(nestedFieldName);

          fields[fullFieldName] = nestedFieldDef;
          fieldSetMap.get(fieldSetId)!.fields.push(fullFieldName);
        }

        // Don't add the parent complex field itself
        continue;
      }
    }

    // Skip hidden regular fields
    if (isMetadataTrue(meta['x-hidden']) || isMetadataTrue(meta['x-hidden-field'])) {
      continue;
    }

    // Regular field processing
    const fieldDef = buildFieldDefinition(
      fieldName,
      zodType as z.ZodTypeAny,
      editableFields,
      primaryKeyField
    );
    fields[fieldName] = fieldDef;

    // Group by fieldset
    const fsId = fieldDef.fieldSet;
    if (!fieldSetMap.has(fsId)) {
      const fsInfo = detectFieldSet(fieldName, meta, dataType);
      fieldSetMap.set(fsId, {
        label: fsInfo.label,
        fields: [],
        sortOrder: fsId === DEFAULT_FIELDSET ? 0 : 1000,
      });
    }
    fieldSetMap.get(fsId)!.fields.push(fieldName);
  }

  // Process fields with navigationRelation
  // These display fields should inherit navigation config from their related FK field
  // and become editable (as combobox) when the FK field is editable
  for (const field of Object.values(fields)) {
    if (field.navigationRelation) {
      // Get the FK field name (case-insensitive)
      const fkFieldNameLower = field.navigationRelation.toLowerCase();

      // Look up navigation info from our pre-built map (includes hidden FK fields)
      const fkNavInfo = fkFieldNavigationMap.get(fkFieldNameLower);

      if (fkNavInfo) {
        // Copy navigation config from the FK field
        field.navigation = {
          target: fkNavInfo.target,
          modelName: fkNavInfo.modelName,
        };

        // Find actual FK field name (preserve original case)
        const actualFkFieldName = Object.keys(queryShape).find(
          k => k.toLowerCase() === fkFieldNameLower
        );

        // If the FK field is editable, this display field becomes editable as a combobox
        if (actualFkFieldName && editableFields.has(actualFkFieldName)) {
          field.editable = true;
          field.readOnly = false;
          field.editorType = 'combobox';
        }
      }
    }
  }

  // Sort fields within each fieldset
  for (const [_, fsData] of fieldSetMap) {
    fsData.fields.sort((a, b) => (fields[a].sortOrder ?? 1000) - (fields[b].sortOrder ?? 1000));
  }

  // Build fieldset definitions
  const fieldSets: FieldSetDefinition[] = Array.from(fieldSetMap.entries())
    .map(([id, data]) => ({
      id,
      label: data.label,
      sortOrder: data.sortOrder,
      collapsible: id !== DEFAULT_FIELDSET,
      collapsed: id !== DEFAULT_FIELDSET,
      fields: data.fields,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Build ordered field list
  const fieldOrder: string[] = [];
  for (const fs of fieldSets) {
    fieldOrder.push(...fs.fields);
  }

  // Build required fields list
  const requiredFields = Object.values(fields)
    .filter(f => f.required)
    .map(f => f.name);

  // Build default values
  const defaultValues: Record<string, unknown> = {};
  for (const field of Object.values(fields)) {
    if (field.defaultValue !== undefined) {
      defaultValues[field.name] = field.defaultValue;
    }
  }
  // Add isActive default if present
  if (fields.isActive && defaultValues.isActive === undefined) {
    defaultValues.isActive = true;
  }

  // Build entity metadata
  const entity: EntityMetadata = {
    queryModel: queryModelName,
    saveModel: saveModelName,
    label,
    pluralLabel: options?.pluralLabel || `${label}s`, // Simple pluralization
    primaryKey: primaryKeyField,
    displayField: schemaMeta['x-display-field'] as string | undefined,
    apiPath: schemaMeta['x-api-path'] as string | undefined,
    routePath: options?.routePath,
    listPath: options?.listPath,
    isReadOnly: isMetadataTrue(schemaMeta['x-read-only']),
    isCreatable: !isMetadataTrue(schemaMeta['x-not-creatable']),
    isDeletable: !isMetadataTrue(schemaMeta['x-not-deletable']),
    isSelectable: !isMetadataTrue(schemaMeta['x-not-selectable']),
    // Audit fields
    createdOnField: fields.createdOn ? 'createdOn' : fields.createdAt ? 'createdAt' : undefined,
    createdByField: fields.createdBy ? 'createdBy' : fields.createdByName ? 'createdByName' : undefined,
    updatedOnField: fields.updatedOn ? 'updatedOn' : fields.modifiedOn ? 'modifiedOn' : undefined,
    updatedByField: fields.updatedBy ? 'updatedBy' : fields.updatedByName ? 'updatedByName' : undefined,
    isActiveField: fields.isActive ? 'isActive' : undefined,
  };

  return {
    version: '1.0',
    entity,
    fieldSets,
    fields,
    fieldOrder,
    editableFields: Array.from(editableFields),
    requiredFields,
    defaultValues,
  };
}

/**
 * Cache for built schemas
 */
const schemaCache = new Map<string, EntityFormSchema>();

/**
 * Get or build an EntityFormSchema
 * Uses cache to avoid rebuilding
 */
export async function getOrBuildFormSchema(
  queryModelName: string,
  options?: Parameters<typeof buildEntityFormSchema>[1]
): Promise<EntityFormSchema | null> {
  // Check cache first
  if (schemaCache.has(queryModelName)) {
    return schemaCache.get(queryModelName)!;
  }

  try {
    const schema = await buildEntityFormSchema(queryModelName, options);
    schemaCache.set(queryModelName, schema);
    return schema;
  } catch (error) {
    console.error(`[SchemaBuilder] Error building schema for ${queryModelName}:`, error);
    return null;
  }
}

/**
 * Clear the schema cache
 */
export function clearSchemaCache(): void {
  schemaCache.clear();
}
