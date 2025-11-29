# Create Order API - JSON Examples

## Endpoint
`POST /api/sales-orders/create`

## Full Example (All Fields)

```json
{
  "locationId": "5726ea68-1b2a-44f0-9357-f08529d72663",
  "cashierId": "5abd7a19-b236-4d17-854c-2c491c9a5c5d",
  "customerId": "customer-uuid-here",
  "lineItems": [
    {
      "variantId": "variant-uuid-here",
      "quantity": 2,
      "unitPrice": 100.00,
      "salesPersonId": "salesperson-uuid",
      "saleDiscount": {
        "amount": 10.00
      },
      "customDiscount": {
        "percent": 5
      },
      "notes": "Line item notes"
    },
    {
      "variantId": "another-variant-uuid",
      "quantity": 1,
      "unitPrice": 50.00,
      "saleDiscount": {
        "percent": 10
      }
    }
  ],
  "payments": [
    {
      "paymentMethodId": "payment-method-uuid",
      "amount": 280.00,
      "transactionId": "txn-12345",
      "authorizationCode": "AUTH123",
      "cardLast4": "1234",
      "cardBrand": "VISA"
    }
  ],
  "orderLevelDiscount": {
    "amount": 5.00
  },
  "adjustment": {
    "amount": 0,
    "reason": "No adjustment"
  },
  "giftCardNumber": "GIFT123456",
  "notes": "Order notes here",
  "customerNotes": "Customer-specific notes"
}
```

## Simple Example (Required Fields Only)

```json
{
  "locationId": "5726ea68-1b2a-44f0-9357-f08529d72663",
  "cashierId": "5abd7a19-b236-4d17-854c-2c491c9a5c5d",
  "lineItems": [
    {
      "variantId": "variant-uuid-here",
      "quantity": 1,
      "unitPrice": 100.00
    }
  ],
  "payments": [
    {
      "paymentMethodId": "payment-method-uuid",
      "amount": 100.00
    }
  ]
}
```

## Field Descriptions

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `locationId` | string (UUID) | Location/store where order is placed |
| `cashierId` | string (UUID) | Cashier/user who created the order |
| `lineItems` | array | At least one line item required |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `customerId` | string (UUID) | Customer associated with order |
| `payments` | array | Payment information (recommended) |
| `orderLevelDiscount` | object | Order-level discount |
| `adjustment` | object | Order adjustment |
| `giftCardNumber` | string | Gift card to apply |
| `couponCode` | string | Deprecated - use giftCardNumber |
| `notes` | string | General order notes |
| `customerNotes` | string | Customer-specific notes |

### Line Item Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variantId` | string (UUID) | Yes | Product variant UUID |
| `quantity` | number | Yes | Quantity ordered |
| `unitPrice` | number | Yes | Price per unit |
| `salesPersonId` | string (UUID) | No | Sales person assigned |
| `saleDiscount` | object | No | Sale discount (amount or percent) |
| `customDiscount` | object | No | Custom discount (amount or percent) |
| `notes` | string | No | Line item notes |

### Discount Object

```json
{
  "amount": 10.00  // OR
  "percent": 5     // Use one or the other
}
```

### Payment Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentMethodId` | string (UUID) | Yes | Payment method UUID |
| `amount` | number | Yes | Payment amount |
| `transactionId` | string | No | Transaction ID |
| `authorizationCode` | string | No | Authorization code |
| `cardLast4` | string | No | Last 4 digits of card |
| `cardBrand` | string | No | Card brand (VISA, MASTERCARD, etc.) |

### Adjustment Object

```json
{
  "amount": 0,
  "reason": "Adjustment reason"
}
```

## Example: Multiple Line Items with Discounts

```json
{
  "locationId": "5726ea68-1b2a-44f0-9357-f08529d72663",
  "cashierId": "5abd7a19-b236-4d17-854c-2c491c9a5c5d",
  "customerId": "customer-uuid",
  "lineItems": [
    {
      "variantId": "variant-1-uuid",
      "quantity": 3,
      "unitPrice": 50.00,
      "saleDiscount": {
        "percent": 10
      }
    },
    {
      "variantId": "variant-2-uuid",
      "quantity": 1,
      "unitPrice": 200.00,
      "customDiscount": {
        "amount": 20.00
      }
    }
  ],
  "payments": [
    {
      "paymentMethodId": "cash-payment-method-uuid",
      "amount": 315.00
    }
  ],
  "orderLevelDiscount": {
    "amount": 15.00
  },
  "notes": "Customer requested express delivery"
}
```

## Example: Cash Payment (Simple)

```json
{
  "locationId": "5726ea68-1b2a-44f0-9357-f08529d72663",
  "cashierId": "5abd7a19-b236-4d17-854c-2c491c9a5c5d",
  "lineItems": [
    {
      "variantId": "variant-uuid",
      "quantity": 1,
      "unitPrice": 1000.00
    }
  ],
  "payments": [
    {
      "paymentMethodId": "cash-payment-method-uuid",
      "amount": 1000.00
    }
  ]
}
```

## Response Example

```json
{
  "message": "Order created successfully. Will be synced to TradeUnleashed.",
  "order": {
    "id": "order-uuid",
    "orderNumber": "SO-2024-001",
    "status": "Open",
    "syncStatus": null,
    "totalAmount": "1000.00"
  }
}
```

## Important Notes

1. **Product Variants**: The `variantId` must be a valid ProductVariant UUID that exists in your database
2. **Location**: Must be a valid Location UUID
3. **Cashier**: Must be a valid User UUID
4. **Customer**: Optional, but if provided must be a valid Customer UUID
5. **Payment Method**: Must be a valid PaymentMethod UUID
6. **Sync**: Order will be automatically synced to TradeUnleashed by the background scheduler
7. **Status**: Orders are created with status "Open" (pending sync)

## How to Get UUIDs

### Get Location ID
```sql
SELECT id, name, code FROM Location WHERE isActive = true;
```

### Get Cashier/User ID
```sql
SELECT id, username, firstName, lastName FROM User WHERE isActive = true;
```

### Get Product Variant ID
```sql
SELECT pv.id, pv.sku, p.name 
FROM ProductVariant pv 
JOIN Product p ON pv.productId = p.id 
WHERE pv.externalSystem = 'tradeunleashed';
```

### Get Payment Method ID
```sql
SELECT id, name, code FROM PaymentMethod WHERE isActive = true;
```

## Testing in Swagger UI

1. Open `http://localhost:4000/api-docs`
2. Navigate to `POST /api/sales-orders/create`
3. Click "Try it out"
4. Paste one of the JSON examples above
5. Replace UUIDs with actual values from your database
6. Click "Execute"

## Files

- `create-order-pos-example.json` - Full example with all fields
- `create-order-pos-simple.json` - Simple example with required fields only

