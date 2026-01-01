# OpenAPI Schema Metadata Extensions

The code generator supports numerous `x-*` vendor extensions in your OpenAPI/Swagger specification. These extensions drive the behavior of generated components.

## Quick Reference

| Extension | Type | Description |
|-----------|------|-------------|
| `x-label` | string | Display label for columns/fields |
| `x-navigation-target` | string | FK target model class |
| `x-navigation-variant` | string | Filtered variant for FK |
| `x-navigation-relation` | string | Related display field |
| `x-navigation-key` | boolean | Primary key marker |
| `x-hidden-column` | boolean | Hide from DataGrid |
| `x-hidden-field` | boolean | Hide from PropertyEditor |
| `x-hidden` | boolean | Hide everywhere |
| `x-field-set` | string | Form fieldset grouping |
| `x-not-filterable` | boolean | Disable filtering |
| `x-not-sortable` | boolean | Disable sorting |
| `x-not-searchable` | boolean | Exclude from search |
| `x-searchable` | boolean | Include in search |
| `x-custom-renderer` | string | Custom cell renderer |
| `x-combobox-variants` | object | Dropdown filter variants |
| `x-predefined-filter` | string | Auto filter buttons |
| `x-synced-from` | string | External sync source |
| `x-permissions` | object | Role-based access |
| `x-read-only` | boolean | Entity is read-only |
| `x-not-creatable` | boolean | Disable create |
| `x-not-selectable` | boolean | Not for dropdowns |
| `x-bulk-actions` | array | Enabled bulk actions |

## Detailed Reference

### Category 1: Labeling & Display

#### `x-label`
Display label for the field. Used in column headers and form labels.

```json
"manufacturerName": {
  "type": "string",
  "x-label": "Manufacturer"
}
```

**Template Usage:**
```handlebars
header: "{{#if @def.properties.manufacturerName.x-label}}{{@def.properties.manufacturerName.x-label}}{{else}}Manufacturer Name{{/if}}"
```

### Category 2: Navigation & Relationships

#### `x-navigation-target`
Specifies the target model for foreign key relationships. Used to generate ComboBox/MultiSelect components.

```json
"categoryId": {
  "type": "integer",
  "x-navigation-target": "GreenOnion.Common.Models.QueryCategoryModel"
}
```

#### `x-navigation-variant`
Specifies which variant of the target model to use.

```json
"schoolCoopId": {
  "type": "integer",
  "x-navigation-target": "GreenOnion.Common.Models.QuerySchoolDistrictModel",
  "x-navigation-variant": "coop"
}
```

#### `x-navigation-relation`
The display field for a navigation target (e.g., the name field that corresponds to an ID).

```json
"categoryName": {
  "type": "string",
  "x-navigation-relation": "categoryId"
}
```

#### `x-navigation-key`
Marks the primary key field.

```json
"productId": {
  "type": "integer",
  "x-navigation-key": true
}
```

### Category 3: Visibility

#### `x-hidden-column`
Hide from DataGrid columns but keep available for filtering.

```json
"internalCode": {
  "type": "string",
  "x-hidden-column": true
}
```

#### `x-hidden-field`
Hide from PropertyEditor forms but show in DataGrid.

```json
"auditTrail": {
  "type": "string",
  "x-hidden-field": true
}
```

#### `x-hidden`
Hide everywhere (both grid and forms).

```json
"createdById": {
  "type": "integer",
  "x-hidden": true
}
```

### Category 4: Form Organization

#### `x-field-set`
Group fields into collapsible panels in PropertyEditor.

```json
"addressLine1": {
  "type": "string",
  "x-field-set": "Address Information"
},
"city": {
  "type": "string",
  "x-field-set": "Address Information"
}
```

Fields without `x-field-set` go into the default "Details" fieldset.

### Category 5: Filtering & Sorting

#### `x-not-filterable`
Disable filtering for this field in FilterSidebar.

```json
"description": {
  "type": "string",
  "x-not-filterable": true
}
```

#### `x-not-sortable`
Disable sorting for this column.

```json
"imageUrl": {
  "type": "string",
  "x-not-sortable": true
}
```

#### `x-not-searchable`
Exclude from global search.

```json
"internalNotes": {
  "type": "string",
  "x-not-searchable": true
}
```

