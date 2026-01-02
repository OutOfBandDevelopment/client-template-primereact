# EntityForm Integration Protocol

## Overview

EntityForm components provide create/edit/view forms with automatic field generation, validation, and API integration. The system includes:

- **EntityPage** - Smart wrapper handling mode detection and data loading
- **EntityForm** - Generated form component for each entity
- **PropertyEditor** - Field-level editing driven by Zod metadata

## Generated Files

```
src/components/{Namespace}/{EntityName}/
├── EntityForm.tsx      # Full form component
├── PropertyEditor.tsx  # Field editor component
└── FormSchema.ts       # Zod schema with field metadata
```

## Using EntityPage (Recommended)

EntityPage is the easiest way to integrate forms:

```typescript
import { EntityPage } from '@/components/ui/prime/EntityForm';
import { QueryProductModelEntityForm } from '@/components/YourApp';
import ProductClient from '@/api/YourApp/Clients/ProductClient';

function ProductEditPage() {
  return (
    <EntityPage<Product>
      entityName="Product"
      client={new ProductClient()}
      FormComponent={QueryProductModelEntityForm}
      getMethod="Get"
      saveMethod="Save"
      idParam="id"
    />
  );
}
```

EntityPage automatically:
- Detects mode from URL (`/Edit` = create, `/Edit/:id` = edit, `/View/:id` = view)
- Loads entity data for edit/view modes
- Handles save operations
- Shows loading states
- Manages navigation after save

## Props Reference: EntityPage

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `entityName` | `string` | Yes | Display name for messages |
| `client` | `TClient` | Yes | API client instance |
| `FormComponent` | `ComponentType` | Yes | Form component to render |
| `getMethod` | `string` | Yes | Client method to fetch entity |
| `saveMethod` | `string` | Yes | Client method to save entity |
| `idParam` | `string` | No | URL param name (default: "id") |
| `returnPath` | `string` | No | Path after save (default: "../List") |
| `defaultValues` | `Partial<T>` | No | Default values for create mode |

## Using EntityForm Directly

For more control, use EntityForm directly:

```typescript
import { QueryProductModelEntityForm } from '@/components/YourApp';

function CustomProductForm() {
  const [formData, setFormData] = useState<Product>(initialProduct);

  const handleSave = async () => {
    const client = new ProductClient();
    await client.Save({ body: formData });
  };

  return (
    <QueryProductModelEntityForm
      formData={formData}
      onChange={setFormData}
      mode="edit"
      onSave={handleSave}
    />
  );
}
```

## Props Reference: EntityForm

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `formData` | `T` | Required | Current form data |
| `onChange` | `(data: T) => void` | Required | Data change handler |
| `mode` | `'create' \| 'edit' \| 'view'` | `'edit'` | Form mode |
| `onSave` | `() => Promise<void>` | - | Save handler |
| `onCancel` | `() => void` | - | Cancel handler |
| `loading` | `boolean` | `false` | Show loading state |
| `saving` | `boolean` | `false` | Disable during save |
| `title` | `string` | Auto | Form title |
| `showHeader` | `boolean` | `true` | Show title bar |
| `className` | `string` | - | Additional CSS |

## PropertyEditor (Field-Level Control)

PropertyEditor renders individual fields based on schema:

```typescript
import { QueryProductModelPropertyEditor } from '@/components/YourApp';

function ProductFields() {
  const [formData, setFormData] = useState<Product>(initialProduct);

  return (
    <QueryProductModelPropertyEditor
      formData={formData}
      onChange={(field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
      }}
      mode="edit"
    />
  );
}
```

## Field Grouping (Fieldsets)

Fields are grouped by `x-field-set` metadata:

```json
{
  "productName": {
    "x-field-set": "Basic Info"
  },
  "price": {
    "x-field-set": "Pricing"
  },
  "description": {
    "x-field-set": "Details"
  }
}
```

- Fields without `x-field-set` go to "Details" (default)
- "Details" fieldset renders without panel wrapper
- Other fieldsets render in collapsible panels

## Field Type Mapping

