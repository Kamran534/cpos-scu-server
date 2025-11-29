# TradeUnleashed API to Database Mapping

## Overview

This document describes how data from the TradeUnleashed `stockQuery` API is mapped to the POS system database tables: `Product`, `ProductVariant`, and `InventoryItem`.

## API Response Structure

The TradeUnleashed `/api/inventoryItems/stockQuery` endpoint returns an array of inventory items with the following fields:

```json
{
  "id": "string|number",           // Unique item/variant ID in TradeUnleashed
  "name": "string",                // Product/variant name
  "sku": "string|null",            // Stock Keeping Unit
  "barCode": "string|null",        // Barcode
  "productId": "string|number",    // Parent product ID (optional - groups variants)
  "onhand": "number",              // Quantity on hand
  "committed": "number",           // Quantity committed/reserved
  "incoming": "number",            // Quantity incoming
  "continueSelling": "boolean",    // Can sell when out of stock
  "imageUrl": "string|null"        // Product image URL
}
```

## Database Mapping Strategy

### 1. Product Table
**Purpose**: Stores parent products that group related variants together.

**Mapping Logic**:
- One product per unique `productId` from the API
- If `productId` is not provided, each item becomes a separate product (using `item.id`)

**Field Mapping**:
| API Field | Database Field | Transformation |
|-----------|---------------|----------------|
| `productId` (or `id`) | `productCode` | `TU-PROD-{productId}` or use SKU |
| `name` | `name` | Direct mapping |
| N/A | `description` | Not provided by stockQuery API |
| N/A | `categoryName` | Not provided by stockQuery API |
| N/A | `brandName` | Not provided by stockQuery API |
| `continueSelling` | `metadata.continueSelling` | Stored in metadata JSON |
| `imageUrl` | `metadata.imageUrl` | Stored in metadata JSON |
| `productId` | `metadata.tradeUnleashedProductId` | Original API productId |
| `id` | `metadata.tradeUnleashedItemId` | Original API item ID |

**Metadata Structure**:
```json
{
  "tradeUnleashedProductId": "12345",  // API productId
  "tradeUnleashedItemId": "67890",     // API item id
  "imageUrl": "https://...",
  "continueSelling": true,
  "sourceSystem": "tradeunleashed",
  "lastSyncedAt": "2025-11-29T..."
}
```

### 2. ProductVariant Table
**Purpose**: Stores individual variants/SKUs that can be sold.

**Mapping Logic**:
- One variant per unique item `id` from the API
- Each API item represents a sellable variant
- Links to parent product via `productId` (database) / `productSku` (payload)

**Field Mapping**:
| API Field | Database Field | Transformation |
|-----------|---------------|----------------|
| `id` | `metadata.tradeUnleashedItemId` | Original TradeUnleashed item ID |
| `sku` | `sku` | Direct mapping (unique identifier) |
| `name` | `variantName` | Direct mapping |
| `barCode` | `barcode` | Direct mapping |
| N/A | `retailPrice` | Defaults to 0 (not in stockQuery) |
| N/A | `cost` | Not provided by stockQuery API |
| N/A | `weight` | Not provided by stockQuery API |
| `continueSelling` | `metadata.continueSelling` | Stored in metadata JSON |
| `imageUrl` | `metadata.imageUrl` | Stored in metadata JSON |
| `productId` | `metadata.tradeUnleashedProductId` | Parent product reference |

**Metadata Structure**:
```json
{
  "tradeUnleashedItemId": "67890",     // API item id (variant identifier)
  "tradeUnleashedProductId": "12345",  // API productId (parent product)
  "imageUrl": "https://...",
  "continueSelling": true,
  "barcode": "123456789",
  "sourceSystem": "tradeunleashed",
  "lastSyncedAt": "2025-11-29T..."
}
```

### 3. InventoryItem Table
**Purpose**: Stores inventory quantities per variant per location.

**Mapping Logic**:
- One inventory record per variant per facility/location
- Links to variant via `variantId` (database) / `variantSku` (payload)

**Field Mapping**:
| API Field | Database Field | Transformation |
|-----------|---------------|----------------|
| `onhand` | `quantityOnHand` | Direct mapping |
| `committed` | `quantityCommitted` | Direct mapping |
| `onhand - committed` | `quantityAvailable` | Calculated (max 0) |
| `incoming` | `quantityIncoming` | Direct mapping |
| `facilityId` (from query params) | `locationId` | Mapped to Location record |

## Data Flow

```
TradeUnleashed API
    ↓
StockItemMapper (normalizes raw API response)
    ↓
TradeUnleashedProductService (builds payloads)
    ↓
ProductPayloadProcessor (saves to database)
    ↓
Database (Product, ProductVariant, InventoryItem tables)
```

## Important Notes

