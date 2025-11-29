# Sales Order API Testing Guide

This guide provides step-by-step instructions and examples for testing the Sales Order API integration with TradeUnleashed.

## Prerequisites

Before testing, ensure:

1. Database is set up and migrations are run
2. Store exists in the system (storeId = 1 for examples)
3. Products are synced from TradeUnleashed with `tuProductId` populated
4. API server is running

## Test Data Setup

### 1. Ensure Products Exist

First, verify that products from TradeUnleashed are synced:

```sql
-- Check if products exist with TradeUnleashed IDs
SELECT id, name, sku, tuProductId, storeId
FROM products
WHERE storeId = 1 AND tuProductId IS NOT NULL;
```

Example result:
```
id  | name           | sku       | tuProductId | storeId
----|----------------|-----------|-------------|--------
1   | Pillow 1 Blue  | PLW-001B  | 182783      | 1
2   | Pillow 2 Red   | PLW-002R  | 182784      | 1
```

If products don't exist, insert test products:

```sql
-- Insert test products with TradeUnleashed IDs
INSERT INTO products (name, sku, tuProductId, storeId, createdAt, updatedAt)
VALUES
  ('Pillow 1 Blue', 'PLW-001B', 182783, 1, NOW(), NOW()),
  ('Pillow 2 Red', 'PLW-002R', 182784, 1, NOW(), NOW());
```

## Test Scenarios

### Scenario 1: Create a New Sales Order (Success)

**Test Case:** Create a new sales order with valid product IDs.

**Request:**
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
  }'
```

**Expected Response:**
```json
{
  "success": 1,
  "failed": 0,
  "created": 1,
  "updated": 0,
  "errors": []
}
```

**Verification:**
```sql
-- Verify the order was created
SELECT * FROM sale_orders WHERE tuSalesOrderId = 12345;

-- Verify the order lines were created with correct HQ product IDs
SELECT sol.*, p.name, p.sku, p.tuProductId
FROM sale_order_lines sol
JOIN products p ON sol.productId = p.id
WHERE sol.saleOrderId = (SELECT id FROM sale_orders WHERE tuSalesOrderId = 12345);
```

### Scenario 2: Update an Existing Sales Order

**Test Case:** Update a previously created sales order.

**Request:**
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
        "status": "completed",
        "totalAmount": 350.00,
        "lastModifiedOn": "2024-01-16T09:00:00Z",
        "lines": [
          {
            "id": 54321,
            "productId": 182783,
            "quantity": 3,
            "unitPrice": 49.99,
            "discount": 0,
            "taxAmount": 12.75,
            "lineTotal": 162.72
          }
        ]
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": 1,
  "failed": 0,
  "created": 0,
  "updated": 1,
  "errors": []
}
```

**Verification:**
```sql
-- Verify the order was updated
SELECT status, totalAmount, tuLastModifiedOn
FROM sale_orders
WHERE tuSalesOrderId = 12345;
-- Should show: status='completed', totalAmount=350.00

-- Verify old lines were replaced
SELECT COUNT(*) FROM sale_order_lines
WHERE saleOrderId = (SELECT id FROM sale_orders WHERE tuSalesOrderId = 12345);
-- Should show: 1 (only one line now)
```

### Scenario 3: Product Not Found Error

**Test Case:** Try to create an order with a product that doesn't exist in HQ.

**Request:**
```bash
curl -X POST http://localhost:3000/api/sales-orders/bulk-save \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "orders": [
      {
        "id": 12346,
        "orderNumber": "SO-2024-002",
        "customerId": 67890,
        "orderDate": "2024-01-15T10:30:00Z",
        "status": "confirmed",
        "totalAmount": 99.99,
        "lines": [
          {
            "id": 54323,
            "productId": 999999,
            "quantity": 1,
            "unitPrice": 99.99,
            "discount": 0,
            "taxAmount": 8.50,
            "lineTotal": 108.49
          }
        ]
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": 0,
  "failed": 1,
  "created": 0,
  "updated": 0,
  "errors": [
    {
      "orderNumber": "SO-2024-002",
      "error": "Product with TradeUnleashed ID 999999 not found in HQ system. Please sync products from TradeUnleashed before creating sales orders."
    }
  ]
}
```

### Scenario 4: Validation Errors

**Test Case:** Submit invalid order data.

**Request:**
```bash
curl -X POST http://localhost:3000/api/sales-orders/bulk-save \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "orders": [
      {
        "id": 12347,
        "orderNumber": "",
        "customerId": null,
        "lines": [
          {
            "id": 54324,
            "productId": 182783,
            "quantity": -1,
            "unitPrice": 49.99
          }
        ]
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": 0,
  "failed": 1,
  "created": 0,
  "updated": 0,
  "errors": [
    {
      "orderNumber": "Order ID 12347",
      "error": "Invalid sales order payload: Order number is required, Customer ID is required, Line 1: Quantity must be greater than 0"
    }
  ]
}
```

### Scenario 5: Bulk Import (Mixed Success/Failure)

**Test Case:** Import multiple orders where some succeed and some fail.

