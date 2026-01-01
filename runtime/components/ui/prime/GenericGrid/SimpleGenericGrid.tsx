import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { DataTable, DataTablePageEvent, DataTableSortEvent, DataTableFilterEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { Paginator } from 'primereact/paginator';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import DefinedFilterClient from '@/api/GreenOnion/Clients/DefinedFilterClient';
import type { IQueryDefinedFilterModel } from '@/api/GreenOnion/Models';

import type { GenericGridColumn, FilterOperation, OrderByConfig } from './types';
import type { ISearchQueryBase } from '../Base/types';
import { GridToolbar } from './GridToolbar';
import { FilterSidebar } from './FilterSidebar';
import { DevelopmentPanel } from './DevelopmentPanel';
import { createDevelopmentFilterViewModel } from './DevelopmentTypes';
import DevelopmentConfig from '@/config/development';
import type { GlobalSearchConfig, PredefinedFilter, GridStateConfig, ColumnWidthConfig } from './types';
import type { ISearch, IFilter, IOrderBy } from '@/api/_ClientBase';
import { getCellRenderer } from '@/utils/cellRendererRegistry';
import { BulkActionBar, getBulkActionsForEntity } from '@/utils/bulkActionRegistry';
import type { BulkActionResult } from '@/utils/bulkActionRegistry';
import { usePermissions } from '@/hooks/usePermissions';
import { DataExporter } from '@/utils/dataExport';

/**
 * Simplified GenericGrid Props without virtual scrolling
 */
export interface SimpleGenericGridProps<TFilter, TOrderBy, TSearchQuery extends ISearchQueryBase, TModel> {
  client: { Query: (params: { body: TSearchQuery }) => Promise<{ rows?: TModel[]; totalRowCount?: number }> };
  title: string;
  columns: GenericGridColumn<TModel>[];
  predefinedFilters?: PredefinedFilter<TSearchQuery>[];
  initialSearchQuery?: Partial<TSearchQuery>;
  pageSize?: number;
  pageSizeOptions?: number[];
  enableBulkSelection?: boolean;
  enableCreate?: boolean;
  onRowClick?: (data: TModel) => void;
  onBulkSelect?: (selectedRows: TModel[]) => void;
  onBulkSelectIds?: (selectedRowIds: (string | number)[]) => void;
  onCreateClick?: () => void;
  className?: string;
  height?: string;
  dataKey?: string; // Primary key field for row identification
  selectionStorageKey?: string; // Custom key for localStorage persistence (defaults to title-based key)
  schema?: any; // Zod schema for field metadata lookup
  /** Entity type for stable filter linking (e.g., "QueryManufacturerModel") */
  entityType?: string;
  /** Bulk action IDs from x-bulk-actions metadata - enables bulk action bar when provided */
  bulkActions?: string[];
  /** Display field for bulk action preview (defaults to 'name') */
  bulkActionDisplayField?: string;
  /** Callback when a bulk action completes */
  onBulkActionComplete?: (actionId: string, result: BulkActionResult) => void;
  /** Enable export buttons in toolbar */
  enableExport?: boolean;
  /** Custom filename for export (defaults to grid title) */
  exportFilename?: string;
  /** Maximum records to export (default: 100000) */
  exportMaxRecords?: number;
}

/**
 * Simplified GenericGrid component with server-side pagination
 */
export function SimpleGenericGrid<TFilter, TOrderBy, TSearchQuery extends ISearchQueryBase, TModel>({
  client,
  title,
  columns,
  predefinedFilters = [],
  initialSearchQuery = {},
  pageSize = 20,
  pageSizeOptions = [50, 100, 1000],
  enableBulkSelection = true,
  // enableColumnReordering = true,
  // enableFiltering = true,
  // enableSorting = true,
  enableCreate = false,
  onRowClick,
  onBulkSelect,
  onBulkSelectIds,
  onCreateClick,
  className = '',
  height = '600px',
  dataKey = 'id', // Default to 'id' for backward compatibility
  selectionStorageKey,
  schema,
  entityType,
  bulkActions = [],
  bulkActionDisplayField = 'name',
  onBulkActionComplete,
  enableExport = true,
  exportFilename,
  exportMaxRecords = 100000
}: SimpleGenericGridProps<TFilter, TOrderBy, TSearchQuery, TModel>) {

  // Get user role for bulk action permissions
  const { userRole } = usePermissions();

  const toastRef = useRef<Toast>(null);
  const [hasAppliedUrlFilter, setHasAppliedUrlFilter] = useState(false);
  const definedFilterClient = useMemo(() => new DefinedFilterClient(), []);
  const [definedFilters, setDefinedFilters] = useState<IQueryDefinedFilterModel[]>([]);
  const [selectedDefinedFilter, setSelectedDefinedFilter] = useState<IQueryDefinedFilterModel | null>(null);

  // State management for server-side pagination
  const [data, setData] = useState<TModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [selectedRows, setSelectedRows] = useState<TModel[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(true); // Default to open/pinned
  const location = useLocation(); // React Router location for detecting programmatic navigation
  const [lastProcessedHash, setLastProcessedHash] = useState<string>(''); // Track processed hash to prevent duplicates
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState<TSearchQuery>(initialSearchQuery as TSearchQuery);
  const [globalSearch, setGlobalSearch] = useState<GlobalSearchConfig>({
    searchTerm: '',
    searchType: 'contains'
  });
  
  // Sort and filter state for UI interaction
  const [activeFilters, setActiveFilters] = useState<FilterOperation[]>([]);
  const [activeSorts, setActiveSorts] = useState<OrderByConfig[]>([]);

  // Show selected only mode - when true, shows only selected rows (no other filters)
  // Stores the previous filter state to restore when toggling back
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [savedFiltersBeforeShowSelected, setSavedFiltersBeforeShowSelected] = useState<FilterOperation[]>([]);
  const [savedGlobalSearchBeforeShowSelected, setSavedGlobalSearchBeforeShowSelected] = useState<GlobalSearchConfig>({ searchTerm: '', searchType: 'contains' });
  
  // Column filter functionality removed
  // Remove DataTable's separate sort state - use only activeSorts as single source of truth

  // Column visibility and ordering
  // Initialize visible columns excluding those marked as hidden
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.filter(col => !col.hidden).map(col => String(col.field))
  );
  // Column order includes all columns (even hidden ones for filter panel)
  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map(col => String(col.field))
  );
  const [columnWidths, setColumnWidths] = useState<{[key: string]: string}>({});
  // Generate unique storage key for this grid instance
  const storageKey = selectionStorageKey || `grid-selection-${(title || 'grid').replace(/\s+/g, '-').toLowerCase()}`;
  
  // Generate grid instance identifier for defined filters
  const gridInstance = (title || 'grid').replace(/\s+/g, '-').toLowerCase();
  
  // Initialize selected rows from localStorage
  const [selectedRowIds, setSelectedRowIds] = useState<(string | number)[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed;
      }
    } catch (error) {
      console.warn(`⚠️ [SimpleGenericGrid] Failed to restore selections for ${title}:`, error);
    }
    return [];
  });

  // Persist selected rows to localStorage whenever they change
  useEffect(() => {
    try {
      if (selectedRowIds.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(selectedRowIds));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn(`⚠️ [SimpleGenericGrid] Failed to persist selections for ${title}:`, error);
    }
  }, [selectedRowIds, storageKey, title]);

  // Debug column visibility changes
  useEffect(() => {
  }, [visibleColumns, columns]);

  // Load defined filters for this grid
  // Uses entityType (stable identifier) when available, falls back to gridInstance for backward compatibility
  const loadDefinedFilters = useCallback(async () => {
    try {
      // Use entityType if available (preferred), otherwise fall back to instance
      const filterCriteria = entityType
        ? { entityType: { eq: entityType }, isActive: { eq: true } }
        : { instance: { eq: gridInstance }, isActive: { eq: true } };

      const searchQuery = {
        currentPage: 0,
        pageSize: 100,
        filter: filterCriteria
      };

      const response = await definedFilterClient.Query({ body: searchQuery });

      if (response && response.rows && Array.isArray(response.rows)) {
        setDefinedFilters(response.rows);
      } else {
        setDefinedFilters([]);
      }
    } catch (error) {
      console.error('❌ [SimpleGenericGrid] Failed to load defined filters:', error);
      setDefinedFilters([]);
    }
  }, [entityType, gridInstance, definedFilterClient]);

  // Parse filter name from URL hash
  const getFilterNameFromUrl = (): string | null => {
    const hash = window.location.hash;
    const filterMatch = hash.match(/#filter=([^&]+)/);
    if (filterMatch && filterMatch[1]) {
      const filterName = decodeURIComponent(filterMatch[1]);
      return filterName;
    }
    return null;
  };

  // Update URL hash with current filter name
  const updateUrlWithFilter = (filterName: string | null) => {
    const currentHash = window.location.hash;
    const newHash = filterName 
      ? `#filter=${encodeURIComponent(filterName)}`
      : '';
    
    if (currentHash !== newHash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search + newHash);
    }
  };

  // Load and apply filter from URL on initial mount
  const loadFilterFromUrl = useCallback(async () => {
    if (hasAppliedUrlFilter) {
      return; // Only apply once on initial load
    }

    const filterName = getFilterNameFromUrl();
    if (!filterName) {
      return;
    }

    try {
      // Query for filters matching this grid instance and name
      const searchQuery = {
        currentPage: 0,
        pageSize: 100,
        filter: {
          instance: { eq: gridInstance },
          name: { eq: filterName },
          isActive: { eq: true }
        }
      };
      
      const response = await definedFilterClient.Query({ body: searchQuery });
      
      if (response && response.rows && response.rows.length > 0) {
        const filter = response.rows[0] as IQueryDefinedFilterModel;
        if (filter.state) {
          try {
            const state = JSON.parse(filter.state);
            // Apply the filter state
            if (state.searchTerm) {
              setGlobalSearch({
                searchTerm: state.searchTerm,
                searchType: 'contains'
              });
            }
            
            if (state.filters) {
              setActiveFilters(state.filters);
            }
            
            if (state.orderBy) {
              setActiveSorts(state.orderBy);
            }
            
            if (state.visibleColumns) {
              setVisibleColumns(state.visibleColumns);
            }
            
            if (state.columnOrder) {
              setColumnOrder(state.columnOrder);
            }
            
            setHasAppliedUrlFilter(true);
            setSelectedDefinedFilter(filter); // Set the selected filter for the dropdown
            
            toastRef.current?.show({
              severity: 'info',
              summary: 'Filter Applied',
              detail: `Applied filter "${filterName}" from URL`,
              life: 3000
            });
          } catch (error) {
            console.error('🔗 [SimpleGenericGrid] Failed to parse filter state:', error);
          }
        }
      } else {
        toastRef.current?.show({
          severity: 'warn',
          summary: 'Filter Not Found',
          detail: `Filter "${filterName}" not found for this grid`,
          life: 5000
        });
      }
    } catch (error) {
      console.error('🔗 [SimpleGenericGrid] Failed to load filter from URL:', error);
    }
  }, [hasAppliedUrlFilter, gridInstance, definedFilterClient]);


  // Update column visibility when columns prop changes
  useEffect(() => {
    const newColumnFields = columns.map(col => String(col.field));
    setVisibleColumns(newColumnFields);
    setColumnOrder(newColumnFields);
  }, [columns]);

  // Global search formatter
  const formatGlobalSearch = (searchTerm: string, searchType: string): string => {
    switch (searchType) {
      case 'startsWith':
        return `${searchTerm}*`;
      case 'endsWith':
        return `*${searchTerm}`;
      case 'contains':
      default:
        return `*${searchTerm}*`;
    }
  };

  // Convert active sorts to search query orderBy format
  const buildOrderBy = (): any => {
    if (activeSorts.length === 0) return undefined;
    
    const orderBy: any = {};
    // Sort by priority to ensure correct order
    const sortedBySorts = [...activeSorts].sort((a, b) => (a.priority || 0) - (b.priority || 0));
    sortedBySorts.forEach(sort => {
      orderBy[sort.field] = sort.direction;
    });
    return orderBy;
  };

  // Convert active filters to search query filter format
  const buildFilter = (): any => {
    // When in "show selected only" mode, ONLY filter by selected IDs - ignore other filters
    if (showSelectedOnly && selectedRowIds.length > 0) {
      return { [dataKey]: { in: selectedRowIds } };
    }

    // Normal mode: apply active filters from UI
    const filter: any = {};
    activeFilters.forEach(filterOp => {
      if (filterOp.operator === 'in' && filterOp.values) {
        filter[filterOp.field] = { [filterOp.operator]: filterOp.values };
      } else {
        filter[filterOp.field] = { [filterOp.operator]: filterOp.value };
      }
    });

    return Object.keys(filter).length > 0 ? filter : undefined;
  };

  // DataTable sort event handler - disabled, using custom header clicks instead
  const onSort = (event: DataTableSortEvent) => {
    // Prevent DataTable's built-in sorting since we handle it in custom header template
  };

  // Filter event handler
  const onFilter = (event: DataTableFilterEvent) => {
    // Handle DataTable filtering if needed
  };

  // Column reorder functionality removed

  // Data fetching function
  const fetchData = useCallback(async (page: number = 0, size: number = currentPageSize) => {
    setLoading(true);
    try {
      // Build search query with pagination, filtering, and sorting
      const orderBy = buildOrderBy();
      const filter = buildFilter();
      
      const queryWithSearch: TSearchQuery = {
        ...searchQuery,
        currentPage: page,
        pageSize: size,
        // When showing selected only, don't apply global search - only filter by IDs
        searchTerm: (!showSelectedOnly && globalSearch.searchTerm) ?
          formatGlobalSearch(globalSearch.searchTerm, globalSearch.searchType) :
          undefined,
        orderBy: orderBy,
        filter: filter
      };
      
      const response = await client.Query({ body: queryWithSearch });
      
      const newRows = response.rows || [];
      
      setData(newRows);
      setTotalRecords(response.totalRowCount || 0);
      setCurrentPage(page);
      setCurrentPageSize(size);
      
      // Restore selection state for current page based on persistent selectedRowIds
      const currentPageSelectedRows = newRows.filter(row => 
        selectedRowIds.includes((row as any)[dataKey])
      );
      setSelectedRows(currentPageSelectedRows);
    } catch (error) {
      console.error('Error fetching data:', error);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to fetch data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        life: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [client, searchQuery, globalSearch, currentPageSize, activeFilters, activeSorts, selectedRowIds, dataKey, showSelectedOnly]);

  // Initial data load, defined filters load, and URL filter check
  useEffect(() => {
    // Load defined filters and URL filter in parallel
    Promise.all([
      loadDefinedFilters(),
      loadFilterFromUrl()
    ]).then(() => {
      // Then fetch data (with any applied filters)
      fetchData(0, currentPageSize);
    });
  }, []); // Only run once on mount


  // Search/filter change effect
  useEffect(() => {
    fetchData(0, currentPageSize);
  }, [searchQuery, globalSearch.searchTerm, globalSearch.searchType]);

  // Sort/filter change effect
  useEffect(() => {
    if (currentPage > 0) {
      setCurrentPage(0);
      fetchData(0, currentPageSize);
    } else {
      fetchData(currentPage, currentPageSize);
    }
  }, [activeFilters, activeSorts]);

  // Show selected only filter change effect
  useEffect(() => {
    setCurrentPage(0);
    fetchData(0, currentPageSize);
  }, [showSelectedOnly]);

  // Pagination handlers
  const onPageChange = (event: DataTablePageEvent) => {
    fetchData(event.page, event.rows);
  };

  // Row selection handlers
  const handleSelectionChange = (e: { value: TModel[] }) => {
    const currentPageIds = data.map(row => (row as any)[dataKey]);
    const newlySelectedIds = e.value.map(row => (row as any)[dataKey]);
    
    // Calculate which rows were deselected on current page
    const deselectedIds = currentPageIds.filter(id => !newlySelectedIds.includes(id));
    
    // Update persistent selected rows:
    // 1. Remove any deselected IDs from the current page
    // 2. Add any newly selected IDs from the current page
    const updatedSelectedIds = [
      ...selectedRowIds.filter(id => !deselectedIds.includes(id) && !currentPageIds.includes(id)),
      ...newlySelectedIds
    ];
    
    setSelectedRowIds(updatedSelectedIds);
    setSelectedRows(e.value);
    
    if (onBulkSelect) {
      onBulkSelect(e.value);
    }
    
    if (onBulkSelectIds) {
      onBulkSelectIds(updatedSelectedIds);
    }
  };

  const handleRowClick = (e: { data: TModel }) => {
    if (onRowClick) {
      onRowClick(e.data);
    }
  };

  // Helper function to clear all selections
  const clearAllSelections = () => {
    setSelectedRowIds([]);
    setSelectedRows([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn(`⚠️ [SimpleGenericGrid] Failed to clear localStorage for ${title}:`, error);
    }
  };

  // Helper function to get all selected rows (not just current page)
  const getAllSelectedRowIds = () => selectedRowIds;

  // Helper function to check if a row is selected
  const isRowSelected = (rowId: string | number) => selectedRowIds.includes(rowId);

  // Helper function to clear stale localStorage entries (optional cleanup)
  const clearStaleSelections = () => {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('grid-selection-'));
      let cleared = 0;
      keys.forEach(key => {
        // Only clear if it's not the current grid's key
        if (key !== storageKey) {
          try {
            localStorage.removeItem(key);
            cleared++;
          } catch (error) {
            // Ignore individual removal errors
          }
        }
      });
    } catch (error) {
      console.warn('⚠️ [SimpleGenericGrid] Failed to clear stale selections:', error);
    }
  };

  // Export handler - fetches all data with current filters and exports to file
  const handleExportAll = useCallback(async (format: 'csv' | 'excel') => {
    setLoading(true);
    try {
      // Build query with same filters/sort but no paging
      const exportQuery: TSearchQuery = {
        ...searchQuery,
        currentPage: 0,
        pageSize: exportMaxRecords,
        searchTerm: globalSearch.searchTerm ?
          formatGlobalSearch(globalSearch.searchTerm, globalSearch.searchType) : undefined,
        orderBy: buildOrderBy(),
        filter: buildFilter()
      };

      // Fetch all data
      const response = await client.Query({ body: exportQuery });
      const exportData = response.rows || [];

      if (exportData.length === 0) {
        toastRef.current?.show({
          severity: 'warn',
          summary: 'No Data',
          detail: 'No records to export with current filters',
          life: 3000
        });
        return;
      }

      // Build column overrides from visible columns
      const columnOverrides: Record<string, { header?: string; hidden?: boolean }> = {};
      columns.forEach(col => {
        const fieldName = String(col.field);
        columnOverrides[fieldName] = {
          header: col.header,
          hidden: !visibleColumns.includes(fieldName)
        };
      });

      // Export using existing DataExporter
      const filename = exportFilename || (title || 'export').replace(/\s+/g, '_');
      await DataExporter.exportData(exportData, {
        filename: filename,
        format: format,
        includeHeaders: true
      }, columnOverrides);

      toastRef.current?.show({
        severity: 'success',
        summary: 'Export Complete',
        detail: `Exported ${exportData.length} records to ${format.toUpperCase()}`,
        life: 3000
      });

    } catch (error) {
      console.error('Export failed:', error);
      toastRef.current?.show({
        severity: 'error',
        summary: 'Export Failed',
        detail: error instanceof Error ? error.message : 'Unknown error occurred',
        life: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [client, searchQuery, globalSearch, exportMaxRecords, columns, visibleColumns, exportFilename, title]);

  // Column filter functionality removed

  // Column width management
  const handleColumnResize = (fieldName: string, width: string) => {
    setColumnWidths(prev => ({
      ...prev,
      [fieldName]: width
    }));
  };

  // Create current grid state for capture
  const getCurrentGridState = (): GridStateConfig<TSearchQuery> => {
    return {
      searchQuery,
      globalSearch,
      activeFilters,
      activeSorts,
      visibleColumns,
      columnOrder,
      columnWidths: Object.entries(columnWidths).map(([field, width]) => ({ field, width })),
      selectedRowIds,
      pageSize: currentPageSize
    };
  };

  // Apply defined filter from toolbar or sidebar
  const applyDefinedFilter = (filter: IQueryDefinedFilterModel | null) => {
    if (filter === null) {
      // Clear filter - reset to defaults
      setSelectedDefinedFilter(null);
      setGlobalSearch({ searchTerm: '', searchType: 'contains' });
      setActiveFilters([]);
      setActiveSorts([]);
      setVisibleColumns(columns.map(col => String(col.field)));
      setColumnOrder(columns.map(col => String(col.field)));
      updateUrlWithFilter(null);
      
      toastRef.current?.show({
        severity: 'info',
        summary: 'Filter Cleared',
        detail: 'All filters have been cleared',
        life: 3000
      });
      return;
    }
    
    if (filter.state) {
      try {
        const state = JSON.parse(filter.state);
        
        // Apply the filter state
        if (state.searchTerm !== undefined) {
          setGlobalSearch({
            searchTerm: state.searchTerm || '',
            searchType: 'contains'
          });
        }
        
        if (state.filters) {
          setActiveFilters(state.filters);
        } else {
          setActiveFilters([]);
        }
        
        if (state.orderBy) {
          setActiveSorts(state.orderBy);
        } else {
          setActiveSorts([]);
        }
        
        if (state.visibleColumns) {
          setVisibleColumns(state.visibleColumns);
        }
        
        if (state.columnOrder) {
          setColumnOrder(state.columnOrder);
        }
        
        setSelectedDefinedFilter(filter);
        updateUrlWithFilter(filter.name);
        
        toastRef.current?.show({
          severity: 'success',
          summary: 'Filter Applied',
          detail: `Applied filter: ${filter.name}`,
          life: 3000
        });
      } catch (error) {
        console.error('❌ [SimpleGenericGrid] Failed to apply defined filter:', error);
        toastRef.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to apply filter',
          life: 5000
        });
      }
    }
  };

  // Listen for hash changes during navigation
  useEffect(() => {
    const handleHashChange = async () => {
      const currentHash = window.location.hash;
      
      // Skip if this hash was already processed
      if (currentHash === lastProcessedHash) {
        return;
      }

      // Update processed hash
      setLastProcessedHash(currentHash);
      
      const filterName = getFilterNameFromUrl();
      if (!filterName) {
        applyDefinedFilter(null);
        return;
      }

      if (!definedFilterClient || (!entityType && !gridInstance)) {
        console.error('❌ [SimpleGenericGrid] Hash change - missing definedFilterClient or entityType/gridInstance');
        return;
      }

      try {
        // Query for the filter by name and entityType (preferred) or gridInstance (fallback)
        // Uses entityType when available for stable filtering across URL/title changes
        const filterCriteria = entityType
          ? { entityType: { eq: entityType }, isActive: { eq: true } }
          : { instance: { eq: gridInstance }, isActive: { eq: true } };

        const searchQuery = {
          currentPage: 0,
          pageSize: 1,
          filter: {
            name: { eq: filterName },
            ...filterCriteria
          }
        };

        const response = await definedFilterClient.Query({ body: searchQuery });

        if (response?.rows && response.rows.length > 0) {
          const filter = response.rows[0];
          applyDefinedFilter(filter);
        } else {
          console.warn(`⚠️ [SimpleGenericGrid] Hash change - filter not found: ${filterName}`);
          applyDefinedFilter(null);
        }
      } catch (error) {
        console.error('❌ [SimpleGenericGrid] Hash change - error loading filter:', error);
        applyDefinedFilter(null);
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [definedFilterClient, entityType, gridInstance, getFilterNameFromUrl, lastProcessedHash]);

  // Handle React Router location changes (for programmatic navigation)
  useEffect(() => {
    const handleLocationChange = async () => {
      const currentHash = location.hash;
      
      // Skip if this hash was already processed
      if (currentHash === lastProcessedHash) {
        return;
      }

      if (!currentHash) {
        // Update processed hash for empty hash
        if (lastProcessedHash !== '') {
          setLastProcessedHash('');
          applyDefinedFilter(null);
        }
        return;
      }

      // Update processed hash
      setLastProcessedHash(currentHash);

      const filterName = getFilterNameFromUrl();
      if (!filterName) {
        applyDefinedFilter(null);
        return;
      }

      if (!definedFilterClient || (!entityType && !gridInstance)) {
        console.error('❌ [SimpleGenericGrid] Location change - missing definedFilterClient or entityType/gridInstance');
        return;
      }

      try {
        // Query for the filter by name and entityType (preferred) or gridInstance (fallback)
        // Uses entityType when available for stable filtering across URL/title changes
        const filterCriteria = entityType
          ? { entityType: { eq: entityType }, isActive: { eq: true } }
          : { instance: { eq: gridInstance }, isActive: { eq: true } };

        const searchQuery = {
          currentPage: 0,
          pageSize: 1,
          filter: {
            name: { eq: filterName },
            ...filterCriteria
          }
        };

        const response = await definedFilterClient.Query({ body: searchQuery });

        if (response?.rows && response.rows.length > 0) {
          const filter = response.rows[0];
          applyDefinedFilter(filter);
        } else {
          console.warn(`⚠️ [SimpleGenericGrid] Location change - filter not found: ${filterName}`);
          applyDefinedFilter(null);
        }
      } catch (error) {
        console.error('❌ [SimpleGenericGrid] Location change - error loading filter:', error);
        applyDefinedFilter(null);
      }
    };

    handleLocationChange();
  }, [location.hash, definedFilterClient, entityType, gridInstance, getFilterNameFromUrl, lastProcessedHash]);

  // Restore grid state from predefined filter
  const restoreGridState = (gridState: GridStateConfig<TSearchQuery>) => {
    if (gridState.searchQuery) {
      setSearchQuery(prev => ({ ...prev, ...gridState.searchQuery }));
    }
    if (gridState.globalSearch) {
      setGlobalSearch(gridState.globalSearch);
    }
    if (gridState.activeFilters) {
      setActiveFilters(gridState.activeFilters);
    }
    if (gridState.activeSorts) {
      setActiveSorts(gridState.activeSorts);
    }
    if (gridState.visibleColumns) {
      setVisibleColumns(gridState.visibleColumns);
    }
    if (gridState.columnOrder) {
      setColumnOrder(gridState.columnOrder);
    }
    if (gridState.columnWidths) {
      const widthsMap = gridState.columnWidths.reduce((acc, { field, width }) => {
        acc[field] = width;
        return acc;
      }, {} as {[key: string]: string});
      setColumnWidths(widthsMap);
    }
    if (gridState.selectedRowIds) {
      setSelectedRowIds(gridState.selectedRowIds);
    }
    if (gridState.pageSize) {
      setCurrentPageSize(gridState.pageSize);
    }
  };

  // Column filter functionality removed

  // Render columns - ensure re-render when visibility changes
  // Actions column is always shown and frozen to the right
  const renderColumns = useMemo(() => {

    // Separate actions column from other columns - actions should always be visible
    const actionsColumn = columns.find(col => String(col.field) === 'actions');

    const orderedColumns = columnOrder
      .filter(fieldName => {
        // Skip actions column here - we'll add it at the end
        if (fieldName === 'actions') return false;
        const isVisible = visibleColumns.includes(fieldName);
        return isVisible;
      })
      .map(fieldName => columns.find(col => String(col.field) === fieldName))
      .filter(Boolean) as typeof columns;

    const renderedColumns = orderedColumns.map(col => {
      const fieldName = String(col.field);

      // Simple header template without filter, sort, or reorder functionality
      const headerTemplate = () => {
        return (
          <div className="flex align-items-center">
            <span>{col.header}</span>
          </div>
        );
      };

      // Determine body renderer: explicit body > cellRenderer from registry > default
      let bodyRenderer = col.body;
      if (!bodyRenderer && col.cellRenderer) {
        const registryRenderer = getCellRenderer(col.cellRenderer);
        if (registryRenderer) {
          bodyRenderer = (rowData: any) => registryRenderer(rowData[fieldName], rowData);
        }
      }

      return (
        <Column
          key={`${fieldName}-${visibleColumns.join('-')}`}
          field={fieldName}
          header={headerTemplate}
          sortable={false} // Column header sorting disabled
          filter={false} // Column header filtering disabled
          style={{ width: col.width }}
          frozen={col.frozen}
          body={bodyRenderer}
        />
      );
    });

    // Always add actions column at the beginning if it exists, frozen to left
    if (actionsColumn) {
      const actionsHeaderTemplate = () => (
        <div className="flex align-items-center">
          <span>{actionsColumn.header}</span>
        </div>
      );

      renderedColumns.unshift(
        <Column
          key="actions-column"
          field="actions"
          header={actionsHeaderTemplate}
          sortable={false}
          filter={false}
          style={{ width: actionsColumn.width || '100px' }}
          frozen
          alignFrozen="left"
          body={actionsColumn.body}
        />
      );
    }

    return renderedColumns;
  }, [columns, columnOrder, visibleColumns]);

  // Create development view model
  const developmentViewModel = useMemo(() => {
    if (!DevelopmentConfig.enableGridDebugPanel) return null;
    
    // Create base ISearch object from current state
    const baseSearch: ISearch<any, any> = {
      currentPage,
      pageSize: currentPageSize,
      excludePageCount: false,
      searchTerm: globalSearch.searchTerm ? 
        formatGlobalSearch(globalSearch.searchTerm, globalSearch.searchType) : 
        undefined,
      filter: buildFilter() || {},
      orderBy: buildOrderBy() || {}
    };

    return createDevelopmentFilterViewModel(
      baseSearch,
      visibleColumns,
      activeFilters,
      activeSorts,
      globalSearch,
      columnOrder,
      Object.entries(columnWidths).map(([field, width]) => ({ field, width })),
      selectedRowIds,
      columns.map(col => String(col.field)),
      `grid-${(title || 'grid').replace(/\s+/g, '-').toLowerCase()}`
    );
  }, [
    currentPage, 
    currentPageSize, 
    globalSearch, 
    visibleColumns, 
    activeFilters, 
    activeSorts, 
    columnOrder, 
    columnWidths,
    selectedRowIds,
    columns, 
    title
  ]);

  // Export grid state for creating predefined filters (exposed for external use)
  // Note: getCurrentGridState and restoreGridState are available as internal functions

  // DataTable sort props removed - using custom header sorting only

  return (
    <div className={`simple-generic-grid ${className}`} style={{ 
      height, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Prevent outer container from scrolling
    }}>
      <Toast ref={toastRef} />
      
      {/* Toolbar - Fixed height */}
      <div style={{ flexShrink: 0 }}>
        <GridToolbar
          title={title}
          predefinedFilters={predefinedFilters}
          definedFilters={definedFilters}
          selectedDefinedFilter={selectedDefinedFilter}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          onPredefinedFilterChange={(filter) => {
            // Support both legacy and new grid state formats
            if (filter.gridState) {
              restoreGridState(filter.gridState);
            } else if (filter.searchQuery) {
              // Legacy support
              setSearchQuery(prev => ({ ...prev, ...filter.searchQuery }));
            }
          }}
          onDefinedFilterChange={applyDefinedFilter}
          enableCreate={enableCreate}
          onCreateClick={onCreateClick}
          onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
          enableExport={enableExport}
          onExport={handleExportAll}
          loading={loading}
        />
      </div>

      {/* Main Content with Sidebar - Flexible height */}
      <div className="grid-content" style={{ 
        display: 'flex', 
        flex: '1 1 0',
        minHeight: 0, // Important for Firefox
        overflow: 'hidden' 
      }}>
        {/* Filter Sidebar - Pinned Open */}
        {sidebarVisible && (
          <div style={{ 
            width: '300px', 
            flexShrink: 0,
            borderRight: '1px solid var(--surface-border)', 
            paddingRight: '1rem', 
            marginRight: '1rem',
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <FilterSidebar
              columns={columns}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={(newVisibleCols) => {
                setVisibleColumns(newVisibleCols);
              }}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              activeFilters={activeFilters}
              onActiveFiltersChange={setActiveFilters}
              activeSorts={activeSorts}
              onActiveSortsChange={setActiveSorts}
              globalSearch={globalSearch}
              onGlobalSearchChange={setGlobalSearch}
              predefinedFilters={predefinedFilters}
              onPredefinedFilterChange={(filter) => {
                // Support both legacy and new grid state formats
                if (filter.gridState) {
                  restoreGridState(filter.gridState);
                } else if (filter.searchQuery) {
                  // Legacy support
                  setSearchQuery(prev => ({ ...prev, ...filter.searchQuery }));
                }
              }}
              developmentViewModel={developmentViewModel}
              developmentPanelVisible={DevelopmentConfig.enableGridDebugPanel}
              gridInstance={(title || 'grid').replace(/\s+/g, '-').toLowerCase()}
              entityType={entityType}
              allColumns={columns.map(col => String(col.field))}
              currentGridState={getCurrentGridState()}
              onClearSelections={clearAllSelections}
              onDefinedFilterApply={(filter) => {
                // Apply the filter and update URL
                applyDefinedFilter(filter);
              }}
              onDefinedFiltersChange={loadDefinedFilters}
              schema={schema}
            />
          </div>
        )}

        {/* Data Table Container */}
        <div className="grid-table-container" style={{ 
          flex: '1 1 0',
          minWidth: 0, // Allow shrinking
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Table wrapper with controlled scrolling */}
          <div style={{ 
            flex: '1 1 0',
            minHeight: 0, // Important for Firefox
            position: 'relative'
          }}>
            <DataTable
              key={`datatable-${visibleColumns.join('-')}-${columnOrder.join('-')}`} // Force re-render when columns change
              value={data}
              loading={loading}
              selection={enableBulkSelection ? selectedRows : undefined}
              onSelectionChange={enableBulkSelection ? handleSelectionChange : undefined}
              onRowClick={handleRowClick}
              onSort={onSort}
              onFilter={onFilter}
              dataKey={dataKey}
              paginator={false} // We'll use custom pagination below
              className="simple-data-table"
              resizableColumns
              columnResizeMode="expand" // Changed from 'fit' to 'expand' to allow horizontal scrolling
              reorderableColumns={false} // Disabled column reordering
              scrollable
              scrollHeight="flex" // Use flex height to fill container
              style={{ width: '100%', height: '100%' }}
            >
              {enableBulkSelection && (
                <Column selectionMode="multiple" headerStyle={{ width: '3rem', minWidth: '3rem' }} frozen alignFrozen="left" />
              )}
              {renderColumns}
            </DataTable>
          </div>
          
          {/* Selection indicator and bulk actions - shows total selected across all pages */}
          {enableBulkSelection && selectedRowIds.length > 0 && (
            <div className={`selection-indicator p-2 border-top-1 surface-border ${showSelectedOnly ? 'bg-orange-50' : 'bg-blue-50'}`} style={{
              flexShrink: 0,
              borderBottom: '1px solid var(--surface-border)'
            }}>
              <div className="flex align-items-center justify-content-between mb-2">
                <div className="flex align-items-center gap-2">
                  <i className={`pi ${showSelectedOnly ? 'pi-eye text-orange-600' : 'pi-check-square text-blue-600'}`}></i>
                  <span className={`text-sm font-medium ${showSelectedOnly ? 'text-orange-800' : 'text-blue-800'}`}>
                    {showSelectedOnly ? (
                      <>Viewing {selectedRowIds.length} selected row{selectedRowIds.length !== 1 ? 's' : ''} (filters paused)</>
                    ) : (
                      <>{selectedRowIds.length} row{selectedRowIds.length !== 1 ? 's' : ''} selected across all pages</>
                    )}
                  </span>
                  {!showSelectedOnly && (
                    <i className="pi pi-save text-xs text-blue-500" title="Selections persist across navigation"></i>
                  )}
                  {showSelectedOnly && savedFiltersBeforeShowSelected.length > 0 && (
                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 border-round">
                      {savedFiltersBeforeShowSelected.length} filter{savedFiltersBeforeShowSelected.length !== 1 ? 's' : ''} paused
                    </span>
                  )}
                </div>
                <div className="flex align-items-center gap-2">
                  <span className="text-xs text-600">
                    {selectedRows.length} visible on current page
                  </span>
                  <Button
                    icon={showSelectedOnly ? "pi pi-filter" : "pi pi-eye"}
                    label={showSelectedOnly ? "Show Filtered" : "Show Selected"}
                    size="small"
                    severity={showSelectedOnly ? "info" : "warning"}
                    onClick={() => {
                      if (!showSelectedOnly) {
                        // Switching TO "show selected" mode - save current filters
                        setSavedFiltersBeforeShowSelected([...activeFilters]);
                        setSavedGlobalSearchBeforeShowSelected({ ...globalSearch });
                        setShowSelectedOnly(true);
                      } else {
                        // Switching back TO "show filtered" mode - restore saved filters
                        setActiveFilters(savedFiltersBeforeShowSelected);
                        setGlobalSearch(savedGlobalSearchBeforeShowSelected);
                        setShowSelectedOnly(false);
                      }
                    }}
                    tooltip={showSelectedOnly
                      ? "Return to filtered view with previous filters"
                      : `Show only ${selectedRowIds.length} selected rows (ignores current filters)`}
                    outlined
                    className="p-1"
                  />
                  <Button
                    icon="pi pi-times"
                    size="small"
                    text
                    severity="secondary"
                    onClick={() => {
                      clearAllSelections();
                      setShowSelectedOnly(false);
                    }}
                    tooltip={`Clear all ${selectedRowIds.length} selections (including other pages)`}
                    className="p-1"
                  />
                </div>
              </div>
              {/* Bulk Action Bar - only shown when bulk actions are configured */}
              {bulkActions.length > 0 && (
                <BulkActionBar
                  actions={bulkActions}
                  selectedRows={selectedRows}
                  selectedIds={selectedRowIds}
                  displayField={bulkActionDisplayField}
                  dataKey={dataKey}
                  userRole={userRole}
                  onActionComplete={(actionId, result) => {
                    // Show toast notification for action result
                    toastRef.current?.show({
                      severity: result.success ? 'success' : 'error',
                      summary: result.success ? 'Action Complete' : 'Action Failed',
                      detail: result.message,
                      life: 5000
                    });
                    // Refresh data after successful action
                    if (result.success) {
                      // Clear selections first
                      setSelectedRowIds([]);
                      setSelectedRows([]);
                      try {
                        localStorage.removeItem(storageKey);
                      } catch (error) {
                        console.warn(`⚠️ [SimpleGenericGrid] Failed to clear localStorage:`, error);
                      }
                      // Use setTimeout to ensure state updates are applied before fetch
                      setTimeout(() => fetchData(currentPage, currentPageSize), 0);
                    }
                    // Call external handler if provided
                    if (onBulkActionComplete) {
                      onBulkActionComplete(actionId, result);
                    }
                  }}
                />
              )}
            </div>
          )}
          
          {/* Custom Pagination - Fixed at bottom */}
          <div className="grid-pagination p-0 border-top-1 surface-border flex justify-content-between align-items-center" style={{ 
            flexShrink: 0,
            backgroundColor: 'var(--surface-ground)'
          }}>
            <div className="pagination-info">
              <span className="text-sm text-600">
                Showing {currentPage * currentPageSize + 1} to {Math.min((currentPage + 1) * currentPageSize, totalRecords)} of {totalRecords} entries
              </span>
            </div>
            
            <div className="pagination-controls flex align-items-center gap-3">
              <div className="flex align-items-center gap-2">
                <label htmlFor="pageSize" className="text-sm">Show:</label>
                <Dropdown
                  id="pageSize"
                  value={currentPageSize}
                  options={pageSizeOptions.map(size => ({ label: `${size}`, value: size }))}
                  onChange={(e) => fetchData(0, e.value)}
                  className="w-6rem"
                />
              </div>
              
              <Paginator
                first={currentPage * currentPageSize}
                rows={currentPageSize}
                totalRecords={totalRecords}
                onPageChange={onPageChange}
                template="PrevPageLink PageLinks NextPageLink"
                className="border-none p-0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimpleGenericGrid;