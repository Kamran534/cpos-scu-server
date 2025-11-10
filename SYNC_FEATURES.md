# Server-Side Sync Features

## Overview

The server now includes automatic and manual sync capabilities for database synchronization.

## Features

### 1. Automatic Hourly Sync

The server automatically runs a sync every hour (at minute 0 of each hour).

**How it works:**
- Started automatically when server starts (if database is connected)
- Runs in background using `node-cron`
- Syncs all tables in dependency order
- Logs sync results

**Configuration:**
- Cron schedule: `0 * * * *` (every hour at minute 0)
- Can be modified in `src/services/syncScheduler.ts`

### 2. Manual Sync API

Trigger sync manually via API endpoint.

**Endpoint:**
```
POST /api/sync/manual
```

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "message": "Sync started in background",
  "data": {
    "startedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `202 Accepted`: Sync started successfully
- `409 Conflict`: Sync already in progress
- `401 Unauthorized`: Authentication required
- `500 Internal Server Error`: Server error

### 3. Auto-Sync on Login

When a user logs in, their user-specific data is automatically synced.

**How it works:**
- Triggered automatically in `AuthService.login()`
- Runs asynchronously (doesn't block login)
- Syncs user-specific tables:
  - User
  - UserLocation
  - Shift
  - SaleOrder
  - (and other user-related tables)

**Logs:**
- Sync start/completion logged to console
- Errors logged but don't affect login

### 4. Sync Status API

Get current sync status and history.

**Endpoint:**
```
GET /api/sync/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tables": ["CustomerGroup", "Location", ...],
    "timestamp": "2024-01-01T12:00:00.000Z",
    "scheduler": {
      "isRunning": false,
      "lastSyncTime": "2024-01-01T11:00:00.000Z",
      "isAutomaticSyncActive": true,
      "recentSyncs": [...]
    }
  }
}
```

## Usage Examples

### Manual Sync via API

```bash
# Trigger manual sync
curl -X POST http://localhost:4000/api/sync/manual \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Check Sync Status

```bash
# Get sync status
curl http://localhost:4000/api/sync/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Login (Auto-Sync)

```bash
# Login (triggers auto-sync)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user",
    "password": "pass"
  }'
```

## Server Startup

When the server starts:

1. Database connection is checked
2. If connected, automatic sync scheduler is started
3. Sync runs every hour automatically
4. Console shows: `✅ Automatic sync scheduler started (runs every hour)`

## Sync Process

1. **Check if sync is running**: Prevents concurrent syncs
2. **Process all tables**: Syncs in dependency order
3. **Log results**: Success/failure logged to console
4. **Update history**: Last 100 sync results stored
5. **Update timestamp**: Last sync time updated

## Monitoring

### Console Logs

```
[SyncScheduler] Running automatic hourly sync...
[SyncScheduler] Processing table: CustomerGroup
[SyncScheduler] Processing table: Location
...
[SyncScheduler] Sync completed: 44 tables, 0 records, 1234ms
```

### Sync History

Last 10 sync results available via `/api/sync/status` endpoint.

## Configuration

### Modify Sync Schedule

Edit `src/services/syncScheduler.ts`:

```typescript
// Change from hourly to every 30 minutes
this.cronJob = cron.schedule('*/30 * * * *', async () => {
  // ...
});
```

### Modify Tables to Sync

Edit the `tables` array in `syncScheduler.performSync()`:

```typescript
const tables = [
  'CustomerGroup',
  // Add or remove tables
];
```

## Error Handling

- Sync errors are logged but don't stop the process
- Individual table errors don't stop entire sync
- Failed syncs are tracked in history
- Manual sync returns 202 even if errors occur (runs in background)

## Notes

- Sync runs in background (non-blocking)
- Multiple syncs cannot run concurrently
- Sync history limited to last 100 results
- Automatic sync requires database connection

