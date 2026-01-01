import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Skeleton } from 'primereact/skeleton';
import type { GenericGridColumn, FilterOperation } from './types';
import { extractZodFields, getSchemaMetadata } from '@/utils/zodSchemaHelper';
import type { z } from 'zod';
import { ModelControlFactory } from '@/components/ui/controls/data';
import { getMultiSelectComponent } from '@/components/GreenOnion/componentRegistry';

/**
 * Get the navigation target type from a relation field name
 * @param relationField Field name like 'ManufacturerId', 'CategoryId', etc.
 * @param schema Zod schema to look up the related field's navigation target
 * @returns Navigation target string or null
 */
function getNavigationTargetFromRelation(relationField: string, schema?: z.ZodObject<any>): string | null {
  if (!schema || !relationField) return null;
  
  try {
    const fields = extractZodFields(schema);
    const relatedField = fields.find(f => f.name === relationField);
    return relatedField?.metadata?.['x-navigation-target'] || null;
  } catch (error) {
    console.warn('Failed to get navigation target from relation:', relationField, error);
    return null;
  }
}

export interface FilterControlProps<TModel> {
  column: GenericGridColumn<TModel>;
  initialFilter?: FilterOperation;
  onApply: (filter: FilterOperation) => void;
  onClear: () => void;
  onCancel?: () => void;
  showHeader?: boolean;
  showButtons?: boolean;
  className?: string;
  style?: React.CSSProperties;
  schema?: z.ZodObject<any>; // Schema for field metadata lookup
}

/**
 * Reusable filter control component that provides a consistent filter interface
 * Uses 'in'/'Contains' operator and determines field type from Zod metadata
 * Used by both column dropdown overlays and sidebar filter panels
 */
