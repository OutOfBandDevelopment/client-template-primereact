/**
 * Schema utilities for EntityForm
 *
 * Provides functions to extract field metadata from Zod schemas,
 * group fields by fieldset, and determine editability.
 *
 * IMPORTANT: This module now delegates to EntityFormSchema when available.
 * Pre-computed schemas from the registry are preferred over dynamic building.
 * The functions here maintain backward compatibility while using the new system.
 */

import { z } from 'zod';
import type { FieldMetadata, FieldSetConfig, FieldType } from './types';
import { getSchema, SCHEMA_REGISTRY } from '@/api/GreenOnion/Schema/Registry';
import {
  getFormSchema,
  hasFormSchema,
  type EntityFormSchema,
  type FieldDefinition,
} from './EntityFormSchema';
import { getOrBuildFormSchema } from './schemaBuilder';

/**
 * Check if a schema exists in the registry
 */
function hasSchema(interfaceName: string): boolean {
  return SCHEMA_REGISTRY.some(entry => entry.interfaceName === interfaceName);
}

/**
 * Check if a metadata value is truthy (handles boolean and string 'true'/'True')
 */
function isMetadataTrue(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return false;
}

/**
 * Extract schema-level metadata from a Zod schema
 * This includes x-save-model, x-read-only, x-label, etc.
 * Uses Zod v4 .meta() method
 */
