# Sync Fix - Local SQLite Database Not Getting Data

## Problem
Data (categories, products, variants, inventory, etc.) was not being added to the local SQLite database (`cpos.db`) after login.

## Root Cause
The client-side sync service's `downloadTable` method was only downloading the **first batch** of records (100 records by default) and **not paginating** to get all records. This meant:
- If a table had more than 100 records, only the first 100 were downloaded
- The rest of the records were never synced to the local database

## Solution
Updated the `downloadTable` method in `monorepo/libs/shared/data-access/src/lib/sync/sync-service.ts` to:

1. **Handle pagination properly**: Loop through all pages until `hasMore` is false
2. **Download all records**: Continue downloading batches until all records are fetched
3. **Insert/update all records**: Save all downloaded records to the local SQLite database

## Changes Made

### Before (Only first batch):
```typescript
// Download from server
const response = await this.apiClient.get(`/api/sync/${tableName}/download`, {
  lastSyncedAt,
  limit: this.config.batchSize, // Only 100 records
});

// Process records (only first 100)
const records = response.data.records || [];
// ... insert records
```

### After (All records with pagination):
```typescript
let offset = 0;
let hasMore = true;
let totalDownloaded = 0;

// Download all records with pagination
while (hasMore) {
  const response = await this.apiClient.get(`/api/sync/${tableName}/download`, {
    lastSyncedAt,
    limit: this.config.batchSize,
    offset, // Increment offset for each batch
  });

  const records = response.data.records || [];
  hasMore = response.data.hasMore || false;
  totalDownloaded += records.length;

  // Process and insert all records
  for (const record of records) {
    // Insert/update in local DB
  }

  offset += records.length; // Move to next batch
  if (records.length === 0 || !hasMore) break;
}
```

## How It Works Now

1. **On Login**: 
   - Client calls `syncService.syncAll()`
   - For each table (Category, Product, ProductVariant, InventoryItem, etc.):
     - Uploads local changes (if any)
     - Downloads ALL records from server (with pagination)
     - Inserts/updates all records in local SQLite database

2. **Pagination Flow**:
   - First request: `offset=0, limit=100` → Gets records 0-99
   - Second request: `offset=100, limit=100` → Gets records 100-199
   - Third request: `offset=200, limit=100` → Gets records 200-299
   - Continues until `hasMore=false`

3. **Result**: All records from server are now saved to local SQLite database!

## Verification

After this fix, you should see:
- All categories in local SQLite database
- All products in local SQLite database
- All product variants in local SQLite database
- All inventory items in local SQLite database

Check logs for:
```
[SyncService] Downloaded 15 Category records
[SyncService] Downloaded 50 Product records
[SyncService] Downloaded 120 ProductVariant records
[SyncService] Downloaded 200 InventoryItem records
```

## Testing

1. **Login** to the application
2. **Check logs** for sync progress
3. **Query local SQLite database** to verify data:
   ```sql
   SELECT COUNT(*) FROM Category;
   SELECT COUNT(*) FROM Product;
   SELECT COUNT(*) FROM ProductVariant;
   SELECT COUNT(*) FROM InventoryItem;
   ```

All counts should match the server database!

