# MultiSelect Integration Protocol

## Overview

MultiSelect components provide multi-selection dropdowns for many-to-many relationships or batch selection scenarios. Generated for each entity with `x-query-model: true` (unless marked `x-not-selectable`).

## Generated Location

```
src/components/{Namespace}/{EntityName}/MultiSelect.tsx
```

## Basic Usage

### Standalone Mode

```typescript
import { QueryCategoryModelMultiSelect } from '@/components/YourApp';

function MyComponent() {
  const [categoryIds, setCategoryIds] = useState<number[]>([]);

  return (
    <QueryCategoryModelMultiSelect
      value={categoryIds}
      onChange={setCategoryIds}
    />
  );
}
```

### With React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { QueryCategoryModelMultiSelect } from '@/components/YourApp';

interface FormData {
  categoryIds: number[];
}

function MyForm() {
  const { control, setValue } = useForm<FormData>({
    defaultValues: { categoryIds: [] }
  });

  return (
    <QueryCategoryModelMultiSelect
      control={control}
      setValue={setValue}
      name="categoryIds"
    />
  );
}
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `number[]` | `[]` | Selected IDs (standalone mode) |
| `onChange` | `(ids: number[]) => void` | - | Change handler |
| `control` | `Control<TFormValues>` | - | React Hook Form control |
| `setValue` | `UseFormSetValue<TFormValues>` | - | React Hook Form setValue |
| `name` | `string` | - | Form field name |
| `disabled` | `boolean` | `false` | Disable component |
| `placeholder` | `string` | Auto-generated | Placeholder text |
| `variant` | `string` | `'all'` | Filter variant |
| `maxSelectedLabels` | `number` | `3` | Max chips before collapsing |
| `selectedItemsLabel` | `string` | `"{0} selected"` | Label when collapsed |
| `showSelectAll` | `boolean` | `true` | Show "Select All" checkbox |
| `filterBy` | `string` | Display field | Field to filter by |
| `display` | `'chip' \| 'comma'` | `'chip'` | Display mode |
| `panelClassName` | `string` | - | Custom panel CSS class |
| `parentEntityId` | `number` | - | Parent ID for filtering |
| `parentEntityFieldName` | `string` | - | Field name for parent filter |
| `requireParent` | `boolean` | `false` | Require parent first |
| `onEntitiesChange` | `(entities: T[]) => void` | - | Callback with full entities |
| `onLoadError` | `(error: string) => void` | - | Error handler |

## Display Modes

### Chip Mode (Default)

Shows selected items as removable chips:

```typescript
<QueryCategoryModelMultiSelect
  value={categoryIds}
  onChange={setCategoryIds}
  display="chip"
  maxSelectedLabels={3}
/>
```

### Comma Mode

Shows selected items as comma-separated text:

```typescript
<QueryCategoryModelMultiSelect
  value={categoryIds}
  onChange={setCategoryIds}
  display="comma"
/>
```

## Variants (Filtered Options)

When entity has `x-combobox-variants`:

```typescript
// Show only active categories
<QueryCategoryModelMultiSelect
  value={categoryIds}
  onChange={setCategoryIds}
  variant="active"
/>
```

## Getting Full Entity Data

```typescript
<QueryCategoryModelMultiSelect
  value={categoryIds}
  onChange={setCategoryIds}
  onEntitiesChange={(entities) => {
    console.log('Selected entities:', entities);
    const names = entities.map(e => e.categoryName).join(', ');
    console.log('Names:', names);
  }}
/>
```

## Filter Sidebar Integration

MultiSelect is automatically used in FilterSidebar for FK fields:

```typescript
// In FilterSidebar, when filtering by categoryId:
// The system automatically uses QueryCategoryModelMultiSelect
// with support for the field's x-navigation-variant

// No manual configuration needed - driven by schema metadata
```

## Bulk Selection Pattern

For bulk operations (e.g., assigning categories to multiple products):

```typescript
function BulkCategoryAssignment({ productIds }: { productIds: number[] }) {
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const toast = useRef<Toast>(null);

  const handleAssign = async () => {
    try {
      await api.assignCategories({
        productIds,
        categoryIds
      });
      toast.current?.show({
        severity: 'success',
        summary: 'Success',
        detail: `Assigned ${categoryIds.length} categories to ${productIds.length} products`
      });
    } catch (error) {
      toast.current?.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to assign categories'
      });
    }
  };

  return (
    <div className="flex gap-2">
      <QueryCategoryModelMultiSelect
        value={categoryIds}
        onChange={setCategoryIds}
        placeholder="Select categories to assign"
        className="flex-grow-1"
      />
      <Button
        label="Assign"
        icon="pi pi-check"
        onClick={handleAssign}
        disabled={categoryIds.length === 0}
      />
      <Toast ref={toast} />
    </div>
  );
}
```

## Parent-Child Filtering

```typescript
function RegionCitySelector() {
  const [regionId, setRegionId] = useState<number>(0);
  const [cityIds, setCityIds] = useState<number[]>([]);

  return (
    <>
      <QueryRegionModelComboBox
        value={regionId}
        onChange={(id) => {
          setRegionId(id);
          setCityIds([]); // Clear cities when region changes
        }}
      />

      <QueryCityModelMultiSelect
        value={cityIds}
        onChange={setCityIds}
        parentEntityId={regionId}
        parentEntityFieldName="regionId"
        requireParent={true}
        parentRequiredMessage="Select a region first"
      />
    </>
  );
}
```

## Customizing Selected Label

```typescript
<QueryCategoryModelMultiSelect
  value={categoryIds}
  onChange={setCategoryIds}
  maxSelectedLabels={2}
  selectedItemsLabel="{0} categories selected"
/>
```

When more than 2 are selected, shows "5 categories selected" instead of chips.

## Styling

```typescript
<QueryCategoryModelMultiSelect
  value={categoryIds}
  onChange={setCategoryIds}
  className="w-full"
  panelClassName="max-h-20rem"
/>
```

## Caching Behavior

- Same 30-minute TTL cache as ComboBox
- Cache key includes parent ID and variant
- Shared cache with corresponding ComboBox component

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Panel too tall | Many items | Add `panelClassName="max-h-20rem"` |
| Chips overflow | Too many selected | Reduce `maxSelectedLabels` |
| Filter not working | Wrong filterBy | Check `filterBy` matches display field |
| Performance slow | Large dataset | Consider pagination or virtualization |

## Swagger Requirements

Same as ComboBox:

```json
{
  "QueryEntityModel": {
    "x-query-model": true,
    "properties": {
      "entityId": { "x-navigation-key": true },
      "entityName": { "x-display-value": true }
    }
  }
}
```

To exclude from MultiSelect generation:

```json
{
  "QueryEntityModel": {
    "x-not-selectable": true
  }
}
```
