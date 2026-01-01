import React from 'react';
import { ISearchQueryBase } from '../Base/types';

// Client interface for data operations
export interface IQueryableClient<TFilter, TOrderBy, TSearchQuery, TModel> {
  Query(request: { body: TSearchQuery }): Promise<{
    rows?: TModel[];
    totalRowCount?: number;
  }>;
}

// Column configuration
export interface GridColumnConfig<TModel> {
  field: keyof TModel;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: FilterType;
  hidden?: boolean;
  width?: string;
  frozen?: boolean;
  body?: (rowData: TModel) => React.ReactNode;
}

// Predefined filter configuration
export interface PredefinedFilter<TSearchQuery> {
  id: string;
  label: string;
  searchQuery: Partial<TSearchQuery>;
  description?: string;
}

// Filter types supported
export type FilterType = 'text' | 'number' | 'date' | 'boolean' | 'dropdown' | 'multiselect';

// Global search configuration
export interface GlobalSearchConfig {
  searchTerm: string;
  searchType: 'startsWith' | 'contains' | 'endsWith' | 'equals';
}

// Filter operations
export interface FilterOperation {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';
  value: any;
  values?: any[]; // for 'in' operator
}

// Order by configuration
export interface OrderByConfig {
  field: string;
  direction: 'asc' | 'desc';
  priority: number;
}

// Main grid component props
export interface GenericGridProps<TFilter, TOrderBy, TSearchQuery extends ISearchQueryBase, TModel> {
  // Data source
  client: IQueryableClient<TFilter, TOrderBy, TSearchQuery, TModel>;
  
  // Configuration
  title: string;
  columns: GridColumnConfig<TModel>[];
  
  // Search and filtering
  predefinedFilters?: PredefinedFilter<TSearchQuery>[];
  initialSearchQuery?: Partial<TSearchQuery>;
  
  // Virtual scrolling configuration
  virtualScrolling?: {
    /** Enable virtual scrolling (default: true) */
    enabled?: boolean;
    /** Item height in pixels (default: 50) */
    itemHeight?: number;
    /** Page size for virtual scrolling (default: 50) */
    pageSize?: number;
    /** Buffer size for virtual scrolling (default: 10) */
    buffer?: number;
  };
  
  // Features
  enableBulkSelection?: boolean;
  enableColumnReordering?: boolean;
  enableFiltering?: boolean;
  enableSorting?: boolean;
  enableCreate?: boolean;
  
  // Event handlers
  onRowClick?: (model: TModel) => void;
  onBulkSelect?: (selectedIds: number[]) => void;
  onCreateClick?: () => void;
  
  // Styling
  className?: string;
  height?: string;
}