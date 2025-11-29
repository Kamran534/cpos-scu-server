# Sales Order Payload Analysis

## API Expected Structure

The API endpoint `POST /api/orders` expects the following structure:

### Required Fields:
1. **`locationId`** (string) - Location/Store ID
2. **`cashierId`** (string) - Cashier/User ID
3. **`lineItems`** (array) - Array of line items, each requiring:
   - `variantId` (string) - Product variant ID
   - `quantity` (number) - Quantity
   - `unitPrice` (number) - Unit price

### Optional Fields:
- `customerId` (string)
- `payments` (array) - Each payment requires:
  - `paymentMethodId` (string) - Payment method ID or code
  - `amount` (number)
  - `transactionId`, `authorizationCode`, `cardLast4`, `cardBrand` (optional)
- `orderLevelDiscount` (object) - `{ amount?: number, percent?: number }`
- `adjustment` (object) - `{ amount: number, reason?: string }`
- `giftCardNumber` (string)
- `couponCode` (string) - Deprecated
- `notes` (string)
- `customerNotes` (string)

### Line Item Optional Fields:
- `salesPersonId` (string)
- `saleDiscount` (object) - `{ amount?: number, percent?: number }`
- `customDiscount` (object) - `{ amount?: number, percent?: number }`
- `notes` (string)

---

## Provided Payload Structure

The provided JSON appears to be from **TradeUnleashed** format with a different structure:

```json
{
  "saleOrders": [
    {
      "id": 1504723025127,
      "orderReference": "5",
      "posSession": { "id": 676864374 },
      "lineItems": [
        {
          "inventoryItem": { "id": 393165 },
          "quantity": 1,
          "unitPrice": 1000,
          "customDiscAmt": 0
        }
      ],
      "orderRoles": [...],
      "payments": [
        {
          "paymentMethod": "CASH",
          "amount": 1000
        }
      ]
    }
  ]
}
```

---

## Mapping Analysis

### ✅ Available in Payload (but needs transformation):

| API Field | Payload Field | Status | Notes |
|-----------|--------------|--------|-------|
| `locationId` | ❌ Missing | **MISSING** | Need to extract from `orderRoles` (facility with roleType 113) |
| `cashierId` | ❌ Missing | **MISSING** | Need to extract from `posSession.id` or `orderRoles` |
| `customerId` | ❌ Missing | **MISSING** | Need to extract from `orderRoles` (party with roleType 112) |
| `lineItems[].variantId` | `lineItems[].inventoryItem.id` | ✅ Available | Needs mapping |
| `lineItems[].quantity` | `lineItems[].quantity` | ✅ Available | Direct match |
| `lineItems[].unitPrice` | `lineItems[].unitPrice` | ✅ Available | Direct match |
| `lineItems[].customDiscount` | `lineItems[].customDiscAmt` | ✅ Available | Needs transformation |
| `payments[].paymentMethodId` | `payments[].paymentMethod` | ✅ Available | Value is "CASH" (string code) |
| `payments[].amount` | `payments[].amount` | ✅ Available | Direct match |
| `notes` | `notes` | ✅ Available | Can be null |
| `orderLevelDiscount` | `orderAdjustments[]` | ⚠️ Partial | Need to calculate from orderAdjustments |
| `adjustment` | `orderAdjustments[]` | ⚠️ Partial | Need to map orderAdjustments |

---

## ❌ Missing Required Fields

### Critical Missing Fields:
1. **`locationId`** - **REQUIRED**
   - Not directly in payload
   - Can be extracted from: `orderRoles[]` where `orderRoleType.id === 113` → `facility.id`
   - **Status**: ⚠️ **NEEDS EXTRACTION**