### Product Grouping
- **With productId**: Multiple variants group under one product
  ```
  Product (productId: 123)
    ├─ Variant (id: 456, sku: "ABC-RED")
    ├─ Variant (id: 457, sku: "ABC-BLUE")
    └─ Variant (id: 458, sku: "ABC-GREEN")
  ```

- **Without productId**: Each item becomes a separate product
  ```
  Product (id: 456)
    └─ Variant (id: 456, sku: "ABC-RED")

  Product (id: 457)
    └─ Variant (id: 457, sku: "ABC-BLUE")
  ```

### SKU Generation
- Primary: Use `sku` field from API
- Fallback 1: Use `barCode` if SKU is null
- Fallback 2: Generate `TU-{id}` if both are null

### Missing Data
The `stockQuery` API has limited data. Missing fields include:
- Product description
- Category, brand, supplier information
- Pricing (retail, wholesale, cost)
- Physical dimensions and weight
- Product type and classifications

To get complete product data, you would need to call additional TradeUnleashed endpoints like `/api/products/{id}`.

### Metadata Preservation
All TradeUnleashed-specific IDs are preserved in the `metadata` JSON field:
- Allows reverse mapping (database → TradeUnleashed)
- Enables future data enrichment
- Supports integration debugging and troubleshooting

## Querying Mapped Data

### Find products from TradeUnleashed
```sql
SELECT * FROM "Product"
WHERE metadata->>'sourceSystem' = 'tradeunleashed';
```

### Find variant by TradeUnleashed item ID
```sql
SELECT * FROM "ProductVariant"
WHERE metadata->>'tradeUnleashedItemId' = '67890';
```

### Find all variants for a TradeUnleashed product
```sql
SELECT v.* FROM "ProductVariant" v
JOIN "Product" p ON v."productId" = p.id
WHERE p.metadata->>'tradeUnleashedProductId' = '12345';
```

### Check inventory for a specific SKU
```sql
SELECT
  v.sku,
  v."variantName",
  l.name as location,
  i."quantityOnHand",
  i."quantityAvailable"
FROM "InventoryItem" i
JOIN "ProductVariant" v ON i."variantId" = v.id
JOIN "Location" l ON i."locationId" = l.id
WHERE v.sku = 'ABC-RED';
```

## Example API Response and Mapping

### API Response Item
```json
{
  "id": 67890,
  "name": "T-Shirt Red Large",
  "sku": "TSHIRT-RED-L",
  "barCode": "123456789",
  "productId": 12345,
  "onhand": 50,
  "committed": 5,
  "incoming": 20,
  "continueSelling": true,
  "imageUrl": "https://example.com/tshirt.jpg"
}
```

### Database Records Created

**Product**:
```json
{
  "id": "uuid-1",
  "productCode": "12345",
  "externalId": "12345",
  "externalSystem": "tradeunleashed",
  "name": "T-Shirt Red Large",
  "metadata": {
    "tradeUnleashedProductId": 12345,
    "tradeUnleashedItemId": 67890,
    "imageUrl": "https://example.com/tshirt.jpg",
    "continueSelling": true,
    "sourceSystem": "tradeunleashed",
    "lastSyncedAt": "2025-11-29T12:00:00Z"
  }
}
```

**ProductVariant**:
```json
{
  "id": "uuid-2",
  "productId": "uuid-1",
  "sku": "TSHIRT-RED-L",
  "barcode": "123456789",
  "variantName": "T-Shirt Red Large",
  "retailPrice": 0,
  "metadata": {
    "tradeUnleashedItemId": 67890,
    "tradeUnleashedProductId": 12345,
    "imageUrl": "https://example.com/tshirt.jpg",
    "continueSelling": true,
    "sourceSystem": "tradeunleashed",
    "lastSyncedAt": "2025-11-29T12:00:00Z"
  }
}
```

**InventoryItem**:
```json
{
  "id": "uuid-3",
  "variantId": "uuid-2",
  "locationId": "uuid-location-1",
  "quantityOnHand": 50,
  "quantityCommitted": 5,
  "quantityAvailable": 45,
  "quantityIncoming": 20
}
```

## Troubleshooting

### Issue: 4800 products but only 1 variant each
**Cause**: The API is not returning `productId` field, so each item is treated as a separate product.

**Solution**:
1. Check API response to confirm `productId` is present
2. Verify StockItemMapper is correctly reading `productId`
3. Check if TradeUnleashed account/facility has product grouping enabled

### Issue: Missing metadata in database
**Cause**: Payload processor not saving `customFields` to metadata.

**Solution**: Ensure `ProductPayloadProcessor.processVariant()` includes:
```typescript
metadata: payload.customFields || {}
```

### Issue: Duplicate products on each sync
**Cause**: SKU matching logic not working correctly.

**Solution**: Check that:
1. SKUs are unique and consistent
2. ProductRepository.findBySku() is working
3. Upsert logic is using correct unique key
