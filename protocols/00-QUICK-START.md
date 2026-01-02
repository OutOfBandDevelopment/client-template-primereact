# Quick Start Protocol

## Overview

This document provides a quick reference for integrating the TypeScript code generator templates into a new React project.

## Prerequisites

- Node.js 18+ and npm 9+
- React 18+ or 19+
- TypeScript 5+
- .NET 8+ (for running the generator)

## Integration Steps (Summary)

| Step | Protocol | Time |
|------|----------|------|
| 1 | [Project Setup](./01-PROJECT-SETUP.md) | 15 min |
| 2 | [API Client Setup](./07-API-CLIENT-SETUP.md) | 10 min |
| 3 | [Run Generator](./01-PROJECT-SETUP.md#run-generator) | 5 min |
| 4 | [Navigation & Routing](./06-NAVIGATION-ROUTING.md) | 20 min |
| 5 | [Permissions Setup](./08-PERMISSIONS-ROLES.md) | 15 min |

## Minimal Integration Checklist

```
[ ] 1. Install dependencies
      npm install primereact primeflex primeicons zod react-hook-form @hookform/resolvers react-router-dom

[ ] 2. Copy runtime files
      ./scripts/copy-runtime.sh ./src

[ ] 3. Configure namespace in generator.config.json
      { "generator": { "namespace": "YourAppName" } }

[ ] 4. Setup PrimeReact in main.tsx
      import { PrimeReactProvider } from 'primereact/api';
      <PrimeReactProvider><App /></PrimeReactProvider>

[ ] 5. Configure navigation
      import { configureNavigation } from '@/utils/navigation';
      configureNavigation({ namespace: 'YourAppName', routePrefix: '/app' });

[ ] 6. Provide swagger.json to generator
      cp your-api-swagger.json ./swagger.json

[ ] 7. Run generator
      cd TypeScriptGenerator && dotnet run

[ ] 8. Verify build
      npm run build
```

## Component Quick Reference

| Component | Use Case | Protocol |
|-----------|----------|----------|
| ComboBox | Single FK selection | [02-COMBOBOX](./02-COMBOBOX-INTEGRATION.md) |
| MultiSelect | Multiple FK selection | [03-MULTISELECT](./03-MULTISELECT-INTEGRATION.md) |
| DataGrid | Table with CRUD | [04-DATAGRID](./04-DATAGRID-INTEGRATION.md) |
| EntityForm | Create/Edit forms | [05-ENTITYFORM](./05-ENTITYFORM-INTEGRATION.md) |

## Swagger Extensions Quick Reference

| Extension | Purpose | Required |
|-----------|---------|----------|
| `x-navigation-key` | Mark primary key field | Yes |
| `x-navigation-target` | FK relationship target | Yes (for FKs) |
| `x-label` | Display label | Recommended |
| `x-hidden-column` | Hide from grid | Optional |
| `x-field-set` | Group form fields | Optional |

See [SCHEMA_METADATA.md](../docs/SCHEMA_METADATA.md) for complete list.

## Common Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module '@/api/...'" | Run generator, check namespace config |
| "PrimeReactProvider not found" | Wrap app in PrimeReactProvider |
| "usePermissions undefined" | Configure AuthContext integration |
| Build fails after generation | Check for TypeScript errors in generated code |

See [Troubleshooting](./09-TROUBLESHOOTING.md) for detailed solutions.
