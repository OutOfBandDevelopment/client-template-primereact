/**
 * EntityForm module exports
 *
 * Provides reusable entity form components for create, edit, and view operations.
 *
 * Architecture:
 * - EntityFormSchema: Pre-computed UI configuration (generated at build time)
 * - schemaBuilder: Builds EntityFormSchema from Zod schemas (runtime fallback)
 * - schemaUtils: Legacy utilities (now delegates to EntityFormSchema)
 * - BaseEntityForm: Main form container
 * - BasePropertyEditor: Field rendering
 * - EntityPage: Route-aware page wrapper
 */

// =============================================================================
// Components
// =============================================================================

export { default as BaseEntityForm } from './BaseEntityForm';
export { default as BasePropertyEditor } from './BasePropertyEditor';
export { default as EntityPage } from './EntityPage';
export type { EntityPageProps } from './EntityPage';

// =============================================================================
// Legacy Types (for backward compatibility)
// =============================================================================

export type {
  EntityFormMode,
  FieldType,
  FieldMetadata,
  FieldSetConfig,
  EntityClient,
  BaseEntityFormProps,
  BasePropertyEditorProps,
  EntityFormPageProps,
} from './types';

// =============================================================================
// EntityFormSchema Types (NEW - preferred for new code)
// =============================================================================

export type {
  // Field types
  FieldEditorType,
  FieldDataType,
  // Validation
  ValidationRule,
  FieldValidation,
  // Field configuration
  FieldOption,
  NavigationConfig,
  FieldDisplay,
  FieldDefinition,
  // Fieldset
  FieldSetDefinition,
  // Entity metadata
  EntityMetadata,
  // Main schema type
  EntityFormSchema,
  // Registry
  FormSchemaRegistryEntry,
} from './EntityFormSchema';

// =============================================================================
// EntityFormSchema Functions
// =============================================================================

export {
  // Registry
  FORM_SCHEMA_REGISTRY,
  registerFormSchema,
  getFormSchema,
  hasFormSchema,
  // Helper functions
  getFieldsForFieldSet,
  getVisibleFields,
  getEditableFieldDefs,
  validateFormData,
  buildInitialFormData,
  buildSavePayload,
} from './EntityFormSchema';

// =============================================================================
// Schema Builder (runtime schema building)
// =============================================================================

export {
  formatFieldLabel,
  buildFieldDefinition,
  buildEntityFormSchema,
  getOrBuildFormSchema,
  clearSchemaCache,
} from './schemaBuilder';

// =============================================================================
// Legacy Schema Utils (maintained for backward compatibility)
// =============================================================================

export {
  formatFieldLabel as formatFieldLabelLegacy, // Alias to avoid conflict
  extractFieldMetadata,
  groupFieldsByFieldSet,
  loadEditableFields,
  buildFieldsFromSchema,
  buildFormConfigFromSchema,
} from './schemaUtils';
