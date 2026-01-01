/**
 * BaseEntityForm - Reusable entity form for create, edit, and view operations
 *
 * Similar to SimpleGenericGrid, this provides a complete form infrastructure
 * that can be configured via props rather than generating all the logic.
 *
 * Features:
 * - Create mode: Empty form, all editable fields enabled
 * - Edit mode: Loads entity data, editable fields enabled
 * - View mode: Loads entity data, all fields read-only
 * - Automatic field grouping by x-field-set metadata
 * - Navigation target fields render as comboboxes
 * - Unsaved changes warning on navigation
 * - SaveModel comparison for editability determination
 * - Error handling with retry functionality
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Tag } from 'primereact/tag';
import { Panel } from 'primereact/panel';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Skeleton } from 'primereact/skeleton';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';

import type { z } from 'zod';
import type { BaseEntityFormProps, FieldSetConfig } from './types';
import type { EntityFormSchema } from './EntityFormSchema';
import { buildFormConfigFromSchema } from './schemaUtils';
import BasePropertyEditor from './BasePropertyEditor';
import { getSchema, SCHEMA_REGISTRY } from '@/api/GreenOnion/Schema/Registry';

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Helper to extract field info from a Zod schema field (same pattern as SchemaRegistryDemo)
function extractFieldInfo(name: string, zodType: any) {
  let type = 'unknown';
  let isOptional = false;
  let isNullable = false;
  let fieldMetadata: Record<string, any> = {};
  let currentType = zodType;

  // Extract metadata using Zod v4 .meta() method
  let metadataSource = zodType;
  while (metadataSource) {
    // Use Zod v4 .meta() method
    if (typeof metadataSource.meta === 'function') {
      const metaResult = metadataSource.meta();
      if (metaResult && typeof metaResult === 'object' && Object.keys(metaResult).length > 0) {
        fieldMetadata = metaResult;
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

  // Unwrap type wrappers to understand the base type
  while (currentType?._def) {
    const typeName = currentType._def.typeName;

    if (typeName === 'ZodOptional') {
      isOptional = true;
      currentType = currentType._def.innerType;
    } else if (typeName === 'ZodNullable') {
      isNullable = true;
      currentType = currentType._def.innerType;
    } else if (typeName === 'ZodNullish') {
      isOptional = true;
      isNullable = true;
      currentType = currentType._def.innerType;
    } else if (typeName === 'ZodDefault') {
      currentType = currentType._def.innerType;
    } else {
      break;
    }
  }

  // Determine base type
  if (currentType?._def) {
    const typeName = currentType._def.typeName;
    switch (typeName) {
      case 'ZodString': type = 'string'; break;
      case 'ZodNumber': type = 'number'; break;
      case 'ZodBigInt': type = 'bigint'; break;
      case 'ZodBoolean': type = 'boolean'; break;
      case 'ZodDate': type = 'date'; break;
      case 'ZodObject': type = 'object'; break;
      case 'ZodArray': type = 'array'; break;
      case 'ZodUnion': type = 'union'; break;
      case 'ZodEnum': type = 'enum'; break;
      case 'ZodLiteral': type = 'literal'; break;
      default: type = typeName || 'unknown'; break;
    }
  }

  return {
    name,
    type,
    isOptional,
    isNullable,
    metadata: fieldMetadata
  };
}

// Helper to extract schema fields (same pattern as SchemaRegistryDemo)
function extractSchemaFields(schema: any): any[] {
  if (!schema || !schema.shape) return [];

  const shape = schema.shape;
  const fields = [];

  for (const [key, value] of Object.entries(shape)) {
    const field = extractFieldInfo(key, value as any);
    if (field) {
      fields.push(field);
    }
  }

  return fields;
}

// Helper to extract model-level metadata (same pattern as SchemaRegistryDemo)
function extractSchemaMetadata(schema: any): Record<string, any> | null {
  // Extract metadata from the schema itself using Zod v4 .meta() method
  if (typeof schema?.meta === 'function') {
    const metaResult = schema.meta();
    if (metaResult && typeof metaResult === 'object' && Object.keys(metaResult).length > 0) {
      return metaResult;
    }
  }

  return null;
}

// Structure for schema details display
interface SchemaDetails {
  fields: Array<{
    name: string;
    type: string;
    isOptional: boolean;
    isNullable: boolean;
    metadata: Record<string, any>;
  }>;
  modelMetadata: Record<string, any> | null;
}

/**
 * BaseEntityForm component
 *
 * Accepts Zod schemas as generics for full type inference and runtime schema access.
 */
function BaseEntityForm<
  TQuerySchema extends z.ZodObject<any> = z.ZodObject<any>,
  TSaveSchema extends z.ZodObject<any> = TQuerySchema,
  TEntity extends Record<string, any> = z.infer<TQuerySchema>,
  TSaveModel = z.infer<TSaveSchema>
>({
  mode,
  entityId,
  client,
  querySchema,
  saveSchema,
  queryModelName,
  saveModelName,
  primaryKeyField,
  entityLabel,
  entityPath,
  listPath,
  onSaveSuccess,
  onCancel,
  title,
  showHeader = true,
  showActions = true,
  className = '',
  useReactRouter = true,
  defaultValues = {},
  PropertyEditor,
}: BaseEntityFormProps<TQuerySchema, TSaveSchema, TEntity, TSaveModel>) {
  const navigate = useNavigate();
  const toast = useRef<Toast>(null);

  // State
  const [loading, setLoading] = useState(mode !== 'create');
  const [saving, setSaving] = useState(false);
  const [entity, setEntity] = useState<TEntity | null>(null);
  const [formData, setFormData] = useState<Partial<TEntity>>(
    mode === 'create' ? ({ isActive: true, ...defaultValues } as Partial<TEntity>) : {}
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [editableFields, setEditableFields] = useState<Set<string>>(new Set());
  const [fieldSets, setFieldSets] = useState<FieldSetConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formSchema, setFormSchema] = useState<EntityFormSchema | null>(null);

  // Debug state for Zod schemas (dev only) - store extracted schema details
  const [querySchemaDetails, setQuerySchemaDetails] = useState<SchemaDetails | null>(null);
  const [saveSchemaDetails, setSaveSchemaDetails] = useState<SchemaDetails | null>(null);
  const [querySchemaName, setQuerySchemaName] = useState<string>('');
  const [saveSchemaName, setSaveSchemaName] = useState<string>('');

  // Load schema configuration
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await buildFormConfigFromSchema(queryModelName, saveModelName);
        setEditableFields(config.editableFields);
        setFieldSets(config.fieldSets);
        // Store the full schema for debug display
        if (config.formSchema) {
          setFormSchema(config.formSchema);
        }

        // Load Zod schemas for debug display (dev only) - extract schema details
        if (isDev) {
          try {
            // Find the registry entry to get the schema file name
            const queryEntry = SCHEMA_REGISTRY.find(e => e.interfaceName === queryModelName);
            const queryZodName = queryEntry ? `Z${queryEntry.querySet}` : `Z${queryModelName.replace(/^I/, '')}`;
            setQuerySchemaName(queryZodName);

            // Load and extract query schema details
            const qSchema = querySchema || await getSchema(queryModelName);
            if (qSchema) {
              const fields = extractSchemaFields(qSchema);
              const modelMetadata = extractSchemaMetadata(qSchema);
              setQuerySchemaDetails({ fields, modelMetadata });
            }

            // Try to load save schema - prefer passed, then registry, then derive from name
            const derivedSaveInterfaceName = saveModelName ||
              queryModelName.replace('Query', 'Save');
            const saveEntry = SCHEMA_REGISTRY.find(e => e.interfaceName === derivedSaveInterfaceName);
            const saveZodName = saveEntry ? `Z${saveEntry.querySet}` : `Z${derivedSaveInterfaceName.replace(/^I/, '')}`;
            setSaveSchemaName(saveZodName);

            // Load and extract save schema details
            const sSchema = saveSchema || await getSchema(derivedSaveInterfaceName);
            if (sSchema) {
              const fields = extractSchemaFields(sSchema);
              const modelMetadata = extractSchemaMetadata(sSchema);
              setSaveSchemaDetails({ fields, modelMetadata });
            }
          } catch (schemaErr) {
            console.warn('Could not load Zod schemas for debug:', schemaErr);
          }
        }
      } catch (err) {
        console.error('Error loading form config:', err);
      }
    };

    loadConfig();
  }, [queryModelName, saveModelName, querySchema, saveSchema]);

  // Load entity data for edit/view modes
  const loadEntity = useCallback(async () => {
    if (mode === 'create') {
      setLoading(false);
      return;
    }

    if (!entityId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await client.Get({
        id: typeof entityId === 'string' ? parseInt(entityId) : entityId,
      });
      if (data) {
        setEntity(data);
        setFormData(data as Partial<TEntity>);
      } else {
        setError(`${entityLabel} not found`);
      }
    } catch (err) {
      console.error('Error loading entity:', err);
      setError(`Failed to load ${entityLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [mode, entityId, client, entityLabel]);

  useEffect(() => {
    loadEntity();
  }, [loadEntity]);

  // Handle field changes
  const handleFieldChange = useCallback((field: keyof TEntity, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setHasChanges(true);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (mode === 'view') return;

    setSaving(true);
    setError(null);

    try {
      // Build save model from form data - only include editable fields
      const saveData: Partial<TSaveModel> = {};
      editableFields.forEach((field) => {
        if (field in formData) {
          (saveData as any)[field] = (formData as any)[field];
        }
      });

      // Include the primary key for updates
      if (mode === 'edit' && primaryKeyField && formData[primaryKeyField as keyof typeof formData] !== undefined) {
        (saveData as any)[primaryKeyField] = formData[primaryKeyField as keyof typeof formData];
      }

      // Call Save with named parameter pattern (body: saveData) as expected by generated clients
      const result = await client.Save({ body: saveData as TSaveModel });

      if (result) {
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: mode === 'create'
            ? `${entityLabel} created successfully`
            : `${entityLabel} updated successfully`,
          life: 3000,
        });
        setHasChanges(false);

        if (onSaveSuccess) {
          onSaveSuccess(result);
        } else if (useReactRouter && listPath) {
          navigate(listPath);
        }
      } else {
        setError(`Failed to save ${entityLabel}`);
      }
    } catch (err) {
      console.error('Error saving entity:', err);
      setError(`Failed to save ${entityLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to save ${entityLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        life: 5000,
      });
    } finally {
      setSaving(false);
    }
  }, [mode, formData, editableFields, primaryKeyField, client, entityLabel, onSaveSuccess, useReactRouter, listPath, navigate]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    const doCancel = () => {
      if (onCancel) {
        onCancel();
      } else if (useReactRouter && listPath) {
        navigate(listPath);
      } else if (useReactRouter) {
        navigate(-1);
      }
    };

    if (hasChanges) {
      confirmDialog({
        message: 'You have unsaved changes. Are you sure you want to cancel?',
        header: 'Unsaved Changes',
        icon: 'pi pi-exclamation-triangle',
        acceptClassName: 'p-button-danger',
        accept: doCancel,
      });
    } else {
      doCancel();
    }
  }, [hasChanges, onCancel, useReactRouter, listPath, navigate]);

  // Get display title
  const displayTitle = useMemo(() => {
    if (title) return title;
    switch (mode) {
      case 'create':
        return `Create ${entityLabel}`;
      case 'edit':
        return `Edit ${entityLabel}`;
      case 'view':
        return `View ${entityLabel}`;
      default:
        return entityLabel;
    }
  }, [title, mode, entityLabel]);

  // Get mode icon
  const getModeIcon = () => {
    switch (mode) {
      case 'create':
        return 'pi pi-plus-circle';
      case 'edit':
        return 'pi pi-pencil';
      case 'view':
        return 'pi pi-eye';
      default:
        return 'pi pi-file';
    }
  };

  // Get mode tag severity
  const getModeTagSeverity = (): "success" | "info" | "warning" | "danger" | "secondary" | "contrast" | null | undefined => {
    switch (mode) {
      case 'create':
        return 'success';
      case 'edit':
        return 'warning';
      case 'view':
        return 'info';
      default:
        return 'secondary';
    }
  };

  // Error state
  if (error && !loading && !entity && mode !== 'create') {
    return (
      <div className={`entity-form ${className}`}>
        <Toast ref={toast} position="top-right" />
        <Card className="text-center">
          <div className="p-5">
            <i className="pi pi-exclamation-triangle text-red-500 text-6xl mb-4"></i>
            <h3 className="text-red-500 mb-3">Error Loading Data</h3>
            <p className="text-600 mb-4">{error}</p>
            <div className="flex justify-content-center gap-2">
              <Button
                label="Retry"
                icon="pi pi-refresh"
                onClick={loadEntity}
                severity="secondary"
              />
              {listPath && (
                <Button
                  label="Back to List"
                  icon="pi pi-arrow-left"
                  onClick={() => navigate(listPath)}
                  className="p-button-text"
                />
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Loading state with skeleton
  if (loading) {
    return (
      <div className={`entity-form ${className}`}>
        <Card>
          {/* Header skeleton */}
          <div className="flex justify-content-between align-items-center mb-4 pb-3 border-bottom-1 surface-border">
            <div className="flex align-items-center gap-3">
              <Skeleton shape="circle" size="2.5rem" />
              <Skeleton width="200px" height="1.5rem" />
            </div>
            <Skeleton width="80px" height="2rem" />
          </div>

          {/* Field skeletons in a grid */}
          <div className="grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="col-12 md:col-6">
                <div className="field">
                  <Skeleton width="30%" height="1rem" className="mb-2" />
                  <Skeleton width="100%" height="2.5rem" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer skeleton */}
          <div className="flex justify-content-end gap-2 mt-4 pt-3 border-top-1 surface-border">
            <Skeleton width="80px" height="2.5rem" />
            <Skeleton width="80px" height="2.5rem" />
          </div>
        </Card>
      </div>
    );
  }

  // Determine which PropertyEditor to use
  const EditorComponent = PropertyEditor || BasePropertyEditor;

  return (
    <div className={`entity-form ${className}`}>
      <Toast ref={toast} position="top-right" />
      <ConfirmDialog />

      <Card>
        {/* Header */}
        {showHeader && (
          <div className="flex flex-column sm:flex-row justify-content-between align-items-start sm:align-items-center mb-4 pb-3 border-bottom-1 surface-border gap-3">
            <div className="flex align-items-center gap-3">
              <div className="flex align-items-center justify-content-center bg-primary border-circle" style={{ width: '2.5rem', height: '2.5rem' }}>
                <i className={`${getModeIcon()} text-white`}></i>
              </div>
              <div>
                <h2 className="m-0 text-xl font-semibold text-900">{displayTitle}</h2>
                {mode !== 'create' && entity && primaryKeyField && (
                  <span className="text-500 text-sm">
                    ID: {(entity as any)[primaryKeyField]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex align-items-center gap-2">
              <Tag
                value={mode === 'create' ? 'New' : mode === 'edit' ? 'Editing' : 'View Only'}
                severity={getModeTagSeverity()}
              />
              {mode === 'view' && entityPath && entityId && (
                <Button
                  label="Edit"
                  icon="pi pi-pencil"
                  onClick={() => {
                    const normalizedPath = entityPath.startsWith('/') ? entityPath : `/${entityPath}`;
                    navigate(`${normalizedPath}/Edit/${entityId}`);
                  }}
                  size="small"
                  outlined
                />
              )}
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border-round border-1 border-red-200">
            <div className="flex align-items-center gap-2">
              <i className="pi pi-exclamation-triangle text-red-500"></i>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Form content */}
        <EditorComponent
          entity={entity}
          formData={formData}
          onChange={handleFieldChange}
          loading={loading}
          disabled={saving}
          editableFields={editableFields}
          mode={mode === 'view' ? 'view' : 'edit'}
          queryModelName={queryModelName}
          fieldSets={fieldSets}
        />

        {/* Debug panels - Development only */}
        {isDev && (
          <div className="mt-4">
            <Panel
              header={
                <span className="flex align-items-center gap-2">
                  <i className="pi pi-code text-orange-500"></i>
                  <span className="text-orange-500">Developer Tools</span>
                </span>
              }
              toggleable
              collapsed
              pt={{
                header: { className: 'bg-orange-50 border-orange-200' },
                content: { className: 'p-0' }
              }}
            >
              <div className="p-3">
                {/* Raw Form Data */}
                <Panel
                  header="Form Data (Current State)"
                  toggleable
                  collapsed
                  className="mb-2"
                  pt={{ content: { className: 'p-0' } }}
                >
                  <pre className="m-0 p-3 bg-gray-900 text-green-400 text-xs overflow-auto" style={{ maxHeight: '300px' }}>
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </Panel>

                {/* Original Entity Data */}
                <Panel
                  header="Original Entity (Loaded from API)"
                  toggleable
                  collapsed
                  className="mb-2"
                  pt={{ content: { className: 'p-0' } }}
                >
                  <pre className="m-0 p-3 bg-gray-900 text-cyan-400 text-xs overflow-auto" style={{ maxHeight: '300px' }}>
                    {entity ? JSON.stringify(entity, null, 2) : 'No entity loaded (Create mode)'}
                  </pre>
                </Panel>

                {/* Form Schema / Field Configuration */}
                <Panel
                  header="Field Configuration (Schema)"
                  toggleable
                  collapsed
                  className="mb-2"
                  pt={{ content: { className: 'p-0' } }}
                >
                  <pre className="m-0 p-3 bg-gray-900 text-yellow-400 text-xs overflow-auto" style={{ maxHeight: '400px' }}>
                    {formSchema
                      ? JSON.stringify(formSchema, null, 2)
                      : JSON.stringify({
                          queryModelName,
                          saveModelName,
                          fieldSets: fieldSets.map(fs => ({
                            name: fs.name,
                            label: fs.label,
                            fields: fs.fields.map(f => ({
                              field: f.field,
                              label: f.label,
                              type: f.type,
                              editable: !f.readOnly,
                              fieldSet: f.fieldSet,
                            }))
                          })),
                          editableFields: Array.from(editableFields),
                        }, null, 2)
                    }
                  </pre>
                </Panel>

                {/* Field Sets Configuration */}
                <Panel
                  header={`Field Sets (${fieldSets.length} sets)`}
                  toggleable
                  collapsed
                  className="mb-2"
                  pt={{ content: { className: 'p-0' } }}
                >
                  <pre className="m-0 p-3 bg-gray-900 text-orange-400 text-xs overflow-auto" style={{ maxHeight: '400px' }}>
                    {JSON.stringify(
                      fieldSets.map(fs => ({
                        name: fs.name,
                        label: fs.label,
                        fieldCount: fs.fields.length,
                        fields: fs.fields.map(f => ({
                          field: f.field,
                          label: f.label,
                          type: f.type,
                          editable: !f.readOnly && editableFields.has(f.field),
                          readOnly: f.readOnly,
                          fieldSet: f.fieldSet,
                          navigationTarget: f.navigationTarget,
                          navigationRelation: f.navigationRelation,
                        }))
                      })),
                      null, 2
                    )}
                  </pre>
                </Panel>

                {/* Editable Fields */}
                <Panel
                  header={`Editable Fields (${editableFields.size} fields)`}
                  toggleable
                  collapsed
                  className="mb-2"
                  pt={{ content: { className: 'p-0' } }}
                >
                  <pre className="m-0 p-3 bg-gray-900 text-purple-400 text-xs overflow-auto" style={{ maxHeight: '200px' }}>
                    {JSON.stringify(Array.from(editableFields).sort(), null, 2)}
                  </pre>
                </Panel>

                {/* Query Model Zod Schema */}
                <Panel
                  header={`Query Zod Schema (${querySchemaName || 'Loading...'}) - ${querySchemaDetails?.fields.length || 0} fields`}
                  toggleable
                  collapsed
                  className="mb-2"
                  pt={{ content: { className: 'p-0' } }}
                >
                  {querySchemaDetails ? (
                    <div className="p-3">
                      {/* Model Metadata */}
                      {querySchemaDetails.modelMetadata && Object.keys(querySchemaDetails.modelMetadata).length > 0 && (
                        <div className="mb-3 p-2 surface-100 border-round">
                          <div className="text-sm font-semibold text-700 mb-2">Model Metadata:</div>
                          <div className="text-xs">
                            {Object.entries(querySchemaDetails.modelMetadata).map(([key, value]) => (
                              <div key={key} className="mb-1">
                                <span className="font-mono text-blue-600">{key}:</span>{' '}
                                <span className="text-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Fields */}
                      <div className="max-h-20rem overflow-auto">
                        {querySchemaDetails.fields.map(field => (
                          <div key={field.name} className="mb-2 p-2 surface-50 border-round border-1 surface-border">
                            <div className="flex justify-content-between align-items-center mb-1">
                              <span className="font-semibold text-900">{field.name}</span>
                              <span className="text-xs text-600">
                                {field.type}
                                {field.isOptional && ' | optional'}
                                {field.isNullable && ' | nullable'}
                              </span>
                            </div>
                            {Object.keys(field.metadata).length > 0 && (
                              <div className="text-xs pl-2 border-left-2 border-blue-300">
                                {Object.entries(field.metadata).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-mono text-blue-600">{key}:</span>{' '}
                                    <span className="text-600">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-600">Loading schema...</div>
                  )}
                </Panel>

                {/* Save Model Zod Schema */}
                <Panel
                  header={`Save Zod Schema (${saveSchemaName || 'Loading...'}) - ${saveSchemaDetails?.fields.length || 0} fields`}
                  toggleable
                  collapsed
                  pt={{ content: { className: 'p-0' } }}
                >
                  {saveSchemaDetails ? (
                    <div className="p-3">
                      {/* Model Metadata */}
                      {saveSchemaDetails.modelMetadata && Object.keys(saveSchemaDetails.modelMetadata).length > 0 && (
                        <div className="mb-3 p-2 surface-100 border-round">
                          <div className="text-sm font-semibold text-700 mb-2">Model Metadata:</div>
                          <div className="text-xs">
                            {Object.entries(saveSchemaDetails.modelMetadata).map(([key, value]) => (
                              <div key={key} className="mb-1">
                                <span className="font-mono text-pink-600">{key}:</span>{' '}
                                <span className="text-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Fields */}
                      <div className="max-h-20rem overflow-auto">
                        {saveSchemaDetails.fields.map(field => (
                          <div key={field.name} className="mb-2 p-2 surface-50 border-round border-1 surface-border">
                            <div className="flex justify-content-between align-items-center mb-1">
                              <span className="font-semibold text-900">{field.name}</span>
                              <span className="text-xs text-600">
                                {field.type}
                                {field.isOptional && ' | optional'}
                                {field.isNullable && ' | nullable'}
                              </span>
                            </div>
                            {Object.keys(field.metadata).length > 0 && (
                              <div className="text-xs pl-2 border-left-2 border-pink-300">
                                {Object.entries(field.metadata).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="font-mono text-pink-600">{key}:</span>{' '}
                                    <span className="text-600">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-center text-600">Loading schema or not available...</div>
                  )}
                </Panel>
              </div>
            </Panel>
          </div>
        )}

        {/* Footer with action buttons */}
        {showActions && (
          <div className="flex flex-column sm:flex-row justify-content-between align-items-stretch sm:align-items-center gap-3 mt-4 pt-3 border-top-1 surface-border">
            <div className="text-500 text-sm">
              {hasChanges && mode !== 'view' && (
                <span className="flex align-items-center gap-2">
                  <i className="pi pi-info-circle"></i>
                  You have unsaved changes
                </span>
              )}
            </div>
            <div className="flex gap-2 justify-content-end">
              <Button
                label={mode === 'view' ? 'Back' : 'Cancel'}
                icon={mode === 'view' ? 'pi pi-arrow-left' : 'pi pi-times'}
                onClick={handleCancel}
                className="p-button-text"
                disabled={saving}
              />
              {mode !== 'view' && (
                <Button
                  label={saving ? 'Saving...' : 'Save'}
                  icon={saving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                  onClick={handleSave}
                  disabled={saving || (!hasChanges && mode === 'edit')}
                />
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default BaseEntityForm;
