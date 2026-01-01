# Namespace Configuration Guide

This document explains how to configure the namespace for your project.

## Overview

The templates use a **configurable namespace** that replaces the default `GreenOnion`. The namespace appears in:

1. **Folder paths**: `src/api/{Namespace}/`, `src/components/{Namespace}/`, `src/pages/{Namespace}/`
2. **Import statements**: `import ... from '@/api/{Namespace}/...'`
3. **Component names**: Cache keys, registry entries, etc.

## Generator Configuration

### 1. Update `generator.config.json`

```json
{
  "generator": {
    "namespace": "YourAppName",
    "displayName": "Your Application Name"
  }
}
```

### 2. Generator Implementation

Your .NET generator should:

1. **Read the namespace** from config
2. **Replace folder names**: When outputting files, replace `GreenOnion` in paths with your namespace
3. **Provide `@namespace` variable** to all templates

**Example C# Implementation:**

```csharp
public class GeneratorConfig
{
    public string Namespace { get; set; } = "GreenOnion";
    public string DisplayName { get; set; } = "Application";
}

public class CodeGenerator
{
    private readonly GeneratorConfig _config;

    public void GenerateFile(string templatePath, string outputPath, object context)
    {
        // Replace namespace in output path
        var finalPath = outputPath.Replace("GreenOnion", _config.Namespace);

        // Add namespace to template context
        var templateContext = new
        {
            // ... other context
            @namespace = _config.Namespace,
            @displayName = _config.DisplayName,
        };

        // Render and write
        var content = RenderTemplate(templatePath, templateContext);
        File.WriteAllText(finalPath, content);
    }
}
```

## Template Variables

The generator must provide these namespace-related variables:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `@namespace` | string | API namespace | `"MyApp"` |
| `@displayName` | string | Display name | `"My Application"` |

## File Path Mappings

| Template Path | Output Path |
|---------------|-------------|
| `templates/api/GreenOnion/...` | `src/api/{Namespace}/...` |
| `templates/components/GreenOnion/...` | `src/components/{Namespace}/...` |
| `templates/pages/GreenOnion/...` | `src/pages/{Namespace}/...` |

## Import Path Updates

Templates contain import statements like:

```typescript
import { Something } from '@/api/GreenOnion/...';
import { Component } from '@/components/GreenOnion/...';
```

The generator should either:

### Option A: Template Variable (Recommended)

Templates use `{{@namespace}}`:

```handlebars
import { Something } from '@/api/{{@namespace}}/...';
```

### Option B: Post-Processing

Generator does find-and-replace after rendering:

```csharp
content = content.Replace("@/api/GreenOnion", $"@/api/{config.Namespace}");
content = content.Replace("@/components/GreenOnion", $"@/components/{config.Namespace}");
content = content.Replace("@/pages/GreenOnion", $"@/pages/{config.Namespace}");
```

## Current Template References

These templates contain hardcoded `GreenOnion` references that need updating:

### API Layer
- `api/GreenOnion/Clients/*.hbs`
- `api/GreenOnion/Models/*.hbs`
- `api/GreenOnion/Schema/*.hbs`
- `api/GreenOnion.Index.ts.hbs`

### Components Layer
- `components/GreenOnion/_Entity_/*.hbs`
- `components/GreenOnion/componentRegistry.ts.hbs`
- `components/GreenOnion/index.tsx.hbs`

### Pages Layer
- `pages/GreenOnion/_Entity_/List/index.tsx.hbs`
- `pages/GreenOnion/_Entity_/Edit/index.tsx.hbs`
- `pages/GreenOnion/Routes.tsx.hbs`
- `pages/GreenOnion/Demo/*.hbs`

## Quick Reference: Search & Replace

If manually updating templates, search and replace:

| Find | Replace With |
|------|--------------|
| `GreenOnion` (in paths) | `{{@namespace}}` |
| `@/api/GreenOnion` | `@/api/{{@namespace}}` |
| `@/components/GreenOnion` | `@/components/{{@namespace}}` |
| `@/pages/GreenOnion` | `@/pages/{{@namespace}}` |

## Folder Structure After Configuration

```
src/
├── api/
│   └── YourAppName/           # Configured namespace
│       ├── Clients/
│       ├── Models/
│       └── Schema/
├── components/
│   └── YourAppName/
│       ├── QueryProductModel/
│       ├── QueryCategoryModel/
│       ├── componentRegistry.ts
│       └── index.tsx
└── pages/
    └── YourAppName/
        ├── QueryProductModel/
        │   ├── List/
        │   └── Edit/
        └── Routes.tsx
```

## Migration from Existing Project

If you have an existing project with `GreenOnion`:

```bash
# Rename folders
mv src/api/GreenOnion src/api/YourAppName
mv src/components/GreenOnion src/components/YourAppName
mv src/pages/GreenOnion src/pages/YourAppName

# Update imports (using sed or IDE find/replace)
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|@/api/GreenOnion|@/api/YourAppName|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|@/components/GreenOnion|@/components/YourAppName|g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|@/pages/GreenOnion|@/pages/YourAppName|g'
```
