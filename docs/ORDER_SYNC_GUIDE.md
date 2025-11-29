# TradeUnleashed Order Sync Guide

## Overview

This system allows you to:
1. **Create orders from POS** (web/desktop) - Orders are saved in the database with status "Open" (pending)
2. **Automatic sync to TradeUnleashed** - A background scheduler syncs pending orders to TradeUnleashed HQ server
3. **Status tracking** - Orders are marked as "Completed" and "Synced" after successful sync

## Architecture

```
POS Interface (Web/Desktop)
    ↓
POST /api/sales-orders/create
    ↓
Database (Status: "Open", SyncStatus: null)
    ↓
Background Scheduler (runs every 5 minutes by default)
    ↓
TradeUnleashed API /api/saleOrders/bulkSave
    ↓
Database (Status: "Completed", SyncStatus: "Synced")
```

## API Endpoints

### 1. Create Order from POS

**Endpoint:** `POST /api/sales-orders/create`

**Description:** Creates a new sales order in the database. The order will be synced to TradeUnleashed automatically by the background scheduler.

**Request Body:**
```json
{
  "locationId": "uuid-of-location",
  "cashierId": "uuid-of-cashier",
  "customerId": "uuid-of-customer", // Optional
  "lineItems": [
    {
      "variantId": "uuid-of-product-variant",
      "quantity": 2,
      "unitPrice": 100.00,
      "saleDiscount": {
        "amount": 10.00
      },
      "customDiscount": {
        "percent": 5
      }
    }
  ],
  "payments": [
    {
      "paymentMethodId": "payment-method-id",
      "amount": 190.00
    }
  ],
  "orderLevelDiscount": {
    "amount": 5.00
  },
  "notes": "Order notes",
  "customerNotes": "Customer notes"
}
```

**Response:**
```json
{
  "message": "Order created successfully. Will be synced to TradeUnleashed.",
  "order": {
    "id": "order-uuid",
    "orderNumber": "SO-2024-001",
    "status": "Open",
    "syncStatus": null,
    "totalAmount": "190.00"
  }
}
```

**Important Notes:**
- Orders are created with status `"Open"` (pending)
- `syncStatus` is `null` initially (will be set during sync)
- Products must have `externalId` and `externalSystem: "tradeunleashed"` to sync
- Location must have `externalId` for TradeUnleashed facility mapping
- Customer must have `externalId` and `externalSystem: "tradeunleashed"` if provided

### 2. Bulk Save from TradeUnleashed (Import)

**Endpoint:** `POST /api/sales-orders/bulk-save`

**Description:** Imports orders FROM TradeUnleashed to your database. This is the reverse direction.

## Background Sync Scheduler

### Configuration

The sync scheduler runs automatically when the server starts. Configure it using environment variables:

```env
# TradeUnleashed API Configuration
TRADEUNLEASHED_BASE_URL=https://q-prod.tradeunleashed.com
TRADEUNLEASHED_USERNAME=your-username
TRADEUNLEASHED_PASSWORD=your-password

# Sync Interval (in minutes, default: 5)
TRADEUNLEASHED_SYNC_INTERVAL_MINUTES=5
```

### How It Works

1. **Fetches Pending Orders:**
   - Status: `"Open"`
   - SyncStatus: `null`, `"Pending"`, or `"Failed"` (retries failed orders)

2. **Maps to TradeUnleashed Format:**
   - Transforms order data to TradeUnleashed API format
   - Maps product variants using `externalId`
   - Maps location using `externalId`
   - Maps customer using `externalId` (if available)

3. **Posts to TradeUnleashed:**
   - Calls `/api/saleOrders/bulkSave` endpoint
   - Sends orders in batch

4. **Updates Status:**
   - On success: Status → `"Completed"`, SyncStatus → `"Synced"`
   - On failure: SyncStatus → `"Failed"`, error message saved

### Sync Process Flow

```
1. Scheduler runs (every 5 minutes)
   ↓
2. Query orders: status="Open" AND syncStatus IN (null, "Pending", "Failed")
   ↓
3. For each order:
   a. Mark as "Syncing"
   b. Map to TradeUnleashed format
   c. Add to batch
   ↓
4. Post batch to TradeUnleashed API
   ↓
5. Update orders:
   - Success: status="Completed", syncStatus="Synced"
   - Failure: syncStatus="Failed", save error
```

## Order Status Flow

```
Open (syncStatus: null)
    ↓
Syncing (syncStatus: "Syncing")
    ↓
Completed (syncStatus: "Synced") ✅
    OR
Failed (syncStatus: "Failed") ❌ → Retry on next sync
```

## TradeUnleashed Payload Structure

Orders are transformed to this format before posting to TradeUnleashed:

