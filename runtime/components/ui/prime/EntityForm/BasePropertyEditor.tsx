/**
 * BasePropertyEditor - Reusable property editor for entity forms
 *
 * Renders form fields based on Zod schema metadata with support for:
 * - Field grouping via x-field-set metadata (displayed as collapsible Panels)
 * - Navigation lookups via x-navigation-target
 * - Read-only fields based on SaveModel comparison
 * - Complex nested objects
 * - Responsive grid layout
 */

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Calendar } from 'primereact/calendar';
import { Panel } from 'primereact/panel';
import { Divider } from 'primereact/divider';
import { Skeleton } from 'primereact/skeleton';
import { classNames } from 'primereact/utils';

import type { FieldMetadata, FieldSetConfig, BasePropertyEditorProps } from './types';
import { buildFormConfigFromSchema, formatFieldLabel } from './schemaUtils';
import { getComboboxComponent } from '@/components/GreenOnion/componentRegistry';

/**
 * Format display value for readonly fields
 */
function formatDisplayValue(value: any, fieldMeta: FieldMetadata): string {
  if (value === null || value === undefined) return 'N/A';

  if (fieldMeta.format === 'date-time' || fieldMeta.type === 'datetime') {
    return new Date(value).toLocaleString();
  }

  if (fieldMeta.format === 'date' || fieldMeta.type === 'date') {
    return new Date(value).toLocaleDateString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Get a nested value from an object using dot notation path
 * e.g., getNestedValue(obj, 'nutritionalInformation.serving') -> obj.nutritionalInformation?.serving
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  if (!path.includes('.')) {
    return obj[path];
  }

  const parts = path.split('.');
  let current: any = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation path
 * Returns a new object with the value set (immutable update)
 * e.g., setNestedValue(obj, 'nutritionalInformation.serving', 100) -> new object
 */
function setNestedValue(obj: Record<string, any>, path: string, value: any): Record<string, any> {
  if (!path.includes('.')) {
    return { ...obj, [path]: value };
  }

  const parts = path.split('.');
  const result = { ...obj };

  let current = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    // Initialize nested object if it doesn't exist
    current[part] = current[part] ? { ...current[part] } : {};
    current = current[part];
  }

  // Set the final value
  current[parts[parts.length - 1]] = value;

  return result;
}

/**
 * Check if a field path is a nested path (contains dot notation)
 */
function isNestedPath(path: string): boolean {
  return path.includes('.');
}

/**
 * BasePropertyEditor component
 */
function BasePropertyEditor<TEntity extends Record<string, any>>({
  entity,
  formData,
  onChange,
  loading = false,
  disabled = false,
  className = '',
  editableFields,
  mode = 'edit',
  queryModelName,
  fieldSets: providedFieldSets,
}: BasePropertyEditorProps<TEntity>) {
  const [fieldSets, setFieldSets] = useState<FieldSetConfig[]>(providedFieldSets || []);
  const [schemaLoaded, setSchemaLoaded] = useState(!!providedFieldSets);
  const [localEditableFields, setLocalEditableFields] = useState<Set<string>>(
    editableFields || new Set()
  );
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});

  // Build field definitions from schema on mount
  useEffect(() => {
    if (providedFieldSets) {
      // Initialize collapsed state from fieldset config
      const initialCollapsed: Record<string, boolean> = {};
      providedFieldSets.forEach(fs => {
        if (fs.collapsible) {
          initialCollapsed[fs.name] = fs.collapsed;
        }
      });
      setCollapsedPanels(initialCollapsed);
      setSchemaLoaded(true);
      return;
    }

    if (!queryModelName) {
      console.warn('BasePropertyEditor: queryModelName is required for schema-based rendering');
      setSchemaLoaded(true);
      return;
    }

    const buildFields = async () => {
      try {
        const config = await buildFormConfigFromSchema(queryModelName);
        setFieldSets(config.fieldSets);
        if (!editableFields) {
          setLocalEditableFields(config.editableFields);
        }
        // Initialize collapsed state
        const initialCollapsed: Record<string, boolean> = {};
        config.fieldSets.forEach(fs => {
          if (fs.collapsible) {
            initialCollapsed[fs.name] = fs.collapsed;
          }
        });
        setCollapsedPanels(initialCollapsed);
        setSchemaLoaded(true);
      } catch (error) {
        console.error('Error building field metadata:', error);
        setSchemaLoaded(true);
      }
    };

    buildFields();
  }, [queryModelName, providedFieldSets, editableFields]);

  // Get effective editable fields
  const effectiveEditableFields = editableFields || localEditableFields;

  // Toggle panel collapsed state
  const togglePanel = useCallback((panelName: string) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  }, []);

  // Handle change for nested or simple fields
  const handleFieldChange = useCallback(
    (fieldPath: string, value: any) => {
      if (isNestedPath(fieldPath)) {
        // For nested paths, update the root object immutably
        const rootField = fieldPath.split('.')[0];
        const updatedRoot = setNestedValue(formData as Record<string, any>, fieldPath, value);
        onChange(rootField as keyof TEntity, updatedRoot[rootField]);
      } else {
        onChange(fieldPath as keyof TEntity, value);
      }
    },
    [formData, onChange]
  );

  // Render a single field based on its metadata
  const renderField = useCallback(
    (fieldMeta: FieldMetadata) => {
      const fieldPath = fieldMeta.field;
      const value = isNestedPath(fieldPath)
        ? getNestedValue(formData as Record<string, any>, fieldPath)
        : formData[fieldPath as keyof TEntity];

      // For nested paths, check both the full path and the root field for editability
      const isFieldEditable = isNestedPath(fieldPath)
        ? effectiveEditableFields.has(fieldPath) || effectiveEditableFields.has(fieldPath.split('.')[0])
        : effectiveEditableFields.has(fieldMeta.field);
      const isDisabled = disabled || mode === 'view' || fieldMeta.readOnly || !isFieldEditable;

      // Skip hidden fields
      if (fieldMeta.hidden) return null;

      // Handle complex types (nested objects)
      if (fieldMeta.isComplex && fieldMeta.type === 'complex') {
        return renderComplexField(fieldMeta);
      }

      // Handle navigation relation (display field for FK) - MUST CHECK BEFORE navigationTarget
      // because fields with navigationRelation also get navigationTarget copied to them
      // In view mode: show readonly text
      // In edit/create mode: show combobox bound to the FK field
      if (fieldMeta.navigationRelation) {
        if (mode === 'view') {
          // View mode: show as readonly text
          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
              </label>
              <InputText
                id={fieldPath}
                value={String(value ?? '')}
                disabled
                className="w-full"
              />
            </div>
          );
        }

        // Edit/create mode: show combobox bound to the FK field
        // The FK field name is stored in navigationRelation (e.g., 'ManufacturerId')
        const fkFieldName = fieldMeta.navigationRelation.charAt(0).toLowerCase() + fieldMeta.navigationRelation.slice(1);
        const fkValue = formData[fkFieldName as keyof TEntity];
        const displayFieldName = fieldPath; // The current field (e.g., 'manufacturerName')

        // Use navigationTarget if available (copied from FK field by schemaBuilder)
        if (fieldMeta.navigationTarget) {
          return renderNavigationRelationField(
            fieldMeta,
            fkFieldName,
            fkValue,
            displayFieldName,
            disabled
          );
        }

        // Fallback: show readonly if no navigation target
        return (
          <div className="field" key={fieldPath}>
            <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
              {fieldMeta.label}
            </label>
            <InputText
              id={fieldPath}
              value={String(value ?? '')}
              disabled
              className="w-full"
            />
          </div>
        );
      }

      // Render based on type
      switch (fieldMeta.type) {
        case 'readonly':
          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
              </label>
              <InputText
                id={fieldPath}
                value={formatDisplayValue(value, fieldMeta)}
                disabled
                className="w-full"
              />
            </div>
          );

        case 'text':
        case 'email':
        case 'phone':
        case 'url':
          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
                {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
              </label>
              <InputText
                id={fieldPath}
                value={String(value ?? '')}
                onChange={(e) => handleFieldChange(fieldPath, e.target.value)}
                disabled={isDisabled}
                maxLength={fieldMeta.maxLength}
                className={classNames('w-full', { 'p-disabled': isDisabled })}
              />
            </div>
          );

        case 'textarea':
          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
                {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
              </label>
              <InputTextarea
                id={fieldPath}
                value={String(value ?? '')}
                onChange={(e) => handleFieldChange(fieldPath, e.target.value)}
                disabled={isDisabled}
                rows={4}
                autoResize
                className={classNames('w-full', { 'p-disabled': isDisabled })}
              />
            </div>
          );

        case 'number':
          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
                {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
              </label>
              <InputNumber
                id={fieldPath}
                value={value as number | null}
                onValueChange={(e) => handleFieldChange(fieldPath, e.value)}
                disabled={isDisabled}
                min={fieldMeta.minimum}
                max={fieldMeta.maximum}
                className="w-full"
                inputClassName={classNames({ 'p-disabled': isDisabled })}
              />
            </div>
          );

        case 'boolean':
          return (
            <div className="field" key={fieldPath}>
              <div className="flex align-items-center h-full pt-4">
                <Checkbox
                  inputId={fieldPath}
                  checked={Boolean(value)}
                  onChange={(e) => handleFieldChange(fieldPath, e.checked)}
                  disabled={isDisabled}
                />
                <label htmlFor={fieldPath} className="ml-2 text-900">
                  {fieldMeta.label}
                </label>
              </div>
            </div>
          );

        case 'date':
          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
                {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Calendar
                id={fieldPath}
                value={value ? new Date(value as string) : null}
                onChange={(e) => handleFieldChange(fieldPath, e.value)}
                disabled={isDisabled}
                dateFormat="mm/dd/yy"
                showIcon
                className="w-full"
                inputClassName={classNames({ 'p-disabled': isDisabled })}
              />
            </div>
          );

        case 'datetime':
          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
                {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
              </label>
              <Calendar
                id={fieldPath}
                value={value ? new Date(value as string) : null}
                onChange={(e) => handleFieldChange(fieldPath, e.value)}
                disabled={isDisabled}
                dateFormat="mm/dd/yy"
                showTime
                hourFormat="12"
                showIcon
                className="w-full"
                inputClassName={classNames({ 'p-disabled': isDisabled })}
              />
            </div>
          );

        case 'images':
          return (
            <div className="field" key={fieldPath}>
              <label className="block text-900 font-medium mb-2">{fieldMeta.label}</label>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(value) && value.length > 0 ? (
                  value.map((img: string, idx: number) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${fieldMeta.label} ${idx + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }}
                    />
                  ))
                ) : (
                  <span className="text-500 text-sm">No images</span>
                )}
              </div>
            </div>
          );

        case 'complex':
          // Explicitly handle complex type in switch
          return renderComplexField(fieldMeta);

        default:
          // Check if value is an object (fallback for complex types not caught earlier)
          if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            return renderComplexField(fieldMeta);
          }

          return (
            <div className="field" key={fieldPath}>
              <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
                {fieldMeta.label}
                {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
              </label>
              <InputText
                id={fieldPath}
                value={String(value ?? '')}
                onChange={(e) => handleFieldChange(fieldPath, e.target.value)}
                disabled={isDisabled}
                className={classNames('w-full', { 'p-disabled': isDisabled })}
              />
            </div>
          );
      }
    },
    [formData, handleFieldChange, disabled, mode, effectiveEditableFields]
  );

  // Render navigation field (combobox lookup)
  const renderNavigationField = useCallback(
    (fieldMeta: FieldMetadata, value: any, isDisabled: boolean) => {
      const fieldPath = fieldMeta.field;
      const ComboBoxComponent = fieldMeta.navigationTarget
        ? getComboboxComponent(fieldMeta.navigationTarget)
        : null;

      if (!ComboBoxComponent) {
        // Fall back to number input if no component found
        return (
          <div className="field" key={fieldPath}>
            <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
              {fieldMeta.label}
              {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
            </label>
            <InputNumber
              id={fieldPath}
              value={value as number | null}
              onValueChange={(e) => handleFieldChange(fieldPath, e.value)}
              disabled={isDisabled}
              className="w-full"
            />
          </div>
        );
      }

      return (
        <div className="field" key={fieldPath}>
          <label htmlFor={fieldPath} className="block text-900 font-medium mb-2">
            {fieldMeta.label}
            {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Suspense fallback={<Skeleton height="2.5rem" className="w-full" />}>
            <ComboBoxComponent
              value={value}
              onChange={(newValue: any) => handleFieldChange(fieldPath, newValue)}
              disabled={isDisabled}
              placeholder={`Select ${fieldMeta.label}...`}
              className="w-full"
            />
          </Suspense>
        </div>
      );
    },
    [handleFieldChange]
  );

  // Render navigation relation field (display field that shows combobox bound to FK field)
  // This binds both the ID to the FK field and the display text to the display field
  const renderNavigationRelationField = useCallback(
    (
      fieldMeta: FieldMetadata,
      fkFieldName: string,
      fkValue: any,
      displayFieldName: string,
      isDisabled: boolean
    ) => {
      const ComboBoxComponent = fieldMeta.navigationTarget
        ? getComboboxComponent(fieldMeta.navigationTarget)
        : null;

      if (!ComboBoxComponent) {
        // Fall back to readonly text if no component found
        return (
          <div className="field" key={displayFieldName}>
            <label htmlFor={displayFieldName} className="block text-900 font-medium mb-2">
              {fieldMeta.label}
            </label>
            <InputText
              id={displayFieldName}
              value={String(formData[displayFieldName as keyof TEntity] ?? '')}
              disabled
              className="w-full"
            />
          </div>
        );
      }

      return (
        <div className="field" key={displayFieldName}>
          <label htmlFor={fkFieldName} className="block text-900 font-medium mb-2">
            {fieldMeta.label}
            {fieldMeta.required && !isDisabled && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Suspense fallback={<Skeleton height="2.5rem" className="w-full" />}>
            <ComboBoxComponent
              value={fkValue}
              onChange={(newValue: any) => {
                // Update the FK field with the ID
                handleFieldChange(fkFieldName, newValue);
              }}
              onTextChange={(newText: string) => {
                // Update the display field with the text
                handleFieldChange(displayFieldName, newText);
              }}
              disabled={isDisabled}
              placeholder={`Select ${fieldMeta.label}...`}
              className="w-full"
            />
          </Suspense>
        </div>
      );
    },
    [handleFieldChange, formData]
  );

  // Known numeric fields in common nested objects (like nutritionalInformation)
  const numericNestedFields = new Set([
    'serving', 'calories', 'carbohydrates', 'protein', 'totalFat', 'transFat',
    'saturatedFat', 'dietaryFiber', 'sugar', 'addedSugar', 'sodium', 'cholesterol',
    // Add other known numeric fields as needed
  ]);

  // Render complex field (nested object)
  const renderComplexField = useCallback(
    (fieldMeta: FieldMetadata) => {
      const fieldName = fieldMeta.field as keyof TEntity;
      const complexValue = formData[fieldName] as Record<string, any> | null | undefined;
      const isDisabled = disabled || mode === 'view';

      // Get field keys - either from existing data or from default structure
      // For nutritional information, we know the expected fields
      const getFieldKeys = (): string[] => {
        if (complexValue && Object.keys(complexValue).length > 0) {
          return Object.keys(complexValue);
        }
        // Default fields for known complex types
        if (fieldMeta.field === 'nutritionalInformation') {
          return [
            'serving', 'servingUom',
            'calories', 'caloriesUom',
            'carbohydrates', 'carbohydratesUom',
            'protein', 'proteinUom',
            'totalFat', 'transFat', 'saturatedFat',
            'dietaryFiber', 'dietaryFiberUom',
            'sugar', 'sugarUom',
            'addedSugar', 'addedSugarUom',
            'sodium', 'sodiumUom',
            'cholesterol', 'cholesterolUom',
          ];
        }
        return [];
      };

      const fieldKeys = getFieldKeys();

      if (fieldKeys.length === 0) {
        return (
          <div className="field" key={fieldMeta.field}>
            <label className="block text-900 font-medium mb-2">{fieldMeta.label}</label>
            <p className="text-500 text-sm m-0">No data available</p>
          </div>
        );
      }

      // Initialize empty object for create mode if needed
      const currentValue = complexValue || {};

      // Render nested object properties
      return (
        <div key={fieldMeta.field} className="complex-field-group">
          <div className="grid">
            {fieldKeys.map((key) => {
              const val = currentValue[key];
              const isNumeric = numericNestedFields.has(key);
              const isUom = key.endsWith('Uom');

              return (
                <div key={`${fieldMeta.field}.${key}`} className={isUom ? 'col-12 md:col-3' : 'col-12 md:col-3'}>
                  <div className="field">
                    <label htmlFor={`${fieldMeta.field}.${key}`} className="block text-900 font-medium mb-2">
                      {formatFieldLabel(key)}
                    </label>
                    {isNumeric ? (
                      <InputNumber
                        id={`${fieldMeta.field}.${key}`}
                        value={val as number | null}
                        onValueChange={(e) => {
                          const updated = { ...currentValue, [key]: e.value };
                          onChange(fieldName, updated);
                        }}
                        disabled={isDisabled}
                        mode="decimal"
                        minFractionDigits={0}
                        maxFractionDigits={2}
                        className="w-full"
                      />
                    ) : (
                      <InputText
                        id={`${fieldMeta.field}.${key}`}
                        value={String(val ?? '')}
                        onChange={(e) => {
                          const updated = { ...currentValue, [key]: e.target.value };
                          onChange(fieldName, updated);
                        }}
                        disabled={isDisabled}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [formData, onChange, disabled, mode]
  );

  // Render a fieldset with its fields
  const renderFieldSet = (fieldSet: FieldSetConfig, isFirst: boolean) => {
    // Filter out hidden fields
    const visibleFields = fieldSet.fields.filter((f) => !f.hidden);

    if (visibleFields.length === 0) return null;

    const content = (
      <div className="grid">
        {visibleFields.map((fieldMeta) => (
          <div
            key={fieldMeta.field}
            className={classNames({
              'col-12': fieldMeta.type === 'textarea' || fieldMeta.isComplex,
              'col-12 md:col-6': fieldMeta.type !== 'textarea' && !fieldMeta.isComplex,
            })}
          >
            {loading ? (
              <div className="field">
                <Skeleton width="30%" height="1rem" className="mb-2" />
                <Skeleton width="100%" height="2.5rem" />
              </div>
            ) : (
              renderField(fieldMeta)
            )}
          </div>
        ))}
      </div>
    );

    // Collapsible panels for non-primary fieldsets
    if (fieldSet.collapsible) {
      return (
        <Panel
          key={fieldSet.name}
          header={
            <span className="font-semibold text-900">{fieldSet.label}</span>
          }
          toggleable
          collapsed={collapsedPanels[fieldSet.name] ?? fieldSet.collapsed}
          onToggle={() => togglePanel(fieldSet.name)}
          className="mb-3"
          pt={{
            header: { className: 'bg-surface-50' },
            content: { className: 'pt-3' }
          }}
        >
          {content}
        </Panel>
      );
    }

    // Non-collapsible primary fieldset (usually "Details")
    return (
      <div key={fieldSet.name} className="mb-4">
        {!isFirst && <Divider />}
        {fieldSet.label !== 'Details' && fieldSet.label !== 'General' && (
          <h3 className="text-lg font-semibold mb-3 text-primary mt-0">{fieldSet.label}</h3>
        )}
        {content}
      </div>
    );
  };

  // Loading state
  if (!schemaLoaded) {
    return (
      <div className={classNames('property-editor', className)}>
        <div className="grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="col-12 md:col-6">
              <div className="field">
                <Skeleton width="30%" height="1rem" className="mb-2" />
                <Skeleton width="100%" height="2.5rem" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={classNames('property-editor', className)}>
      {fieldSets.map((fieldSet, index) => renderFieldSet(fieldSet, index === 0))}
    </div>
  );
}

export default BasePropertyEditor;
