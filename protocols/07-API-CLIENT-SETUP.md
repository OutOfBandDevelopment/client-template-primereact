# API Client Setup Protocol

## Overview

Generated API clients provide type-safe HTTP communication with your backend. Each entity gets a client class with CRUD operations.

## Generated Location

```
src/api/{Namespace}/
├── Clients/
│   ├── {Entity}Client.ts     # Client implementation
│   ├── I{Entity}Client.ts    # Interface
│   └── Index.ts              # Barrel export
├── Models/
│   ├── {Entity}Model.ts      # TypeScript interfaces
│   └── Index.ts
└── Schema/
    ├── {Entity}Schema.ts     # Zod validation schemas
    ├── Registry.ts           # Schema registry
    └── Index.ts
```

## Client Architecture

```typescript
// Generated client structure
class ProductClient extends ClientBase {
  // Query (list with pagination/filtering)
  async Query(params: { body: ProductSearchQuery }): Promise<QueryResult<Product>>

  // Get single entity
  async Get(params: { productId: number }): Promise<Product>

  // Save (create or update)
  async Save(params: { body: Product }): Promise<Product>

  // Delete
  async Delete(params: { productId: number }): Promise<void>

  // Bulk operations (if configured)
  async BulkApprove(params: { body: number[] }): Promise<BulkResult>
  async BulkDelete(params: { body: number[] }): Promise<BulkResult>
}
```

## Basic Usage

### Query (List with Filtering)

```typescript
import ProductClient from '@/api/YourApp/Clients/ProductClient';

const client = new ProductClient();

// Simple query
const result = await client.Query({
  body: {
    currentPage: 0,
    pageSize: 25
  }
});

console.log(result.rows);      // Product[]
console.log(result.totalRows); // Total count

// With filtering
const filteredResult = await client.Query({
  body: {
    currentPage: 0,
    pageSize: 25,
    filter: {
      isActive: { eq: true },
      categoryId: { in: [1, 2, 3] },
      productName: { contains: 'widget' }
    },
    orderBy: {
      productName: 'asc'
    }
  }
});
```

### Get Single Entity

```typescript
const product = await client.Get({ productId: 123 });
```

### Save (Create/Update)

```typescript
// Create new
const newProduct = await client.Save({
  body: {
    productId: 0,  // 0 = create new
    productName: 'New Product',
    categoryId: 1,
    isActive: true
  }
});

// Update existing
const updatedProduct = await client.Save({
  body: {
    productId: 123,
    productName: 'Updated Name',
    categoryId: 2,
    isActive: true
  }
});
```

### Delete

```typescript
await client.Delete({ productId: 123 });
```

## Filter Operators

| Operator | Usage | SQL Equivalent |
|----------|-------|----------------|
| `eq` | `{ field: { eq: value } }` | `field = value` |
| `ne` | `{ field: { ne: value } }` | `field != value` |
| `gt` | `{ field: { gt: value } }` | `field > value` |
| `gte` | `{ field: { gte: value } }` | `field >= value` |
| `lt` | `{ field: { lt: value } }` | `field < value` |
| `lte` | `{ field: { lte: value } }` | `field <= value` |
| `in` | `{ field: { in: [1,2,3] } }` | `field IN (1,2,3)` |
| `contains` | `{ field: { contains: 'text' } }` | `field LIKE '%text%'` |
| `startsWith` | `{ field: { startsWith: 'text' } }` | `field LIKE 'text%'` |
| `endsWith` | `{ field: { endsWith: 'text' } }` | `field LIKE '%text'` |

## Authentication

### Configure Token Provider

```typescript
// src/api/ClientBase.ts (or your auth setup)
import { getAuthToken } from '@/contexts/AuthContext';

// In ClientBase constructor or fetch wrapper
const headers = {
  'Authorization': `Bearer ${await getAuthToken()}`,
  'Content-Type': 'application/json'
};
```

### Token Refresh

The ClientBase handles automatic token refresh:

```typescript
// If 401 received, attempt refresh
if (response.status === 401) {
  const newToken = await refreshToken();
  // Retry request with new token
}
```

## Error Handling

