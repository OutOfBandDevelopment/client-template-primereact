# TypeScript Code Generator Template Project

A portable template project for generating React TypeScript components, API clients, and Zod schemas from OpenAPI/Swagger specifications.

## Overview

This template project provides everything needed to integrate the TypeScript code generation system into **any React project**. It includes:

- **Handlebars Templates**: Generate React components, API clients, and Zod schemas
- **Runtime Dependencies**: Base components and utilities that generated code requires
- **Navigation & Routing Utilities**: Reusable menu, route, and navigation builders
- **Documentation**: Comprehensive guides for setup, customization, and usage
- **Scripts**: Helper scripts for installation (bash and batch)

## Namespace Configuration

The templates use a configurable namespace (default: `GreenOnion`). When integrating into your project:

1. **Update `generator.config.json`** with your namespace:

```json
{
  "generator": {
    "namespace": "YourAppName",
    "displayName": "Your Application",
    "paths": {
      "templates": "./templates",
      "output": "../src",
      "swagger": "./swagger.json"
    }
  }
}
```

2. **Template paths will generate as:**
   - `src/api/{Namespace}/Clients/`
   - `src/api/{Namespace}/Models/`
   - `src/api/{Namespace}/Schema/`
   - `src/components/{Namespace}/`
   - `src/pages/{Namespace}/`

3. **Configure navigation in your app:**

```typescript
import { configureNavigation } from '@/utils/navigation';

configureNavigation({
  namespace: 'YourAppName',
  routePrefix: '/app',
  apiBaseUrl: '/api',
  useReactRouter: true,
});
```

## Quick Start

### 1. Install Dependencies

```bash
# Bash (Linux/Mac)
./scripts/install.sh

# Windows
scripts\install.bat

# Or manually
npm install primereact primeflex primeicons zod react-hook-form react-router-dom
```

### 2. Copy Runtime Files

```bash
# Bash
./scripts/copy-runtime.sh ./src

# Windows
scripts\copy-runtime.bat .\src
```

### 3. Configure Your Generator

Update your .NET generator to use templates from `templates/` and configure the namespace in `generator.config.json`.

### 4. Generate Code

```bash
cd TypeScriptGenerator
dotnet run
npm run build  # Verify
```

## Project Structure

```
template-project/
├── README.md                    # This file
├── generator.config.json        # Namespace and generation settings
├── package.json.example         # NPM dependencies reference
├── vite.config.example.ts       # Vite configuration example
├── tsconfig.example.json        # TypeScript config example
│
├── templates/                   # Handlebars templates (55 files)
│   ├── _common/                 # Shared partials
│   ├── _helpers/                # Client/factory templates
│   ├── api/{Namespace}/         # API layer templates
│   │   ├── Clients/             # HTTP client classes
│   │   ├── Models/              # TypeScript interfaces
│   │   └── Schema/              # Zod schemas
│   ├── components/{Namespace}/  # Component templates
│   │   ├── _Entity_/            # Per-entity components
│   │   ├── componentRegistry.ts.hbs
│   │   └── index.tsx.hbs
│   └── pages/{Namespace}/       # Page templates
│       ├── _Entity_/            # List/Edit pages
│       └── Routes.tsx.hbs
│
├── runtime/                     # Runtime dependencies (32 files)
│   ├── components/ui/prime/     # Base UI components
│   │   ├── GenericGrid/         # SimpleGenericGrid, FilterSidebar
│   │   └── EntityForm/          # EntityPage, BasePropertyEditor
│   ├── utils/
│   │   ├── schemaBasedColumnBuilder.tsx
│   │   ├── zodSchemaHelper.tsx
│   │   ├── masterDataCache.ts
│   │   ├── navigation.ts        # Navigation utilities
│   │   ├── menuBuilder.ts       # Menu generation
│   │   └── routeBuilder.ts      # Route generation
│   ├── hooks/
│   │   ├── useCachedApiCall.ts
│   │   └── usePermissions.ts
│   └── types/
│       └── roles.ts
│
├── docs/                        # Documentation (6 files)
│   ├── ARCHITECTURE.md          # System architecture
│   ├── API_CONTRACT.md          # Backend API requirements
│   ├── SCHEMA_METADATA.md       # x-* extensions reference
│   ├── TEMPLATE_GUIDE.md        # Template customization
│   ├── INTEGRATION.md           # Step-by-step integration
│   └── GENERATOR_CONFIG.md      # Generator setup
│
└── scripts/                     # Helper scripts (6 files)
    ├── install.sh / install.bat
    ├── verify.sh / verify.bat
    └── copy-runtime.sh / copy-runtime.bat
```

## Documentation for Teams

### For Backend/API Teams

**Read: `docs/API_CONTRACT.md`**

Defines the API contract including:
- Required response formats (pagination, errors)
- Required swagger extensions (`x-navigation-target`, etc.)
- Query/filter operator support
- CRUD endpoint patterns
- Authentication requirements

### For Frontend Teams

**Read: `docs/INTEGRATION.md`**

Step-by-step integration guide covering:
- NPM package installation
- PrimeReact setup
- Authentication hook configuration
- Route and menu setup

### For Template Maintainers

**Read: `docs/TEMPLATE_GUIDE.md`**

