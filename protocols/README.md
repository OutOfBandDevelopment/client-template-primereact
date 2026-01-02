# Integration Protocols

Step-by-step guides for integrating TypeScript generator templates into your React project.

## Quick Reference

| Protocol | Purpose | Time Estimate |
|----------|---------|---------------|
| [00-QUICK-START](./00-QUICK-START.md) | Overview and checklist | 5 min read |
| [01-PROJECT-SETUP](./01-PROJECT-SETUP.md) | Initial project configuration | 15-30 min |
| [02-COMBOBOX-INTEGRATION](./02-COMBOBOX-INTEGRATION.md) | Single-select FK dropdowns | 10 min |
| [03-MULTISELECT-INTEGRATION](./03-MULTISELECT-INTEGRATION.md) | Multi-select FK dropdowns | 10 min |
| [04-DATAGRID-INTEGRATION](./04-DATAGRID-INTEGRATION.md) | Data tables with CRUD | 15 min |
| [05-ENTITYFORM-INTEGRATION](./05-ENTITYFORM-INTEGRATION.md) | Create/Edit/View forms | 20 min |
| [06-NAVIGATION-ROUTING](./06-NAVIGATION-ROUTING.md) | Routes and menus | 20 min |
| [07-API-CLIENT-SETUP](./07-API-CLIENT-SETUP.md) | API client configuration | 10 min |
| [08-PERMISSIONS-ROLES](./08-PERMISSIONS-ROLES.md) | Role-based access control | 15 min |
| [09-TROUBLESHOOTING](./09-TROUBLESHOOTING.md) | Common issues and fixes | Reference |

## Recommended Reading Order

### New Project Setup
1. [00-QUICK-START](./00-QUICK-START.md) - Get the overview
2. [01-PROJECT-SETUP](./01-PROJECT-SETUP.md) - Install and configure
3. [07-API-CLIENT-SETUP](./07-API-CLIENT-SETUP.md) - Connect to backend
4. [06-NAVIGATION-ROUTING](./06-NAVIGATION-ROUTING.md) - Setup routes
5. [08-PERMISSIONS-ROLES](./08-PERMISSIONS-ROLES.md) - Add access control

### Component Integration
1. [04-DATAGRID-INTEGRATION](./04-DATAGRID-INTEGRATION.md) - List pages
2. [05-ENTITYFORM-INTEGRATION](./05-ENTITYFORM-INTEGRATION.md) - Edit pages
3. [02-COMBOBOX-INTEGRATION](./02-COMBOBOX-INTEGRATION.md) - FK fields
4. [03-MULTISELECT-INTEGRATION](./03-MULTISELECT-INTEGRATION.md) - Multi-select fields

## Protocol Conventions

Each protocol follows a consistent structure:

1. **Overview** - What the component/feature does
2. **Generated Location** - Where to find generated files
3. **Basic Usage** - Minimal working example
4. **Props Reference** - Complete API documentation
5. **Advanced Patterns** - Complex use cases
6. **Troubleshooting** - Common issues
7. **Related Protocols** - Links to related docs

## Key Concepts

### Namespace
All generated code uses a configurable namespace (default: `GreenOnion`). Configure in `generator.config.json`:

```json
{
  "generator": {
    "namespace": "YourAppName"
  }
}
```

### Swagger Extensions
Templates are driven by OpenAPI `x-*` extensions. See [SCHEMA_METADATA.md](../docs/SCHEMA_METADATA.md) for complete reference.

### Runtime Dependencies
The `runtime/` folder contains base components that generated code depends on. Copy these before running the generator.

## Getting Help

1. Check [09-TROUBLESHOOTING](./09-TROUBLESHOOTING.md) for common issues
2. Review [../docs/](../docs/) for detailed documentation
3. Verify build with `npm run build`
