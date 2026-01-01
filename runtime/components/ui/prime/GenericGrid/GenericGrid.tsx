import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Sidebar } from 'primereact/sidebar';
import { Toast } from 'primereact/toast';
import { GridToolbar } from './GridToolbar';
import { FilterSidebar } from './FilterSidebar';
import { GenericGridProps, GlobalSearchConfig, IQueryableClient } from './interfaces';
import { ISearchQueryBase } from '../Base/types';

export function GenericGrid<TFilter, TOrderBy, TSearchQuery extends ISearchQueryBase, TModel>({
  client,
  title,
  columns,
  predefinedFilters = [],
  initialSearchQuery = {},
  pageSize = 20,
  pageSizeOptions = [50, 100, 1000],
  enableBulkSelection = true,
  enableColumnReordering = true,
  enableFiltering = true,
  enableSorting = true,
  enableCreate = false,
  onRowClick,
  onBulkSelect,
  onCreateClick,
  className = '',
  height = '600px'
}: GenericGridProps<TFilter, TOrderBy, TSearchQuery, TModel>) {
  const toastRef = useRef<Toast>(null);

  // State management for server-side pagination
  const [data, setData] = useState<TModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [selectedRows, setSelectedRows] = useState<TModel[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<TSearchQuery>(initialSearchQuery as TSearchQuery);
  const [globalSearch, setGlobalSearch] = useState<GlobalSearchConfig>({
    searchTerm: '',
    searchType: 'contains'
  });
  
  // Virtual scrolling state (keeping original logic for now)
  const [hasNextPage, setHasNextPage] = useState(true);
  const loadedPagesRef = useRef<Set<number>>(new Set());
  
  // Grid state
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.filter(col => !col.hidden).map(col => String(col.field))
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map(col => String(col.field))
  );

  // Global search formatting
  const formatGlobalSearch = (term: string, type: GlobalSearchConfig['searchType']): string => {
    switch (type) {
      case 'startsWith': return `${term}*`;
      case 'contains': return `*${term}*`;
      case 'endsWith': return `*${term}`;
      case 'equals': return term;
      default: return `*${term}*`;
    }
  };

  // Data fetching for infinite scrolling
  const fetchPage = useCallback(async (pageNumber: number, isInitial = false) => {
    if (!isInitial && loadedPagesRef.current.has(pageNumber)) {
      return;
    }
    
    setLoading(true);
    try {
      // Build search query with virtual scrolling parameters
      const queryWithSearch: TSearchQuery = {
        ...searchQuery,
        currentPage: pageNumber, // 0-based page number
        pageSize: virtualConfig.pageSize,
        excludePageCount: pageNumber === 0, // Only get total count on first page
        searchTerm: globalSearch.searchTerm ? 
          formatGlobalSearch(globalSearch.searchTerm, globalSearch.searchType) : 
          undefined
      };

      const response = await client.Query({ body: queryWithSearch });
      const newRows = response.rows || [];
      if (isInitial || pageNumber === 0) {
        // Initial load or search change - replace all data
        setAllData(newRows);
        setData(newRows);
        setTotalRecords(response.totalRowCount || 0);
        loadedPagesRef.current = new Set([pageNumber]);
        setCurrentPage(0);
        setHasNextPage(newRows.length >= virtualConfig.pageSize);
      } else {
        // Append new data for infinite scrolling
        setAllData(prev => {
          const combined = [...prev, ...newRows];
          // Remove duplicates if any (based on id field)
          const unique = combined.filter((item, index, arr) => 
            arr.findIndex(i => (i as any).id === (item as any).id) === index
          );
          return unique;
        });
        loadedPagesRef.current = new Set([...loadedPagesRef.current, pageNumber]);
        setHasNextPage(newRows.length >= virtualConfig.pageSize);
      }
    } catch (error) {
      console.error('❌ [GenericGrid] Error fetching data:', error);
      console.error('❌ [GenericGrid] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      toastRef.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load data',
        life: 3000
      });
    } finally {
      setLoading(false);
      if (isInitial) {
        setInitialLoading(false);
      }
    }
  }, [client, searchQuery, globalSearch, virtualConfig.pageSize]);

  // Initial data fetch
  useEffect(() => {
    fetchPage(0, true);
  }, [fetchPage]);

  // Refetch when search/filter changes
  useEffect(() => {
    loadedPagesRef.current = new Set();
    setCurrentPage(0);
    fetchPage(0, true);
  }, [searchQuery, globalSearch, fetchPage]);

  // Virtual scrolling handler
  const onVirtualScrollerLazyLoad = useCallback((event: any) => {
    if (!virtualConfig.enabled || !hasNextPage) return;
    
    const { first, last } = event;
    const nextPageNeeded = Math.floor(last / virtualConfig.pageSize);
    
    if (nextPageNeeded > currentPage && !loadedPagesRef.current.has(nextPageNeeded)) {
      setCurrentPage(nextPageNeeded);
      fetchPage(nextPageNeeded);
    }
  }, [virtualConfig.enabled, virtualConfig.pageSize, currentPage, hasNextPage, fetchPage]);

  // Selection handling
  const handleSelectionChange = (e: { value: TModel[] }) => {
    setSelectedRows(e.value);
    if (onBulkSelect) {
      const selectedIds = e.value.map((row: any) => row.id || row.Id).filter(Boolean);
      onBulkSelect(selectedIds);
    }
  };

  // Row click handling
  const handleRowClick = (e: { data: TModel }) => {
    if (onRowClick) {
      onRowClick(e.data);
    }
  };

  // Use allData for virtual scrolling, or filtered data for regular display
  const displayData = virtualConfig.enabled ? allData : data;
  
  // Render columns
  const renderColumns = useMemo(() => {
    const orderedColumns = columnOrder
      .filter(fieldName => visibleColumns.includes(fieldName))
      .map(fieldName => columns.find(col => String(col.field) === fieldName))
      .filter(Boolean) as typeof columns;

    return orderedColumns.map(col => (
      <Column
        key={String(col.field)}
        field={String(col.field)}
        header={col.header}
        sortable={col.sortable && enableSorting}
        filter={col.filterable && enableFiltering}
        style={{ width: col.width }}
        frozen={col.frozen}
        body={col.body}
      />
    ));
  }, [columns, columnOrder, visibleColumns, enableSorting, enableFiltering]);

  return (
    <div className={`generic-grid ${className}`}>
      <Toast ref={toastRef} />
      
      {/* Toolbar */}
      <GridToolbar
        title={title}
        predefinedFilters={predefinedFilters}
        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
        onPredefinedFilterChange={(filter) => setSearchQuery(prev => ({ ...prev, ...filter.searchQuery }))}
        enableCreate={enableCreate}
        onCreateClick={onCreateClick}
        onToggleSidebar={() => setSidebarVisible(!sidebarVisible)}
      />

      {/* Main Content */}
      <div className="grid-content" style={{ display: 'flex', height }}>
        {/* Filter Sidebar */}
        <Sidebar
          visible={sidebarVisible}
          onHide={() => setSidebarVisible(false)}
          position="left"
          style={{ width: '300px' }}
          className="grid-sidebar"
        >
          <FilterSidebar
            columns={columns}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={setVisibleColumns}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
          />
        </Sidebar>

        {/* Data Table */}
        <div className="grid-table-container" style={{ flex: 1 }}>
          <DataTable
            value={displayData}
            loading={initialLoading}
            selection={enableBulkSelection ? selectedRows : undefined}
            onSelectionChange={enableBulkSelection ? handleSelectionChange : undefined}
            onRowClick={handleRowClick}
            dataKey="id"
            paginator={false}
            className="generic-data-table"
            resizableColumns
            columnResizeMode="fit"
            reorderableColumns={enableColumnReordering}
            scrollable
            scrollHeight="100%"
            virtualScrollerOptions={virtualConfig.enabled ? {
              itemSize: virtualConfig.itemHeight,
              showLoader: true,
              loading: loading,
              delay: 250,
              lazy: true,
              onLazyLoad: onVirtualScrollerLazyLoad,
              loadingTemplate: () => (
                <div className="flex align-items-center justify-content-center h-4rem">
                  <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                  <span className="ml-2">Loading more data...</span>
                </div>
              ),
              // Calculate total number of items for virtual scroller
              numToleratedItems: virtualConfig.buffer
            } : undefined}
          >
            {enableBulkSelection && (
              <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} />
            )}
            {renderColumns}
          </DataTable>

          {/* Status indicator for virtual scrolling */}
          {virtualConfig.enabled && (
            <div className="grid-status-bar p-2 text-sm text-500">
              {totalRecords > 0 ? (
                <span>
                  Showing {allData.length} of {totalRecords.toLocaleString()} records
                  {loading && <i className="pi pi-spin pi-spinner ml-2"></i>}
                </span>
              ) : (
                <span>
                  Loaded {allData.length} records
                  {hasNextPage && <span> (more available)</span>}
                  {loading && <i className="pi pi-spin pi-spinner ml-2"></i>}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}