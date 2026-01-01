/**
 * EntityFormSchema - Pre-computed UI configuration for entity forms
 *
 * This module defines intermediate schema definitions that are generated
 * at build time by the TypeScript Generator. These pre-computed schemas:
 *
 * 1. Eliminate runtime schema parsing overhead
 * 2. Provide a single source of truth for UI configuration
 * 3. Enable compile-time validation of form configurations
 * 4. Make the codebase easier to understand and maintain
 *
 * The schemas are generated from OpenAPI/Swagger metadata and Zod schemas,
 * combining information from both QueryModel and SaveModel to determine
 * field editability, validation rules, and UI presentation.
 */

// =============================================================================
// Field Types
// =============================================================================

/**
 * Supported field editor types
 */
export type FieldEditorType =
  | 'text'           // Single-line text input
  | 'textarea'       // Multi-line text input
  | 'number'         // Numeric input with optional min/max
  | 'integer'        // Integer-only numeric input
  | 'decimal'        // Decimal numeric input with precision
  | 'currency'       // Currency input with formatting
  | 'boolean'        // Checkbox or toggle
  | 'switch'         // Toggle switch (alternative to checkbox)
  | 'date'           // Date picker (no time)
  | 'datetime'       // Date and time picker
  | 'time'           // Time picker only
  | 'email'          // Email input with validation
  | 'phone'          // Phone number input
  | 'url'            // URL input with validation
  | 'password'       // Password input (masked)
  | 'color'          // Color picker
  | 'rating'         // Star rating
  | 'slider'         // Numeric slider
  | 'select'         // Single-select dropdown (static options)
  | 'multiselect'    // Multi-select (static options)
  | 'combobox'       // Single-select with search (navigation target)
  | 'multicombobox'  // Multi-select with search (navigation target)
  | 'autocomplete'   // Free-form with suggestions
  | 'chips'          // Tag/chip input
  | 'editor'         // Rich text editor
  | 'markdown'       // Markdown editor
  | 'code'           // Code editor
  | 'image'          // Single image upload
  | 'images'         // Multiple image upload
  | 'file'           // Single file upload
  | 'files'          // Multiple file upload
  | 'hidden'         // Hidden field (not rendered)
  | 'readonly'       // Display-only field
  | 'custom';        // Custom component specified by customRenderer

/**
 * Data type of the underlying field value
 */
export type FieldDataType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'array'
  | 'object'
  | 'null'
  | 'any';

// =============================================================================
// Validation Rules
// =============================================================================

/**
 * Validation rule definition
 */
export interface ValidationRule {
  /** Validation type */
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'email' | 'url' | 'custom';
  /** Validation value (number for min/max, string for pattern, etc.) */
  value?: string | number | boolean;
  /** Custom error message */
  message?: string;
}

/**
 * Complete validation configuration for a field
 */
export interface FieldValidation {
  /** Whether the field is required */
  required: boolean;
  /** Minimum value for numbers */
  min?: number;
  /** Maximum value for numbers */
  max?: number;
  /** Minimum length for strings */
  minLength?: number;
  /** Maximum length for strings */
  maxLength?: number;
  /** Regex pattern for validation */
  pattern?: string;
  /** Pattern description for error messages */
  patternDescription?: string;
  /** Custom validation rules */
  rules?: ValidationRule[];
}

// =============================================================================
// Field Definition
// =============================================================================

/**
 * Static option for select/multiselect fields
 */
export interface FieldOption {
  /** Option value */
  value: string | number | boolean;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: string;
  /** Whether option is disabled */
  disabled?: boolean;
}

/**
 * Navigation configuration for lookup fields (combobox/multicombobox)
 */
export interface NavigationConfig {
  /** Full model path (e.g., "GreenOnion.Common.Models.QueryManufacturerModel") */
  target: string;
  /** Model name only (e.g., "QueryManufacturerModel") */
  modelName: string;
  /** Display field to show in readonly mode */
  displayField?: string;
  /** Value field (usually the ID) */
  valueField?: string;
  /** Additional filter to apply to the lookup query */
  filter?: Record<string, unknown>;
  /** Parent field for cascading lookups (e.g., categoryId for subcategory) */
  parentField?: string;
}

/**
 * Display configuration for field presentation
 */
export interface FieldDisplay {
  /** Column span in grid (1-12) */
  colSpan?: number;
  /** Row span in grid */
  rowSpan?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Help text shown below field */
  helpText?: string;
  /** Tooltip text */
  tooltip?: string;
  /** Icon to display */
  icon?: string;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** CSS class for the field container */
  className?: string;
  /** CSS class for the input element */
  inputClassName?: string;
  /** Whether to show character count */
  showCharCount?: boolean;
  /** Number format (for numbers/currency) */
  numberFormat?: {
    locale?: string;
    style?: 'decimal' | 'currency' | 'percent';
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  };
  /** Date format */
  dateFormat?: string;
  /** Boolean display mode */
  booleanDisplay?: {
    trueLabel?: string;
    falseLabel?: string;
    trueIcon?: string;
    falseIcon?: string;
    trueSeverity?: 'success' | 'info' | 'warning' | 'danger';
    falseSeverity?: 'success' | 'info' | 'warning' | 'danger';
  };
}

/**
 * Complete field definition
 */
export interface FieldDefinition {
  /** Field name (property key in the model) */
  name: string;
  /** Display label */
  label: string;
  /** Data type of the value */
  dataType: FieldDataType;
  /** Editor type to render */
  editorType: FieldEditorType;
  /** Sort order within fieldset (lower = first) */
  sortOrder: number;
  /** Fieldset this field belongs to */
  fieldSet: string;

  // State flags
  /** Whether field is required for form submission */
  required: boolean;
  /** Whether field is read-only (not editable) */
  readOnly: boolean;
  /** Whether field is nullable */
  nullable: boolean;
  /** Whether field should be hidden from the form */
  hidden: boolean;
  /** Whether field is part of the SaveModel (editable in edit mode) */
  editable: boolean;
  /** Whether field is the primary key */
  isPrimaryKey: boolean;

  // Navigation (for lookup fields)
  /** Navigation configuration for combobox/multicombobox */
  navigation?: NavigationConfig;

  /**
   * Navigation relation - indicates this is a display field for a FK field
   * In edit mode, this field should show a combobox bound to the related FK field
   * e.g., manufacturerName has navigationRelation: 'manufacturerId'
   */
  navigationRelation?: string;

  // Static options (for select/multiselect)
  /** Static options for select fields */
  options?: FieldOption[];

  // Validation
  /** Validation configuration */
  validation: FieldValidation;

  // Display
  /** Display/presentation configuration */
  display: FieldDisplay;

  // Custom rendering
  /** Name of custom renderer component */
  customRenderer?: string;
  /** Props to pass to custom renderer */
  customProps?: Record<string, unknown>;

  // Default value
  /** Default value for new entities */
  defaultValue?: unknown;
}

// =============================================================================
// Fieldset Definition
// =============================================================================

/**
 * Fieldset definition for grouping related fields
 */
export interface FieldSetDefinition {
  /** Unique identifier for the fieldset */
  id: string;
  /** Display label */
  label: string;
  /** Sort order (lower = first) */
  sortOrder: number;
  /** Whether the fieldset can be collapsed */
  collapsible: boolean;
  /** Whether the fieldset starts collapsed */
  collapsed: boolean;
  /** Description or help text */
  description?: string;
  /** Icon for the fieldset header */
  icon?: string;
  /** CSS class for the fieldset */
  className?: string;
  /** Field names in this fieldset (in order) */
  fields: string[];
}

// =============================================================================
// Entity Form Schema
// =============================================================================

/**
 * Entity-level metadata
 */
export interface EntityMetadata {
  /** Query model interface name (e.g., "IQueryCategoryModel") */
  queryModel: string;
  /** Save model interface name (e.g., "SaveCategoryModel") */
  saveModel?: string;
  /** Display label for the entity (e.g., "Category") */
  label: string;
  /** Plural label for lists (e.g., "Categories") */
  pluralLabel: string;
  /** Primary key field name */
  primaryKey: string;
  /** Display field for representing the entity (e.g., in comboboxes) */
  displayField?: string;

  // URLs and paths
  /** Base API path (e.g., "/api/v2/Category") */
  apiPath?: string;
  /** Route path for pages (e.g., "v2/Category") */
  routePath?: string;
  /** List page path */
  listPath?: string;

  // Capabilities
  /** Whether entity is read-only (view only, no create/edit) */
  isReadOnly: boolean;
  /** Whether new entities can be created */
  isCreatable: boolean;
  /** Whether entities can be deleted */
  isDeletable: boolean;
  /** Whether entity can be selected (in comboboxes) */
  isSelectable: boolean;

  // Audit fields
  /** Name of createdOn field (if entity has audit) */
  createdOnField?: string;
  /** Name of createdBy field */
  createdByField?: string;
  /** Name of updatedOn field */
  updatedOnField?: string;
  /** Name of updatedBy field */
  updatedByField?: string;

  // Soft delete
  /** Name of isActive field (for soft delete) */
  isActiveField?: string;
}

/**
 * Complete pre-computed form schema for an entity
 *
 * This is the main export that generated code will use.
 */
export interface EntityFormSchema {
  /** Schema version for compatibility checks */
  version: '1.0';

  /** Entity-level metadata */
  entity: EntityMetadata;

  /** Ordered array of fieldset definitions */
  fieldSets: FieldSetDefinition[];

  /** Map of field name to field definition */
  fields: Record<string, FieldDefinition>;

  /** Ordered array of all field names (respecting fieldset and sort order) */
  fieldOrder: string[];

  /** Array of editable field names (fields in SaveModel) */
  editableFields: string[];

  /** Array of required field names */
  requiredFields: string[];

  /** Default values for new entities */
  defaultValues: Record<string, unknown>;
}

// =============================================================================
// Schema Registry
// =============================================================================

/**
 * Registry entry for form schemas
 */