**Request:**
```bash
curl -X POST http://localhost:3000/api/sales-orders/bulk-save \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "orders": [
      {
        "id": 12348,
        "orderNumber": "SO-2024-003",
        "customerId": 67890,
        "orderDate": "2024-01-15T10:30:00Z",
        "status": "confirmed",
        "totalAmount": 149.99,
        "lines": [
          {
            "id": 54325,
            "productId": 182783,
            "quantity": 3,
            "unitPrice": 49.99,
            "discount": 0,
            "taxAmount": 12.75,
            "lineTotal": 162.72
          }
        ]
      },
      {
        "id": 12349,
        "orderNumber": "SO-2024-004",
        "customerId": 67890,
        "orderDate": "2024-01-15T10:30:00Z",
        "status": "confirmed",
        "totalAmount": 99.99,
        "lines": [
          {
            "id": 54326,
            "productId": 999999,
            "quantity": 1,
            "unitPrice": 99.99,
            "discount": 0,
            "taxAmount": 8.50,
            "lineTotal": 108.49
          }
        ]
      },
      {
        "id": 12350,
        "orderNumber": "SO-2024-005",
        "customerId": 67891,
        "orderDate": "2024-01-15T10:30:00Z",
        "status": "pending",
        "totalAmount": 179.97,
        "lines": [
          {
            "id": 54327,
            "productId": 182784,
            "quantity": 3,
            "unitPrice": 59.99,
            "discount": 0,
            "taxAmount": 15.30,
            "lineTotal": 195.27
          }
        ]
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "success": 2,
  "failed": 1,
  "created": 2,
  "updated": 0,
  "errors": [
    {
      "orderNumber": "SO-2024-004",
      "error": "Product with TradeUnleashed ID 999999 not found in HQ system. Please sync products from TradeUnleashed before creating sales orders."
    }
  ]
}
```

**Verification:**
```sql
-- Verify successful orders were created
SELECT tuSalesOrderNumber, status, totalAmount
FROM sale_orders
WHERE tuSalesOrderId IN (12348, 12350);
-- Should show 2 orders: SO-2024-003 and SO-2024-005

-- Verify failed order was not created
SELECT COUNT(*) FROM sale_orders WHERE tuSalesOrderId = 12349;
-- Should show: 0
```

### Scenario 6: Get Sales Orders with Filters

**Test Case:** Retrieve orders with status filter.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/sales-orders/1?status=confirmed&limit=10&offset=0"
```

**Expected Response:**
```json
{
  "orders": [
    {
      "id": 1,
      "storeId": 1,
      "tuSalesOrderId": 12348,
      "tuSalesOrderNumber": "SO-2024-003",
      "tuCustomerId": 67890,
      "orderDate": "2024-01-15T10:30:00.000Z",
      "status": "confirmed",
      "totalAmount": "149.99",
      "lines": [...]
    }
  ],
  "total": 1
}
```

### Scenario 7: Get Order by TradeUnleashed ID

**Test Case:** Retrieve a specific order by its TradeUnleashed ID.

**Request:**
```bash
curl -X GET "http://localhost:3000/api/sales-orders/1/tu/12348"
```

**Expected Response:**
```json
{
  "id": 1,
  "storeId": 1,
  "tuSalesOrderId": 12348,
  "tuSalesOrderNumber": "SO-2024-003",
  "tuCustomerId": 67890,
  "orderDate": "2024-01-15T10:30:00.000Z",
  "status": "confirmed",
  "totalAmount": "149.99",
  "tuSyncStatus": "synced",
  "lines": [
    {
      "id": 1,
      "saleOrderId": 1,
      "productId": 1,
      "tuSalesOrderLineId": 54325,
      "tuProductId": 182783,
      "quantity": "3.00",
      "unitPrice": "49.99",
      "lineTotal": "162.72"
    }
  ]
}
```

### Scenario 8: Save Single Order

**Test Case:** Create a single order using the non-bulk endpoint.

**Request:**
```bash
curl -X POST http://localhost:3000/api/sales-orders \
  -H "Content-Type: application/json" \
  -d '{
    "storeId": 1,
    "order": {
      "id": 12351,
      "orderNumber": "SO-2024-006",
      "customerId": 67892,
      "orderDate": "2024-01-16T14:00:00Z",
      "status": "pending",
      "totalAmount": 59.99,
      "lines": [
        {
          "id": 54328,
          "productId": 182783,
          "quantity": 1,
          "unitPrice": 49.99,
          "discount": 0,
          "taxAmount": 4.25,
          "lineTotal": 54.24
        }
      ]
    }
  }'
