# Template Customization Guide

## Template Structure

Templates use Handlebars syntax with custom helpers. Each template generates one file per entity.

### Directory Layout

```
templates/
├── _common/                    # Shared partials
│   ├── file_header.ts.hbs     # Standard file header
│   ├── schema-template.hbs    # Type mapping helpers
│   ├── entity-definition.hbs  # Entity info partial
│   └── get-entity-*.hbs       # Property helpers
├── _helpers/                   # Complex helpers
│   ├── ClientBase.ts.hbs      # Base API client
│   └── ClientFactory.ts.hbs   # Factory pattern
├── api/GreenOnion/
│   ├── Clients/
│   │   └── {Entity}Client.ts.hbs
│   ├── Models/
│   │   └── {Entity}Model.ts.hbs
│   └── Schema/
│       └── {Entity}Schema.ts.hbs
├── components/GreenOnion/
│   ├── _Entity_/
│   │   ├── ComboBox.tsx.hbs
│   │   ├── MultiSelect.tsx.hbs
│   │   ├── DataGrid.tsx.hbs
│   │   ├── PropertyEditor.tsx.hbs
│   │   ├── EntityForm.tsx.hbs
│   │   ├── FormSchema.ts.hbs
│   │   └── index.tsx.hbs
│   ├── componentRegistry.ts.hbs
│   └── index.tsx.hbs
└── pages/GreenOnion/
    ├── _Entity_/
    │   ├── List/index.tsx.hbs
    │   └── Edit/index.tsx.hbs
    └── Routes.tsx.hbs
```

## Available Handlebars Variables

### Global Variables (@ prefix)

| Variable | Description | Example |
|----------|-------------|---------|
| `@entityNameSimple` | Simple entity name | `QueryCategoryModel` |
| `@entityNameFull` | Full namespace | `GreenOnion.Models.QueryCategoryModel` |
| `@entityInterface` | Interface name | `IQueryCategoryModel` |
| `@clientName` | Client class name | `CategoryClient` |
| `@idProperty` | Primary key field | `categoryId` |
| `@valueProperty` | Display value field | `categoryName` |
| `@cacheKey` | Cache key identifier | `QueryCategory` |
| `@uri` | API endpoint | `/api/category` |
| `@httpMethod` | HTTP method | `POST` |
| `@def` | Entity definition object | `{ properties: {...} }` |

### Definition Object (`@def`)

| Property | Description |
|----------|-------------|
| `@def.properties` | All property definitions |
| `@def.x-label` | Entity display label |
| `@def.x-read-only` | Entity is read-only |
| `@def.x-not-creatable` | Disable create |
| `@def.x-combobox-variants` | Variant definitions |
| `@def.x-bulk-actions` | Enabled bulk actions |

## Custom Handlebars Helpers

### Conditionals

```handlebars
{{!-- Equality check --}}
{{#if-eq value "literal"}}...{{/if-eq}}

{{!-- Match any option --}}
{{#if-any value "opt1" "opt2"}}...{{/if-any}}

{{!-- Logical OR --}}
{{#if-or cond1 cond2}}...{{/if-or}}

{{!-- Numeric comparison --}}
{{#if (compare num ">" 100)}}...{{/if}}

{{!-- String prefix/suffix --}}
{{#if-starts str "prefix"}}...{{/if-starts}}
{{#if-ends str "suffix"}}...{{/if-ends}}
```

### String Manipulation

```handlebars
{{!-- Concatenation --}}
{{concat str1 str2}}

{{!-- Dynamic property access --}}
{{lookup object "key"}}

{{!-- Case conversion (if available) --}}
{{lowercase str}}
{{uppercase str}}
```

### Iteration

```handlebars
{{!-- Iterate properties --}}
{{#each @def.properties as |prop propName|}}
  Field: {{propName}}, Type: {{prop.type}}
{{/each}}

{{!-- With index --}}
{{#each items}}
  {{@index}}: {{this.name}}
{{/each}}
```

## Common Template Patterns

### 1. Conditional Field Rendering

