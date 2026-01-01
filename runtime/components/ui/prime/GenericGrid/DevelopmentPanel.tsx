import React, { useState } from 'react';
import { Panel } from 'primereact/panel';
import { Button } from 'primereact/button';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Badge } from 'primereact/badge';
import type { IDevelopmentFilterViewModel, IFilter, IOrderBy } from './DevelopmentTypes';

interface DevelopmentPanelProps<TFilter extends IFilter, TOrderBy extends IOrderBy> {
  viewModel: IDevelopmentFilterViewModel<TFilter, TOrderBy>;
  title?: string;
  className?: string;
}

/**
 * Development panel that displays the current filter view model
 * PRESENTATION ONLY - No editing capabilities, purely for debugging
 * Only visible in development mode
 */
export function DevelopmentPanel<TFilter extends IFilter, TOrderBy extends IOrderBy>({
  viewModel,
  title = "Grid Debug Panel",
  className = ''
}: DevelopmentPanelProps<TFilter, TOrderBy>) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'search' | 'filters' | 'sorts' | 'columns' | 'selection' | 'raw'>('summary');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(viewModel, null, 2));
  };

  const renderSummaryTab = () => (
    <div className="flex flex-column gap-3">
      <div className="grid">
        <div className="col-6">
          <div className="text-center p-3 border-round surface-card">
            <i className="pi pi-search text-2xl mb-2 text-blue-500"></i>
            <div className="text-xl font-semibold">{viewModel.globalSearchActive ? 'Active' : 'Inactive'}</div>
            <div className="text-sm text-600">Global Search</div>
          </div>
        </div>
        <div className="col-6">
          <div className="text-center p-3 border-round surface-card">
            <i className="pi pi-filter text-2xl mb-2 text-green-500"></i>
            <div className="text-xl font-semibold">{viewModel.activeFiltersCount}</div>
            <div className="text-sm text-600">Active Filters</div>
          </div>
        </div>
        <div className="col-6">
          <div className="text-center p-3 border-round surface-card">
            <i className="pi pi-sort text-2xl mb-2 text-orange-500"></i>
            <div className="text-xl font-semibold">{viewModel.activeSortsCount}</div>
            <div className="text-sm text-600">Active Sorts</div>
          </div>
        </div>
        <div className="col-6">
          <div className="text-center p-3 border-round surface-card">
            <i className="pi pi-eye text-2xl mb-2 text-purple-500"></i>
            <div className="text-xl font-semibold">{viewModel.columns.length}</div>
            <div className="text-sm text-600">Visible Columns</div>
          </div>
        </div>
        <div className="col-6">
          <div className="text-center p-3 border-round surface-card">
            <i className="pi pi-check-square text-2xl mb-2 text-cyan-500"></i>
            <div className="text-xl font-semibold">{viewModel.selectedRowsCount}</div>
            <div className="text-sm text-600">Selected Rows</div>
            {viewModel.selectedRowsCount > 0 && (
              <div className="flex align-items-center justify-content-center gap-1 mt-1">
                <i className="pi pi-save text-xs text-cyan-400"></i>
                <span className="text-xs text-500">Persistent</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="surface-card p-3 border-round">
        <h5 className="mt-0">Pagination Info</h5>
        <div className="grid">
          <div className="col-4">
            <strong>Current Page:</strong> {viewModel.currentPage || 0}
          </div>
          <div className="col-4">
            <strong>Page Size:</strong> {viewModel.pageSize || 'N/A'}
          </div>
          <div className="col-4">
            <strong>Search Term:</strong> {viewModel.searchTerm || 'None'}
          </div>
        </div>
      </div>

      <div className="surface-card p-3 border-round">
        <h5 className="mt-0">Metadata</h5>
        <div className="grid">
          <div className="col-12">
            <strong>Timestamp:</strong> {viewModel.timestamp}
          </div>
          {viewModel.gridInstanceId && (
            <div className="col-12">
              <strong>Grid Instance:</strong> {viewModel.gridInstanceId}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSearchTab = () => (
    <div className="flex flex-column gap-3">
      <div className="surface-card p-3 border-round">
        <h5 className="mt-0">ISearch Base Properties</h5>
        <div className="grid">
          <div className="col-6">
            <strong>Current Page:</strong> {viewModel.currentPage || 0}
          </div>
          <div className="col-6">
            <strong>Page Size:</strong> {viewModel.pageSize || 'N/A'}
          </div>
          <div className="col-6">
            <strong>Exclude Page Count:</strong> {viewModel.excludePageCount ? 'Yes' : 'No'}
          </div>
          <div className="col-6">
            <strong>Search Term:</strong> {viewModel.searchTerm || 'None'}
          </div>
        </div>
      </div>

      {viewModel.globalSearch && (
        <div className="surface-card p-3 border-round">
          <h5 className="mt-0">Global Search</h5>
          <div className="grid">
            <div className="col-8">
              <strong>Term:</strong> {viewModel.globalSearch.searchTerm || 'None'}
            </div>
            <div className="col-4">
              <strong>Type:</strong> {viewModel.globalSearch.searchType}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFiltersTab = () => (
    <div className="flex flex-column gap-3">
      <div className="surface-card p-3 border-round">
        <h5 className="mt-0">Filter Object (IFilter)</h5>
        <pre className="text-sm overflow-auto" style={{ maxHeight: '200px' }}>
          {JSON.stringify(viewModel.filter, null, 2)}
        </pre>
      </div>

      {viewModel.activeFilters && viewModel.activeFilters.length > 0 && (
        <div className="surface-card p-3 border-round">
          <h5 className="mt-0">Active Filters ({viewModel.activeFilters.length})</h5>
          {viewModel.activeFilters.map((filter, index) => (
            <div key={index} className="border-1 border-300 border-round p-2 mb-2">
              <div className="grid">
                <div className="col-4">
                  <strong>Field:</strong> {filter.field}
                </div>
                <div className="col-4">
                  <strong>Operator:</strong> <Badge value={filter.operator} />
                </div>
                <div className="col-4">
                  <strong>Value:</strong> {String(filter.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSortsTab = () => (
    <div className="flex flex-column gap-3">
      <div className="surface-card p-3 border-round">
        <h5 className="mt-0">OrderBy Object (IOrderBy)</h5>
        <pre className="text-sm overflow-auto" style={{ maxHeight: '200px' }}>
          {JSON.stringify(viewModel.orderBy, null, 2)}
        </pre>
      </div>

      {viewModel.activeSorts && viewModel.activeSorts.length > 0 && (
        <div className="surface-card p-3 border-round">
          <h5 className="mt-0">Active Sorts ({viewModel.activeSorts.length})</h5>
          {viewModel.activeSorts.map((sort, index) => (
            <div key={index} className="border-1 border-300 border-round p-2 mb-2">
              <div className="grid">
                <div className="col-4">
                  <strong>Field:</strong> {sort.field}
                </div>
                <div className="col-4">
                  <strong>Direction:</strong> <Badge value={sort.direction} severity={sort.direction === 'asc' ? 'success' : 'warning'} />
                </div>
                <div className="col-4">
                  <strong>Priority:</strong> {sort.priority || 0}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderColumnsTab = () => (
    <div className="flex flex-column gap-3">
      <div className="surface-card p-3 border-round">
        <h5 className="mt-0">Visible Columns ({viewModel.columns.length})</h5>
        <div className="flex flex-wrap gap-2">
          {viewModel.columns.map((column, index) => (
            <Badge key={index} value={column} className="mr-1 mb-1" />
          ))}
        </div>
      </div>

      {viewModel.columnOrder && (
        <div className="surface-card p-3 border-round">
          <h5 className="mt-0">Column Order</h5>
          <div className="flex flex-wrap gap-2">
            {viewModel.columnOrder.map((column, index) => (
              <Badge key={index} value={`${index + 1}. ${column}`} severity="info" className="mr-1 mb-1" />
            ))}
          </div>
        </div>
      )}

      {viewModel.allAvailableColumns && (
        <div className="surface-card p-3 border-round">
          <h5 className="mt-0">All Available Columns ({viewModel.allAvailableColumns.length})</h5>
          <div className="flex flex-wrap gap-2">
            {viewModel.allAvailableColumns.map((column, index) => {
              const isVisible = viewModel.columns.includes(column);
              return (
                <Badge 
                  key={index} 
                  value={column} 
                  severity={isVisible ? 'success' : 'secondary'} 
                  className="mr-1 mb-1" 
                />
              );
            })}
          </div>
        </div>
      )}

      {viewModel.columnWidths && viewModel.columnWidths.length > 0 && (
        <div className="surface-card p-3 border-round">
          <h5 className="mt-0">Column Widths ({viewModel.columnWidths.length})</h5>
          {viewModel.columnWidths.map((columnWidth, index) => (
            <div key={index} className="border-1 border-300 border-round p-2 mb-2">
              <div className="grid">
                <div className="col-6">
                  <strong>Field:</strong> {columnWidth.field}
                </div>
                <div className="col-6">
                  <strong>Width:</strong> <Badge value={columnWidth.width} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewModel.selectedRowIds && viewModel.selectedRowIds.length > 0 && (
        <div className="surface-card p-3 border-round">
          <h5 className="mt-0">Selected Rows ({viewModel.selectedRowIds.length})</h5>
          <div className="flex flex-wrap gap-2">
            {viewModel.selectedRowIds.map((id, index) => (
              <Badge key={index} value={String(id)} severity="info" className="mr-1 mb-1" />
            ))}
          </div>
          <div className="text-sm text-600 mt-2">
            <i className="pi pi-info-circle mr-1"></i>
            Selected row IDs persist across pagination for bulk actions
          </div>
        </div>
      )}
    </div>
  );

  const renderSelectionTab = () => (
    <div className="flex flex-column gap-3">
      <div className="surface-card p-3 border-round">
        <h5 className="mt-0">Selection Summary</h5>
        <div className="grid">
          <div className="col-6">
            <div className="text-center p-3 border-round bg-blue-50">
              <i className="pi pi-check-square text-2xl mb-2 text-blue-600"></i>
              <div className="text-xl font-semibold text-blue-800">{viewModel.selectedRowsCount}</div>
              <div className="text-sm text-600">Total Selected</div>
            </div>
          </div>
          <div className="col-6">
            <div className="text-center p-3 border-round bg-cyan-50">
              <i className="pi pi-save text-2xl mb-2 text-cyan-600"></i>
              <div className="text-xl font-semibold text-cyan-800">Persistent</div>
              <div className="text-sm text-600">localStorage</div>
            </div>
          </div>
        </div>
      </div>

      {viewModel.selectedRowIds && viewModel.selectedRowIds.length > 0 ? (
        <div className="surface-card p-3 border-round">
          <div className="flex justify-content-between align-items-center mb-3">
            <h5 className="mt-0">Selected Row IDs ({viewModel.selectedRowIds.length})</h5>
            <Button 
              icon="pi pi-copy" 
              label="Copy IDs" 
              size="small" 
              outlined
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(viewModel.selectedRowIds, null, 2));
              }}
              tooltip="Copy selected IDs to clipboard"
            />
          </div>
          
          {viewModel.selectedRowIds.length <= 20 ? (
            // Show all IDs as badges for small lists
            <div className="flex flex-wrap gap-2">
              {viewModel.selectedRowIds.map((id, index) => (
                <Badge 
                  key={index} 
                  value={String(id)} 
                  severity="info" 
                  className="mr-1 mb-1" 
                />
              ))}
            </div>
          ) : (
            // Show scrollable list for large collections
            <div>
              <div className="text-sm text-600 mb-2">
                Showing first 20 of {viewModel.selectedRowIds.length} selected IDs
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {viewModel.selectedRowIds.slice(0, 20).map((id, index) => (
                  <Badge 
                    key={index} 
                    value={String(id)} 
                    severity="info" 
                    className="mr-1 mb-1" 
                  />
                ))}
              </div>
              <div className="border-1 border-300 border-round p-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <div className="text-xs text-600 mb-2">Complete list:</div>
                <pre className="text-xs m-0" style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(viewModel.selectedRowIds, null, 2)}
                </pre>
              </div>
            </div>
          )}
          
          <div className="mt-3 p-2 bg-blue-50 border-round">
            <div className="text-sm">
              <i className="pi pi-info-circle mr-2 text-blue-600"></i>
              <span className="text-blue-800">
                These selections persist across pagination, filtering, sorting, and navigation
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="surface-card p-3 border-round text-center">
          <i className="pi pi-check-square text-4xl mb-3 text-300"></i>
          <h6 className="text-600 mb-0">No rows selected</h6>
          <p className="text-sm text-500 mt-2 mb-0">
            Selected rows will appear here with their IDs and persistence status
          </p>
        </div>
      )}
    </div>
  );

  const renderRawTab = () => (
    <div className="surface-card p-3 border-round">
      <div className="flex justify-content-between align-items-center mb-3">
        <h5 className="mt-0">Raw View Model</h5>
        <Button 
          icon="pi pi-copy" 
          label="Copy to Clipboard" 
          size="small" 
          onClick={copyToClipboard}
          tooltip="Copy JSON to clipboard"
        />
      </div>
      <ScrollPanel style={{ width: '100%', height: '400px' }}>
        <pre className="text-sm">
          {JSON.stringify(viewModel, null, 2)}
        </pre>
      </ScrollPanel>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary': return renderSummaryTab();
      case 'search': return renderSearchTab();
      case 'filters': return renderFiltersTab();
      case 'sorts': return renderSortsTab();
      case 'columns': return renderColumnsTab();
      case 'selection': return renderSelectionTab();
      case 'raw': return renderRawTab();
      default: return renderSummaryTab();
    }
  };

  const headerTemplate = () => (
    <div className="flex align-items-center gap-2">
      <i className="pi pi-code text-orange-500"></i>
      <span className="font-semibold">{title}</span>
      <Badge value="DEV" severity="warning" />
    </div>
  );

  return (
    <div className={`development-panel ${className}`}>
      <Panel 
        header={headerTemplate()} 
        toggleable 
        collapsed={collapsed}
        onToggle={(e) => setCollapsed(e.value)}
        className="h-full"
      >
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 mb-3 border-bottom-1 surface-border pb-2">
          {[
            { key: 'summary', label: 'Summary', icon: 'pi-chart-bar' },
            { key: 'search', label: 'Search', icon: 'pi-search' },
            { key: 'filters', label: 'Filters', icon: 'pi-filter' },
            { key: 'sorts', label: 'Sorts', icon: 'pi-sort' },
            { key: 'columns', label: 'Columns', icon: 'pi-eye' },
            { key: 'selection', label: 'Selection', icon: 'pi-check-square' },
            { key: 'raw', label: 'Raw', icon: 'pi-code' }
          ].map(tab => (
            <Button
              key={tab.key}
              label={tab.label}
              icon={`pi ${tab.icon}`}
              size="small"
              severity={activeTab === tab.key ? 'info' : 'secondary'}
              outlined={activeTab !== tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className="p-1"
            />
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {renderTabContent()}
        </div>
      </Panel>
    </div>
  );
}

export default DevelopmentPanel;