```

**Expected Response:**
```json
{
  "message": "Sales order created",
  "order": {
    "id": 4,
    "storeId": 1,
    "tuSalesOrderId": 12351,
    "tuSalesOrderNumber": "SO-2024-006",
    "status": "pending",
    "lines": [...]
  },
  "created": true
}
```

## Automated Test Script

Here's a Node.js test script to automate testing:

```javascript
// test-sales-orders.js
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function runTests() {
  console.log('Starting Sales Order API Tests...\n');

  // Test 1: Create new order
  console.log('Test 1: Create new order');
  try {
    const response = await axios.post(`${API_BASE}/sales-orders/bulk-save`, {
      storeId: 1,
      orders: [{
        id: 12345,
        orderNumber: 'SO-2024-001',
        customerId: 67890,
        orderDate: '2024-01-15T10:30:00Z',
        status: 'confirmed',
        totalAmount: 299.99,
        lines: [{
          id: 54321,
          productId: 182783,
          quantity: 2,
          unitPrice: 49.99,
          discount: 0,
          taxAmount: 8.50,
          lineTotal: 108.48
        }]
      }]
    });
    console.log('✓ Passed:', response.data);
  } catch (error) {
    console.log('✗ Failed:', error.response?.data || error.message);
  }

  // Test 2: Product not found
  console.log('\nTest 2: Product not found error');
  try {
    const response = await axios.post(`${API_BASE}/sales-orders/bulk-save`, {
      storeId: 1,
      orders: [{
        id: 12346,
        orderNumber: 'SO-2024-002',
        customerId: 67890,
        orderDate: '2024-01-15T10:30:00Z',
        status: 'confirmed',
        totalAmount: 99.99,
        lines: [{
          id: 54323,
          productId: 999999,
          quantity: 1,
          unitPrice: 99.99,
          discount: 0,
          taxAmount: 8.50,
          lineTotal: 108.49
        }]
      }]
    });
    console.log('✓ Passed:', response.data);
  } catch (error) {
    console.log('✗ Failed:', error.response?.data || error.message);
  }

  // Test 3: Get orders
  console.log('\nTest 3: Get orders for store');
  try {
    const response = await axios.get(`${API_BASE}/sales-orders/1?limit=10`);
    console.log('✓ Passed: Found', response.data.total, 'orders');
  } catch (error) {
    console.log('✗ Failed:', error.response?.data || error.message);
  }

  // Test 4: Get order by TU ID
  console.log('\nTest 4: Get order by TradeUnleashed ID');
  try {
    const response = await axios.get(`${API_BASE}/sales-orders/1/tu/12345`);
    console.log('✓ Passed:', response.data.tuSalesOrderNumber);
  } catch (error) {
    console.log('✗ Failed:', error.response?.data || error.message);
  }

  console.log('\nTests completed!');
}

runTests();
```

**Run the test script:**
```bash
node test-sales-orders.js
```

## Performance Testing

### Load Test with Artillery

Create `artillery-test.yml`:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: Bulk Save Orders
    flow:
      - post:
          url: '/api/sales-orders/bulk-save'
          json:
            storeId: 1
            orders:
              - id: '{{ $randomNumber() }}'
                orderNumber: 'SO-{{ $randomNumber() }}'
                customerId: 67890
                orderDate: '2024-01-15T10:30:00Z'
                status: 'confirmed'
                totalAmount: 299.99
                lines:
                  - id: '{{ $randomNumber() }}'
                    productId: 182783
                    quantity: 2
                    unitPrice: 49.99
                    discount: 0
                    taxAmount: 8.50
                    lineTotal: 108.48
```

**Run load test:**
```bash
artillery run artillery-test.yml
```

## Database Verification Queries

```sql
-- Count total orders
SELECT COUNT(*) as total_orders FROM sale_orders;

-- Count orders by status
SELECT status, COUNT(*) as count
FROM sale_orders
GROUP BY status;

-- Count orders by sync status
SELECT tuSyncStatus, COUNT(*) as count
FROM sale_orders
GROUP BY tuSyncStatus;

-- Verify product mappings in order lines
SELECT
  so.tuSalesOrderNumber,
  p.name as product_name,
  p.sku,
  sol.tuProductId as trade_unleashed_product_id,
  sol.productId as hq_product_id,
  sol.quantity
FROM sale_order_lines sol
JOIN sale_orders so ON sol.saleOrderId = so.id
JOIN products p ON sol.productId = p.id
ORDER BY so.orderDate DESC;

-- Find orders with failed sync
SELECT tuSalesOrderNumber, tuSyncStatus, tuSyncError
FROM sale_orders
WHERE tuSyncStatus = 'failed';
```

## Troubleshooting

### Issue: Product mapping fails

**Solution:**
1. Verify products exist: `SELECT * FROM products WHERE tuProductId = 182783;`
2. Sync products from TradeUnleashed first
3. Check that `tuProductId` is populated correctly

### Issue: Order lines not created

**Solution:**
1. Check transaction logs
2. Verify line validation (quantity > 0, valid product IDs)
3. Check database constraints

### Issue: Duplicate orders

**Solution:**
- The API is idempotent - sending the same TradeUnleashed order ID will update the existing order
- Check `tuSalesOrderId` for uniqueness

## Next Steps

After testing, consider:
1. Adding authentication middleware
2. Implementing rate limiting
3. Adding webhook notifications for order status changes
4. Creating scheduled jobs for automatic order syncing
5. Adding order status update endpoints