```handlebars
{{#each @def.properties as |prop propName|}}
  {{#if prop.x-custom-renderer}}
    {{#if-any prop.x-custom-renderer "date"}}
      {{propName}}: {
        body: (rowData) => ColumnRenderers.date(rowData.{{propName}}),
      },
    {{/if-any}}
    {{#if-any prop.x-custom-renderer "boolean-tag"}}
      {{propName}}: {
        body: (rowData) => (
          <Tag
            severity={rowData.{{propName}} ? "success" : "secondary"}
            value={rowData.{{propName}} ? "Yes" : "No"}
          />
        ),
      },
    {{/if-any}}
  {{/if}}
{{/each}}
```

### 2. Variant Support

```handlebars
{{#if @def.x-combobox-variants}}
export type {{@entityNameSimple}}Variant = {{#each @def.x-combobox-variants}}'{{@key}}'{{#unless @last}} | {{/unless}}{{/each}};

const variantFilters = {
{{#each @def.x-combobox-variants}}
  '{{@key}}': {{#if this.filter}}{ ... }{{else}}null{{/if}},
{{/each}}
};
{{/if}}
```

### 3. Permission Checks

```handlebars
{{#if @def.x-permissions.role}}
const requiredRoles: UserRole[] = [
  {{#each @def.x-permissions.role}}
    '{{this}}' as UserRole,
  {{/each}}
];
{{/if}}
```

### 4. Import Generation

```handlebars
import {{@clientName}} from '@/api/GreenOnion/Clients/{{@clientName}}';
import type {
  {{@entityInterface}},
  {{@entityInterface}}SearchQuery,
  {{@entityInterface}}Filter,
  {{@entityInterface}}OrderBy,
} from '@/api/GreenOnion/Models';
```

### 5. Excluded Fields

```handlebars
excludeFields: [
  'createdOn', 'createdById', 'createdBy',
  'updatedOn', 'updatedById', 'updatedBy',
  {{#each @def.properties as |prop propName|}}
    {{#if prop.x-hidden-column}}
    '{{propName}}',
    {{/if}}
  {{/each}}
],
```

## Adding a New Component Template

1. **Create the template file:**

```handlebars
{{!-- components/GreenOnion/_Entity_/MyComponent.tsx.hbs --}}
{{ import "_common/file_header.ts" }}

import React from 'react';

export interface {{@entityNameSimple}}MyComponentProps {
  // Props here
}

export function {{@entityNameSimple}}MyComponent(props: {{@entityNameSimple}}MyComponentProps) {
  return (
    <div>My Component for {{@entityNameSimple}}</div>
  );
}

export default {{@entityNameSimple}}MyComponent;
```

2. **Add to entity index:**

Edit `components/GreenOnion/_Entity_/index.tsx.hbs`:

```handlebars
export { default as {{@entityNameSimple}}MyComponent } from './MyComponent';
```

3. **Update generator configuration** (in your .NET generator) to include the new template.

## Best Practices

### 1. Avoid Triple Braces

Add spacing to prevent `}}}` sequence:

```handlebars
{{!-- BAD --}}
${entity.{{@id}}}

{{!-- GOOD --}}
${ entity.{{@id}} }
```

### 2. Handle Optional Properties

Always check for undefined:

```handlebars
{{#if @valueProperty}}
  label: rowData.{{@valueProperty}}
{{else}}
  label: rowData.{{@idProperty}}
{{/if}}
```

### 3. Use Consistent Fallbacks

```handlebars
placeholder = "Select {{#if @def.x-label}}{{@def.x-label}}{{else}}{{@entityNameSimple}}{{/if}}"
```

### 4. Preserve Indentation

The generated code should be properly indented:

```handlebars
const columns = [
  {{#each columns}}
  {
    field: '{{this.field}}',
    header: '{{this.header}}',
  },
  {{/each}}
];
```

### 5. Comment Complex Logic

```handlebars
{{!--
  Generate variant filters from x-combobox-variants metadata.
  Each variant creates a filter button in the DataGrid toolbar.
--}}
{{#if @def.x-combobox-variants}}
  ...
{{/if}}
```

## Debugging Templates

1. **Check generated output** for syntax errors
2. **Use console.log** in generated code to trace runtime issues
3. **Review Handlebars parse errors** - often caused by `}}}` sequences
4. **Verify variable availability** - some variables may be undefined for certain entities
