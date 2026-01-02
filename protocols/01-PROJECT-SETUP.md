# Project Setup Protocol

## Phase 1: Install Dependencies

### Required Packages

```bash
# Core UI Framework
npm install primereact primeflex primeicons

# Form Management
npm install react-hook-form @hookform/resolvers zod

# Routing
npm install react-router-dom
```

### Optional Packages

```bash
# Excel export support
npm install xlsx@https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz

# CSS utilities
npm install classnames
```

### Verify Installation

```bash
./scripts/verify.sh
# or on Windows
scripts\verify.bat
```

## Phase 2: Copy Runtime Files

The runtime folder contains base components and utilities required by generated code.

```bash
# Copy to your src folder
./scripts/copy-runtime.sh ./src

# Verify files exist
ls -la src/components/ui/prime/
ls -la src/utils/
ls -la src/hooks/
```

### Runtime Files Copied

| Destination | Contents |
|-------------|----------|
| `src/components/ui/prime/GenericGrid/` | SimpleGenericGrid, FilterSidebar, etc. |
| `src/components/ui/prime/EntityForm/` | BaseEntityForm, EntityPage, etc. |
| `src/utils/` | navigation, menuBuilder, routeBuilder, etc. |
| `src/hooks/` | useCachedApiCall, usePermissions |
| `src/types/` | roles.ts |

## Phase 3: Configure Namespace

Edit `generator.config.json`:

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

### Namespace Affects

- Output folder structure: `src/api/{namespace}/`, `src/components/{namespace}/`
- Import paths in generated code: `@/api/{namespace}/...`
- Route paths: `/{namespace}/{Entity}/List`

## Phase 4: Setup PrimeReact

In your `src/main.tsx` or `src/index.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { PrimeReactProvider } from 'primereact/api';
import App from './App';

// PrimeReact styles
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrimeReactProvider>
      <App />
    </PrimeReactProvider>
  </React.StrictMode>
);
```

## Phase 5: Configure Navigation

In your app initialization (e.g., `App.tsx`):

```typescript
import { configureNavigation } from '@/utils/navigation';

// Configure before rendering routes
configureNavigation({
  namespace: 'YourAppName',
  routePrefix: '/app',          // Base path for all entity routes
  apiBaseUrl: '/api',           // API base URL
  useReactRouter: true,         // Use React Router for navigation
});
```

## Phase 6: Prepare Swagger File

1. Export your API's OpenAPI/Swagger specification
2. Ensure required extensions are present (see [API_CONTRACT.md](../docs/API_CONTRACT.md))
3. Copy to generator directory:

```bash
cp path/to/your-swagger.json ./swagger.json
```

### Minimum Swagger Requirements

```json
{
  "components": {
    "schemas": {
      "QueryYourEntityModel": {
        "type": "object",
        "x-query-model": true,
        "properties": {
          "entityId": {
            "type": "integer",
            "x-navigation-key": true,
            "x-label": "ID"
          },
          "entityName": {
            "type": "string",
            "x-display-value": true,
            "x-label": "Name"
          }
        }
      }
    }
  }
}
```

## Phase 7: Run Generator

```bash
cd TypeScriptGenerator
dotnet run
```

### Expected Output Structure

```
src/
├── api/{Namespace}/
│   ├── Clients/          # API client classes
│   ├── Models/           # TypeScript interfaces
│   └── Schema/           # Zod schemas
├── components/{Namespace}/
│   ├── {Entity}/         # Per-entity components
│   ├── componentRegistry.ts
│   └── index.tsx
└── pages/{Namespace}/
    ├── {Entity}/         # List/Edit pages
    └── Routes.tsx
```

## Phase 8: Verify Build

```bash
npm run build
```

### Common Build Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Cannot find '@/api/...' | Namespace mismatch | Check generator.config.json |
| Missing 'useCachedApiCall' | Runtime not copied | Run copy-runtime script |
| PrimeReact types missing | Outdated types | `npm install @types/primereact` |

## Next Steps

1. [Configure API Clients](./07-API-CLIENT-SETUP.md)
2. [Setup Navigation & Routing](./06-NAVIGATION-ROUTING.md)
3. [Configure Permissions](./08-PERMISSIONS-ROLES.md)
