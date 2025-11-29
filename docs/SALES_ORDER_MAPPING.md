# Sales Order Mapping for TradeUnleashed

## Overview

This document explains how products are mapped for sales order synchronization between the POS system and TradeUnleashed HQ.

## Critical Requirement

When sending sales orders to TradeUnleashed HQ, you **MUST** send the original TradeUnleashed item ID that was received during product sync. The HQ server expects this ID to match products in their system.

## Database Structure

### Product Table
Stores the TradeUnleashed **productId** (parent product):

| Field | Example Value | Description |
|-------|--------------|-------------|
| `externalId` | `"730467674"` | TradeUnleashed productId |
| `externalSystem` | `"tradeunleashed"` | Source system identifier |
| `productCode` | `"TU-PROD-730467674"` | Internal product code |
| `metadata` | `{...}` | JSON with additional TU data |

### ProductVariant Table
Stores the TradeUnleashed **item ID** (variant/SKU) - **THIS IS CRITICAL FOR SALES ORDERS**:

| Field | Example Value | Description |
|-------|--------------|-------------|
| `externalId` | `"730467712"` | **TradeUnleashed item ID - SEND THIS in sales orders!** |
| `externalSystem` | `"tradeunleashed"` | Source system identifier |
| `sku` | `"4G1-84-844OGL"` | Internal SKU |
| `barcode` | `"4G1-84-844OGL"` | Product barcode |
| `metadata` | `{...}` | JSON with additional TU data |

## Example: API Response → Database Mapping

### TradeUnleashed stockQuery API Response
```json
[
  730467712,                              // id (item/variant ID)
  "2-PC Stitched Printed Suit L / Orange", // name
  "4G1-84-844OGL",                        // sku
  "4G1-84-844OGL",                        // barCode
  730467674,                              // productId (parent product)
  0.0,                                    // onhand
  0.0,                                    // committed
  0.0,                                    // incoming
  null,                                   // continueSelling
  "resources/productImages/..."           // imageUrl
]
```

### Mapped to Database

**Product Record**:
```sql
INSERT INTO "Product" (
  id, productCode, name, externalId, externalSystem, ...
) VALUES (
  'uuid-123',
  '730467674',  -- productId (no prefix)
  '2-PC Stitched Printed Suit L / Orange',
  '730467674',  -- TradeUnleashed productId
  'tradeunleashed',
  ...
);
```

**ProductVariant Record**:
```sql
INSERT INTO "ProductVariant" (
  id, productId, sku, variantName, externalId, externalSystem, barcode, ...
) VALUES (
  'uuid-456',
  'uuid-123',
  '4G1-84-844OGL',
  '2-PC Stitched Printed Suit L / Orange',
  '730467712',  -- TradeUnleashed item ID ⚠️ CRITICAL for sales orders!
  'tradeunleashed',
  '4G1-84-844OGL',
  ...
);
```

## How to Use in Sales Orders

### When Creating a Sale

1. **Customer selects product in POS**
2. **Query the variant**:
```typescript
const variant = await prisma.productVariant.findUnique({
  where: { sku: '4G1-84-844OGL' }
});

// variant.externalId = "730467712"
```

3. **Create sales order locally**:
```typescript
const order = await prisma.saleOrder.create({
  data: {
    orderNumber: 'POS-001',
    // ... other order fields
    lineItems: {
      create: {
        variantId: variant.id,
        quantity: 1,
        unitPrice: 2500,
        // ... other line item fields
      }
    }
  }
});
```

4. **Send to TradeUnleashed HQ**:
```typescript
// Build the payload for TradeUnleashed
const tuPayload = {
  orderNumber: order.orderNumber,
  items: [{
    itemId: variant.externalId, // 730467712 ⚠️ CRITICAL: Use externalId, not your internal ID!
    quantity: 1,
    price: 2500,
    // ... other fields HQ expects
  }]
};

// POST to TradeUnleashed sales order API
await tradeUnleashedClient.createSalesOrder(tuPayload);
```

## SQL Queries for Sales Order Processing

### Get Variant with External ID
```sql
SELECT
  v.id,
  v.sku,
  v."variantName",
  v."externalId",          -- TradeUnleashed item ID
  v."externalSystem",
  v."retailPrice",
  p."externalId" as "productExternalId"
FROM "ProductVariant" v
JOIN "Product" p ON v."productId" = p.id
WHERE v.sku = '4G1-84-844OGL';
```

