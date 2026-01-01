# Architecture Guide

## Overview

This template project generates a complete React TypeScript frontend from OpenAPI/Swagger specifications using Handlebars templates. The architecture follows a layered approach:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Pages Layer                              │
│    List Pages (DataGrids)  │  Edit Pages (PropertyEditors)      │
├─────────────────────────────────────────────────────────────────┤
│                      Components Layer                            │
│  ComboBox │ MultiSelect │ DataGrid │ PropertyEditor │ EntityForm│
├─────────────────────────────────────────────────────────────────┤
│                     Base Components Layer                        │
│       SimpleGenericGrid │ BasePropertyEditor │ EntityPage        │
├─────────────────────────────────────────────────────────────────┤
│                        API Layer                                 │
│          Clients (HTTP) │ Models (Types) │ Schema (Zod)         │
├─────────────────────────────────────────────────────────────────┤
│                      Utilities Layer                             │
│   schemaBasedColumnBuilder │ zodSchemaHelper │ masterDataCache  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Categories

### 1. Generated Entity Components

These are per-entity components generated from templates:

| Component | Template | Purpose |
|-----------|----------|---------|
| ComboBox | `ComboBox.tsx.hbs` | Dropdown selector with caching |
| MultiSelect | `MultiSelect.tsx.hbs` | Multi-value selector with chips |
| DataGrid | `DataGrid.tsx.hbs` | Full-featured data grid |
| PropertyEditor | `PropertyEditor.tsx.hbs` | Form editor from schema |
| EntityForm | `EntityForm.tsx.hbs` | React Hook Form wrapper |
| FormSchema | `FormSchema.ts.hbs` | Field configuration export |

### 2. Base Runtime Components

These are shared components that generated code depends on:

| Component | Location | Purpose |
|-----------|----------|---------|
| SimpleGenericGrid | `GenericGrid/SimpleGenericGrid.tsx` | Core grid with filtering/sorting |
| FilterSidebar | `GenericGrid/FilterSidebar.tsx` | Filter panel with schema support |
| FilterControl | `GenericGrid/FilterControl.tsx` | Individual filter inputs |
| EntityPage | `EntityForm/EntityPage.tsx` | Page wrapper with loading/errors |
| BasePropertyEditor | `EntityForm/BasePropertyEditor.tsx` | Base form field rendering |
| BaseEntityForm | `EntityForm/BaseEntityForm.tsx` | Form with validation |

## Data Flow

### Grid Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  DataGrid    │────▶│ SimpleGeneric│────▶│  API Client  │
│  (Generated) │     │   Grid       │     │  (Generated) │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │                    ▼                    │
       │            ┌──────────────┐            │
       │            │ FilterSidebar│            │
       │            │ (Schema-based│            │
       │            │   filters)   │            │
       │            └──────────────┘            │
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────┐
│              Zod Schema Registry                       │
│    (Field metadata, validation, navigation targets)   │
└──────────────────────────────────────────────────────┘
```

### Form Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ PropertyEdit │────▶│ BaseProperty │────▶│  ComboBox    │
│   (Generated)│     │   Editor     │     │  (Generated) │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────┐
│                  Zod Schema Metadata                   │
│   x-field-set │ x-navigation-target │ x-synced-from   │
└──────────────────────────────────────────────────────┘
```

## Key Design Patterns

### 1. Schema-Driven UI

The UI is driven by Zod schema metadata:

```typescript
// Schema with metadata
const ZProductSchema = z.object({
  productId: z.number().meta({
    'x-navigation-key': true,
    'x-label': 'Product ID'
  }),
  categoryId: z.number().meta({
    'x-navigation-target': 'QueryCategoryModel',
    'x-navigation-variant': 'active'
  }),
  // ...
});

// Runtime extraction
const fields = extractZodFields(ZProductSchema);
// Returns: [{ name: 'productId', metadata: { 'x-navigation-key': true, ... } }, ...]
```

### 2. Lazy Component Loading

ComboBox and MultiSelect components are loaded lazily to reduce bundle size:

```typescript
// componentRegistry.ts (generated)
const comboboxComponents = {
  'QueryCategoryModel': lazy(() => import('@/components/GreenOnion/QueryCategoryModel/ComboBox')),
  // ...
};

export function getComboboxComponent(navigationTarget: string) {
  return comboboxComponents[extractModelName(navigationTarget)];
}
```

### 3. Cached API Calls

ComboBox data is cached to prevent redundant API calls:

```typescript
const { data, loading, error } = useCachedApiCall(
  cacheKey,
  fetchItems,
  { ttl: 30 * 60 * 1000 } // 30 minutes
);
```

### 4. Column Generation from Schema

DataGrid columns are generated from Zod schemas at runtime:

```typescript
const columns = await buildColumnsFromSchema<IQueryProductModel>(
  'IQueryProductModel',
  {
    enableActions: true,
    onEditClick: handleEdit,
    primaryKeyField: 'productId',
    excludeFields: ['createdOn', 'updatedOn'],
  }
);
```

## Customization Points

### 1. Custom Cell Renderers

Add in DataGrid template:

```handlebars
{{#if-any prop.x-custom-renderer "my-renderer"}}
  body: (rowData) => <MyRenderer value={rowData.{{propName}}} />,
{{/if-any}}
```

### 2. Custom Field Types

Add in PropertyEditor template:

```handlebars
{{#if-eq field.type "rich-text"}}
  <RichTextEditor ... />
{{/if-eq}}
```

### 3. Custom Variants

Define in swagger.json:

```json
"x-combobox-variants": {
  "active": { "label": "Active Only", "filter": { "isActive": true } },
  "inactive": { "label": "Inactive", "filter": { "isActive": false } }
}
```

## File Organization

Generated files follow this structure:

```
src/
├── api/GreenOnion/
│   ├── Clients/          # HTTP client classes
│   │   ├── CategoryClient.ts
│   │   └── Index.ts
│   ├── Models/           # TypeScript interfaces
│   │   ├── IQueryCategoryModel.ts
│   │   └── Index.ts
│   └── Schema/           # Zod validation schemas
│       ├── ZQueryCategoryModel.ts
│       ├── Registry.ts   # Schema lookup
│       └── Index.ts
├── components/GreenOnion/
│   ├── QueryCategoryModel/
│   │   ├── ComboBox.tsx
│   │   ├── MultiSelect.tsx
│   │   ├── DataGrid.tsx
│   │   ├── PropertyEditor.tsx
│   │   ├── EntityForm.tsx
│   │   ├── FormSchema.ts
│   │   └── index.tsx
│   ├── componentRegistry.ts
│   └── index.tsx
└── pages/GreenOnion/
    ├── QueryCategoryModel/
    │   ├── List/index.tsx
    │   └── Edit/index.tsx
    └── Routes.tsx
```

## Performance Considerations

1. **Code Splitting**: Use `lazy()` imports for components
2. **Caching**: Master data cached for 15-30 minutes
3. **Schema Registry**: Lazy loading of Zod schemas
4. **Column Memoization**: `useMemo` for column definitions
5. **Virtual Scrolling**: PrimeReact DataTable handles large datasets
