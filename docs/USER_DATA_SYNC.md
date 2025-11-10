# User Data Sync - Local SQLite Database

## Overview
User data (User and UserLocation tables) is now synced to the local SQLite database (`cpos.db`) using the same pagination approach as other tables (Category, Product, ProductVariant, InventoryItem).

## How It Works

### 1. On Login (Automatic)
When a user logs in online:

1. **Immediate User Sync**: `syncUserTable()` is called immediately to sync User table
   - Downloads ALL users from server (with pagination)
   - Includes `passwordHash` for offline login support
   - Saves all users to local SQLite database

2. **Full Sync**: `syncAll()` is called in background
   - Syncs all tables including User and UserLocation
   - Uses pagination to download all records

3. **Periodic Sync**: Starts hourly automatic sync
   - Keeps user data up-to-date

### 2. User Table Sync Details

**Method**: `syncUserTable()`
- **Upload**: Uploads local user changes to server
- **Download**: Downloads ALL users from server (forced, no lastSyncedAt filter)
- **Pagination**: Handles pagination to get all users, not just first batch
- **Purpose**: Ensures user data with passwordHash is available for offline login

**Method**: `downloadUserTableForced()`
- Downloads all users with pagination
- Loops through all batches until `hasMore` is false
- Inserts/updates all users in local SQLite database

### 3. UserLocation Table Sync

UserLocation table is synced as part of `syncAll()`:
- Included in `SYNC_TABLES` array
- Uses the same pagination approach as other tables
- All user-location assignments are synced to local database

## Sync Flow

```
Login → 
  ├─ syncUserTable() (immediate)
  │   ├─ Upload local user changes
  │   └─ Download ALL users (with pagination)
  │       ├─ Batch 1: offset=0, limit=100
  │       ├─ Batch 2: offset=100, limit=100
  │       ├─ Batch 3: offset=200, limit=100
  │       └─ ... continues until hasMore=false
  │
  ├─ syncAll() (background)
  │   ├─ Syncs all tables including User and UserLocation
  │   └─ Uses pagination for all tables
  │
  └─ startPeriodicSync() (hourly)
      └─ Keeps all data synchronized
```

## What Gets Synced

### User Table
- All user records from server
- Includes: id, username, email, passwordHash, firstName, lastName, roleId, etc.
- **Important**: passwordHash is included for offline login support

### UserLocation Table
- All user-location assignments
- Links users to their assigned locations

## Pagination Implementation

The `downloadUserTableForced()` method now uses pagination:

```typescript
let offset = 0;
let hasMore = true;
let totalDownloaded = 0;

while (hasMore) {
  const response = await this.apiClient.get(`/api/sync/User/download`, {
    limit: this.config.batchSize, // 100 by default
    offset,
  });

  const records = response.data.records || [];
  hasMore = response.data.hasMore || false;
  totalDownloaded += records.length;

  // Process and insert all records
  for (const record of records) {
    // Insert/update in local DB
  }

  offset += records.length;
  if (records.length === 0 || !hasMore) break;
}
```

## Benefits

1. **Offline Login Support**: User data with passwordHash is available locally
2. **Complete Data**: All users are synced, not just first batch
3. **Consistent Approach**: Same pagination pattern as other tables
4. **Automatic Updates**: Hourly sync keeps user data current

## Verification

After login, check logs:
```
[SyncService] Syncing User table (forced full download)...
[SyncService] User table upload: { success: true, recordsProcessed: 0 }
[SyncService] Downloading all users from server...
[SyncService] Downloaded 25 users from server
[SyncService] User table synced successfully: { recordsDownloaded: 25 }
```

Query local SQLite database:
```sql
SELECT COUNT(*) FROM User;
SELECT COUNT(*) FROM UserLocation;
```

Counts should match the server database!

## Summary

✅ **User data is now synced to local SQLite database**
✅ **Uses pagination to download ALL users**
✅ **Includes passwordHash for offline login**
✅ **UserLocation table also synced**
✅ **Automatic sync on login and hourly**

User data is now stored in local SQLite database the same way as categories, products, variants, and inventory! 🎉