export interface FormSchemaRegistryEntry {
  /** Query model interface name */
  interfaceName: string;
  /** Lazy loader for the schema */
  getSchema: () => Promise<EntityFormSchema>;
}

/**
 * Form schema registry - populated by generated code
 */
export const FORM_SCHEMA_REGISTRY: FormSchemaRegistryEntry[] = [];

/**
 * Register a form schema in the registry
 */
export function registerFormSchema(entry: FormSchemaRegistryEntry): void {
  // Avoid duplicates
  const existingIndex = FORM_SCHEMA_REGISTRY.findIndex(e => e.interfaceName === entry.interfaceName);
  if (existingIndex >= 0) {
    FORM_SCHEMA_REGISTRY[existingIndex] = entry;
  } else {
    FORM_SCHEMA_REGISTRY.push(entry);
  }
}

/**
 * Get a form schema by interface name
 */
export async function getFormSchema(interfaceName: string): Promise<EntityFormSchema | null> {
  const entry = FORM_SCHEMA_REGISTRY.find(e => e.interfaceName === interfaceName);
  if (!entry) {
    console.warn(`[EntityFormSchema] No schema registered for ${interfaceName}`);
    return null;
  }
  return entry.getSchema();
}

/**
 * Check if a form schema exists
 */
export function hasFormSchema(interfaceName: string): boolean {
  return FORM_SCHEMA_REGISTRY.some(e => e.interfaceName === interfaceName);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get fields for a specific fieldset from the schema
 */
export function getFieldsForFieldSet(
  schema: EntityFormSchema,
  fieldSetId: string
): FieldDefinition[] {
  const fieldSet = schema.fieldSets.find(fs => fs.id === fieldSetId);
  if (!fieldSet) return [];

  return fieldSet.fields
    .map(fieldName => schema.fields[fieldName])
    .filter(Boolean);
}

/**
 * Get visible (non-hidden) fields from the schema
 */
export function getVisibleFields(schema: EntityFormSchema): FieldDefinition[] {
  return schema.fieldOrder
    .map(fieldName => schema.fields[fieldName])
    .filter(field => field && !field.hidden);
}

/**
 * Get editable fields from the schema
 */
export function getEditableFieldDefs(schema: EntityFormSchema): FieldDefinition[] {
  return schema.editableFields
    .map(fieldName => schema.fields[fieldName])
    .filter(Boolean);
}

/**
 * Validate form data against schema
 * Returns array of validation errors
 */
export function validateFormData(
  schema: EntityFormSchema,
  data: Record<string, unknown>,
  mode: 'create' | 'edit'
): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = [];

  for (const fieldName of schema.editableFields) {
    const field = schema.fields[fieldName];
    if (!field) continue;

    const value = data[fieldName];
    const validation = field.validation;

    // Skip validation for non-required fields with no value
    if (!validation.required && (value === undefined || value === null || value === '')) {
      continue;
    }

    // Required check
    if (validation.required && (value === undefined || value === null || value === '')) {
      // Skip primary key for create mode
      if (mode === 'create' && field.isPrimaryKey) continue;
      errors.push({ field: fieldName, message: `${field.label} is required` });
      continue;
    }

    // String validations
    if (typeof value === 'string') {
      if (validation.minLength !== undefined && value.length < validation.minLength) {
        errors.push({ field: fieldName, message: `${field.label} must be at least ${validation.minLength} characters` });
      }
      if (validation.maxLength !== undefined && value.length > validation.maxLength) {
        errors.push({ field: fieldName, message: `${field.label} must be at most ${validation.maxLength} characters` });
      }
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(value)) {
          errors.push({
            field: fieldName,
            message: validation.patternDescription || `${field.label} has invalid format`
          });
        }
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        errors.push({ field: fieldName, message: `${field.label} must be at least ${validation.min}` });
      }
      if (validation.max !== undefined && value > validation.max) {
        errors.push({ field: fieldName, message: `${field.label} must be at most ${validation.max}` });
      }
    }
  }

  return errors;
}

/**
 * Build initial form data from schema defaults
 */
export function buildInitialFormData(
  schema: EntityFormSchema,
  existingData?: Record<string, unknown>
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...schema.defaultValues };

  // Overlay existing data if provided
  if (existingData) {
    for (const [key, value] of Object.entries(existingData)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }
  }

  return data;
}

/**
 * Build save payload from form data (only editable fields)
 */
export function buildSavePayload(
  schema: EntityFormSchema,
  formData: Record<string, unknown>,
  mode: 'create' | 'edit'
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const fieldName of schema.editableFields) {
    const field = schema.fields[fieldName];
    if (!field) continue;

    // Skip primary key for create mode
    if (mode === 'create' && field.isPrimaryKey) continue;

    const value = formData[fieldName];
    if (value !== undefined) {
      payload[fieldName] = value;
    }
  }

  // Include primary key for edit mode
  if (mode === 'edit' && schema.entity.primaryKey) {
    const pkValue = formData[schema.entity.primaryKey];
    if (pkValue !== undefined) {
      payload[schema.entity.primaryKey] = pkValue;
    }
  }

  return payload;
}
