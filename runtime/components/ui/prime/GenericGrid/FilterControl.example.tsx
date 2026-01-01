import React from 'react';
import { FilterControl } from './FilterControl';
import type { GenericGridColumn, FilterOperation } from './types';

// Example usage of the FilterControl component
export function FilterControlExample() {
  // Example column configurations
  const textColumn: GenericGridColumn<any> = {
    field: 'name',
    header: 'Name',
    filterable: true,
    filterType: 'text'
  };

  const numberColumn: GenericGridColumn<any> = {
    field: 'age',
    header: 'Age',
    filterable: true,
    filterType: 'number'
  };

  const dateColumn: GenericGridColumn<any> = {
    field: 'createdDate',
    header: 'Created Date',
    filterable: true,
    filterType: 'date'
  };

  const booleanColumn: GenericGridColumn<any> = {
    field: 'isActive',
    header: 'Active',
    filterable: true,
    filterType: 'boolean'
  };

  const handleApply = (filter: FilterOperation) => {
    console.log('Filter applied:', filter);
  };

  const handleClear = () => {
    console.log('Filter cleared');
  };

  return (
    <div className="flex flex-column gap-4 p-4">
      <h3>FilterControl Component Examples</h3>
      
      {/* Text filter with header and buttons */}
      <div>
        <h4>Text Filter (with header and buttons)</h4>
        <FilterControl
          column={textColumn}
          onApply={handleApply}
          onClear={handleClear}
          showHeader={true}
          showButtons={true}
          className="border-1 border-300 border-round p-3"
        />
      </div>

      {/* Number filter without header (for use in overlays) */}
      <div>
        <h4>Number Filter (no header, for overlay use)</h4>
        <FilterControl
          column={numberColumn}
          onApply={handleApply}
          onClear={handleClear}
          showHeader={false}
          showButtons={true}
          className="p-3"
        />
      </div>

      {/* Date filter with existing filter */}
      <div>
        <h4>Date Filter (with initial filter)</h4>
        <FilterControl
          column={dateColumn}
          initialFilter={{
            field: 'createdDate',
            operator: 'gte',
            value: new Date('2024-01-01')
          }}
          onApply={handleApply}
          onClear={handleClear}
          showHeader={true}
          showButtons={true}
          className="border-1 border-300 border-round p-3"
        />
      </div>

      {/* Boolean filter without buttons (auto-apply on change) */}
      <div>
        <h4>Boolean Filter (no buttons, auto-apply)</h4>
        <FilterControl
          column={booleanColumn}
          onApply={handleApply}
          onClear={handleClear}
          showHeader={true}
          showButtons={false}
          className="border-1 border-300 border-round p-3"
        />
      </div>
    </div>
  );
}

export default FilterControlExample;