#### `x-searchable`
Include in search term matching.

```json
"productName": {
  "type": "string",
  "x-searchable": true
}
```

### Category 6: Custom Rendering

#### `x-custom-renderer`
Specify a custom cell renderer type.

```json
"isActive": {
  "type": "boolean",
  "x-custom-renderer": "boolean-tag",
  "x-tag-true-severity": "success",
  "x-tag-false-severity": "danger",
  "x-tag-true-label": "Active",
  "x-tag-false-label": "Inactive"
}
```

**Available Renderers:**
- `date` - Format as date
- `boolean-tag` - PrimeReact Tag with severities
- `truncated-text` - Truncate with tooltip
- `image` - Thumbnail display
- `count` - Info tag with number
- `status` - Active/Inactive tag
- `code` - Monospace formatting
- `email` - Mailto link

### Category 7: Variants

#### `x-combobox-variants`
Define filtered variants for dropdowns.

```json
"QuerySchoolDistrictModel": {
  "x-combobox-variants": {
    "all": { "label": "All Districts", "filter": null },
    "district": { "label": "Districts Only", "filter": { "isSchoolCoop": false } },
    "coop": { "label": "Coops Only", "filter": { "isSchoolCoop": true } }
  }
}
```

**Usage:**
```tsx
<QuerySchoolDistrictModelComboBox variant="coop" />
```

#### `x-predefined-filter`
Auto-generate filter buttons in DataGrid.

```json
"isActive": {
  "type": "boolean",
  "x-predefined-filter": "eq",
  "x-predefined-filter-value": true,
  "x-predefined-filter-label": "Active Only"
}
```

### Category 8: External Sync

#### `x-synced-from`
Mark fields as synced from external system (makes conditionally readonly).

```json
"productName": {
  "type": "string",
  "x-synced-from": "oneWorldSync"
}
```

#### `x-external-sync` (schema-level)
Configure external sync behavior.

```json
"QueryProductModel": {
  "x-external-sync": {
    "oneWorldSync": {
      "indicatorField": "hasOneWorldSyncProduct",
      "readonlyReason": "This field is synced from 1WorldSync"
    }
  }
}
```

### Category 9: Permissions

#### `x-permissions`
Role-based access control.

```json
"sensitiveData": {
  "type": "string",
  "x-permissions": {
    "role": ["Super Admin", "District Admin"]
  }
}
```

### Category 10: Entity Behavior

#### `x-read-only`
Entity is view-only, no create/edit.

```json
"QueryAuditLogModel": {
  "x-read-only": true
}
```

#### `x-not-creatable`
Disable create functionality.

```json
"QueryReportModel": {
  "x-not-creatable": true
}
```

#### `x-not-selectable`
Exclude from dropdown generation.

```json
"QueryErrorLogModel": {
  "x-not-selectable": true
}
```

#### `x-bulk-actions`
Enable bulk action buttons.

```json
"QueryProductModel": {
  "x-bulk-actions": ["activate", "deactivate", "delete"]
}
```

## Example: Complete Entity Definition

```json
{
  "QueryProductModel": {
    "type": "object",
    "x-label": "Product",
    "x-bulk-actions": ["activate", "deactivate"],
    "x-combobox-variants": {
      "active": { "label": "Active Products", "filter": { "isActive": true } }
    },
    "properties": {
      "productId": {
        "type": "integer",
        "x-navigation-key": true,
        "x-label": "ID"
      },
      "productName": {
        "type": "string",
        "x-label": "Product Name",
        "x-searchable": true
      },
      "categoryId": {
        "type": "integer",
        "x-navigation-target": "GreenOnion.Common.Models.QueryCategoryModel",
        "x-label": "Category"
      },
      "categoryName": {
        "type": "string",
        "x-navigation-relation": "categoryId",
        "x-hidden-field": true
      },
      "isActive": {
        "type": "boolean",
        "x-custom-renderer": "boolean-tag",
        "x-tag-true-severity": "success",
        "x-tag-false-severity": "secondary"
      },
      "createdOn": {
        "type": "string",
        "format": "date-time",
        "x-hidden-column": true,
        "x-field-set": "Audit Information"
      }
    }
  }
}
```