| Schema/Metadata | Renders As |
|-----------------|------------|
| `x-navigation-target` | ComboBox (FK lookup) |
| `format: 'date-time'` | Calendar with time |
| `format: 'date'` | Calendar |
| `type: boolean` + nullable | Dropdown (Yes/No/--) |
| `type: boolean` + required | Checkbox |
| `maxLength > 255` | Textarea |
| `type: string` | InputText |
| `type: integer/number` | InputNumber |

## Nested Object Fields

Nested objects (like `nutritionalInformation`) are automatically expanded:

```json
{
  "nutritionalInformation": {
    "type": "object",
    "x-label": "Nutrition Facts",
    "properties": {
      "calories": { "type": "number" },
      "servingSize": { "type": "string" }
    }
  }
}
```

Generates a "Nutrition Facts" fieldset with `calories` and `servingSize` fields. Field names use dot notation: `nutritionalInformation.calories`.

## FK Field with Variant

When a FK field should show filtered options:

```json
{
  "schoolCoopId": {
    "type": "integer",
    "x-navigation-target": "Models.QuerySchoolDistrictModel",
    "x-navigation-variant": "coop"
  }
}
```

The PropertyEditor automatically uses `variant="coop"` for the ComboBox.

## Read-Only Fields

```json
{
  "createdAt": {
    "type": "string",
    "readOnly": true
  },
  "syncedField": {
    "type": "string",
    "x-synced-from": "externalSystem"
  }
}
```

- `readOnly: true` - Always read-only
- `x-synced-from` - Conditionally read-only when synced

## Validation

Validation is handled by Zod schemas:

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { ZQueryProductModelSave } from '@/api/YourApp/Schema';

function ValidatedProductForm() {
  const form = useForm<Product>({
    resolver: zodResolver(ZQueryProductModelSave),
    defaultValues: initialProduct
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <QueryProductModelPropertyEditor
        formData={form.watch()}
        onChange={(field, value) => form.setValue(field, value)}
        mode="edit"
        errors={form.formState.errors}
      />
    </form>
  );
}
```

## Custom Field Override

Override specific fields in PropertyEditor:

```typescript
<QueryProductModelPropertyEditor
  formData={formData}
  onChange={handleChange}
  mode="edit"
  fieldOverrides={{
    description: (value, onChange, mode) => (
      <RichTextEditor
        value={value}
        onChange={onChange}
        readOnly={mode === 'view'}
      />
    )
  }}
/>
```

## Mode-Based Behavior

| Mode | Behavior |
|------|----------|
| `create` | All editable fields enabled, ID hidden |
| `edit` | ID readonly, editable fields enabled |
| `view` | All fields readonly, no save button |

## Developer Tools

In development mode, EntityForm shows collapsible DevTools panel:

- Form data (current values)
- Original entity (loaded data)
- Field configuration
- Field sets with status
- Zod schema info

## Complete Integration Example

```typescript
// src/pages/YourApp/Product/Edit/index.tsx
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { EntityPage } from '@/components/ui/prime/EntityForm';
import { QueryProductModelEntityForm } from '@/components/YourApp';
import ProductClient from '@/api/YourApp/Clients/ProductClient';

export default function ProductEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Detect mode from URL
  const isView = location.pathname.includes('/View/');
  const isCreate = !id;
  const mode = isView ? 'view' : isCreate ? 'create' : 'edit';

  return (
    <EntityPage
      entityName="Product"
      client={new ProductClient()}
      FormComponent={QueryProductModelEntityForm}
      getMethod="Get"
      saveMethod="Save"
      returnPath="../List"
      defaultValues={{
        isActive: true,
        createdAt: new Date().toISOString()
      }}
    />
  );
}
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Fields not showing | Missing schema | Regenerate code |
| FK dropdown empty | Wrong x-navigation-target | Fix swagger metadata |
| Validation not working | Missing resolver | Add zodResolver |
| Save not working | Wrong saveMethod | Verify client method name |
| Nested fields broken | Schema structure | Check ZodObject expansion |

## Related Protocols

- [ComboBox Integration](./02-COMBOBOX-INTEGRATION.md) - FK field dropdowns
- [DataGrid Integration](./04-DATAGRID-INTEGRATION.md) - List pages
- [API Client Setup](./07-API-CLIENT-SETUP.md) - Client configuration