Template customization including:
- Handlebars helpers available
- Adding custom renderers
- Creating new component types

## Navigation & Routing Utilities

### Navigation Configuration

```typescript
// src/main.tsx or App.tsx
import { configureNavigation } from '@/utils/navigation';

configureNavigation({
  namespace: 'MyApp',
  routePrefix: '/admin',
  apiBaseUrl: '/api/v1',
  useReactRouter: true,
});
```

### Menu Builder

```typescript
import { buildEntityMenuItems, filterMenuByRole } from '@/utils/menuBuilder';

// Define entity menu configurations
const entityConfigs = [
  { entityName: 'QueryProductModel', label: 'Products', icon: 'pi pi-box', group: 'Catalog' },
  { entityName: 'QueryCategoryModel', label: 'Categories', icon: 'pi pi-tags', group: 'Catalog' },
  { entityName: 'QueryUserModel', label: 'Users', icon: 'pi pi-users', group: 'Admin', requiredRoles: ['Super Admin'] },
];

// Build menu items
const menuItems = buildEntityMenuItems(entityConfigs);

// Filter by user role
const visibleItems = filterMenuByRole(menuItems, currentUserRole);
```

### Route Builder

```typescript
import { buildAllEntityRoutes, buildComponentMap } from '@/utils/routeBuilder';

const entityConfigs = [
  { entityName: 'QueryProductModel', label: 'Product' },
  { entityName: 'QueryCategoryModel', label: 'Category', readOnly: true },
];

const componentMap = buildComponentMap('MyApp', ['QueryProductModel', 'QueryCategoryModel']);
const routes = buildAllEntityRoutes(entityConfigs, componentMap);

// Use with React Router
<Routes>
  {routes.map(route => (
    <Route key={route.path} path={route.path} element={route.element} />
  ))}
</Routes>
```

## Required NPM Packages

### Core Dependencies

```json
{
  "dependencies": {
    "primereact": "^10.9.6",
    "primeflex": "^4.0.0",
    "primeicons": "^7.0.0",
    "zod": "^4.0.0",
    "react-hook-form": "^7.62.0",
    "@hookform/resolvers": "^5.2.1",
    "react-router-dom": "^7.8.0",
    "react": "^18.0.0 || ^19.0.0",
    "react-dom": "^18.0.0 || ^19.0.0"
  }
}
```

### Optional Dependencies

```json
{
  "optionalDependencies": {
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz",
    "classnames": "^2.5.1"
  }
}
```

## Generated Component Types

### 1. ComboBox Components

```typescript
<QueryProductModelComboBox
  value={productId}
  onChange={setProductId}
  variant="active"              // Filter by variant
  parentEntityId={categoryId}   // Parent filtering
  parentEntityFieldName="categoryId"
/>
```

### 2. MultiSelect Components

```typescript
<QueryCategoryModelMultiSelect
  value={categoryIds}
  onChange={setCategoryIds}
  maxSelectedLabels={3}
/>
```

### 3. DataGrid Components

```typescript
<QueryProductModelData
  title="Product Management"
  enableCreate={true}
  enableBulkSelection={true}
  onCreateClick={() => navigate('/products/new')}
/>
```

### 4. PropertyEditor Components

```typescript
<QueryProductModelPropertyEditor
  formData={product}
  onChange={handleFieldChange}
  mode="edit"  // 'create' | 'edit' | 'view'
/>
```

## Swagger Extensions Summary

**Required by Backend Teams** (see `docs/API_CONTRACT.md`):

| Extension | Purpose | Example |
|-----------|---------|---------|
| `x-navigation-key` | Mark primary key | `"x-navigation-key": true` |
| `x-navigation-target` | FK target model | `"x-navigation-target": "App.Models.QueryCategoryModel"` |
| `x-navigation-relation` | Display field for FK | `"x-navigation-relation": "categoryId"` |
| `x-label` | Field/column label | `"x-label": "Product Name"` |

**Optional but Recommended**:

| Extension | Purpose |
|-----------|---------|
| `x-display-value` | Mark display name field |
| `x-field-set` | Group form fields |
| `x-hidden-column` | Hide from grid |
| `x-custom-renderer` | Custom cell renderer |
| `x-combobox-variants` | Filtered dropdown variants |
| `x-bulk-actions` | Enable bulk actions |

## Checklist for New Projects

- [ ] Copy `template-project/` to your project
- [ ] Update `generator.config.json` with your namespace
- [ ] Run `scripts/install.sh` to install npm packages
- [ ] Run `scripts/copy-runtime.sh` to copy runtime files
- [ ] Configure `usePermissions.ts` with your auth system
- [ ] Configure `navigation.ts` with your namespace
- [ ] Set up PrimeReact in your app entry point
- [ ] Give `docs/API_CONTRACT.md` to your backend team
- [ ] Run your generator with `swagger.json`
- [ ] Verify with `npm run build`

## Support

| Document | Purpose |
|----------|---------|
| `docs/API_CONTRACT.md` | Backend team requirements |
| `docs/INTEGRATION.md` | Frontend integration guide |
| `docs/SCHEMA_METADATA.md` | Complete x-* extension reference |
| `docs/TEMPLATE_GUIDE.md` | Template customization |
| `docs/GENERATOR_CONFIG.md` | Generator setup |