export function FilterControl<TModel>({
  column,
  initialFilter,
  onApply,
  onClear,
  onCancel,
  showHeader = true,
  showButtons = true,
  className = '',
  style,
  schema
}: FilterControlProps<TModel>) {

  const fieldName = String(column.field);
  
  // Get field metadata from schema
  const fieldMetadata = useMemo(() => {
    if (!schema) return null;
    
    const fields = extractZodFields(schema);
    const field = fields.find(f => f.name === fieldName);
    return field || null;
  }, [schema, fieldName]);

  // Determine if this is a navigation field (either direct target or relation)
  // Prefer column properties over schema metadata (column is pre-computed from schema)
  const navigationTarget = column.navigationTarget || fieldMetadata?.metadata?.['x-navigation-target'];
  const navigationRelation = fieldMetadata?.metadata?.['x-navigation-relation'];
  const navigationVariant = column.navigationVariant || fieldMetadata?.metadata?.['x-navigation-variant'];
  const isNavigationField = !!(navigationTarget || navigationRelation);

  // For navigation relations, we need to determine the target type from the related field
  const navigationType = navigationTarget || (navigationRelation ? getNavigationTargetFromRelation(navigationRelation, schema) : null);
  const relatedFieldName = navigationRelation; // The actual field to filter on (e.g., 'ManufacturerId')
  const fieldType = fieldMetadata?.type || 'string';

  // Local state for the filter being edited - always use 'in' operator
  const [filterValues, setFilterValues] = useState<any[]>(() => {
    if (initialFilter?.values && Array.isArray(initialFilter.values)) {
      return initialFilter.values;
    }
    if (initialFilter?.value !== undefined) {
      return Array.isArray(initialFilter.value) ? initialFilter.value : [initialFilter.value];
    }
    return [];
  });
  const [inputValue, setInputValue] = useState<string>(() => {
    if (initialFilter?.value === undefined || initialFilter?.value === null) {
      return '';
    }
    if (Array.isArray(initialFilter.value)) {
      return initialFilter.value.map(v => String(v)).join(', ');
    }
    return String(initialFilter.value);
  });

  // Update local state when initialFilter changes
  useEffect(() => {
    if (initialFilter?.values && Array.isArray(initialFilter.values)) {
      setFilterValues(initialFilter.values);
    } else if (initialFilter?.value !== undefined) {
      const valueArray = Array.isArray(initialFilter.value) ? initialFilter.value : [initialFilter.value];
      setFilterValues(valueArray);
    } else {
      setFilterValues([]);
    }
    
    // Update input value for text fields
    if (!isNavigationField) {
      if (initialFilter?.value === undefined || initialFilter?.value === null) {
        setInputValue('');
      } else if (Array.isArray(initialFilter.value)) {
        setInputValue(initialFilter.value.map(v => String(v)).join(', '));
      } else {
        setInputValue(String(initialFilter.value));
      }
    }
  }, [initialFilter, isNavigationField]);

  // Helper to get the model interface from navigation target
  const getModelInterface = (navigationTarget: string) => {
    // Extract model name from navigation target
    const parts = navigationTarget.split('.');
    const modelName = parts[parts.length - 1] || navigationTarget;
    
    // Map model names to interface names
    const interfaceMap: Record<string, string> = {
      'QueryCategoryModel': 'IQueryCategoryModel',
      'QueryAllergenModel': 'IQueryAllergenModel',
      'QueryDistributorModel': 'IQueryDistributorModel',
      'QueryIngredientModel': 'IQueryIngredientModel',
      'QueryIocCategoryModel': 'IQueryIocCategoryModel',
      'QueryManufacturerModel': 'IQueryManufacturerModel',
      'QueryRoleModel': 'IQueryRoleModel',
      'QuerySchoolDistrictModel': 'IQuerySchoolDistrictModel',
      'QueryStateModel': 'IQueryStateModel',
      'QueryStorageTypeModel': 'IQueryStorageTypeModel',
      'QuerySubCategoryModel': 'IQuerySubCategoryModel',
    };
    
    return interfaceMap[modelName] || null;
  };

  const handleApply = () => {
    let values: any[] = [];

    if (isNavigationField) {
      // For navigation fields, use the selected values directly
      values = filterValues.filter(v => v != null && v !== 0);
    } else {
      // For non-navigation fields, parse input value
      if (fieldType === 'boolean') {
        // Boolean fields: parse 'true'/'false' strings to actual booleans
        values = inputValue
          .split(',')
          .map(v => v.trim().toLowerCase())
          .filter(v => v === 'true' || v === 'false')
          .map(v => v === 'true');
      } else if (fieldType === 'string') {
        // Split on comma for string fields
        values = inputValue
          .split(',')
          .map(v => v.trim())
          .filter(v => v.length > 0);
      } else {
        // Single value for non-string fields (numbers, etc.)
        const parsed = fieldType === 'number' ? parseFloat(inputValue) : inputValue;
        if (parsed !== '' && !isNaN(parsed as any)) {
          values = [parsed];
        }
      }
    }

    const filter: FilterOperation = {
      field: relatedFieldName || fieldName, // Use relation field if present, otherwise original field
      operator: 'in', // Always use 'in' operator
      value: values.length === 1 ? values[0] : values,
      values: values
    };
    onApply(filter);
  };

  const handleClear = () => {
    setFilterValues([]);
    setInputValue('');
    onClear();
  };

  const renderFilterInput = () => {
    // If this is a navigation field with x-navigation-target, use generated components with variant support
    if (isNavigationField && navigationType) {
      // Try to use the generated component from componentRegistry (supports variants)
      const GeneratedMultiSelect = getMultiSelectComponent(navigationType);

      if (GeneratedMultiSelect) {
        // Use generated component with variant support
        return (
          <Suspense fallback={<Skeleton height="2.5rem" className="w-full" />}>
            <GeneratedMultiSelect
              value={Array.isArray(filterValues) ? filterValues : []}
              onChange={(values: number[]) => setFilterValues(Array.isArray(values) ? values : [])}
              placeholder=""
              className="w-full"
              maxSelectedLabels={3}
              selectedItemsLabel={`{0} selected`}
              showSelectAll={false}
              display="chip"
              {...(navigationVariant ? { variant: navigationVariant } : {})}
            />
          </Suspense>
        );
      }

      // Fallback to ModelControlFactory for legacy support
      const modelInterface = getModelInterface(navigationType);

      if (!modelInterface) {
        return (
          <div className="p-3 bg-gray-100 border-round">
            <small className="text-500">
              Navigation field "{fieldName}" (type: {navigationType}) not yet supported
            </small>
          </div>
        );
      }

      // Use ModelControlFactory for consistent MultiSelect handling
      return (
        <ModelControlFactory
          modelInterface={modelInterface as any}
          controlType="multiselect"
          value={Array.isArray(filterValues) ? filterValues : []}
          onChange={(values: number[]) => setFilterValues(Array.isArray(values) ? values : [])}
          placeholder=""
          className="w-full"
          maxSelectedLabels={3}
          selectedItemsLabel={`{0} selected`}
          showSelectAll={false}
          display="chip"
        />
      );
    }

    // For non-navigation fields, render appropriate input based on field type
    switch (fieldType) {
      case 'number':
        return (
          <InputText
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder=""
            className="w-full"
          />
        );
      case 'date':
        return (
          <InputText
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder=""
            className="w-full"
          />
        );
      case 'boolean':
        // Ensure inputValue is a string before splitting
        const boolInputStr = String(inputValue || '');
        const boolValues = boolInputStr.split(',').map(v => v.trim()).filter(v => v === 'true' || v === 'false');
        return (
          <MultiSelect
            value={boolValues}
            onChange={(e) => setInputValue((e.value || []).join(', '))}
            options={[
              { label: 'True', value: 'true' },
              { label: 'False', value: 'false' }
            ]}
            placeholder=""
            className="w-full"
            maxSelectedLabels={2}
          />
        );
      default:
        return (
          <InputText
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder=""
            className="w-full"
          />
        );
    }
  };

  return (
    <div 
      className={`filter-control flex flex-column gap-2 ${className}`} 
      style={{ minWidth: '200px', ...style }}
    >
      {/* Property name header */}
      {showHeader && (
        <div className="flex align-items-center justify-content-between">
          <span className="font-medium text-900">{column.header}</span>
          {onCancel && (
            <Button
              icon="pi pi-times"
              className="p-button-text p-button-sm"
              onClick={onCancel}
              title="Close filter"
            />
          )}
        </div>
      )}

      {/* Just the filter input control */}
      {renderFilterInput()}

      {/* Optional action buttons */}
      {showButtons && (
        <div className="flex gap-2">
          <Button
            label="Apply"
            size="small"
            onClick={handleApply}
            className="flex-1"
            disabled={isNavigationField ? filterValues.length === 0 : !inputValue.trim()}
          />
          <Button
            label="Clear"
            size="small"
            severity="secondary"
            outlined
            onClick={handleClear}
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
}

export default FilterControl;