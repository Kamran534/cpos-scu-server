# Login Sync Flow - Bidirectional Sync

## Overview

When a user logs in **in online mode**, the system needs to perform **bidirectional sync** to update both:
- **Local SQLite DB** (client) ← receives data from server
- **Server PostgreSQL DB** ← receives changes from client

## Current Implementation

### Server-Side (Automatic)

When user logs in via `POST /api/auth/login`:

1. **Login succeeds** → Returns JWT token
2. **Server triggers `syncOnLogin()`** → Prepares data and logs table counts
3. **Server does NOT directly sync** → Cannot access client's local SQLite DB

### Client-Side (Required for Bidirectional Sync)

After receiving login response, the **CLIENT must**:

1. **Call bidirectional sync endpoints** for each essential table
2. **Upload local changes** to server
3. **Download server updates** to local DB

## Recommended Client Flow

```javascript
// 1. User logs in
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { data: { token, user } } = await loginResponse.json();

// 2. Store token for authenticated requests
localStorage.setItem('authToken', token);

// 3. Perform bidirectional sync for each essential table
const essentialTables = [
  'Location',
  'Brand', 
  'Supplier',
  'TaxCategory',
  'Category',
  'Product',
  'ProductVariant',
  'InventoryItem',
  'User',
  'UserLocation'
];

for (const table of essentialTables) {
  await syncTableBidirectional(table, token);
}

async function syncTableBidirectional(tableName, token) {
  // Get local records that need to be uploaded
  const localChanges = await getLocalUnsyncedRecords(tableName);
  
  // Get last sync timestamp
  const lastSyncedAt = await getLastSyncTime(tableName);
  
  // Perform bidirectional sync
  const response = await fetch(`/api/sync/${tableName}/bidirectional`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      records: localChanges,  // Upload local changes
      lastSyncedAt: lastSyncedAt  // Download only changed records
    })
  });
  
  const result = await response.json();
  
  if (result.success) {
    // Update local database with downloaded records
    await updateLocalDatabase(tableName, result.data.download.records);
    
    // Mark uploaded records as synced
    await markRecordsAsSynced(tableName, localChanges);
    
    // Update last sync time
    await updateLastSyncTime(tableName, new Date().toISOString());
    
    console.log(`✅ Synced ${tableName}:`, {
      uploaded: result.data.upload.created + result.data.upload.updated,
      downloaded: result.data.download.records.length
    });
  }
}
```

## What Happens in Bidirectional Sync

### Step 1: Upload (Client → Server)
- Client sends local changes (new/updated records)
- Server creates/updates records in PostgreSQL
- Returns: `{ created: X, updated: Y, errors: [] }`

### Step 2: Download (Server → Client)
- Server sends latest data (all records or only changed since `lastSyncedAt`)
- Client updates local SQLite database
- Returns: `{ records: [...], hasMore: false, totalCount: Z }`

## Sync Order (Important!)

Sync tables in this order to respect foreign key dependencies:

1. **Location** (no dependencies)
2. **Brand** (no dependencies)
3. **Supplier** (no dependencies)
4. **TaxCategory** (no dependencies)
5. **Category** (may reference parentCategoryId, but sync all)
6. **Product** (depends on Category, Brand, Supplier)
7. **ProductVariant** (depends on Product)
8. **InventoryItem** (depends on ProductVariant and Location)
9. **User** (no dependencies for sync)
10. **UserLocation** (depends on User and Location)

## Example: Complete Login + Sync Flow

```javascript
async function loginAndSync(email, password) {
  try {
    // Step 1: Login
    console.log('🔐 Logging in...');
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) {
      throw new Error(loginData.error);
    }
    
    const { token, user } = loginData.data;
    console.log('✅ Login successful');
    
    // Step 2: Bidirectional Sync
    console.log('🔄 Starting bidirectional sync...');
    
    const syncTables = [
      'Location', 'Brand', 'Supplier', 'TaxCategory',
      'Category', 'Product', 'ProductVariant', 'InventoryItem',
      'User', 'UserLocation'
    ];
    
    let totalUploaded = 0;
    let totalDownloaded = 0;
    
    for (const table of syncTables) {
      const localChanges = await getLocalUnsyncedRecords(table);
      const lastSyncedAt = await getLastSyncTime(table);
      
      const syncRes = await fetch(`/api/sync/${table}/bidirectional`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          records: localChanges,
          lastSyncedAt
        })
      });
      
      const syncData = await syncRes.json();
      
      if (syncData.success) {
        // Update local DB
        await updateLocalDatabase(table, syncData.data.download.records);
        await markRecordsAsSynced(table, localChanges);
        await updateLastSyncTime(table, new Date().toISOString());
        
        totalUploaded += syncData.data.upload.created + syncData.data.upload.updated;
        totalDownloaded += syncData.data.download.records.length;
        
        console.log(`  ✅ ${table}: +${syncData.data.upload.created + syncData.data.upload.updated} uploaded, ${syncData.data.download.records.length} downloaded`);
      }
    }
    
    console.log(`✅ Sync complete: ${totalUploaded} uploaded, ${totalDownloaded} downloaded`);
    
    return { token, user, syncComplete: true };
    
  } catch (error) {
    console.error('Login/sync error:', error);
    throw error;
  }
}
```

## Summary

**Current State:**
- ✅ Server prepares data on login (logs table counts)
- ✅ Bidirectional sync endpoints are available
- ⚠️ **Client must call bidirectional sync endpoints after login**

**To achieve true bidirectional sync on login:**
1. Client logs in → Gets JWT token
2. Client calls `POST /api/sync/:table/bidirectional` for each essential table
3. For each table:
   - Uploads local changes → Updates server DB
   - Downloads server updates → Updates local DB

**Result:** Both local and server databases are synchronized bidirectionally! 🎉

