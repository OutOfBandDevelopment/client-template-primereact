# ComboBox Integration Protocol

## Overview

ComboBox components provide single-selection dropdowns for foreign key fields. They are auto-generated for each entity with `x-query-model: true`.

## Generated Location

```
src/components/{Namespace}/{EntityName}/ComboBox.tsx
```

## Basic Usage

### Standalone (Uncontrolled)

```typescript
import { QueryCategoryModelComboBox } from '@/components/YourApp';

function MyComponent() {
  const [categoryId, setCategoryId] = useState<number>(0);

  return (
    <QueryCategoryModelComboBox
      value={categoryId}
      onChange={setCategoryId}
    />
  );
}
```

### With React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { QueryCategoryModelComboBox } from '@/components/YourApp';

function MyForm() {
  const { control, setValue } = useForm<FormData>();

  return (
    <QueryCategoryModelComboBox
      control={control}
      setValue={setValue}
      name="categoryId"
      required={true}
    />
  );
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number` | - | Selected ID (standalone mode) |
| `onChange` | `(id: number) => void` | - | Change handler (standalone mode) |
| `control` | `Control<TFormValues>` | - | React Hook Form control |
| `setValue` | `UseFormSetValue<TFormValues>` | - | React Hook Form setValue |
| `name` | `string` | Entity ID field | Form field name |
| `entityName` | `string` | - | Field name for entity object |
| `textName` | `string` | - | Field name for display text |
| `required` | `boolean` | `false` | Validation required |
| `disabled` | `boolean` | `false` | Disable dropdown |
| `placeholder` | `string` | Auto-generated | Placeholder text |
| `includeEmpty` | `boolean` | `true` | Include empty option |
| `emptyLabel` | `string` | "Select {Entity}" | Empty option label |
| `variant` | `string` | `'all'` | Filter variant (if configured) |
| `parentEntityId` | `number` | - | Parent ID for filtering |
| `parentEntityFieldName` | `string` | - | Field name for parent filter |
| `requireParent` | `boolean` | `false` | Require parent selection first |
| `parentRequiredMessage` | `string` | "Please select a parent first" | Message when parent required |
| `onEntityChange` | `(entity: T \| null) => void` | - | Callback with full entity |
| `onTextChange` | `(text: string) => void` | - | Callback with display text |
| `onLoadError` | `(error: string) => void` | - | Error handler |

## Variants (Filtered Dropdowns)

When an entity has `x-combobox-variants` in swagger:

```typescript
// Show only active items
<QueryCategoryModelComboBox variant="active" />

// Show only archived items
<QueryCategoryModelComboBox variant="archived" />

// Show all items (default)
<QueryCategoryModelComboBox variant="all" />
```

### Swagger Configuration for Variants

```json
"QueryCategoryModel": {
  "x-combobox-variants": {
    "all": { "label": "All Categories", "filter": null },
    "active": { "label": "Active Only", "filter": { "isActive": true } },
    "archived": { "label": "Archived", "filter": { "isActive": false } }
  }
}
```

## Parent-Child Filtering

For cascading dropdowns (e.g., Category → SubCategory):

```typescript
function CategorySubCategoryPicker() {
  const [categoryId, setCategoryId] = useState<number>(0);
  const [subCategoryId, setSubCategoryId] = useState<number>(0);

  return (
    <>
      <QueryCategoryModelComboBox
        value={categoryId}
        onChange={(id) => {
          setCategoryId(id);
          setSubCategoryId(0); // Reset child
        }}
      />

      <QuerySubCategoryModelComboBox
        value={subCategoryId}
        onChange={setSubCategoryId}
        parentEntityId={categoryId}
        parentEntityFieldName="categoryId"
        requireParent={true}
        parentRequiredMessage="Select a category first"
      />
    </>
  );
}
```

## Getting Full Entity Data

```typescript
<QueryCategoryModelComboBox
  value={categoryId}
  onChange={setCategoryId}
  onEntityChange={(entity) => {
    if (entity) {
      console.log('Selected:', entity.categoryName);
      console.log('Full entity:', entity);
    }
  }}
/>
```

## Form Integration Pattern

Complete form with FK fields:

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

interface ProductForm {
  productId: number;
  productName: string;
  categoryId: number;
  manufacturerId: number;
}

function ProductEditForm() {
  const { control, setValue, handleSubmit } = useForm<ProductForm>({
    defaultValues: {
      productId: 0,
      productName: '',
      categoryId: 0,
      manufacturerId: 0,
    }
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="field">
        <label>Category</label>
        <QueryCategoryModelComboBox
          control={control}
          setValue={setValue}
          name="categoryId"
          required={true}
        />
      </div>

      <div className="field">
        <label>Manufacturer</label>
        <QueryManufacturerModelComboBox
          control={control}
          setValue={setValue}
          name="manufacturerId"
          required={true}
        />
      </div>

      <Button type="submit" label="Save" />
    </form>
  );
}
```

## Caching Behavior

- Data is cached for 30 minutes by default
- Cache key includes parent ID and variant for isolation
- Cache is automatically invalidated when dependencies change

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Dropdown empty | API error | Check onLoadError callback |
| Wrong items shown | Wrong variant | Verify variant prop |
| Parent filter not working | Missing parentEntityFieldName | Add parentEntityFieldName prop |
| Form not updating | Missing setValue | Pass setValue from useForm |

## Swagger Requirements

For ComboBox generation, entity needs:

```json
{
  "QueryEntityModel": {
    "x-query-model": true,
    "properties": {
      "entityId": {
        "x-navigation-key": true
      },
      "entityName": {
        "x-display-value": true,
        "x-label": "Entity Name"
      }
    }
  }
}
```

To exclude from ComboBox generation:

```json
{
  "QueryEntityModel": {
    "x-not-selectable": true
  }
}
```