### Find Product by TradeUnleashed Item ID
```sql
SELECT * FROM "ProductVariant"
WHERE "externalId" = '730467712'
  AND "externalSystem" = 'tradeunleashed';
```

### Get All Order Line Items with External IDs
```sql
SELECT
  o."orderNumber",
  oli.quantity,
  oli."unitPrice",
  v.sku,
  v."externalId" as "tradeUnleashedItemId",  -- Send this to HQ!
  p."externalId" as "tradeUnleashedProductId"
FROM "OrderLineItem" oli
JOIN "SaleOrder" o ON oli."orderId" = o.id
JOIN "ProductVariant" v ON oli."variantId" = v.id
JOIN "Product" p ON v."productId" = p.id
WHERE o.id = 'order-uuid-here';
```

## Important Notes

### ⚠️ Critical Field Mapping
- **Product.externalId** = TradeUnleashed `productId` (parent product grouping)
- **ProductVariant.externalId** = TradeUnleashed `id` (item/variant ID) **← USE THIS FOR SALES ORDERS!**

### Why Both IDs?
- **productId** (730467674): Groups related variants together (e.g., all colors/sizes of same product)
- **item id** (730467712): Identifies the specific variant (e.g., Orange / Large)
- HQ expects the **item ID** (variant) in sales orders, not the product ID

### Validation Before Sending
Always validate that externalId exists before sending to HQ:

```typescript
function validateVariantForSync(variant: ProductVariant) {
  if (!variant.externalId || variant.externalSystem !== 'tradeunleashed') {
    throw new Error(
      `Cannot sync variant ${variant.sku} to TradeUnleashed: ` +
      `missing externalId or wrong external system`
    );
  }
  return variant.externalId; // Safe to send to HQ
}
```

### Handling Products Not From TradeUnleashed
If you create products locally (not synced from TradeUnleashed):
- `externalId` will be `null`
- `externalSystem` will be `null`
- **DO NOT** send these products to TradeUnleashed
- Filter by `externalSystem = 'tradeunleashed'` before syncing

Example filter:
```sql
SELECT * FROM "ProductVariant"
WHERE "externalSystem" = 'tradeunleashed'
  AND "externalId" IS NOT NULL;
```

## Testing the Mapping

### 1. Verify Product Import
After syncing from TradeUnleashed:
```sql
SELECT
  COUNT(*) as total_variants,
  COUNT("externalId") as with_external_id,
  COUNT(*) FILTER (WHERE "externalSystem" = 'tradeunleashed') as from_tradeunleashed
FROM "ProductVariant";
```

Expected: All three counts should match (all variants have externalId and system).

### 2. Sample Data Check
```sql
SELECT
  sku,
  "variantName",
  "externalId",
  "externalSystem",
  metadata->>'tradeUnleashedItemId' as metadata_item_id
FROM "ProductVariant"
WHERE "externalSystem" = 'tradeunleashed'
LIMIT 5;
```

Verify:
- `externalId` matches `metadata.tradeUnleashedItemId`
- All fields are populated

### 3. Sales Order Line Item Query
```sql
WITH order_items AS (
  SELECT
    oli.*,
    v."externalId" as tu_item_id,
    v.sku
  FROM "OrderLineItem" oli
  JOIN "ProductVariant" v ON oli."variantId" = v.id
  WHERE v."externalSystem" = 'tradeunleashed'
)
SELECT * FROM order_items;
```

## Troubleshooting

### Issue: externalId is NULL
**Cause**: Product was created before externalId feature was added, or product was created manually.

**Solution**:
- For TradeUnleashed products: Re-sync from API
- For manual products: Don't sync to TradeUnleashed

### Issue: Sales order rejected by HQ with "Product not found"
**Cause**: Sent wrong ID to HQ (possibly internal UUID instead of externalId).

**Solution**: Always use `variant.externalId`, never `variant.id`:
```typescript
// ❌ WRONG
itemId: variant.id  // "uuid-456" - HQ doesn't know this

// ✅ CORRECT
itemId: variant.externalId  // "730467712" - HQ recognizes this
```

### Issue: Duplicate products after re-sync
**Cause**: SKU matching not working, creating new products instead of updating.

**Solution**: Check that:
- SKUs are unique and consistent
- ProductRepository.findBySku() is working
- Upsert logic uses SKU as unique key
