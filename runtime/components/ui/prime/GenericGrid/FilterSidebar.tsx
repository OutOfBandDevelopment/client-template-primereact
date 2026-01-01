import React, { useState, useMemo } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GenericGridColumn, FilterOperation, OrderByConfig, GlobalSearchConfig, PredefinedFilter, GridStateConfig } from './types';
import { FilterControl } from './FilterControl';
import { InputText } from 'primereact/inputtext';
import { DevelopmentPanel } from './DevelopmentPanel';
import { DefinedFilterComponent } from '../DefinedFilter';
import DevelopmentConfig from '@/config/development';
import type { IDevelopmentFilterViewModel, IFilter, IOrderBy } from './DevelopmentTypes';
import { extractZodFields } from '@/utils/zodSchemaHelper';
import type { z } from 'zod';
import type { IQueryDefinedFilterModel } from '@/api/GreenOnion/Models';

interface FilterSidebarProps<TSearchQuery> {
  columns: GenericGridColumn<any>[];
  searchQuery: TSearchQuery;
  onSearchQueryChange: (query: TSearchQuery) => void;
  visibleColumns: string[];
  onVisibleColumnsChange: (columns: string[]) => void;
  columnOrder: string[];
  onColumnOrderChange: (order: string[]) => void;
  activeFilters?: FilterOperation[];
  onActiveFiltersChange?: (filters: FilterOperation[]) => void;
  activeSorts?: OrderByConfig[];
  onActiveSortsChange?: (sorts: OrderByConfig[]) => void;
  globalSearch?: GlobalSearchConfig;
  onGlobalSearchChange?: (search: GlobalSearchConfig) => void;
  predefinedFilters?: PredefinedFilter<TSearchQuery>[];
  onPredefinedFilterChange?: (filter: PredefinedFilter<TSearchQuery>) => void;
  developmentViewModel?: IDevelopmentFilterViewModel<any, any>;
  developmentPanelVisible?: boolean;
  // New props for DefinedFilter integration
  gridInstance?: string;
  entityType?: string; // Entity model name for stable filter linking (e.g., "QueryManufacturerModel")
  allColumns?: string[];
  currentGridState?: GridStateConfig<TSearchQuery>;
  onClearSelections?: () => void;
  onDefinedFilterApply?: (filter: IQueryDefinedFilterModel) => void;
  onDefinedFiltersChange?: () => void;
  // Schema for field metadata lookup
  schema?: any; // z.ZodObject<any> - using any to avoid import issues
}

// Sortable item component for column visibility (with excluded drag handle for buttons)
function SortableColumnItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex align-items-center gap-2 p-2 border-1 border-300 border-round mb-1">
        <span {...attributes} {...listeners} style={{ cursor: 'move' }}>
          <i className="pi pi-bars text-400" />
        </span>
        {children}
      </div>
    </div>
  );
}

// Sortable item component for order by (drag handle only on bars icon)
function SortableOrderItem({ id, children }: { id: string; children: React.ReactNode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex align-items-center gap-2 p-2 border-1 border-300 border-round mb-1">
        <span {...attributes} {...listeners} style={{ cursor: 'move', padding: '0.25rem' }}>
          <i className="pi pi-bars text-400" />
        </span>
        {children}
      </div>
    </div>
  );
}


