# Sales Order API Documentation

This API allows you to sync sales orders from TradeUnleashed to the HQ system with automatic product mapping.

## Overview

The Sales Order API handles:
- Bulk import of sales orders from TradeUnleashed
- Automatic mapping of TradeUnleashed product IDs to HQ product IDs
- Order status tracking and synchronization
- Error handling and validation

## Product Mapping

The API automatically maps TradeUnleashed products to HQ products using the `tuProductId` field. Before creating sales orders, ensure that:

1. Products are synced from TradeUnleashed to HQ
2. Each product in HQ has its `tuProductId` field populated
3. The product mapping is current

### TradeUnleashed Product Structure

Products from TradeUnleashed follow this structure:
```json
[
  "id",           // TradeUnleashed product ID
  "name",         // Product name
  "sku",          // Product SKU
  "barCode",      // Barcode
  "productId",    // Parent product ID
  "onhand",       // On-hand quantity
  "committed",    // Committed quantity
  "incoming",     // Incoming quantity
  "continueSelling", // Continue selling flag
  "imageUrl"      // Product image URL
]
```

Example:
```json
[182783, "Pillow 1 Blue", "PLW-001B", null, 182780, 0.0, 0.0, 0.0, null, null]
```

The `id` field (182783 in the example) is used as `tuProductId` to map to HQ products.

## Endpoints

### 1. Bulk Save Sales Orders

**Endpoint:** `POST /api/sales-orders/bulk-save`

**Description:** Creates or updates multiple sales orders in a single request. Handles product mapping automatically.

**Request Body:**
```json
{
  "storeId": 1,
  "orders": [
    {
      "id": 12345,
      "orderNumber": "SO-2024-001",
      "customerId": 67890,
      "orderDate": "2024-01-15T10:30:00Z",
      "status": "confirmed",
      "totalAmount": 299.99,
      "lastModifiedOn": "2024-01-15T11:00:00Z",
      "lines": [
        {
          "id": 54321,
          "productId": 182783,
          "quantity": 2,
          "unitPrice": 49.99,
          "discount": 0,
          "taxAmount": 8.50,
          "lineTotal": 108.48
        },
        {
          "id": 54322,
          "productId": 182784,
          "quantity": 3,
          "unitPrice": 59.99,
          "discount": 10.00,
          "taxAmount": 15.30,
          "lineTotal": 185.27
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": 1,
  "failed": 0,
  "created": 1,
  "updated": 0,
  "errors": []
}
```

**Error Response (Product Not Found):**
```json
{
  "success": 0,
  "failed": 1,
  "created": 0,
  "updated": 0,
  "errors": [
    {
      "orderNumber": "SO-2024-001",
      "error": "Product with TradeUnleashed ID 182783 not found in HQ system. Please sync products from TradeUnleashed before creating sales orders."
    }
  ]
}
```

### 2. Save Single Sales Order

**Endpoint:** `POST /api/sales-orders`

**Description:** Creates or updates a single sales order.

**Request Body:**
```json
{
  "storeId": 1,
  "order": {
    "id": 12345,
    "orderNumber": "SO-2024-001",
    "customerId": 67890,
    "orderDate": "2024-01-15T10:30:00Z",
    "status": "confirmed",
    "totalAmount": 299.99,
    "lines": [
      {
        "id": 54321,
        "productId": 182783,
        "quantity": 2,
        "unitPrice": 49.99,
        "discount": 0,
        "taxAmount": 8.50,
        "lineTotal": 108.48
      }
    ]
  }
}
```

**Response:**
```json
{
  "message": "Sales order created",
  "order": {
    "id": 1,
    "storeId": 1,
    "tuSalesOrderId": 12345,
    "tuSalesOrderNumber": "SO-2024-001",
    "orderDate": "2024-01-15T10:30:00Z",
    "status": "confirmed",
    "totalAmount": 299.99,
    "lines": [...]
  },
  "created": true
}
```

### 3. Get Sales Orders

**Endpoint:** `GET /api/sales-orders/:storeId`

**Description:** Retrieves sales orders for a store with optional filters.

**Query Parameters:**
- `status` (optional): Filter by order status
- `fromDate` (optional): Filter orders from this date (YYYY-MM-DD)
- `toDate` (optional): Filter orders to this date (YYYY-MM-DD)
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Example Request:**
```
GET /api/sales-orders/1?status=confirmed&limit=50&offset=0
```

**Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "storeId": 1,
      "tuSalesOrderId": 12345,
      "tuSalesOrderNumber": "SO-2024-001",
      "orderDate": "2024-01-15T10:30:00Z",
      "status": "confirmed",
      "totalAmount": 299.99,
      "lines": [...]
    }
  ],
  "total": 1
}
```

### 4. Get Sales Order by TradeUnleashed ID

**Endpoint:** `GET /api/sales-orders/:storeId/tu/:tuOrderId`

**Description:** Retrieves a specific sales order by its TradeUnleashed order ID.

**Example Request:**
```
GET /api/sales-orders/1/tu/12345
```

**Response:**
```json
{
  "id": 1,
  "storeId": 1,
  "tuSalesOrderId": 12345,
  "tuSalesOrderNumber": "SO-2024-001",
  "orderDate": "2024-01-15T10:30:00Z",
  "status": "confirmed",
  "totalAmount": 299.99,
  "lines": [...]
}
```

### 5. Get Orders Needing Sync

**Endpoint:** `GET /api/sales-orders/:storeId/needing-sync`

**Description:** Retrieves orders that need re-synchronization (status: pending or failed).

**Example Request:**
```
GET /api/sales-orders/1/needing-sync
```

**Response:**
```json
[
  {
    "id": 2,
    "storeId": 1,
    "tuSalesOrderId": 12346,
    "tuSalesOrderNumber": "SO-2024-002",
    "tuSyncStatus": "failed",
    "tuSyncError": "Product mapping failed",
    "lines": [...]
  }
]
```

## Data Models

### Sales Order

| Field | Type | Description |
|-------|------|-------------|
| id | number | HQ system order ID |
| storeId | number | Store ID |
| tuSalesOrderId | number | TradeUnleashed sales order ID |
| tuSalesOrderNumber | string | Order number from TradeUnleashed |
| tuCustomerId | number | TradeUnleashed customer ID |
| orderDate | datetime | Order date |
| status | string | Order status |
| totalAmount | decimal | Total order amount |
| tuLastModifiedOn | datetime | Last modified date in TradeUnleashed |
| tuSyncStatus | string | Sync status (pending/synced/failed) |
| tuLastSyncedAt | datetime | Last sync timestamp |
| tuSyncError | string | Error message if sync failed |

### Sales Order Line

| Field | Type | Description |
|-------|------|-------------|
| id | number | HQ system line ID |
| saleOrderId | number | Parent sales order ID |
| productId | number | HQ product ID (mapped from TradeUnleashed) |
| tuSalesOrderLineId | number | TradeUnleashed line ID |
| tuProductId | number | TradeUnleashed product ID (for reference) |
| quantity | decimal | Quantity ordered |
| unitPrice | decimal | Unit price |
| discount | decimal | Discount amount |
| taxAmount | decimal | Tax amount |
| lineTotal | decimal | Line total |

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid input data |
| 404 | Not Found - Order or product not found |
| 500 | Internal Server Error |

## Common Errors

### Product Not Found

```json
{
  "error": "Product with TradeUnleashed ID 182783 not found in HQ system. Please sync products from TradeUnleashed before creating sales orders."
}
```

**Solution:** Ensure products are synced from TradeUnleashed first.

### Invalid Order Data

```json
{
  "error": "Invalid sales order payload: Sales order ID is required, Order number is required"
}
```

**Solution:** Verify all required fields are present in the request.

### Validation Errors

```json
{
  "errors": [
    {
      "orderNumber": "SO-2024-001",
      "error": "Line 1: Quantity must be greater than 0"
    }
  ]
}
```

**Solution:** Fix the validation errors in the order data.

## Integration Example

### Node.js/TypeScript Example

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

async function syncSalesOrders(storeId: number, tradeUnleashedOrders: any[]) {
  try {
    const response = await axios.post(`${API_BASE_URL}/sales-orders/bulk-save`, {
      storeId,
      orders: tradeUnleashedOrders
    });

    console.log(`Successfully synced ${response.data.success} orders`);
    console.log(`Created: ${response.data.created}, Updated: ${response.data.updated}`);

    if (response.data.errors.length > 0) {
      console.error('Errors:', response.data.errors);
    }

    return response.data;
  } catch (error) {
    console.error('Failed to sync sales orders:', error);
    throw error;
  }
}

// Example usage
const orders = [
  {
    id: 12345,
    orderNumber: "SO-2024-001",
    customerId: 67890,
    orderDate: "2024-01-15T10:30:00Z",
    status: "confirmed",
    totalAmount: 299.99,
    lines: [
      {
        id: 54321,
        productId: 182783, // TradeUnleashed product ID
        quantity: 2,
        unitPrice: 49.99,
        discount: 0,
        taxAmount: 8.50,
        lineTotal: 108.48
      }
    ]
  }
];

syncSalesOrders(1, orders);
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/sales-orders/bulk-save \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "orders": [
      {
        "id": 12345,
        "orderNumber": "SO-2024-001",
        "customerId": 67890,
        "orderDate": "2024-01-15T10:30:00Z",
        "status": "confirmed",
        "totalAmount": 299.99,
        "lines": [
          {
            "id": 54321,
            "productId": 182783,
            "quantity": 2,
            "unitPrice": 49.99,
            "discount": 0,
            "taxAmount": 8.50,
            "lineTotal": 108.48
          }
        ]
      }
    ]
  }'
```

## Best Practices

1. **Sync Products First:** Always ensure products are synced from TradeUnleashed before creating sales orders.

2. **Batch Processing:** Use the bulk save endpoint for syncing multiple orders to improve performance.

3. **Error Handling:** Check the `errors` array in the response to handle failed orders appropriately.

4. **Idempotency:** The API uses TradeUnleashed order IDs to prevent duplicates. Sending the same order multiple times will update the existing order.

5. **Product Mapping:** Verify that all products in the order have corresponding HQ products with `tuProductId` set.

6. **Status Monitoring:** Use the `/needing-sync` endpoint to identify and retry failed orders.

7. **Date Formats:** Always use ISO 8601 format for dates (e.g., "2024-01-15T10:30:00Z").

## Notes

- All endpoints should be protected with authentication middleware in production
- The API uses transactions to ensure data consistency
- Product mapping is performed during order creation/update
- Orders can be updated by sending the same TradeUnleashed order ID again
