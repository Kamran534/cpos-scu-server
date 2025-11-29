# Swagger API Guide - Create Sales Orders from TradeUnleashed

## Quick Start

1. **Open Swagger UI**: Navigate to `http://localhost:4000/api-docs`
2. **Find Endpoint**: Look for `POST /api/sales-orders/bulk-save`
3. **Use Ready JSON**: Copy contents from `swagger-order-input-ready.json` (uses existing products)
4. **Or Use Template**: Copy from `swagger-order-input-template.json` and replace placeholders

## Request Format

```json
{
  "storeId": 1,
  "locationId": "184806",
  "cashierId": "5abd7a19-b236-4d17-854c-2c491c9a5c5d",
  "orders": [
    {
      "id": 1504723025127,
      "orderNumber": "SO-TU-5",
      "customerId": null,
      "orderDate": "2024-11-02T01:29:27.859Z",
      "status": "confirmed",
      "totalAmount": 1000,
      "lastModifiedOn": "2024-11-02T01:29:27.859Z",
      "lines": [
        {
          "id": 1611469024988,
          "productId": 359605,
          "quantity": 1,
          "unitPrice": 1000,
          "discount": 0,
          "taxAmount": 0,
          "lineTotal": 1000
        }
      ]
    }
  ]
}
```

## Field Descriptions

### Top Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `storeId` | number | Yes | Store ID (currently not used, can be 1) |
| `locationId` | string | No* | Location code (e.g., "184806") or UUID. If not provided, uses first active location |
| `cashierId` | string | No* | Cashier/user UUID. If not provided, uses first active user |
| `orders` | array | Yes | Array of sales orders to create |

*Will use defaults if not provided

### Order Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | TradeUnleashed order ID |
| `orderNumber` | string | Yes | Unique order number/reference |
| `customerId` | number/null | No | TradeUnleashed customer/party ID (can be null) |
| `orderDate` | string | Yes | ISO date string |
| `status` | string | Yes | Order status: "confirmed", "pending", "voided", "parked", "onhold" |
| `totalAmount` | number | Yes | Total order amount |
| `lastModifiedOn` | string | Yes | ISO date string |
| `lines` | array | Yes | Array of line items |

### Line Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | Yes | TradeUnleashed line item ID |
| `productId` | number | Yes | **TradeUnleashed inventory item ID** - Must exist in DB as ProductVariant with matching `externalId` |
| `quantity` | number | Yes | Quantity ordered |
| `unitPrice` | number | Yes | Price per unit |
| `discount` | number | No | Discount amount (default: 0) |
| `taxAmount` | number | No | Tax amount (default: 0) |
| `lineTotal` | number | Yes | Line total (unitPrice * quantity - discount + tax) |

## Important Notes

### Product ID Mapping

The `productId` in line items is the **TradeUnleashed inventory item ID**, not your internal ProductVariant ID.

**Example:**
- TradeUnleashed inventory item ID: `393165`
- Your database ProductVariant must have: `externalId: "393165"` and `externalSystem: "tradeunleashed"`

**To check if a product exists:**
```bash
npm run check-product 393165
```

### Location ID

You can use either:
- **Location Code**: `"184806"` (will be looked up automatically)
- **Location UUID**: `"5726ea68-1b2a-44f0-9357-f08529d72663"` (direct)

### Status Mapping

| TradeUnleashed Status | Maps To | Description |
|----------------------|---------|-------------|
| `"confirmed"` | `Completed` | Order is confirmed/completed |
| `"pending"` | `Open` | Order is pending |
| `"voided"` | `Voided` | Order is voided |
| `"parked"` | `Parked` | Order is parked/saved |
| `"onhold"` | `OnHold` | Order is on hold |

## Example: Using Existing Products

The file `swagger-order-input-ready.json` contains orders using product `359605` which exists in your database.

## Example: Transform TradeUnleashed Format

To transform TradeUnleashed orders automatically:

```bash
node transform-tu-to-api.js
```

This will:
1. Read TradeUnleashed order format
2. Map location, customer, cashier from database
3. Generate `swagger-order-input.json` ready for Swagger UI

## Response Format

Success response:
```json
{
  "success": 1,
  "failed": 0,
  "created": 1,
  "updated": 0,
  "errors": []
}
```

Error response:
```json
{
  "success": 0,
  "failed": 1,
  "created": 0,
  "updated": 0,
  "errors": [
    {
      "orderNumber": "SO-TU-5",
      "error": "ProductVariant with TradeUnleashed ID 393165 not found"
    }
  ]
}
```

## Troubleshooting

### Product Not Found Error
- **Problem**: Product with TradeUnleashed ID doesn't exist
- **Solution**: 
  1. Check if product exists: `npm run check-product <ID>`
  2. Sync products from TradeUnleashed if missing
  3. Verify `externalId` matches the TradeUnleashed inventory item ID

### Location Not Found
- **Problem**: Location code doesn't exist
- **Solution**: Use location UUID instead, or ensure location with that code exists

### Invalid Status Error
- **Problem**: Status value not recognized
- **Solution**: Use one of: "confirmed", "pending", "voided", "parked", "onhold"