```json
{
  "saleOrders": [
    {
      "id": 1504723025127,
      "orderReference": "SO-2024-001",
      "dateCreated": "2024-11-02T01:29:27.859Z",
      "deliveryDate": "2024-11-02T01:29:27.859Z",
      "customerName": "",
      "transient": true,
      "uniqueHash": "order-uuid",
      "posSession": { "id": 676864374 },
      "notes": null,
      "fbrInvoiceNum": null,
      "saleType": { "id": 432545517 },
      "lineItems": [
        {
          "inventoryItem": { "id": 393165 },
          "quantity": 1,
          "unitPrice": 1000,
          "customDiscAmt": 0,
          "id": 1611469024988,
          "lineNum": 1,
          "orderAdjustments": [...]
        }
      ],
      "orderRoles": [
        {
          "id": 1331008416098,
          "orderRoleType": { "id": 113 },
          "facility": { "id": 184806 },
          "party": null
        },
        {
          "id": 1508564164862,
          "orderRoleType": { "id": 112 },
          "party": { "id": 182643 },
          "facility": null
        }
      ],
      "orderStatuses": [
        { "id": 1206211949659, "orderStatusType": { "id": 133 } }
      ],
      "orderAdjustments": [...],
      "payments": [
        {
          "id": 756147306460,
          "datePaid": "2024-11-02T01:29:27.859Z",
          "amount": 1000,
          "paymentMethod": "CASH",
          "paymentType": { "id": 145 }
        }
      ]
    }
  ]
}
```

## Prerequisites

### 1. Products Must Be Synced

Products must have TradeUnleashed mapping:
- `ProductVariant.externalId` = TradeUnleashed inventory item ID
- `ProductVariant.externalSystem` = `"tradeunleashed"`

**Check if product is synced:**
```bash
npm run check-product <tradeunleashed-item-id>
```

### 2. Location Must Have External ID

Location must have:
- `Location.externalId` = TradeUnleashed facility ID
- `Location.externalSystem` = `"tradeunleashed"`

### 3. Customer Must Have External ID (if provided)

Customer must have:
- `Customer.externalId` = TradeUnleashed party ID
- `Customer.externalSystem` = `"tradeunleashed"`

## Troubleshooting

### Order Not Syncing

1. **Check order status:**
   ```sql
   SELECT id, orderNumber, status, syncStatus, syncError 
   FROM SaleOrder 
   WHERE status = 'Open';
   ```

2. **Check sync logs:**
   - Look for `[TradeUnleashedOrderSyncScheduler]` in server logs
   - Check for error messages

3. **Common issues:**
   - Product missing `externalId` → Check product sync
   - Location missing `externalId` → Update location with TradeUnleashed facility ID
   - Customer missing `externalId` → Update customer with TradeUnleashed party ID
   - TradeUnleashed API error → Check credentials and network

### Retry Failed Orders

Failed orders are automatically retried on the next sync cycle. To manually trigger:

1. Update order syncStatus:
   ```sql
   UPDATE SaleOrder 
   SET syncStatus = 'Pending' 
   WHERE syncStatus = 'Failed';
   ```

2. Wait for next sync cycle (or restart server to trigger immediate sync)

### Check Sync Statistics

The scheduler tracks sync statistics. Check server logs for:
```
[TradeUnleashedOrderSyncScheduler] Sync completed: X succeeded, Y failed
```

## Manual Sync (For Testing)

You can manually trigger sync by calling the service:

```typescript
import TradeUnleashedOrderSyncService from './services/tradeUnleashed/TradeUnleashedOrderSyncService';
import { config } from './config';

// Initialize
await TradeUnleashedOrderSyncService.initializeClient({
  baseUrl: config.tradeUnleashed.baseUrl,
  username: config.tradeUnleashed.username,
  password: config.tradeUnleashed.password,
});

// Run sync
const result = await TradeUnleashedOrderSyncService.syncPendingOrders();
console.log(result);
```

## Environment Variables

```env
# TradeUnleashed API
TRADEUNLEASHED_BASE_URL=https://q-prod.tradeunleashed.com
TRADEUNLEASHED_USERNAME=your-username
TRADEUNLEASHED_PASSWORD=your-password

# Sync Configuration
TRADEUNLEASHED_SYNC_INTERVAL_MINUTES=5
```

## Summary

✅ **Create orders from POS** → `POST /api/sales-orders/create`
✅ **Automatic sync** → Background scheduler runs every 5 minutes
✅ **Status tracking** → Orders progress: Open → Syncing → Completed/Synced
✅ **Error handling** → Failed orders are retried automatically
✅ **Batch processing** → Multiple orders synced in one API call

