import React, { useState, useMemo } from 'react';
import { DataTable, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Paginator } from 'primereact/paginator';
import { Button } from '@/components/ui/controls';
import type { GenericGridColumn } from './types';

/**
 * Static version of SimpleGenericGrid for client-side data
 */
export interface StaticSimpleGenericGridProps<TModel> {
  title: string;
  columns: GenericGridColumn<TModel>[];
  data: TModel[];
  pageSize?: number;
  pageSizeOptions?: number[];
  enableSorting?: boolean;
  className?: string;
  height?: string;
  dataKey?: string;
  showPagination?: boolean;
}

/**
 * Static SimpleGenericGrid component for client-side data display
 */
export function StaticSimpleGenericGrid<TModel>({
  title,
  columns,
  data,
  pageSize = 20,
  pageSizeOptions = [10, 20, 50],
  enableSorting = true,
  className = '',
  height = '600px',
  dataKey = 'id',
  showPagination = true
}: StaticSimpleGenericGridProps<TModel>) {
  // Pagination state
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(pageSize);

  // Sorting state
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<1 | -1 | 0>(0);

  // Handle page change
  const onPageChange = (event: DataTablePageEvent) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  // Handle sort change
  const onSort = (event: DataTableSortEvent) => {
    setSortField(event.sortField);
    setSortOrder(event.sortOrder as 1 | -1 | 0);
  };

  // Process data for current page
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply sorting
    if (sortField && sortOrder !== 0) {
      result.sort((a, b) => {
        const aValue = (a as any)[sortField];
        const bValue = (b as any)[sortField];
        
        if (aValue === null || aValue === undefined) return sortOrder;
        if (bValue === null || bValue === undefined) return -sortOrder;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 1 ? aValue - bValue : bValue - aValue;
        }
        
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        return sortOrder === 1 
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      });
    }

    return result;
  }, [data, sortField, sortOrder]);

  // Get current page data
  const currentPageData = useMemo(() => {
    if (!showPagination) return processedData;
    return processedData.slice(first, first + rows);
  }, [processedData, first, rows, showPagination]);

  // Render columns
  const renderColumns = () => {
    return columns.map((col) => {
      const columnProps: any = {
        key: String(col.field),
        field: String(col.field),
        header: col.header,
        sortable: enableSorting && col.sortable !== false,
        style: col.width ? { width: col.width } : undefined,
        className: col.className
      };

      // Handle custom body template
      if (col.body) {
        columnProps.body = (rowData: TModel) => col.body!(rowData);
      }

      return <Column {...columnProps} />;
    });
  };

  return (
    <div className={`static-simple-generic-grid ${className}`}>
      <div className="grid-header p-4 border-b">
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      
      <DataTable
        value={currentPageData}
        dataKey={dataKey}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={enableSorting ? onSort : undefined}
        className="p-datatable-sm"
        scrollable
        scrollHeight={height}
        style={{ minHeight: height }}
      >
        {renderColumns()}
      </DataTable>

      {showPagination && (
        <Paginator
          first={first}
          rows={rows}
          totalRecords={data.length}
          rowsPerPageOptions={pageSizeOptions}
          onPageChange={onPageChange}
          className="p-paginator-bottom"
        />
      )}
    </div>
  );
}