export function FilterSidebar<TSearchQuery>({
  columns,
  searchQuery,
  onSearchQueryChange,
  visibleColumns,
  onVisibleColumnsChange,
  columnOrder,
  onColumnOrderChange,
  activeFilters = [],
  onActiveFiltersChange,
  activeSorts = [],
  onActiveSortsChange,
  globalSearch,
  onGlobalSearchChange,
  predefinedFilters = [],
  onPredefinedFilterChange,
  developmentViewModel,
  developmentPanelVisible = false,
  gridInstance,
  entityType,
  allColumns = [],
  currentGridState,
  onClearSelections,
  onDefinedFilterApply,
  onDefinedFiltersChange,
  schema
}: FilterSidebarProps<TSearchQuery>) {
  // Local state for form inputs
  const [selectedFilterField, setSelectedFilterField] = useState<string>('');
  const [selectedSortField, setSelectedSortField] = useState<string>('');

  // Build filterable fields from schema (independent of displayed columns)
  // This includes navigation target fields that may be hidden from display
  const filterableFields = useMemo(() => {
    if (!schema) {
      // Fallback to columns if no schema provided
      return columns.filter(col => col.filterable).map(col => ({
        field: String(col.field),
        header: col.header,
        navigationTarget: col.navigationTarget,
        navigationVariant: col.navigationVariant,
        filterType: col.filterType || 'text',
      }));
    }

    try {
      const schemaFields = extractZodFields(schema as z.ZodObject<any>);
      const fields: Array<{
        field: string;
        header: string;
        navigationTarget?: string;
        navigationVariant?: string;
        filterType: string;
      }> = [];

      // Helper to check metadata boolean values (handles true, 'true', 'True', etc.)
      const isMetadataTrue = (value: any): boolean => {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') return value.toLowerCase() === 'true';
        return !!value;
      };

      for (const f of schemaFields) {
        // Skip non-filterable fields (x-not-filterable: true)
        if (isMetadataTrue(f.metadata?.['x-not-filterable'])) continue;
        // Skip navigation relation fields (use the ID field instead)
        if (f.metadata?.['x-navigation-relation']) continue;
        // Skip array/object fields
        if (f.type === 'array' || f.type === 'object') continue;

        // Get header from x-label or format field name
        let header = f.metadata?.['x-label'] || f.name.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

        // Navigation target fields get "ID" suffix for clarity
        const isNavigationTarget = !!f.metadata?.['x-navigation-target'];
        if (isNavigationTarget && !header.toLowerCase().endsWith(' id')) {
          header = `${header}`;
        }

        fields.push({
          field: f.name,
          header,
          navigationTarget: f.metadata?.['x-navigation-target'],
          navigationVariant: f.metadata?.['x-navigation-variant'],
          filterType: isNavigationTarget ? 'multiselect' :
                     f.type === 'boolean' ? 'boolean' :
                     f.type === 'number' ? 'number' :
                     f.type === 'date' ? 'date' : 'text',
        });
      }

      return fields;
    } catch (error) {
      console.warn('FilterSidebar: Error extracting fields from schema:', error);
      // Fallback to columns
      return columns.filter(col => col.filterable).map(col => ({
        field: String(col.field),
        header: col.header,
        navigationTarget: col.navigationTarget,
        navigationVariant: col.navigationVariant,
        filterType: col.filterType || 'text',
      }));
    }
  }, [schema, columns]);

  // Helper to get column config for a field (may be from columns or synthesized from schema)
  const getColumnForField = (fieldName: string): GenericGridColumn<any> | null => {
    // First try to find in columns
    const column = columns.find(col => String(col.field) === fieldName);
    if (column) return column;

    // Otherwise synthesize from filterableFields
    const filterField = filterableFields.find(f => f.field === fieldName);
    if (filterField) {
      return {
        field: filterField.field as any,
        header: filterField.header,
        filterable: true,
        filterType: filterField.filterType as any,
        navigationTarget: filterField.navigationTarget,
        navigationVariant: filterField.navigationVariant,
      };
    }

    return null;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSortDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onActiveSortsChange) {
      const oldIndex = activeSorts.findIndex((item) => item.field === active.id);
      const newIndex = activeSorts.findIndex((item) => item.field === over.id);

      const reorderedSorts = arrayMove(activeSorts, oldIndex, newIndex);
      
      // Update priorities to match new order
      const sortsWithUpdatedPriorities = reorderedSorts.map((sort, index) => ({
        ...sort,
        priority: index
      }));
      
      onActiveSortsChange(sortsWithUpdatedPriorities);
    }
  };


  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.findIndex((item) => item === active.id);
      const newIndex = columnOrder.findIndex((item) => item === over.id);

      onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex));
    }
  };

  const toggleSortDirection = (index: number) => {
    if (onActiveSortsChange) {
      const newSorts = [...activeSorts];
      newSorts[index].direction = newSorts[index].direction === 'asc' ? 'desc' : 'asc';
      onActiveSortsChange(newSorts);
    }
  };

  const removeSort = (index: number) => {
    if (onActiveSortsChange) {
      const newSorts = activeSorts.filter((_, i) => i !== index);
      
      // Update priorities for remaining sorts
      const sortsWithUpdatedPriorities = newSorts.map((sort, idx) => ({
        ...sort,
        priority: idx
      }));
      
      onActiveSortsChange(sortsWithUpdatedPriorities);
    }
  };

  const addSort = (field: string) => {
    if (onActiveSortsChange) {
      const newSort: OrderByConfig = {
        field,
        direction: 'asc',
        priority: activeSorts.length
      };
      onActiveSortsChange([...activeSorts, newSort]);
    }
  };

  const addFilter = (field: string) => {
    if (onActiveFiltersChange) {
      const newFilter: FilterOperation = {
        field,
        operator: 'eq',
        value: ''
      };
      onActiveFiltersChange([...activeFilters, newFilter]);
    }
  };


  const removeFilter = (index: number) => {
    if (onActiveFiltersChange) {
      onActiveFiltersChange(activeFilters.filter((_, i) => i !== index));
    }
  };

  // Update filter at specific index with new values
  const handleFilterUpdate = (index: number, newFilter: FilterOperation) => {
    if (onActiveFiltersChange) {
      const newFilters = [...activeFilters];
      newFilters[index] = newFilter;
      onActiveFiltersChange(newFilters);
    }
  };

  // Global Search Panel - REMOVED: Global search now exists on top bar

  // Handle defined filter apply
  const handleDefinedFilterApply = (filter: IQueryDefinedFilterModel) => {
    try {
      if (filter.state) {
        const state = JSON.parse(filter.state);
        
        // Reset selections
        if (onClearSelections) {
          onClearSelections();
        }
        
        // Apply search term
        if (state.searchTerm && onGlobalSearchChange) {
          onGlobalSearchChange({
            searchTerm: state.searchTerm,
            searchType: globalSearch?.searchType || 'contains'
          });
        } else if (onGlobalSearchChange) {
          onGlobalSearchChange({
            searchTerm: '',
            searchType: globalSearch?.searchType || 'contains'
          });
        }
        
        // Apply filters
        if (state.filters && onActiveFiltersChange) {
          onActiveFiltersChange(state.filters);
        } else if (onActiveFiltersChange) {
          onActiveFiltersChange([]);
        }
        
        // Apply sorts
        if (state.orderBy && onActiveSortsChange) {
          onActiveSortsChange(state.orderBy);
        } else if (onActiveSortsChange) {
          onActiveSortsChange([]);
        }
        
        // Apply column visibility and order
        if (state.visibleColumns && onVisibleColumnsChange) {
          onVisibleColumnsChange(state.visibleColumns);
        } else if (allColumns.length > 0 && onVisibleColumnsChange) {
          onVisibleColumnsChange(allColumns);
        }
        
        if (state.columnOrder && onColumnOrderChange) {
          onColumnOrderChange(state.columnOrder);
        } else if (allColumns.length > 0 && onColumnOrderChange) {
          onColumnOrderChange(allColumns);
        }
        
        // Call parent callback if provided
        if (onDefinedFilterApply) {
          onDefinedFilterApply(filter);
        }
      }
    } catch (error) {
      console.error('❌ [FilterSidebar] Failed to apply defined filter:', error);
    }
  };

  // Handle new filter (reset to default)
  const handleNewFilter = () => {
    // Reset selections
    if (onClearSelections) {
      onClearSelections();
    }
    
    // Clear search
    if (onGlobalSearchChange) {
      onGlobalSearchChange({
        searchTerm: '',
        searchType: globalSearch?.searchType || 'contains'
      });
    }
    
    // Clear filters and sorts
    if (onActiveFiltersChange) {
      onActiveFiltersChange([]);
    }
    if (onActiveSortsChange) {
      onActiveSortsChange([]);
    }
    
    // Show all columns in original order
    if (allColumns.length > 0) {
      if (onVisibleColumnsChange) {
        onVisibleColumnsChange(allColumns);
      }
      if (onColumnOrderChange) {
        onColumnOrderChange(allColumns);
      }
    }
    
    // Clear URL filter when resetting
    if (onDefinedFilterApply) {
      onDefinedFilterApply(null as any);
    }
  };

  // Defined Filters Panel (replaces predefined filters)
  const definedFiltersPanel = gridInstance ? (
    <div className="mb-3">
      <DefinedFilterComponent
        gridInstance={gridInstance}
        entityType={entityType}
        allColumns={allColumns}
        onFilterApply={handleDefinedFilterApply}
        onNewFilter={handleNewFilter}
        getCurrentGridState={() => {
          return currentGridState || null;
        }}
        onFiltersChange={onDefinedFiltersChange}
      />
    </div>
  ) : null;

  // Predefined Filters Panel (legacy - only shown when no gridInstance)
  const predefinedFiltersPanel = !gridInstance && predefinedFilters.length > 0 && onPredefinedFilterChange ? (
    <Panel header="Quick Filters" toggleable collapsed={false} className="mb-3">
      <div className="flex flex-column gap-2">
        {predefinedFilters.map((filter) => (
          <Button
            key={filter.id}
            label={filter.label}
            size="small"
            severity="info"
            outlined
            onClick={() => onPredefinedFilterChange(filter)}
            className="justify-content-start"
            tooltip={filter.description}
          />
        ))}
      </div>
    </Panel>
  ) : null;

  // Reset function (moved to individual panels)
  const handleReset = () => {
    // Reset all to defaults
    if (onActiveFiltersChange) {
      onActiveFiltersChange([]);
    }
    if (onActiveSortsChange) {
      onActiveSortsChange([]);
    }
    if (onGlobalSearchChange && globalSearch) {
      onGlobalSearchChange({ searchTerm: '', searchType: globalSearch.searchType });
    }
    if (onVisibleColumnsChange && columns.length > 0) {
      const defaultColumns = columns.map(col => String(col.field));
      onVisibleColumnsChange(defaultColumns);
    }
    if (onColumnOrderChange && columns.length > 0) {
      const defaultOrder = columns.map(col => String(col.field));
      onColumnOrderChange(defaultOrder);
    }
  };

  // Filter Panel with count in header and reset button
  const filterPanel = (
    <Panel 
      header={
        <div className="flex align-items-center justify-content-between w-full">
          <span>Filters ({activeFilters.length})</span>
          {activeFilters.length > 0 && (
            <Button
              icon="pi pi-times"
              size="small"
              severity="secondary"
              text
              onClick={() => onActiveFiltersChange?.([])}
              tooltip="Clear all filters"
            />
          )}
        </div>
      } 
      toggleable 
      collapsed={false} 
      className="mb-3"
    >
      <div className="flex flex-column gap-2">
        <div className="flex align-items-center gap-2">
          <Dropdown
            value={selectedFilterField}
            options={filterableFields.map(f => ({
              label: f.header,
              value: f.field
            }))}
            onChange={(e) => setSelectedFilterField(e.value)}
            placeholder="Add filter..."
            className="flex-1"
          />
          <Button 
            icon="pi pi-plus" 
            className="p-button-sm" 
            disabled={!selectedFilterField || activeFilters.some(f => f.field === selectedFilterField)}
            onClick={() => {
              if (selectedFilterField) {
                addFilter(selectedFilterField);
                setSelectedFilterField('');
              }
            }}
          />
        </div>

        {/* Active filters list - using FilterControl component */}
        {activeFilters.map((filter, index) => {
          const column = getColumnForField(filter.field);

          if (!column) return null;

          return (
            <FilterControl
              key={index}
              column={column}
              initialFilter={filter}
              onApply={(newFilter) => handleFilterUpdate(index, newFilter)}
              onClear={() => removeFilter(index)}
              onCancel={() => removeFilter(index)}
              showHeader={true}
              showButtons={true}
              className="border-1 border-300 border-round p-3 mb-2"
              schema={schema}
            />
          );
        })}
        
        {activeFilters.length === 0 && (
          <small className="text-500">No filters applied</small>
        )}
      </div>
    </Panel>
  );

  // Order By Panel with count in header and reset button
  const orderByPanel = (
    <Panel 
      header={
        <div className="flex align-items-center justify-content-between w-full">
          <span>Order By ({activeSorts.length})</span>
          {activeSorts.length > 0 && (
            <Button
              icon="pi pi-times"
              size="small"
              severity="secondary"
              text
              onClick={() => onActiveSortsChange?.([])}
              tooltip="Clear all sorts"
            />
          )}
        </div>
      } 
      toggleable 
      collapsed={false} 
      className="mb-3"
    >
      <div className="flex flex-column gap-2">
        <div className="flex align-items-center gap-2">
          <Dropdown
            value={selectedSortField}
            options={columns.filter(col => col.sortable).map(col => ({
              label: col.header,
              value: String(col.field)
            }))}
            onChange={(e) => setSelectedSortField(e.value)}
            placeholder="Add sort..."
            className="flex-1"
          />
          <Button 
            icon="pi pi-plus" 
            className="p-button-sm" 
            disabled={!selectedSortField || activeSorts.some(s => s.field === selectedSortField)}
            onClick={() => {
              if (selectedSortField) {
                addSort(selectedSortField);
                setSelectedSortField('');
              }
            }}
          />
        </div>

        {/* Sortable list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSortDragEnd}
        >
          <SortableContext items={activeSorts.map(s => s.field)} strategy={verticalListSortingStrategy}>
            {activeSorts.map((sort, index) => {
              const column = columns.find(col => String(col.field) === sort.field);
              return (
                <SortableOrderItem key={sort.field} id={sort.field}>
                  <span className="flex-1">{column?.header || sort.field}</span>
                  <button
                    type="button"
                    className="p-button p-button-text p-button-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSortDirection(index);
                    }}
                    title={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px'
                    }}
                  >
                    <i className={sort.direction === 'asc' ? 'pi pi-sort-amount-up' : 'pi pi-sort-amount-down'} />
                  </button>
                  <button
                    type="button"
                    className="p-button p-button-text p-button-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeSort(index);
                    }}
                    title="Remove from sort"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px',
                      color: 'var(--red-500)'
                    }}
                  >
                    <i className="pi pi-times" />
                  </button>
                </SortableOrderItem>
              );
            })}
          </SortableContext>
        </DndContext>

        {activeSorts.length === 0 && (
          <small className="text-500">No sorting applied</small>
        )}
      </div>
    </Panel>
  );

  // Columns Panel with visible/total count
  const columnsPanel = (
    <Panel 
      header={
        <div className="flex align-items-center justify-content-between w-full">
          <span>Columns ({visibleColumns.length}/{columnOrder.length})</span>
          {visibleColumns.length < columnOrder.length && (
            <Button
              icon="pi pi-eye"
              size="small"
              severity="secondary"
              text
              onClick={() => onVisibleColumnsChange?.(columnOrder)}
              tooltip="Show all columns"
            />
          )}
        </div>
      } 
      toggleable 
      collapsed={true}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleColumnDragEnd}
      >
        <SortableContext items={columnOrder} strategy={verticalListSortingStrategy}>
          {columnOrder.map((fieldName) => {
            const column = columns.find(col => String(col.field) === fieldName);
            if (!column) return null;

            const isVisible = visibleColumns.includes(fieldName);
            
            return (
              <SortableColumnItem key={fieldName} id={fieldName}>
                <span className={`flex-1 ${!isVisible ? 'text-400' : ''}`}>{column.header}</span>
                <button
                    type="button"
                    className={`p-button p-button-text p-button-sm ${
                      !isVisible 
                        ? 'p-button-secondary text-400' 
                        : isVisible && visibleColumns.length <= 1 
                          ? 'text-400' 
                          : 'text-primary'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      if (isVisible) {
                        // Don't allow hiding the last visible column
                        if (visibleColumns.length > 1) {
                          const newVisibleColumns = visibleColumns.filter(col => col !== fieldName);
                          onVisibleColumnsChange(newVisibleColumns);
                        } 
                      } else {
                        const newVisibleColumns = [...visibleColumns, fieldName];
                        onVisibleColumnsChange(newVisibleColumns);
                      }
                    }}
                    title={isVisible ? (visibleColumns.length > 1 ? 'Hide column' : 'Cannot hide last column') : 'Show column'}
                    disabled={isVisible && visibleColumns.length <= 1}
                    style={{
                      color: isVisible 
                        ? (visibleColumns.length <= 1 ? 'var(--text-color-secondary)' : 'var(--primary-color)') 
                        : 'var(--text-color-secondary)',
                      background: 'transparent',
                      border: 'none',
                      cursor: isVisible && visibleColumns.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '3px'
                    }}
                  >
                    <i className={isVisible ? 'pi pi-eye' : 'pi pi-eye-slash'} />
                  </button>
              </SortableColumnItem>
            );
          })}
        </SortableContext>
      </DndContext>
    </Panel>
  );

  // Development Panel Section
  const developmentPanel = DevelopmentConfig.enableGridDebugPanel && developmentPanelVisible && developmentViewModel ? (
    <DevelopmentPanel
      viewModel={developmentViewModel}
      title="Debug Panel"
    />
  ) : null;

  return (
    <div className="filter-sidebar">
      {predefinedFiltersPanel}
      {filterPanel}
      {orderByPanel}
      {columnsPanel}
      {definedFiltersPanel}
      {developmentPanel}
    </div>
  );
}