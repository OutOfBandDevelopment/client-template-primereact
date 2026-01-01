import React from 'react';
import { Toolbar } from 'primereact/toolbar';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { PredefinedFilter, GlobalSearchConfig } from './types';
import type { IQueryDefinedFilterModel } from '@/api/GreenOnion/Models';

interface GridToolbarProps<TSearchQuery> {
  title: string;
  predefinedFilters?: PredefinedFilter<TSearchQuery>[];  // Legacy support
  definedFilters?: IQueryDefinedFilterModel[];  // New defined filters from database
  globalSearch: GlobalSearchConfig;
  onGlobalSearchChange: (config: GlobalSearchConfig) => void;
  onPredefinedFilterChange?: (filter: PredefinedFilter<TSearchQuery>) => void;  // Legacy support
  onDefinedFilterChange?: (filter: IQueryDefinedFilterModel | null) => void;  // New defined filter handler
  enableCreate: boolean;
  onCreateClick?: () => void;
  onToggleSidebar: () => void;
  selectedDefinedFilter?: IQueryDefinedFilterModel | null;  // Currently selected defined filter
  /** Enable export buttons */
  enableExport?: boolean;
  /** Handler for export action */
  onExport?: (format: 'csv' | 'excel') => void;
  /** Loading state - disables export buttons during export */
  loading?: boolean;
}

export function GridToolbar<TSearchQuery>({
  title,
  predefinedFilters = [],
  definedFilters = [],
  globalSearch,
  onGlobalSearchChange,
  onPredefinedFilterChange,
  onDefinedFilterChange,
  enableCreate,
  onCreateClick,
  onToggleSidebar,
  selectedDefinedFilter,
  enableExport = false,
  onExport,
  loading = false
}: GridToolbarProps<TSearchQuery>) {
  const searchTypeOptions = [
    { label: 'Contains', value: 'contains' },
    { label: 'Starts With', value: 'startsWith' },
    { label: 'Ends With', value: 'endsWith' },
    { label: 'Matches', value: 'equals' }
  ];

  const leftContent = (
    <div className="flex align-items-center gap-2">
      <h2 className="text-xl font-semibold m-0">{title}</h2>
      <Button
        icon="pi pi-filter"
        className="p-button-text"
        onClick={onToggleSidebar}
        tooltip="Toggle Filters"
      />
      {enableExport && onExport && (
        <Button
          icon="pi pi-download"
          label="Export"
          severity="secondary"
          size="small"
          onClick={() => onExport('csv')}
          loading={loading}
          disabled={loading}
          tooltip="Export to CSV"
        />
      )}
    </div>
  );

  const rightContent = (
    <div className="flex align-items-center gap-3">
      {/* Defined Filters (new) or Predefined Filters (legacy) */}
      {definedFilters.length > 0 ? (
        <div className="field">
          <Dropdown
            id="defined-filter"
            value={selectedDefinedFilter}
            options={[
              { name: '-- No Filter --', id: null },
              ...definedFilters
            ]}
            optionLabel="name"
            placeholder="Select filter..."
            onChange={(e) => {
              if (onDefinedFilterChange) {
                onDefinedFilterChange(e.value?.id === null ? null : e.value);
              }
            }}
            className="w-12rem"
          />
        </div>
      ) : predefinedFilters.length > 0 && (
        <div className="field">
          {/* Legacy predefined filters */}
          <Dropdown
            id="predefined"
            options={predefinedFilters}
            optionLabel="label"
            placeholder="Select filter..."
            onChange={(e) => onPredefinedFilterChange && onPredefinedFilterChange(e.value)}
            className="w-full"
          />
        </div>
      )}

      {/* Global Search */}
      <div className="field flex align-items-center gap-2">
        <label htmlFor="search" className="text-sm font-medium">Search:</label>
        <InputText
          id="search"
          value={globalSearch.searchTerm}
          onChange={(e) => onGlobalSearchChange({
            ...globalSearch,
            searchTerm: e.target.value
          })}
          placeholder="Search all columns..."
          className="w-12rem"
        />
        <Dropdown
          value={globalSearch.searchType}
          options={searchTypeOptions}
          onChange={(e) => onGlobalSearchChange({
            ...globalSearch,
            searchType: e.value
          })}
          className="w-9rem"
        />
        <Button
          icon="pi pi-search"
          className="p-button-outlined"
          tooltip="Search"
        />

        {/* Create Button */}
        {enableCreate && (
          <Button
            label="Create"
            icon="pi pi-plus"
            onClick={onCreateClick}
            className="p-button-success"
          />
        )}

      </div>
    </div>
  );

  return (
    <Toolbar
      left={leftContent}
      right={rightContent}
      className="mb-3"
    />
  );
}