```typescript
import ProductClient from '@/api/YourApp/Clients/ProductClient';
import { Toast } from 'primereact/toast';

function ProductManager() {
  const toast = useRef<Toast>(null);
  const client = useMemo(() => new ProductClient(), []);

  const loadProducts = async () => {
    try {
      const result = await client.Query({ body: { currentPage: 0, pageSize: 25 } });
      setProducts(result.rows);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.current?.show({
          severity: 'error',
          summary: 'API Error',
          detail: error.message
        });
      } else {
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load products'
        });
      }
    }
  };

  return (
    <>
      <Toast ref={toast} />
      {/* Component content */}
    </>
  );
}
```

## Using with SimpleGenericGrid

```typescript
import { SimpleGenericGrid } from '@/components/ui/prime/GenericGrid';
import ProductClient from '@/api/YourApp/Clients/ProductClient';
import type {
  Product,
  ProductFilter,
  ProductOrderBy,
  ProductSearchQuery
} from '@/api/YourApp/Clients/ProductClient';

function ProductGrid() {
  const client = useMemo(() => new ProductClient(), []);

  return (
    <SimpleGenericGrid<ProductFilter, ProductOrderBy, ProductSearchQuery, Product>
      client={client}
      dataKey="productId"
      title="Products"
      columns={columns}
      enableFiltering={true}
      enableSorting={true}
    />
  );
}
```

## Using with EntityPage

```typescript
import { EntityPage } from '@/components/ui/prime/EntityForm';
import ProductClient from '@/api/YourApp/Clients/ProductClient';
import { ProductEntityForm } from '@/components/YourApp';

function ProductEditPage() {
  const client = useMemo(() => new ProductClient(), []);

  return (
    <EntityPage
      client={client}
      FormComponent={ProductEntityForm}
      entityName="Product"
      getMethod="Get"
      saveMethod="Save"
    />
  );
}
```

## Bulk Operations

If entity has bulk actions configured:

```typescript
// Bulk approve
await client.BulkApprove({
  body: [1, 2, 3, 4, 5]  // Array of IDs
});

// Bulk delete
await client.BulkDelete({
  body: [1, 2, 3]
});

// Custom bulk action
await client.BulkAllocate({
  body: {
    productIds: [1, 2, 3],
    districtId: 42
  }
});
```

## Caching

Use `useCachedApiCall` for data that doesn't change often:

```typescript
import { useCachedApiCall } from '@/hooks/useCachedApiCall';

function CategorySelector() {
  const fetchCategories = useCallback(async () => {
    const client = new CategoryClient();
    const result = await client.Query({
      body: { currentPage: 0, pageSize: 1000 }
    });
    return result.rows;
  }, []);

  const { data: categories, loading, error } = useCachedApiCall(
    'categories-list',
    fetchCategories,
    { ttl: 30 * 60 * 1000 }  // 30 minute cache
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <Dropdown
      options={categories}
      optionLabel="categoryName"
      optionValue="categoryId"
    />
  );
}
```

## API Base URL Configuration

### Development

```typescript
// src/config.ts
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7080/api';
```

### Production

```json
// public/config.json
{
  "apiBaseUrl": "https://api.yourdomain.com"
}
```

```typescript
// Load at runtime
const config = await fetch('/config.json').then(r => r.json());
ClientBase.setBaseUrl(config.apiBaseUrl);
```

## Types and Interfaces

Each client exports its types:

```typescript
import type {
  // Entity type
  Product,

  // Query types
  ProductSearchQuery,
  ProductFilter,
  ProductOrderBy,

  // Filter parameter type
  IFilterParameter,

  // Client interface
  IProductClient
} from '@/api/YourApp/Clients/ProductClient';
```

## Zod Schemas

For validation:

```typescript
import {
  ZQueryProductModel,      // Query/Read schema
  ZQueryProductModelSave   // Save/Write schema
} from '@/api/YourApp/Schema';

// Validate data
const result = ZQueryProductModelSave.safeParse(formData);
if (!result.success) {
  console.error(result.error.issues);
}

// With React Hook Form
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(ZQueryProductModelSave)
});
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing/expired token | Check auth configuration |
| 404 Not Found | Wrong API path | Verify apiBaseUrl configuration |
| CORS errors | Cross-origin blocked | Configure backend CORS |
| Type errors | Schema mismatch | Regenerate after API changes |
| Network errors | Server down | Check server status |

## Related Protocols

- [Project Setup](./01-PROJECT-SETUP.md) - Initial configuration
- [DataGrid Integration](./04-DATAGRID-INTEGRATION.md) - Using with grids
- [EntityForm Integration](./05-ENTITYFORM-INTEGRATION.md) - Using with forms
