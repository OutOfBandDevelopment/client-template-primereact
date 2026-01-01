# API Contract Requirements

This document defines the API contract that backend teams must implement for the generated frontend components to work correctly.

## Overview

The TypeScript generator produces React components that expect specific API patterns and swagger metadata. This document is the **contract** between backend and frontend teams.

## Table of Contents

1. [API Response Patterns](#api-response-patterns)
2. [Required Swagger Extensions](#required-swagger-extensions)
3. [Entity Model Conventions](#entity-model-conventions)
4. [Query/Search Patterns](#querysearch-patterns)
5. [CRUD Operations](#crud-operations)
6. [Error Handling](#error-handling)

---

## API Response Patterns

### Paginated Query Response

All list/query endpoints must return this structure:

```json
{
  "rows": [...],           // Array of entity objects
  "totalRecords": 150,     // Total count for pagination
  "currentPage": 0,        // Zero-based page index
  "pageSize": 20,          // Items per page
  "totalPages": 8          // Calculated total pages
}
```

**TypeScript Interface:**
```typescript
interface QueryResponse<T> {
  rows: T[];
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}
```

### Single Entity Response

GET/PUT endpoints for single entities return the entity directly:

```json
{
  "productId": 123,
  "productName": "Widget A",
  "categoryId": 5,
  "categoryName": "Electronics",
  "isActive": true
}
```

### Create Response

POST endpoints return the created entity with its new ID:

```json
{
  "productId": 456,        // Newly assigned ID
  "productName": "Widget B",
  // ... rest of entity
}
```

### Delete Response

DELETE endpoints return success status:

```json
{
  "success": true,
  "message": "Entity deleted successfully"
}
```

---

## Required Swagger Extensions

### Schema-Level Extensions

These go on the schema definition itself:

| Extension | Required | Type | Description |
|-----------|----------|------|-------------|
| `x-label` | **Yes** | string | Human-readable entity name |
| `x-navigation-key` | **Yes** | boolean | Marks the primary key field |
| `x-display-value` | Recommended | boolean | Marks the display name field |

**Example:**
```json
"QueryProductModel": {
  "type": "object",
  "x-label": "Product",
  "properties": {
    "productId": {
      "type": "integer",
      "x-navigation-key": true
    },
    "productName": {
      "type": "string",
      "x-display-value": true
    }
  }
}
```

### Property-Level Extensions

#### Navigation (Foreign Keys)

| Extension | Required | Type | Description |
|-----------|----------|------|-------------|
| `x-navigation-target` | **Yes** for FKs | string | Full class name of related model |
| `x-navigation-relation` | **Yes** for display fields | string | Related ID field name |
| `x-navigation-description` | Recommended | string | Label for the relationship |
| `x-navigation-variant` | Optional | string | Filtered variant to use |

**Example:**
```json
"categoryId": {
  "type": "integer",
  "nullable": true,
  "x-navigation-target": "MyApp.Models.QueryCategoryModel",
  "x-navigation-description": "Category"
},
"categoryName": {
  "type": "string",
  "nullable": true,
  "x-navigation-relation": "categoryId"
}
```

#### Display & Labeling

| Extension | Required | Type | Description |
|-----------|----------|------|-------------|
| `x-label` | Recommended | string | Column header / field label |
| `x-field-set` | Optional | string | Form fieldset grouping |

#### Visibility Control

| Extension | Type | Description |
|-----------|------|-------------|
| `x-hidden` | boolean | Hide everywhere |
| `x-hidden-column` | boolean | Hide from grid only |
| `x-hidden-field` | boolean | Hide from forms only |

#### Search & Filter Behavior

| Extension | Type | Description |
|-----------|------|-------------|
| `x-searchable` | boolean | Include in search term |
| `x-not-searchable` | boolean | Exclude from search |
| `x-not-filterable` | boolean | Disable filtering |
| `x-not-sortable` | boolean | Disable sorting |

#### Custom Rendering

| Extension | Type | Values |
|-----------|------|--------|
| `x-custom-renderer` | string | `date`, `boolean-tag`, `truncated-text`, `image`, `count`, `status`, `code`, `email` |
| `x-tag-true-severity` | string | `success`, `info`, `warning`, `danger`, `secondary` |
| `x-tag-false-severity` | string | Same as above |
| `x-tag-true-label` | string | Custom label for true |
| `x-tag-false-label` | string | Custom label for false |
| `x-truncate-length` | integer | Max chars before truncation |
| `x-column-width` | string | CSS width (e.g., "150px") |

### Entity Behavior Extensions

| Extension | Type | Description |
|-----------|------|-------------|
| `x-read-only` | boolean | View only, no create/edit |
| `x-not-creatable` | boolean | Disable create |
| `x-not-selectable` | boolean | Exclude from dropdowns |
| `x-bulk-actions` | string[] | Enabled bulk action IDs |
| `x-permissions` | object | Role-based access |

### Variant Extensions

For entities with filtered subsets:

```json
"QuerySchoolDistrictModel": {
  "x-combobox-variants": {
    "all": {
      "label": "All Districts",
      "filter": null
    },
    "district": {
      "label": "Districts Only",
      "filter": { "isSchoolCoop": false }
    },
    "coop": {
      "label": "Coops Only",
      "filter": { "isSchoolCoop": true }
    }
  }
}
```

### External Sync Extensions

For fields synced from external systems:

```json
"QueryProductModel": {
  "x-external-sync": {
    "oneWorldSync": {
      "indicatorField": "hasOneWorldSyncProduct",
      "readonlyReason": "Synced from 1WorldSync"
    }
  },
  "properties": {
    "productName": {
      "type": "string",
      "x-synced-from": "oneWorldSync"
    }
  }
}
```

---

## Entity Model Conventions

### Naming Conventions

| Pattern | Example | Purpose |
|---------|---------|---------|
| `Query{Entity}Model` | `QueryProductModel` | Read/list operations |
| `Save{Entity}Model` | `SaveProductModel` | Create/update operations |
| `I{Entity}` | `IQueryProductModel` | TypeScript interface |
| `{Entity}SearchQuery` | `ProductSearchQuery` | Query parameters |
| `{Entity}Filter` | `ProductFilter` | Filter criteria |
| `{Entity}OrderBy` | `ProductOrderBy` | Sort configuration |

### Required Fields

Every Query model should have:

```json
{
  "{entity}Id": {
    "type": "integer",
    "x-navigation-key": true,
    "x-label": "ID"
  },
  "{entity}Name": {
    "type": "string",
    "x-display-value": true,
    "x-label": "Name"
  },
  "isActive": {
    "type": "boolean",
    "x-label": "Active",
    "x-custom-renderer": "boolean-tag"
  }
}
```

### Audit Fields (Optional but Recommended)

```json
{
  "createdOn": {
    "type": "string",
    "format": "date-time",
    "readOnly": true,
    "x-hidden-column": true,
    "x-field-set": "Audit Information"
  },
  "createdById": {
    "type": "integer",
    "readOnly": true,
    "x-hidden": true
  },
  "createdBy": {
    "type": "string",
    "readOnly": true,
    "x-hidden-column": true,
    "x-field-set": "Audit Information"
  },
  "updatedOn": {
    "type": "string",
    "format": "date-time",
    "readOnly": true,
    "x-hidden-column": true,
    "x-field-set": "Audit Information"
  },
  "updatedById": {
    "type": "integer",
    "readOnly": true,
    "x-hidden": true
  },
  "updatedBy": {
    "type": "string",
    "readOnly": true,
    "x-hidden-column": true,
    "x-field-set": "Audit Information"
  }
}
```

---

## Query/Search Patterns

### Search Query Body

POST query endpoints expect this body structure:

```json
{
  "currentPage": 0,
  "pageSize": 20,
  "searchTerm": "optional search text",
  "filter": {
    "isActive": { "eq": true },
    "categoryId": { "in": [1, 2, 3] },
    "productName": { "contains": "widget" }
  },
  "orderBy": {
    "productName": "asc",
    "createdOn": "desc"
  }
}
```

### Filter Operators

The API must support these filter operators:

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{ "isActive": { "eq": true } }` |
| `ne` | Not equals | `{ "status": { "ne": "deleted" } }` |
| `gt` | Greater than | `{ "price": { "gt": 100 } }` |
| `gte` | Greater or equal | `{ "quantity": { "gte": 0 } }` |
| `lt` | Less than | `{ "price": { "lt": 1000 } }` |
| `lte` | Less or equal | `{ "date": { "lte": "2024-12-31" } }` |
| `in` | In array | `{ "categoryId": { "in": [1, 2, 3] } }` |
| `contains` | String contains | `{ "name": { "contains": "test" } }` |
| `startsWith` | String starts with | `{ "code": { "startsWith": "PRD" } }` |
| `endsWith` | String ends with | `{ "email": { "endsWith": "@company.com" } }` |

### OrderBy Structure

```json
{
  "orderBy": {
    "fieldName": "asc",      // or "desc"
    "secondField": "desc"    // Multi-field sorting
  }
}
```

---

## CRUD Operations

### Endpoint Patterns

| Operation | Method | Endpoint | Body |
|-----------|--------|----------|------|
| Query/List | POST | `/api/{entity}/query` | SearchQuery |
| Get One | GET | `/api/{entity}/{id}` | - |
| Create | POST | `/api/{entity}` | SaveModel |
| Update | PUT | `/api/{entity}/{id}` | SaveModel |
| Delete | DELETE | `/api/{entity}/{id}` | - |
| Bulk Action | POST | `/api/{entity}/bulk/{action}` | `{ ids: number[] }` |

### Query Endpoint

```
POST /api/product/query
Content-Type: application/json

{
  "currentPage": 0,
  "pageSize": 20,
  "filter": { "isActive": { "eq": true } }
}
```

**Response:**
```json
{
  "rows": [
    { "productId": 1, "productName": "Widget A", ... },
    { "productId": 2, "productName": "Widget B", ... }
  ],
  "totalRecords": 150,
  "currentPage": 0,
  "pageSize": 20,
  "totalPages": 8
}
```

### Get Single

```
GET /api/product/123
```

**Response:**
```json
{
  "productId": 123,
  "productName": "Widget A",
  "categoryId": 5,
  "isActive": true
}
```

### Create

```
POST /api/product
Content-Type: application/json

{
  "productName": "New Widget",
  "categoryId": 5,
  "isActive": true
}
```

**Response:** Created entity with ID

### Update

```
PUT /api/product/123
Content-Type: application/json

{
  "productId": 123,
  "productName": "Updated Widget",
  "categoryId": 5,
  "isActive": true
}
```

**Response:** Updated entity

### Bulk Actions

```
POST /api/product/bulk/activate
Content-Type: application/json

{
  "ids": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "success": true,
  "affected": 5,
  "message": "5 products activated"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "status": 400,
  "title": "Validation Error",
  "errors": {
    "productName": ["Product name is required"],
    "categoryId": ["Category does not exist"]
  },
  "traceId": "abc-123-def"
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized |
| 404 | Entity not found |
| 409 | Conflict (duplicate, etc.) |
| 500 | Server error |

---

## Authentication

### Token Header

```
Authorization: Bearer {jwt_token}
```

### Correlation ID

Include for request tracing:

```
X-Correlation-ID: {guid}
```

---

## Complete Schema Example

```json
{
  "components": {
    "schemas": {
      "QueryProductModel": {
        "type": "object",
        "x-label": "Product",
        "x-bulk-actions": ["activate", "deactivate"],
        "properties": {
          "productId": {
            "type": "integer",
            "x-navigation-key": true,
            "x-label": "ID"
          },
          "productName": {
            "type": "string",
            "x-display-value": true,
            "x-label": "Product Name",
            "x-searchable": true
          },
          "categoryId": {
            "type": "integer",
            "nullable": true,
            "x-navigation-target": "MyApp.Models.QueryCategoryModel",
            "x-label": "Category"
          },
          "categoryName": {
            "type": "string",
            "nullable": true,
            "x-navigation-relation": "categoryId"
          },
          "price": {
            "type": "number",
            "format": "decimal",
            "x-label": "Price"
          },
          "isActive": {
            "type": "boolean",
            "x-label": "Active",
            "x-custom-renderer": "boolean-tag",
            "x-tag-true-severity": "success",
            "x-tag-false-severity": "secondary"
          },
          "createdOn": {
            "type": "string",
            "format": "date-time",
            "readOnly": true,
            "x-hidden-column": true,
            "x-field-set": "Audit Information"
          }
        }
      }
    }
  }
}
```

---

## Checklist for Backend Teams

- [ ] Implement paginated query response format
- [ ] Add `x-navigation-key` to all primary keys
- [ ] Add `x-navigation-target` to all foreign keys
- [ ] Add `x-navigation-relation` to display name fields
- [ ] Add `x-label` to all user-facing fields
- [ ] Implement all required filter operators
- [ ] Support multi-field orderBy
- [ ] Return proper error response format
- [ ] Include CORS headers for frontend dev
