# Implementation Summary: TradeUnleashed Product & Sales Order Mapping

## Changes Completed

### 1. Database Schema Updates

#### Added to `Product` table:
```sql
ALTER TABLE "Product"
  ADD COLUMN "externalId" TEXT,        -- TradeUnleashed productId (730467674)
  ADD COLUMN "externalSystem" TEXT;    -- 'tradeunleashed'

CREATE INDEX "Product_externalId_externalSystem_idx"
  ON "Product"("externalId", "externalSystem");
```

#### Added to `ProductVariant` table:
```sql
ALTER TABLE "ProductVariant"
  ADD COLUMN "externalId" TEXT,        -- TradeUnleashed item ID (730467712) ⚠️ CRITICAL
  ADD COLUMN "externalSystem" TEXT,    -- 'tradeunleashed'
  ADD COLUMN "metadata" JSONB;         -- Additional integration data

CREATE INDEX "ProductVariant_externalId_externalSystem_idx"
  ON "ProductVariant"("externalId", "externalSystem");
```

### 2. Code Changes

#### File: `pos-server/src/payloads/product.payload.ts`
- Added `customFields` to `ProductVariantPayload` interface to support integration-specific metadata

#### File: `pos-server/src/integrations/tradeunleashed/services/TradeUnleashedProductService.ts`
**buildProductPayload()**:
- Added `externalId` to customFields (TradeUnleashed productId)
- Added `externalSystem: 'tradeunleashed'` to customFields

**buildVariantPayload()**:
- Added `externalId` to customFields (TradeUnleashed item ID - CRITICAL for sales orders)
- Added `externalSystem: 'tradeunleashed'` to customFields
- Stores all TradeUnleashed-specific fields in customFields

#### File: `pos-server/src/core/processors/ProductPayloadProcessor.ts`
**processProduct()**:
- Extracts `externalId` and `externalSystem` from `customFields`
- Saves them to Product table's dedicated fields
- Also preserves full customFields in metadata JSON

**processVariant()**:
- Extracts `externalId` and `externalSystem` from `customFields`
- Saves them to ProductVariant table's dedicated fields
- Also preserves full customFields in metadata JSON

### 3. Database Migrations

- `20251129064556_add_variant_metadata` - Added metadata field to ProductVariant
- `20251129070803_add_external_id_fields` - Added externalId and externalSystem fields to Product and ProductVariant

## How Data is Stored

### Example: TradeUnleashed API Response
```json
[
  730467712,                              // id (item/variant ID)
  "2-PC Stitched Printed Suit L / Orange",
  "4G1-84-844OGL",                        // sku
  "4G1-84-844OGL",                        // barCode
  730467674,                              // productId
  0.0, 0.0, 0.0, null,
  "resources/productImages/..."
]
```

### Stored in Database

**Product Table**:
| Field | Value |
|-------|-------|
| `productCode` | `"TU-PROD-730467674"` |
| `externalId` | `"730467674"` |
| `externalSystem` | `"tradeunleashed"` |
| `metadata` | `{"tradeUnleashedProductId": 730467674, ...}` |

**ProductVariant Table**:
| Field | Value |
|-------|-------|
| `sku` | `"4G1-84-844OGL"` |
| `barcode` | `"4G1-84-844OGL"` |
| `externalId` | `"730467712"` ← **USE THIS FOR SALES ORDERS!** |
| `externalSystem` | `"tradeunleashed"` |
| `metadata` | `{"tradeUnleashedItemId": 730467712, "imageUrl": "...", ...}` |

## Usage for Sales Orders

### Query Variant for Sales Order
```typescript
const variant = await prisma.productVariant.findUnique({
  where: { sku: '4G1-84-844OGL' }
});

// Send to TradeUnleashed HQ
const salesOrderPayload = {
  items: [{
    itemId: variant.externalId, // "730467712" ⚠️ MUST USE THIS!
    quantity: 1,
    price: 2500
  }]
};
```

### SQL Query for Sales Order Line Items
```sql
SELECT
  oli.*,
  v."externalId" as tu_item_id,  -- Send this to HQ!
  v.sku,
  v."variantName"
FROM "OrderLineItem" oli
JOIN "ProductVariant" v ON oli."variantId" = v.id
WHERE v."externalSystem" = 'tradeunleashed';
```

## Benefits of This Implementation