function getSchemaMetadata(schema: z.ZodTypeAny): Record<string, unknown> {
  let current: z.ZodTypeAny | undefined = schema;

  while (current) {
    // Zod v4: use .meta() method to get metadata
    if (typeof current.meta === 'function') {
      const meta = current.meta();
      if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
        return meta;
      }
    }

    // Unwrap wrapper types using instanceof (Zod v4)
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
 * Safely extract shape from a Zod schema
 * Uses Zod v4 .shape property on ZodObject
 */
function getSchemaShape(schema: z.ZodTypeAny): Record<string, z.ZodTypeAny> {
  let current: z.ZodTypeAny = schema;

  // Unwrap wrapper types to get to ZodObject
  while (current) {
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
 * Extract the underlying type from optional/nullable wrappers
 * Uses instanceof checks and unwrap methods (Zod v4 pattern)
 */
function unwrapZodType(zodType: z.ZodTypeAny): { type: z.ZodTypeAny; isOptional: boolean; isNullable: boolean } {
  let current = zodType;
  let isOptional = false;
  let isNullable = false;

  // Unwrap wrapper types using instanceof (Zod v4 pattern)
  while (current) {
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
 * Determine the field type from a Zod schema type
 * Uses instanceof checks (Zod v4 pattern)
 */
function determineFieldType(zodType: z.ZodTypeAny, meta: any): FieldType {
  const { type: unwrapped } = unwrapZodType(zodType);

  // Check custom renderer first
  if (meta?.['x-custom-renderer']) {
    const renderer = meta['x-custom-renderer'];
    if (renderer === 'images' || renderer === 'image') return 'images';
    if (renderer === 'textarea') return 'textarea';
  }

  // Check if read-only
  if (meta?.readOnly) return 'readonly';

  // Check navigation target (lookup field)
  if (meta?.['x-navigation-target']) return 'navigation';

  // Check format hints
  if (meta?.format) {
    if (meta.format === 'date-time') return 'datetime';
    if (meta.format === 'date') return 'date';
    if (meta.format === 'email') return 'email';
    if (meta.format === 'phone' || meta.format === 'tel') return 'phone';
    if (meta.format === 'uri' || meta.format === 'url') return 'url';
  }

  // Determine from Zod type using instanceof (Zod v4 pattern)
  if (unwrapped instanceof z.ZodString) {
    // Check for textarea hint
    if (meta?.maxLength && meta.maxLength > 255) return 'textarea';
    return 'text';
  }

  if (unwrapped instanceof z.ZodNumber || unwrapped instanceof z.ZodBigInt) {
    return 'number';
  }

  if (unwrapped instanceof z.ZodBoolean) {
    return 'boolean';
  }

  if (unwrapped instanceof z.ZodDate) {
    return 'datetime';
  }

  if (unwrapped instanceof z.ZodObject) {
    return 'complex';
  }

  if (unwrapped instanceof z.ZodArray) {
    // Check if array of images
    if (meta?.['x-custom-renderer'] === 'images') return 'images';
    return 'complex';
  }

  return 'text';
}

/**
 * Format a field name into a display label
 */
export function formatFieldLabel(fieldName: string): string {
  // Handle common abbreviations
  const abbreviations: Record<string, string> = {
    id: 'ID',
    url: 'URL',
    gln: 'GLN',
    api: 'API',
    ioc: 'IOC',
  };

  return fieldName
    // Insert space before uppercase letters
    .replace(/([A-Z])/g, ' $1')
    // Handle consecutive uppercase (like GLN, URL)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Capitalize first letter
    .replace(/^./, str => str.toUpperCase())
    // Handle known abbreviations
    .replace(/\b(id|url|gln|api|ioc)\b/gi, match => abbreviations[match.toLowerCase()] || match)
    .trim();
}

/**
 * Extract metadata from a Zod type using Zod v4 .meta() method
 * Traverses wrapped types (nullable, optional, etc.) to find metadata
 */
function getZodMeta(zodType: z.ZodTypeAny): Record<string, unknown> {
  let current: z.ZodTypeAny = zodType;

  // Traverse through wrapper types to find metadata
  while (current) {
    // Zod v4: use .meta() method to get metadata
    if (typeof current.meta === 'function') {
      const meta = current.meta();
      if (meta && typeof meta === 'object' && Object.keys(meta).length > 0) {
        return meta;
      }
    }

    // Unwrap wrapper types using instanceof (Zod v4)
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
 * Extract field metadata from a Zod schema field
 */
export function extractFieldMetadata(
  fieldName: string,
  zodType: z.ZodTypeAny,
  editableFields?: Set<string>
): FieldMetadata {
  const { type: unwrapped, isOptional, isNullable } = unwrapZodType(zodType);
  const meta = getZodMeta(zodType);

  // Check if editable (either in editableFields set, or not marked readOnly)
  const isEditable = editableFields
    ? editableFields.has(fieldName)
    : !meta.readOnly;

  const fieldType = determineFieldType(zodType, meta);

  // For complex objects without explicit field set, use the field label as the fieldset
  // This creates logical groupings like "Nutritional Information" for nested objects
  let fieldSetName = meta['x-field-set'];
  if (!fieldSetName && fieldType === 'complex') {
    // Use the field's label as its own fieldset for complex nested objects
    fieldSetName = meta['x-label'] || formatFieldLabel(fieldName);
  }

  return {
    field: fieldName,
    label: meta['x-label'] || formatFieldLabel(fieldName),
    type: fieldType,
    required: !isOptional && !isNullable && !meta.readOnly,
    readOnly: !isEditable || isMetadataTrue(meta.readOnly),
    nullable: isNullable,
    hidden: isMetadataTrue(meta['x-hidden']) || isMetadataTrue(meta['x-hidden-field']),
    isComplex: fieldType === 'complex',
    fieldSet: fieldSetName,
    sortOrder: meta['x-sort-order'] ?? 1000,
    navigationTarget: meta['x-navigation-target'],
    navigationRelation: meta['x-navigation-relation'],
    format: meta.format,
    minimum: meta.minimum,
    maximum: meta.maximum,
    maxLength: meta.maxLength,
    customRenderer: meta['x-custom-renderer'],
  };
}

/**
 * Group fields by fieldset, with a default fieldset for ungrouped fields
 */
export function groupFieldsByFieldSet(
  fields: FieldMetadata[],
  defaultFieldSetName: string = 'Details'
): FieldSetConfig[] {
  const fieldSetMap = new Map<string, FieldMetadata[]>();

  // Group fields by fieldset
  for (const field of fields) {
    const setName = field.fieldSet || defaultFieldSetName;
    if (!fieldSetMap.has(setName)) {
      fieldSetMap.set(setName, []);
    }
    fieldSetMap.get(setName)!.push(field);
  }

  // Convert to array and sort
  const fieldSets: FieldSetConfig[] = [];

  for (const [name, setFields] of fieldSetMap) {
    // Sort fields within the set
    setFields.sort((a, b) => (a.sortOrder ?? 1000) - (b.sortOrder ?? 1000));

    // Determine if this is a collapsible fieldset (not the default)
    const isDefault = name === defaultFieldSetName;

    fieldSets.push({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      label: name,
      collapsed: !isDefault, // Collapse non-default fieldsets initially
      collapsible: !isDefault,
      sortOrder: isDefault ? 0 : (setFields[0]?.sortOrder ?? 1000),
      fields: setFields,
    });
  }

  // Sort fieldsets (default first, then by sort order)
  fieldSets.sort((a, b) => (a.sortOrder ?? 1000) - (b.sortOrder ?? 1000));

  return fieldSets;
}

/**
 * Load editable fields by comparing QueryModel to SaveModel
 *
 * The SaveModel contains only the fields that can be edited (submitted to the server).
 * The QueryModel contains all fields including read-only audit fields.
 * A field is editable if it exists in the SaveModel.
 *
 * Uses x-save-model metadata if present to find the correct SaveModel.
 * Falls back to deriving SaveModel name from QueryModel name pattern.
 *
 * @param queryModelName The query model interface name (e.g., 'IQueryCategoryModel')
 * @param saveModelName Optional explicit save model name, otherwise derived from query model or x-save-model
 * @returns Set of editable field names (union of SaveModel fields)
 */
export async function loadEditableFields(
  queryModelName: string,
  saveModelName?: string
): Promise<Set<string>> {
  try {
    const editableSet = new Set<string>();

    // First, try to get x-save-model from QueryModel schema metadata
    let derivedSaveModelName = saveModelName;

    if (!derivedSaveModelName) {
      const querySchema = await getSchema(queryModelName);
      if (querySchema) {
        const schemaMeta = getSchemaMetadata(querySchema);
        // Check for x-save-model metadata
        if (schemaMeta['x-save-model']) {
          // x-save-model can be fully qualified (e.g., "GreenOnion.Common.Models.SaveCategoryModel")
          // Extract just the model name (last part after the final dot)
          const fullSaveModel = schemaMeta['x-save-model'] as string;
          derivedSaveModelName = fullSaveModel.includes('.')
            ? fullSaveModel.split('.').pop() || fullSaveModel
            : fullSaveModel;
        }

        // Check if schema is marked as x-read-only (no editable fields)
        if (isMetadataTrue(schemaMeta['x-read-only'])) {
          return editableSet;
        }
      }
    }

    // Fall back to deriving SaveModel name from QueryModel pattern
    // IQueryXModel -> SaveXModel or QueryXModel -> SaveXModel
    if (!derivedSaveModelName) {
      derivedSaveModelName = queryModelName.replace(/^I?Query/, 'Save');
    }

    // Build set of navigation-key fields from query model (these are always readonly)
    const navigationKeyFields = new Set<string>();
    const querySchemaForKeys = await getSchema(queryModelName);
    if (querySchemaForKeys) {
      const queryShapeForKeys = getSchemaShape(querySchemaForKeys);
      for (const [fieldName, zodType] of Object.entries(queryShapeForKeys)) {
        const meta = getZodMeta(zodType as z.ZodTypeAny);
        if (isMetadataTrue(meta['x-navigation-key'])) {
          navigationKeyFields.add(fieldName);
        }
      }
    }

    // Try to load the SaveModel schema - fields in SaveModel are editable (except navigation-key)
    if (hasSchema(derivedSaveModelName)) {
      const saveSchema = await getSchema(derivedSaveModelName);
      if (saveSchema) {
        const saveShape = getSchemaShape(saveSchema);
        // Fields in SaveModel are editable, except navigation-key fields
        for (const key of Object.keys(saveShape)) {
          if (!navigationKeyFields.has(key)) {
            editableSet.add(key);
          }
        }
        return editableSet;
      }
    }

    // No SaveModel found - fall back to checking readOnly metadata on QueryModel
    const querySchema = await getSchema(queryModelName);
    if (querySchema) {
      const queryShape = getSchemaShape(querySchema);
      for (const [key, field] of Object.entries(queryShape)) {
        const meta = getZodMeta(field as z.ZodTypeAny);
        // If not explicitly marked readOnly and not a navigation-key, consider it editable
        if (!isMetadataTrue(meta?.readOnly) && !navigationKeyFields.has(key)) {
          editableSet.add(key);
        }
      }
      return editableSet;
    }

    return editableSet;
  } catch (error) {
    console.error('Error loading editable fields:', error);
    return new Set<string>();
  }
}

/**
 * Build field metadata from a schema
 *
 * Automatically expands nested ZodObject fields into individual field entries
 * with dot-notation paths (e.g., 'nutritionalInformation.serving').
 * Nested fields are grouped into fieldsets named after the parent field
 * (using x-field-set if present, otherwise formatting the parent field name).
 *
 * @param queryModelName The query model interface name
 * @param editableFields Set of editable field names
 * @returns Array of field metadata (including expanded nested fields)
 */
export async function buildFieldsFromSchema(
  queryModelName: string,
  editableFields?: Set<string>
): Promise<FieldMetadata[]> {
  try {
    const schema = await getSchema(queryModelName);
    if (!schema) {
      console.warn(`Schema not found for ${queryModelName}`);
      return [];
    }

    const shape = getSchemaShape(schema);
    const fields: FieldMetadata[] = [];

    for (const [fieldName, fieldType] of Object.entries(shape)) {
      const metadata = extractFieldMetadata(
        fieldName,
        fieldType as z.ZodTypeAny,
        editableFields
      );

      // Check if this is a complex object that should be expanded
      if (metadata.isComplex && metadata.type === 'complex') {
        const nestedFields = expandNestedObjectFields(
          fieldName,
          fieldType as z.ZodTypeAny,
          metadata.fieldSet || formatFieldLabel(fieldName),
          editableFields
        );

        if (nestedFields.length > 0) {
          // Add expanded nested fields instead of the parent complex field
          fields.push(...nestedFields);
        } else {
          // No nested fields found, keep the parent as-is
          fields.push(metadata);
        }
      } else {
        fields.push(metadata);
      }
    }

    return fields;
  } catch (error) {
    console.error('Error building field metadata:', error);
    return [];
  }
}

/**
 * Expand a nested ZodObject field into individual field entries
 *
 * @param parentFieldName The parent field name (e.g., 'nutritionalInformation')
 * @param parentZodType The parent field's Zod type
 * @param fieldSetName The fieldset name for grouping nested fields
 * @param editableFields Set of editable field names
 * @returns Array of field metadata for nested fields
 */
function expandNestedObjectFields(
  parentFieldName: string,
  parentZodType: z.ZodTypeAny,
  fieldSetName: string,
  editableFields?: Set<string>
): FieldMetadata[] {
  const { type: unwrapped } = unwrapZodType(parentZodType);

  // Only expand ZodObject types using instanceof (Zod v4 pattern)
  if (!(unwrapped instanceof z.ZodObject)) {
    return [];
  }

  const nestedShape = getSchemaShape(unwrapped);
  if (!nestedShape || Object.keys(nestedShape).length === 0) {
    return [];
  }

  const nestedFields: FieldMetadata[] = [];

  for (const [nestedFieldName, nestedFieldType] of Object.entries(nestedShape)) {
    const fullPath = `${parentFieldName}.${nestedFieldName}`;

    // Check if the nested field is editable
    // A nested field is editable if either the parent or full path is in editableFields
    const isNestedEditable = editableFields
      ? editableFields.has(parentFieldName) || editableFields.has(fullPath)
      : true;

    const nestedMeta = getZodMeta(nestedFieldType as z.ZodTypeAny);
    const { type: nestedUnwrapped, isOptional, isNullable } = unwrapZodType(nestedFieldType as z.ZodTypeAny);

    // Skip nested complex objects (don't recursively expand more than one level)
    if (nestedUnwrapped instanceof z.ZodObject) {
      continue;
    }

    const fieldType = determineFieldType(nestedFieldType as z.ZodTypeAny, nestedMeta);

    nestedFields.push({
      field: fullPath,
      label: nestedMeta['x-label'] || formatFieldLabel(nestedFieldName),
      type: fieldType,
      required: !isOptional && !isNullable && !nestedMeta.readOnly,
      readOnly: !isNestedEditable || isMetadataTrue(nestedMeta.readOnly),
      nullable: isNullable,
      hidden: isMetadataTrue(nestedMeta['x-hidden']) || isMetadataTrue(nestedMeta['x-hidden-field']),
      isComplex: false,
      fieldSet: fieldSetName,
      sortOrder: nestedMeta['x-sort-order'] ?? 1000,
      navigationTarget: nestedMeta['x-navigation-target'],
      navigationRelation: nestedMeta['x-navigation-relation'],
      format: nestedMeta.format,
      minimum: nestedMeta.minimum,
      maximum: nestedMeta.maximum,
      maxLength: nestedMeta.maxLength,
      customRenderer: nestedMeta['x-custom-renderer'],
    });
  }

  return nestedFields;
}

/**
 * Convert FieldDefinition (new format) to FieldMetadata (old format)
 * for backward compatibility
 */
function fieldDefinitionToMetadata(field: FieldDefinition): FieldMetadata {
  // Map editor type to field type
  const typeMap: Record<string, FieldType> = {
    text: 'text',
    textarea: 'textarea',
    number: 'number',
    integer: 'number',
    decimal: 'number',
    currency: 'number',
    boolean: 'boolean',
    switch: 'boolean',
    date: 'date',
    datetime: 'datetime',
    time: 'datetime',
    email: 'email',
    phone: 'phone',
    url: 'url',
    combobox: 'navigation',
    multicombobox: 'navigation',
    images: 'images',
    image: 'images',
    readonly: 'readonly',
    custom: 'complex',
  };

  return {
    field: field.name,
    label: field.label,
    type: typeMap[field.editorType] || 'text',
    required: field.required,
    readOnly: field.readOnly,
    nullable: field.nullable,
    hidden: field.hidden,
    isComplex: field.editorType === 'custom' || field.dataType === 'object' || field.dataType === 'array',
    fieldSet: field.fieldSet === 'general' ? undefined : field.fieldSet,
    sortOrder: field.sortOrder,
    navigationTarget: field.navigation?.target,
    navigationRelation: field.navigationRelation, // FK field name this display field relates to
    format: field.validation.pattern ? undefined : undefined, // Format is in display now
    minimum: field.validation.min,
    maximum: field.validation.max,
    maxLength: field.validation.maxLength,
    customRenderer: field.customRenderer,
  };
}

/**
 * Convert EntityFormSchema (new format) to FieldSetConfig[] (old format)
 * for backward compatibility with BasePropertyEditor
 */
function schemaToFieldSetConfigs(schema: EntityFormSchema): FieldSetConfig[] {
  return schema.fieldSets.map(fs => ({
    name: fs.id,
    label: fs.label,
    collapsed: fs.collapsed,
    collapsible: fs.collapsible,
    sortOrder: fs.sortOrder,
    fields: fs.fields
      .map(fieldName => schema.fields[fieldName])
      .filter(Boolean)
      .map(fieldDefinitionToMetadata),
  }));
}

/**
 * Build complete field configuration from schema
 *
 * This function now uses the pre-computed EntityFormSchema when available,
 * falling back to dynamic schema building for backward compatibility.
 *
 * @param queryModelName The query model interface name
 * @param saveModelName Optional explicit save model name
 * @returns Object with editableFields set and fieldSets array
 */
export async function buildFormConfigFromSchema(
  queryModelName: string,
  saveModelName?: string
): Promise<{
  editableFields: Set<string>;
  fieldSets: FieldSetConfig[];
  formSchema?: EntityFormSchema;
}> {
  // First try to get or build the pre-computed schema
  const formSchema = await getOrBuildFormSchema(queryModelName, { saveModelName });

  if (formSchema) {
    // Convert to old format for backward compatibility
    const editableFields = new Set(formSchema.editableFields);
    const fieldSets = schemaToFieldSetConfigs(formSchema);
    return { editableFields, fieldSets, formSchema };
  }

  // Fall back to legacy dynamic building
  const editableFields = await loadEditableFields(queryModelName, saveModelName);
  const fields = await buildFieldsFromSchema(queryModelName, editableFields);
  const fieldSets = groupFieldsByFieldSet(fields);

  return { editableFields, fieldSets };
}
