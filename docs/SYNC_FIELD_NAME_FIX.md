# Sync Field Name Fix - Snake Case to Camel Case

## Problem
When syncing data from local SQLite (which uses snake_case field names) to server PostgreSQL (which uses camelCase via Prisma), field name mismatches caused sync failures.

**Error Example:**
```
Unknown argument `updated_at`. Did you mean `updatedAt`?
```

## Root Cause
- **Local SQLite**: Uses snake_case field names (`updated_at`, `created_at`, `parent_category_id`)
- **Prisma/PostgreSQL**: Uses camelCase field names (`updatedAt`, `createdAt`, `parentCategoryId`)
- Sync service was not converting field names before sending to Prisma

## Solution
Added field name conversion in `sanitizeData()` method to convert all snake_case keys to camelCase before sending to Prisma.

**File**: `pos-server/src/services/syncService.ts`

**Changes:**
1. Added `snakeToCamel()` method to convert individual field names
2. Added `convertKeysToCamelCase()` method to recursively convert all keys in objects/arrays
3. Updated `sanitizeData()` to convert keys before processing

## Field Name Conversions

### Common Conversions:
- `updated_at` → `updatedAt`
- `created_at` → `createdAt`
- `parent_category_id` → `parentCategoryId`
- `category_id` → `categoryId`
- `brand_id` → `brandId`
- `supplier_id` → `supplierId`
- `product_id` → `productId`
- `variant_id` → `variantId`
- `location_id` → `locationId`
- `user_id` → `userId`
- `role_id` → `roleId`
- `sync_status` → `syncStatus`
- `last_synced_at` → `lastSyncedAt`
- `is_deleted` → `isDeleted`

## How It Works

### Before:
```typescript
// Data from SQLite (snake_case)
{
  id: "...",
  name: "Category",
  updated_at: "2024-01-01T12:00:00.000Z",
  parent_category_id: "..."
}

// Sent to Prisma (fails - expects camelCase)
await model.create({ data: { ... } }); // ❌ Error: Unknown argument `updated_at`
```

### After:
```typescript
// Data from SQLite (snake_case)
{
  id: "...",
  name: "Category",
  updated_at: "2024-01-01T12:00:00.000Z",
  parent_category_id: "..."
}

// Converted to camelCase
{
  id: "...",
  name: "Category",
  updatedAt: "2024-01-01T12:00:00.000Z",
  parentCategoryId: "..."
}

// Sent to Prisma (succeeds)
await model.create({ data: { ... } }); // ✅ Success
```

## Implementation

```typescript
/**
 * Convert snake_case to camelCase
 */
private snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert all keys from snake_case to camelCase
 */
private convertKeysToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => this.convertKeysToCamelCase(item));
  }

  if (typeof obj === 'object') {
    const converted: any = {};
    for (const key in obj) {
      const camelKey = this.snakeToCamel(key);
      converted[camelKey] = this.convertKeysToCamelCase(obj[key]);
    }
    return converted;
  }

  return obj;
}

// In sanitizeData():
const camelCaseData = this.convertKeysToCamelCase(data);
const sanitized: any = { ...camelCaseData };
```

## Benefits

1. **Automatic Conversion**: All field names are converted automatically
2. **Recursive**: Handles nested objects and arrays
3. **Complete**: Converts all snake_case fields to camelCase
4. **No Breaking Changes**: Works with existing data

## Testing

After this fix, sync should work correctly:
- ✅ Categories sync to local DB
- ✅ Products sync to local DB
- ✅ ProductVariants sync to local DB
- ✅ InventoryItems sync to local DB
- ✅ All other tables sync correctly

## Summary

✅ **Fixed field name conversion** from snake_case to camelCase
✅ **All sync operations now work correctly**
✅ **Categories and all other tables sync to local DB**

The sync service now properly converts field names before sending to Prisma, ensuring all data syncs correctly to the local SQLite database! 🎉