### 1. Direct Field Access
- **Fast queries**: No JSON parsing needed for sales order mapping
- **Indexed**: `externalId + externalSystem` composite index for quick lookups
- **Type-safe**: String fields instead of JSON extraction

### 2. Redundancy for Safety
- **Direct fields**: `externalId`, `externalSystem` for critical operations
- **Metadata JSON**: Full integration data preserved for debugging/future use
- **Both stored**: Belt and suspenders approach ensures data is never lost

### 3. Multi-Integration Support
- `externalSystem` field allows multiple integrations (Shopify, WooCommerce, etc.)
- Can query: `WHERE externalSystem = 'tradeunleashed'` to filter by source
- Future-proof for adding more integrations

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ TradeUnleashed API                                              │
│ GET /api/inventoryItems/stockQuery                              │
│ Response: [730467712, "Product Name", "SKU", ...]               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ StockItemMapper.toNormalized()                                  │
│ Normalizes raw API response to internal format                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ TradeUnleashedProductService                                    │
│ - buildProductPayload() → adds externalId to customFields       │
│ - buildVariantPayload() → adds externalId to customFields       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ ProductPayloadProcessor                                         │
│ - Extracts externalId from customFields                         │
│ - Saves to Product.externalId (productId: 730467674)            │
│ - Saves to ProductVariant.externalId (itemId: 730467712)        │
│ - Also saves full customFields to metadata JSON                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PostgreSQL Database                                             │
│ Product: externalId = "730467674"                               │
│ ProductVariant: externalId = "730467712" ← Use for sales orders │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Sales Order Creation                                            │
│ Query variant → Get externalId → Send to TradeUnleashed HQ      │
└─────────────────────────────────────────────────────────────────┘
```

## Testing & Verification

### 1. After Product Sync
```sql
-- Check that all variants have externalId
SELECT
  COUNT(*) as total,
  COUNT("externalId") as with_external_id,
  COUNT(*) FILTER (WHERE "externalSystem" = 'tradeunleashed') as from_tu
FROM "ProductVariant";
-- All three counts should match
```

### 2. Sample Data
```sql
SELECT
  sku,
  "variantName",
  "externalId",
  metadata->>'tradeUnleashedItemId' as metadata_id
FROM "ProductVariant"
WHERE "externalSystem" = 'tradeunleashed'
LIMIT 5;
-- externalId should match metadata_id
```

### 3. Find Product by TradeUnleashed ID
```sql
SELECT * FROM "ProductVariant"
WHERE "externalId" = '730467712'
  AND "externalSystem" = 'tradeunleashed';
```

## Documentation

Created comprehensive documentation:

1. **TRADEUNLEASHED_MAPPING.md**
   - How API data maps to database tables
   - Field-by-field mapping
   - Data flow diagrams

2. **SALES_ORDER_MAPPING.md** ⚠️ **CRITICAL FOR SALES**
   - How to use externalId for sales orders
   - SQL queries for sales order processing
   - Validation and troubleshooting

3. **IMPLEMENTATION_SUMMARY.md** (this file)
   - All changes made
   - Data flow
   - Testing procedures

## Migration & Deployment

### Database Migration
```bash
cd pos-server
npx prisma migrate deploy
```

This will apply:
1. `20251129064556_add_variant_metadata`
2. `20251129070803_add_external_id_fields`

### Re-sync Products
After deployment, re-sync products from TradeUnleashed to populate the new fields:
```bash
# Your sync command here
# Products will now have externalId fields populated
```

## Critical Reminders

⚠️ **ALWAYS use `variant.externalId` when sending sales orders to TradeUnleashed HQ**

❌ **WRONG**:
```typescript
itemId: variant.id  // Internal UUID - HQ doesn't know this
```

✅ **CORRECT**:
```typescript
itemId: variant.externalId  // TradeUnleashed item ID - HQ recognizes this
```

---

## Summary

✅ Database schema updated with `externalId` and `externalSystem` fields
✅ Code updated to extract and save TradeUnleashed IDs
✅ Migrations created and applied
✅ Indexes created for fast lookups
✅ Documentation created
✅ System ready for sales order integration with TradeUnleashed HQ

**Next Steps**:
1. Sync products from TradeUnleashed to populate externalId fields
2. Test sales order creation using externalId
3. Verify HQ accepts the item IDs
