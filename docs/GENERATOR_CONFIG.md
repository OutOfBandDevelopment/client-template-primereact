# Generator Configuration Reference

This document describes how to configure the .NET TypeScript Generator to use these templates.

## Generator Overview

The TypeScript Generator is a .NET console application that:

1. Reads your OpenAPI/Swagger specification (`swagger.json`)
2. Parses entity definitions and metadata
3. Applies Handlebars templates
4. Outputs TypeScript files to your React project

## Required Generator Components

Your generator needs these key components:

### 1. Swagger Parser

Reads and parses the OpenAPI specification:

```csharp
public class SwaggerParser
{
    public SwaggerDocument Parse(string jsonPath)
    {
        var json = File.ReadAllText(jsonPath);
        return JsonSerializer.Deserialize<SwaggerDocument>(json);
    }
}
```

### 2. Template Engine

Compiles and renders Handlebars templates:

```csharp
using HandlebarsDotNet;

public class TemplateEngine
{
    private readonly IHandlebars _handlebars;

    public TemplateEngine()
    {
        _handlebars = Handlebars.Create();
        RegisterHelpers();
    }

    private void RegisterHelpers()
    {
        // if-eq helper
        _handlebars.RegisterHelper("if-eq", (writer, context, args) => {
            if (args.Length >= 2 && args[0]?.ToString() == args[1]?.ToString())
                return true;
            return false;
        });

        // if-any helper
        _handlebars.RegisterHelper("if-any", (writer, context, args) => {
            var value = args[0]?.ToString();
            for (int i = 1; i < args.Length; i++)
            {
                if (value == args[i]?.ToString())
                    return true;
            }
            return false;
        });

        // Add more helpers as needed...
    }

    public string Render(string template, object context)
    {
        var compiled = _handlebars.Compile(template);
        return compiled(context);
    }
}
```

### 3. Code Generator

Orchestrates the generation process:

```csharp
public class CodeGenerator
{
    private readonly TemplateEngine _templateEngine;
    private readonly string _templatesPath;
    private readonly string _outputPath;

    public void Generate(SwaggerDocument swagger)
    {
        foreach (var schema in swagger.Components.Schemas)
        {
            var context = BuildContext(schema);

            // Generate component files
            GenerateFile("components/GreenOnion/_Entity_/ComboBox.tsx.hbs", context);
            GenerateFile("components/GreenOnion/_Entity_/MultiSelect.tsx.hbs", context);
            GenerateFile("components/GreenOnion/_Entity_/DataGrid.tsx.hbs", context);
            // etc...
        }
    }

    private object BuildContext(SchemaDefinition schema)
    {
        return new
        {
            entityNameSimple = schema.Name,
            entityNameFull = schema.FullName,
            entityInterface = "I" + schema.Name,
            clientName = GetClientName(schema.Name),
            idProperty = FindIdProperty(schema),
            valueProperty = FindValueProperty(schema),
            def = schema,
            // etc...
        };
    }
}
```

## Template Context Variables

The generator must provide these variables to templates:

### Entity Information

| Variable | Type | Description |
|----------|------|-------------|
| `@entityNameSimple` | string | Entity name without namespace |
| `@entityNameFull` | string | Full entity name with namespace |
| `@entityInterface` | string | Interface name (I + entity name) |
| `@clientName` | string | API client class name |

### Property Information

| Variable | Type | Description |
|----------|------|-------------|
| `@idProperty` | string | Primary key property name |
| `@valueProperty` | string | Display value property name |
| `@cacheKey` | string | Cache key identifier |

### API Information

| Variable | Type | Description |
|----------|------|-------------|
| `@uri` | string | API endpoint path |
| `@httpMethod` | string | HTTP method |

### Definition Object

| Variable | Type | Description |
|----------|------|-------------|
| `@def` | object | Full schema definition |
| `@def.properties` | object | Property definitions |
| `@def.x-*` | any | Metadata extensions |

## Required Handlebars Helpers

### Comparison Helpers

```csharp
// if-eq: Equality comparison
{{#if-eq value "literal"}}...{{/if-eq}}

// if-any: Match any value
{{#if-any value "a" "b" "c"}}...{{/if-any}}

// if-or: Logical OR
{{#if-or cond1 cond2}}...{{/if-or}}

// compare: Numeric comparison
{{#if (compare num ">" 100)}}...{{/if}}
```

### String Helpers

```csharp
// if-starts: String prefix check
{{#if-starts str "prefix"}}...{{/if-starts}}

// if-ends: String suffix check
{{#if-ends str "suffix"}}...{{/if-ends}}

// concat: String concatenation
{{concat str1 str2}}

// lookup: Dynamic property access
{{lookup object "key"}}
```

### Block Helpers

```csharp
// import: Include partial template
{{ import "_common/file_header.ts" }}

// builder / builder-set: Build complex output
{{#builder "output"}}
  {{builder-set "key" "value"}}
{{/builder}}
```

## File Output Mapping

Templates map to output files:

| Template | Output Path |
|----------|-------------|
| `components/GreenOnion/_Entity_/ComboBox.tsx.hbs` | `src/components/GreenOnion/{EntityName}/ComboBox.tsx` |
| `components/GreenOnion/_Entity_/DataGrid.tsx.hbs` | `src/components/GreenOnion/{EntityName}/DataGrid.tsx` |
| `api/GreenOnion/Clients/{Entity}Client.ts.hbs` | `src/api/GreenOnion/Clients/{EntityName}Client.ts` |
| `api/GreenOnion/Schema/{Entity}Schema.ts.hbs` | `src/api/GreenOnion/Schema/Z{EntityName}.ts` |

## Entity Filtering

Not all schemas should generate components. Filter based on:

```csharp
bool ShouldGenerateComponents(SchemaDefinition schema)
{
    // Only Query* models get components
    if (!schema.Name.StartsWith("Query"))
        return false;

    // Skip not-selectable models for ComboBox/MultiSelect
    if (schema.Metadata.ContainsKey("x-not-selectable"))
        return false;

    return true;
}
```

## Generation Order

Generate files in dependency order:

1. **Models** - TypeScript interfaces
2. **Schemas** - Zod validation schemas
3. **Schema Registry** - Schema lookup
4. **Clients** - API client classes
5. **Client Index** - Client exports
6. **Components** - React components
7. **Component Registry** - Lazy loading registry
8. **Component Index** - Component exports
9. **Pages** - List/Edit pages
10. **Routes** - React Router config

## Sample Configuration File

```json
{
  "generator": {
    "templatesPath": "./templates",
    "outputPath": "../src",
    "swaggerPath": "./swagger.json",
    "namespace": "GreenOnion",
    "entities": {
      "include": ["Query*"],
      "exclude": ["*SearchQuery", "*Filter", "*OrderBy"]
    },
    "components": {
      "combobox": true,
      "multiselect": true,
      "datagrid": true,
      "propertyeditor": true,
      "entityform": true
    },
    "pages": {
      "list": true,
      "edit": true,
      "routes": true
    }
  }
}
```

## Build Integration

Add generator to your build process:

```json
// package.json
{
  "scripts": {
    "generate": "cd TypeScriptGenerator && dotnet run",
    "build": "npm run generate && vite build"
  }
}
```

## Validation

After generation, validate the output:

```bash
# Type check
npm run typecheck

# Build
npm run build
```

If errors occur:
1. Check template syntax
2. Verify context variables
3. Review generated file for missing imports
