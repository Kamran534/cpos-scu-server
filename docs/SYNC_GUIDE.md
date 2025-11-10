# Bidirectional Sync Guide

This guide explains how to use the bidirectional sync system for synchronizing data between the server (PostgreSQL) and client (SQLite) databases.

## Overview

The sync system supports:
- **Bidirectional sync**: Upload local changes and download server updates in one request
- **Incremental sync**: Only sync records changed since last sync
- **Automatic sync on login**: Essential data synced automatically when user logs in
- **Hourly automatic sync**: Server runs sync every hour
- **Manual sync**: Trigger sync manually via API

## Essential Tables for POS Operations

The following tables are synced on login and hourly:

1. **Master Data** (no dependencies):
   - `Location` - Store/warehouse locations
   - `Brand` - Product brands
   - `Supplier` - Product suppliers
   - `TaxCategory` - Tax categories

2. **Categories**:
   - `Category` - Product categories with hierarchical structure

3. **Products**:
   - `Product` - Products (depends on Category, Brand, Supplier)
   - `ProductVariant` - Product variants (depends on Product)
   - `InventoryItem` - Inventory levels (depends on ProductVariant and Location)

4. **User Data**:
   - `User` - User accounts
   - `UserLocation` - User location assignments

## Sync Endpoints

### 1. Bidirectional Sync (Recommended)

**Endpoint:** `POST /api/sync/:table/bidirectional`

Performs both upload and download in one request.

**Request:**
```json
{
  "records": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Updated Category",
      "description": "Updated description",
      "updated_at": "2024-01-01T12:00:00.000Z"
    }
  ],
  "lastSyncedAt": "2024-01-01T11:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "upload": {
      "created": 0,
      "updated": 1,
      "errors": []
    },
    "download": {
      "records": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "name": "Updated Category",
          "sync_status": "synced",
          "last_synced_at": "2024-01-01T12:00:00.000Z"
        }
      ],
      "hasMore": false,
      "totalCount": 1
    }
  }
}
```

### 2. Upload Only

**Endpoint:** `POST /api/sync/:table/upload`

Upload local changes to server.

**Request:**
```json
{
  "records": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "New Category",
      "description": "Category description"
    }
  ]
}
```

### 3. Download Only

**Endpoint:** `GET /api/sync/:table/download?lastSyncedAt=2024-01-01T11:00:00.000Z&limit=100&offset=0`

Download records from server.

**Query Parameters:**
- `lastSyncedAt` (optional): Only get records modified after this time
- `limit` (optional, default: 100): Maximum records per request
- `offset` (optional, default: 0): Pagination offset

### 4. Sync Status

**Endpoint:** `GET /api/sync/status`

Get sync status and available tables.

## Sync Flow for Client Application

### On Login

1. User logs in via `POST /api/auth/login`
2. Server automatically triggers `syncOnLogin()` which syncs:
   - Location, Brand, Supplier, TaxCategory
   - Category (all categories with hierarchy)
   - Product (all products)
   - ProductVariant (all variants)
   - InventoryItem (all inventory)
   - User, UserLocation

### Periodic Sync (Every Hour)

The server automatically syncs all tables every hour. The client can also trigger manual sync.

### Manual Sync Workflow

For each table, perform bidirectional sync:

```javascript
// Example: Sync Categories
async function syncCategories() {
  // 1. Get local records that need to be uploaded
  const localChanges = await getLocalUnsyncedRecords('Category');
  
  // 2. Get last sync timestamp
  const lastSyncedAt = await getLastSyncTime('Category');
  
  // 3. Perform bidirectional sync
  const response = await fetch('/api/sync/Category/bidirectional', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      records: localChanges,
      lastSyncedAt: lastSyncedAt
    })
  });
  
  const result = await response.json();
  
  // 4. Update local database with downloaded records
  if (result.success) {
    await updateLocalDatabase('Category', result.data.download.records);
    await markRecordsAsSynced('Category', localChanges);
    await updateLastSyncTime('Category', new Date().toISOString());
  }
}
```

## Sync Order (Dependency Order)

When syncing multiple tables, follow this order:

1. **Location** - No dependencies
2. **Brand** - No dependencies
3. **Supplier** - No dependencies
4. **TaxCategory** - No dependencies
5. **Category** - May have parentCategoryId (but sync all)
6. **Product** - Depends on Category, Brand, Supplier
7. **ProductVariant** - Depends on Product
8. **InventoryItem** - Depends on ProductVariant and Location

## Data Format

### Category
```json
{
  "id": "uuid",
  "name": "Electronics",
  "parentCategoryId": null,
  "description": "Electronic devices",
  "image": "assets/images/categories/electronics.jpg",
  "sortOrder": 1,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Product
```json
{
  "id": "uuid",
  "productCode": "IPHONE-15-PRO",
  "name": "iPhone 15 Pro",
  "description": "Latest iPhone",
  "categoryId": "category-uuid",
  "brandId": "brand-uuid",
  "supplierId": "supplier-uuid",
  "hasVariants": true,
  "trackInventory": true,
  "isTaxable": true,
  "images": ["image1.jpg", "image2.jpg"],
  "tags": ["smartphone", "apple"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### ProductVariant
```json
{
  "id": "uuid",
  "productId": "product-uuid",
  "sku": "IPHONE-15-PRO-128-BLUE",
  "barcode": "1234567890123",
  "variantName": "128GB - Natural Titanium",
  "options": {
    "storage": "128GB",
    "color": "Natural Titanium"
  },
  "retailPrice": 999.00,
  "wholesalePrice": 850.00,
  "cost": 750.00,
  "weight": 0.187,
  "dimensions": {
    "length": 15.9,
    "width": 7.6,
    "height": 0.83,
    "unit": "cm"
  },
  "image": "assets/images/products/iphone-15-pro.jpg",
  "position": 0,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### InventoryItem
```json
{
  "id": "uuid",
  "variantId": "variant-uuid",
  "locationId": "location-uuid",
  "quantityOnHand": 25,
  "quantityAvailable": 20,
  "quantityCommitted": 5,
  "quantityIncoming": 0,
  "reorderPoint": 10,
  "reorderQuantity": 20,
  "lastCountedAt": null,
  "lastReceivedAt": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## Important Notes

1. **Foreign Keys**: When uploading records, ensure referenced records exist:
   - Product requires valid `categoryId`, `brandId`, `supplierId`
   - ProductVariant requires valid `productId`
   - InventoryItem requires valid `variantId` and `locationId`
   - Category `parentCategoryId` can be null or valid category ID

2. **JSON Fields**: These fields are automatically parsed:
   - ProductVariant: `options`, `dimensions`
   - Product: `images`, `tags`
   - Category: `tags` (if exists)

3. **Decimal Fields**: Prices, weights, etc. are converted to numbers for JSON

4. **Date Fields**: All date fields are converted to ISO 8601 strings

5. **Incremental Sync**: Use `lastSyncedAt` to only sync changed records

6. **Pagination**: For large tables, use `limit` and `offset` to paginate downloads

## Error Handling

The sync system handles errors gracefully:
- Upload errors are collected and returned in the `errors` array
- Individual record failures don't stop the entire sync
- Download errors return appropriate HTTP status codes

## Testing Sync

You can test sync endpoints in Swagger UI:
1. Go to `http://localhost:4000/api-docs`
2. Authorize with your JWT token
3. Navigate to Sync endpoints
4. Test bidirectional sync for Category, Product, etc.

