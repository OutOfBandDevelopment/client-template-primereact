import React from 'react';

/**
 * Column configuration for GenericGrid
 */
export interface GenericGridColumn<TModel> {
  field: keyof TModel;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'number' | 'date' | 'boolean' | 'dropdown' | 'multiselect';
  hidden?: boolean;
  width?: string;
  frozen?: boolean;
  body?: (rowData: TModel) => React.ReactNode;
  /** Navigation target for foreign key fields - used to load options from related entity */
  navigationTarget?: string;
  /** Navigation variant for filtered combobox/multiselect (from x-navigation-variant) */
  navigationVariant?: string;
  /** Cell renderer name from x-cell-renderer metadata - looked up in cellRendererRegistry */
  cellRenderer?: string;
}

/**
 * Global search configuration
 */
export interface GlobalSearchConfig {
  searchTerm: string;
  searchType: 'startsWith' | 'contains' | 'endsWith' | 'equals';
}

/**
 * Column width configuration for state capture/restore
 */
export interface ColumnWidthConfig {
  field: string;
  width: string;
}

/**
 * Complete grid state for predefined filters
 */
export interface GridStateConfig<TSearchQuery> {
  searchQuery: Partial<TSearchQuery>;
  globalSearch?: GlobalSearchConfig;
  activeFilters?: FilterOperation[];
  activeSorts?: OrderByConfig[];
  visibleColumns?: string[];
  columnOrder?: string[];
  columnWidths?: ColumnWidthConfig[];
  selectedRowIds?: (string | number)[];
  pageSize?: number;
}

/**
 * Predefined filter configuration with complete grid state support
 */
export interface PredefinedFilter<TSearchQuery> {
  id: string;
  label: string;
  description?: string;
  
  // Legacy support (deprecated - use gridState instead)
  searchQuery?: Partial<TSearchQuery>;
  
  // Enhanced grid state support
  gridState?: GridStateConfig<TSearchQuery>;
}

/**
 * Filter operations
 */
export interface FilterOperation {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
  value: any;
  values?: any[]; // for 'in' operator
}

/**
 * Order by configuration
 */
export interface OrderByConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}