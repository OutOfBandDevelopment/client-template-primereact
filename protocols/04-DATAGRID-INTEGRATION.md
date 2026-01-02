# DataGrid Integration Protocol

## Overview

DataGrid components provide full-featured data tables with filtering, sorting, pagination, and CRUD operations. Generated for each entity with `x-query-model: true`.

## Generated Location

```
src/components/{Namespace}/{EntityName}/DataGrid.tsx
```

## Basic Usage

```typescript
import { QueryProductModelDataGrid } from '@/components/YourApp';

function ProductList() {
  return (
    <QueryProductModelDataGrid
      title="Product Management"
      enableCreate={true}
      onCreateClick={() => navigate('/products/new')}
    />
  );
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | Entity label | Grid title |
| `enableCreate` | `boolean` | `false` | Show create button |
| `onCreateClick` | `() => void` | - | Create button handler |
| `enableFiltering` | `boolean` | `true` | Show filter sidebar |
| `enableSorting` | `boolean` | `true` | Enable column sorting |
| `enableExport` | `boolean` | `true` | Show export buttons |
| `exportFilename` | `string` | Title | Export file name |
| `exportMaxRecords` | `number` | `100000` | Max export records |
| `enableBulkSelection` | `boolean` | `false` | Enable row checkboxes |
| `onSelectionChange` | `(items: T[]) => void` | - | Selection change handler |
| `visibleColumns` | `string[]` | All | Columns to display |
| `defaultFilters` | `object` | - | Initial filter values |
| `defaultSort` | `{ field, order }` | - | Initial sort |
| `pageSize` | `number` | `25` | Rows per page |
| `useReactRouter` | `boolean` | `true` | Use React Router navigation |
| `onRowClick` | `(row: T) => void` | - | Row click handler |
| `className` | `string` | - | Additional CSS class |

## Column Configuration

Columns are auto-generated from schema. Override with `customColumns`:

```typescript
<QueryProductModelDataGrid
  title="Products"
  customColumns={{
    productName: {
      header: "Product",
      width: "300px",
      sortable: true,
      body: (row) => (
        <div className="flex align-items-center gap-2">
          <Avatar image={row.imageUrl} />
          <span className="font-bold">{row.productName}</span>
        </div>
      )
    },
    price: {
      header: "Price",
      width: "120px",
      body: (row) => `$${row.price.toFixed(2)}`
    }
  }}
/>
```

## Filtering

### Default Filters

```typescript
<QueryProductModelDataGrid
  title="Active Products"
  defaultFilters={{
    isActive: { eq: true }
  }}
/>
```

### Predefined Filter Buttons

Configure in swagger with `x-predefined-filter`:

```json
{
  "isActive": {
    "type": "boolean",
    "x-predefined-filter": true,
    "x-predefined-filter-label": "Active Only",
    "x-predefined-filter-value": true
  }
}
```

Generates filter buttons above the grid.

### Filter Sidebar

The filter sidebar is schema-driven:
- Shows all filterable fields from schema
- Uses generated MultiSelect for FK fields
- Respects `x-navigation-variant` for filtered FK lookups
- Fields with `x-not-filterable: true` are excluded

## Bulk Selection & Actions

```typescript
function ProductListWithBulkActions() {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  return (
    <>
      <QueryProductModelDataGrid
        title="Products"
        enableBulkSelection={true}
        onSelectionChange={setSelectedProducts}
      />

      {selectedProducts.length > 0 && (
        <div className="flex gap-2 mt-2">
          <Button
            label={`Delete ${selectedProducts.length} items`}
            icon="pi pi-trash"
            severity="danger"
            onClick={() => handleBulkDelete(selectedProducts)}
          />
          <Button
            label="Export Selected"
            icon="pi pi-download"
            onClick={() => handleExport(selectedProducts)}
          />
        </div>
      )}
    </>
  );
}
```

## Export Configuration

Export is enabled by default:

```typescript
// Disable export
<QueryProductModelDataGrid
  enableExport={false}
/>

// Custom export settings
<QueryProductModelDataGrid
  exportFilename="products-export"
  exportMaxRecords={50000}
/>
```

Export formats: Excel (.xlsx), CSV

## Row Click Navigation

```typescript
// Using React Router (default)
<QueryProductModelDataGrid
  useReactRouter={true}
  onRowClick={(row) => navigate(`/products/edit/${row.productId}`)}
/>

// Using custom navigation
<QueryProductModelDataGrid
  useReactRouter={false}
  onRowClick={(row) => {
    window.location.href = `/products/edit/${row.productId}`;
  }}
/>
```

## Visible Columns

Control which columns are displayed:

```typescript
<QueryProductModelDataGrid
  visibleColumns={['productName', 'category', 'price', 'isActive']}
/>
```

Note: Action column is always included when edit/view enabled.

## Custom Renderers

Configure in swagger with `x-custom-renderer`:

| Renderer | Usage |
|----------|-------|
| `date` | Format as date |
| `date-time` | Format as date/time |
| `boolean-tag` | PrimeReact Tag component |
| `truncated-text` | Truncate with tooltip |
| `image` | 40x40 thumbnail |
| `currency` | Currency format |

```json
{
  "createdAt": {
    "type": "string",
    "format": "date-time",
    "x-custom-renderer": "date"
  },
  "isActive": {
    "type": "boolean",
    "x-custom-renderer": "boolean-tag",
    "x-tag-true-label": "Active",
    "x-tag-false-label": "Inactive",
    "x-tag-true-severity": "success",
    "x-tag-false-severity": "danger"
  }
}
```

## Integration with List Page

Generated List pages use DataGrid:

```typescript
// Generated: src/pages/{Namespace}/{Entity}/List/index.tsx
import { QueryProductModelDataGrid } from '@/components/YourApp';

export default function ProductListPage() {
  const navigate = useNavigate();

  return (
    <div className="p-4">
      <QueryProductModelDataGrid
        title="Product Management"
        enableCreate={true}
        onCreateClick={() => navigate('../Edit')}
        enableFiltering={true}
        enableExport={true}
      />
    </div>
  );
}
```

## Performance Optimization

### Large Datasets

```typescript
<QueryProductModelDataGrid
  pageSize={50}
  virtualScroll={true}  // If supported
/>
```

### Debounced Filtering

Filter changes are debounced by default (300ms).

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty grid | API error | Check console, verify API endpoint |
| Wrong columns | Schema mismatch | Regenerate after schema change |
| Filters not working | Wrong field type | Check filter field metadata |
| Export fails | Too many records | Reduce exportMaxRecords |
| Slow rendering | Too many columns | Use visibleColumns to limit |

## Swagger Requirements

```json
{
  "QueryEntityModel": {
    "x-query-model": true,
    "properties": {
      "entityId": {
        "x-navigation-key": true,
        "x-label": "ID"
      },
      "entityName": {
        "x-label": "Name",
        "x-display-value": true
      },
      "isActive": {
        "x-label": "Status",
        "x-custom-renderer": "boolean-tag"
      },
      "internalField": {
        "x-hidden-column": true
      },
      "computedField": {
        "x-not-filterable": true
      }
    }
  }
}
```

## Related Protocols

- [EntityForm Integration](./05-ENTITYFORM-INTEGRATION.md) - For create/edit forms
- [Navigation & Routing](./06-NAVIGATION-ROUTING.md) - For route setup