2. **`cashierId`** - **REQUIRED**
   - Not directly in payload
   - Can be extracted from: `posSession.id` (but this is a TradeUnleashed session ID, not a User ID)
   - Or from `orderRoles[]` where `orderRoleType.id === 109` (if that's the cashier role)
   - **Status**: ⚠️ **NEEDS MAPPING/EXTRACTION**

3. **`lineItems[].variantId`** - **REQUIRED**
   - Available as `lineItems[].inventoryItem.id`
   - But this is a TradeUnleashed inventory item ID, not a ProductVariant ID
   - **Status**: ⚠️ **NEEDS ID MAPPING** (TradeUnleashed ID → ProductVariant ID)

---

## ⚠️ Fields That Need Transformation

### 1. Payment Method
- **Provided**: `payments[].paymentMethod` = `"CASH"` (string code)
- **Expected**: `payments[].paymentMethodId` = UUID string or payment method code
- **Action**: The API accepts payment method codes (like "CASH"), so this should work, but needs to be renamed

### 2. Line Item Variant ID
- **Provided**: `lineItems[].inventoryItem.id` = `393165` (TradeUnleashed ID)
- **Expected**: `lineItems[].variantId` = UUID string (ProductVariant ID)
- **Action**: Need to map TradeUnleashed inventory item ID to ProductVariant ID

### 3. Location ID
- **Provided**: `orderRoles[]` with `facility.id = 184806` (TradeUnleashed facility ID)
- **Expected**: `locationId` = UUID string (Location ID)
- **Action**: Need to map TradeUnleashed facility ID to Location ID

### 4. Cashier ID
- **Provided**: `posSession.id = 676864374` (TradeUnleashed session ID)
- **Expected**: `cashierId` = UUID string (User ID)
- **Action**: Need to map TradeUnleashed session/cashier to User ID

### 5. Customer ID
- **Provided**: `orderRoles[]` with `party.id = 182643` (TradeUnleashed party ID)
- **Expected**: `customerId` = UUID string (Customer ID)
- **Action**: Need to map TradeUnleashed party ID to Customer ID

### 6. Discounts
- **Provided**: `lineItems[].customDiscAmt` = `0`
- **Expected**: `lineItems[].customDiscount` = `{ amount?: number, percent?: number }`
- **Action**: Transform to object format

### 7. Order Adjustments
- **Provided**: `orderAdjustments[]` array with `amount` and `percentage`
- **Expected**: `adjustment` = `{ amount: number, reason?: string }`
- **Action**: Need to aggregate and transform

---

## 📋 Summary

### ✅ What We Have:
- Line items with quantity and unit price
- Payment information (method and amount)
- Order adjustments data
- Customer, location, and cashier references (but as TradeUnleashed IDs)

### ❌ What's Missing/Incomplete:
1. **`locationId`** - Need to extract and map from `orderRoles`
2. **`cashierId`** - Need to extract and map from `posSession` or `orderRoles`
3. **`customerId`** - Need to extract and map from `orderRoles` (optional but recommended)
4. **ID Mappings** - All TradeUnleashed IDs need to be mapped to internal UUIDs:
   - Inventory Item ID → ProductVariant ID
   - Facility ID → Location ID
   - Party ID → Customer ID
   - Session ID → User ID

### ⚠️ What Needs Transformation:
1. Payment method field name (`paymentMethod` → `paymentMethodId`)
2. Line item structure (`inventoryItem.id` → `variantId`)
3. Discount format (`customDiscAmt` → `customDiscount` object)
4. Order adjustments aggregation

---

## 🔧 Recommended Action Plan

1. **Create a mapping service** to convert TradeUnleashed IDs to internal IDs
2. **Extract locationId** from `orderRoles` where `orderRoleType.id === 113`
3. **Extract cashierId** from `posSession.id` or appropriate `orderRole`
4. **Extract customerId** from `orderRoles` where `orderRoleType.id === 112`
5. **Map inventory item IDs** to ProductVariant IDs
6. **Transform payment structure** (rename field, ensure code format)
7. **Transform discount structure** (convert to object format)
8. **Aggregate order adjustments** into single adjustment object

---

## Example Transformed Payload

```json
{
  "locationId": "<mapped-location-uuid>",
  "cashierId": "<mapped-cashier-uuid>",
  "customerId": "<mapped-customer-uuid>",
  "lineItems": [
    {
      "variantId": "<mapped-variant-uuid>",
      "quantity": 1,
      "unitPrice": 1000,
      "customDiscount": {
        "amount": 0
      }
    }
  ],
  "payments": [
    {
      "paymentMethodId": "CASH",
      "amount": 1000
    }
  ],
  "notes": null,
  "adjustment": {
    "amount": 0
  }
}
```

