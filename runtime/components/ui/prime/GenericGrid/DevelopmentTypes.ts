import type { ISearch, IFilter, IOrderBy } from '@/api/_ClientBase';
import type { FilterOperation, OrderByConfig, GlobalSearchConfig, ColumnWidthConfig } from './types';

/**
 * Development filter view model that extends ISearch with additional properties
 * for debugging and development purposes
 */
export interface IDevelopmentFilterViewModel<TFilter extends IFilter, TOrderBy extends IOrderBy> 
  extends ISearch<TFilter, TOrderBy> {
  // Additional development properties
  columns: string[]; // Array of visible column field names
  activeFiltersCount: number;
  activeSortsCount: number;
  globalSearchActive: boolean;
  predefinedFilterActive: boolean;
  selectedRowsCount: number; // Count of selected rows across pagination
  
  // Enhanced debugging info
  activeFilters?: FilterOperation[];
  activeSorts?: OrderByConfig[];
  globalSearch?: GlobalSearchConfig;
  columnOrder?: string[];
  columnWidths?: ColumnWidthConfig[];
  selectedRowIds?: (string | number)[]; // IDs of selected rows across pagination
  allAvailableColumns?: string[];
  
  // Metadata
  timestamp: string;
  gridInstanceId?: string;
}

/**
 * Factory function to create development filter view model from grid state
 */
export function createDevelopmentFilterViewModel<TFilter extends IFilter, TOrderBy extends IOrderBy>(
  baseSearch: ISearch<TFilter, TOrderBy>,
  visibleColumns: string[],
  activeFilters: FilterOperation[] = [],
  activeSorts: OrderByConfig[] = [],
  globalSearch?: GlobalSearchConfig,
  columnOrder?: string[],
  columnWidths?: ColumnWidthConfig[],
  selectedRowIds?: (string | number)[],
  allColumns?: string[],
  gridInstanceId?: string
): IDevelopmentFilterViewModel<TFilter, TOrderBy> {
  return {
    // Base ISearch properties
    currentPage: baseSearch.currentPage,
    pageSize: baseSearch.pageSize,
    excludePageCount: baseSearch.excludePageCount,
    searchTerm: baseSearch.searchTerm,
    filter: baseSearch.filter,
    orderBy: baseSearch.orderBy,
    
    // Development-specific properties
    columns: visibleColumns,
    activeFiltersCount: activeFilters.length,
    activeSortsCount: activeSorts.length,
    globalSearchActive: !!(globalSearch?.searchTerm),
    predefinedFilterActive: false, // Could be enhanced to track predefined filter usage
    selectedRowsCount: selectedRowIds?.length || 0,
    
    // Enhanced debugging info
    activeFilters,
    activeSorts,
    globalSearch,
    columnOrder,
    columnWidths,
    selectedRowIds,
    allAvailableColumns: allColumns,
    
    // Metadata
    timestamp: new Date().toISOString(),
    gridInstanceId
  };
}

export type { ISearch, IFilter, IOrderBy };