# Template Project Maintenance Protocol

This document provides guidance for maintaining and evolving the TypeScript code generator template project.

## Overview

The template project contains Handlebars templates that generate React components, API clients, and page structures. Proper maintenance ensures generated code remains consistent and up-to-date with project standards.

---

## Directory Structure

```
template-project/
├── templates/              # Handlebars template files
│   ├── components/         # UI component templates
│   ├── pages/              # Page component templates
│   ├── api/                # API client templates
│   └── _common/            # Shared partial templates
├── runtime/                # Runtime utilities included in output
├── protocols/              # Integration protocols
├── docs/                   # Template documentation
├── scripts/                # Build and validation scripts
└── generator.config.json   # Generator configuration
```

---

## Maintenance Tasks

### 1. Adding New Templates

#### Steps

1. **Create the template file** in the appropriate directory:
   ```
   templates/components/NewComponent.tsx.hbs
   ```

2. **Define required context variables** in a comment header:
   ```handlebars
   {{!--
     Required context:
     - @entityName: string
     - @namespace: string
     - model: object with properties
   --}}
   ```

3. **Use namespace variable** for imports:
   ```handlebars
   import { {{@entityName}} } from '@/api/{{@namespace}}/Schema/{{@entityName}}';
   ```

4. **Add to generator.config.json** if needed:
   ```json
   {
     "templates": {
       "NewComponent": {
         "source": "templates/components/NewComponent.tsx.hbs",
         "output": "src/components/{{@namespace}}/{{@entityName}}/NewComponent.tsx"
       }
     }
   }
   ```

5. **Document the template** in `docs/templates/`

6. **Create integration protocol** in `protocols/` if applicable

#### Checklist

- [ ] Template uses `{{@namespace}}` for all namespace references
- [ ] No hardcoded paths or entity names
- [ ] Proper TypeScript types in output
- [ ] Exports are properly named
- [ ] Documentation updated

### 2. Modifying Existing Templates

#### Before Making Changes

1. **Identify all consumers** of the template
2. **Review generated output** to understand current behavior
3. **Check for breaking changes** in the modification
4. **Plan migration path** if breaking changes are necessary

#### Change Process

1. **Create a branch** for the template change
2. **Make modifications** to the template
3. **Regenerate affected files** and verify output
4. **Run build verification**: `npm run build`
5. **Test generated components** in the application
6. **Update documentation** to reflect changes
7. **Update protocols** if integration steps changed

#### Breaking Change Protocol

If changes affect template consumers:

1. Document the breaking change in `CHANGELOG.md`
2. Update all affected protocols
3. Provide migration guidance
4. Consider versioning the template

### 3. Template Variable Management

#### Adding New Variables

1. **Define in generator config**:
   ```json
   {
     "variables": {
       "newVariable": "value"
     }
   }
   ```

2. **Document usage** in `docs/variables.md`

3. **Use consistently** with `@` prefix in templates

#### Standard Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `@namespace` | Project namespace | `GreenOnion` |
| `@entityName` | Entity model name | `Manufacturer` |
| `@entityInterface` | Full interface name | `IQueryManufacturerModel` |
| `@primaryKey` | Primary key field | `manufacturerId` |

### 4. Runtime Utilities

#### Adding New Utilities

1. **Create utility file** in `runtime/`:
   ```
   runtime/newUtility.ts
   ```

2. **Follow existing patterns** for exports

3. **Add to runtime index** for bundling

4. **Document in runtime README**

#### Updating Utilities

1. Maintain backward compatibility when possible
2. Version utilities if breaking changes needed
3. Update all templates that consume the utility

---

## Quality Assurance

### Template Validation

Run before committing changes:

```bash
# Verify no hardcoded namespaces
grep -r "GreenOnion" templates/ --include="*.hbs"

# Verify variable usage
grep -r "{{@namespace}}" templates/ --include="*.hbs"

# Lint templates (if configured)
npm run lint:templates
```

### Generated Code Validation

After regeneration:

```bash
# TypeScript compilation
npm run build

# Lint generated code
npm run lint

# Run tests
npm test
```

### Integration Testing

1. Generate sample components
2. Verify imports resolve
3. Test component rendering
4. Verify API client functionality

---

## Documentation Standards

### Template Documentation

Each template should have:

1. **Header comment** explaining purpose
2. **Context variables** listed
3. **Usage examples** in docs
4. **Integration protocol** reference

### Protocol Updates

When templates change:

1. Review all related protocols
2. Update step-by-step instructions
3. Update code examples
4. Verify protocol accuracy

---

## Version Control

### Commit Messages

```
feat(templates): Add new ComboBox variant support
fix(templates): Correct import path for schema
docs(templates): Update DataGrid integration protocol
```

### Branching Strategy

- `main`: Stable templates
- `feature/*`: New template development
- `fix/*`: Template bug fixes
- `docs/*`: Documentation updates

### Release Process

1. Update `CHANGELOG.md`
2. Bump version in `package.json`
3. Tag release
4. Update migration guides if needed

---

## Troubleshooting

### Common Issues

#### Template Not Generating

- Check `generator.config.json` includes template
- Verify template path is correct
- Check for Handlebars syntax errors

#### Import Errors in Generated Code

- Verify `{{@namespace}}` usage
- Check relative path calculations
- Ensure runtime utilities are exported

#### Type Errors in Generated Code

- Review type annotations in template
- Check model property access
- Verify interface names match

### Debug Process

1. Enable generator debug logging
2. Inspect intermediate output
3. Verify context variables
4. Check Handlebars helper output

---

## Contacts and Resources

### Documentation

- Template Reference: `docs/templates/`
- Integration Protocols: `protocols/`
- Variable Guide: `docs/variables.md`

### Related Projects (Siblings)

| Project | Path | Description |
|---------|------|-------------|
| TypeScript Generator | `../TypeScriptGenerator/` | .NET generator that processes templates |
| Generated Output | `../src/components/{Namespace}/` | Where generated code lands |
| Schema Source | `../swagger.json` | OpenAPI source for generation |

### Related Template Projects

These are sibling projects in the same directory:

| Project | Description |
|---------|-------------|
| `client-design-guide/` | UX patterns and architectural guidance |
| `client-impersonation-react/` | Role impersonation template |

Each project is standalone and can be used independently.
