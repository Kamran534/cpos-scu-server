# Payload-Based Architecture Documentation

## Overview

This architecture uses **payloads as the common language** between two distinct layers:

1. **Generic Layer (Core)** - SCU Model/DB layer - handles business logic and database operations
2. **Integration Layer** - Platform-specific API calls and data fetching

## Architecture Flow

```
┌────────────────────────────────────────────────────────────┐
│          INTEGRATION LAYER (Specific)                      │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ TradeUnleashed   │  │  Shopify         │               │
│  │ ProductService   │  │  ProductService  │  ...          │
│  │                  │  │                  │               │
│  │ - API calls      │  │  - API calls     │               │
│  │ - Build payloads │  │  - Build payloads│               │
│  └──────────────────┘  └──────────────────┘               │
│           │                     │                          │
└───────────┼─────────────────────┼──────────────────────────┘
            │                     │
            ▼                     ▼
    [ProductPayload] [InventoryItemPayload] (DTO)
            │                     │
            └──────────┬──────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│          GENERIC LAYER (Core - SCU Model/DB)                │
│                                                              │
│  ┌────────────────────────────────────────┐                 │
│  │   ProductPayloadProcessor               │                │
│  │                                         │                │
│  │   - Validate payloads                   │                │
│  │   - Business logic                      │                │
│  │   - Call repositories                   │                │
│  └────────────────────────────────────────┘                 │
│                       │                                      │
│  ┌────────────────────▼──────────────────┐                  │
│  │   Repositories                         │                  │
│  │   - ProductRepository                  │                  │
│  │   - CategoryRepository                 │                  │
│  │   - InventoryItemRepository            │                  │
│  └────────────────────────────────────────┘                  │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
                   [Database]
```

## Key Principles

### 1. Payloads as Common Language

Payloads are **DTOs (Data Transfer Objects)** - pure data structures with no logic:

```typescript
interface ProductPayload {
  sourceSystem: string;        // 'tradeunleashed', 'shopify', etc.
  sourceId: string;            // ID from source system
  timestamp: Date;             // When fetched
  sku: string;
  name: string;
  categoryName?: string;
  // ... pure data
}
```

### 2. Integration Layer Responsibilities

✅ **DOES**:
- Call external APIs
- Parse API responses
- Build payloads from API data
- Handle API authentication

❌ **DOES NOT**:
- Access database
- Business logic
- Data validation
- Save to DB

### 3. Generic Layer Responsibilities

✅ **DOES**:
- Receive payloads
- Validate data
- Business logic
- Database operations
- Create/update records

❌ **DOES NOT**:
- Call external APIs
- Know about integrations
- Parse API responses

## Directory Structure

```
src/
├── payloads/                          # Common Language (DTOs)
│   ├── base.payload.ts                # Base payload types
│   ├── product.payload.ts             # Product payloads
│   ├── order.payload.ts               # Order payloads
│   ├── customer.payload.ts            # Customer payloads
│   └── index.ts
│
├── core/                              # GENERIC LAYER
│   ├── processors/
│   │   └── ProductPayloadProcessor.ts  # Receives payloads → saves to DB
│   ├── repositories/
│   │   ├── ProductRepository.ts        # DB operations only
│   │   ├── CategoryRepository.ts
│   │   └── ...
│   └── types/
│       └── base.types.ts
│
├── integrations/                       # INTEGRATION LAYER
│   └── tradeunleashed/
│       ├── api/
│       │   └── TradeUnleashedClient.ts        # API calls only
│       ├── services/
│       │   └── TradeUnleashedProductService.ts # Fetch → build payloads
│       └── types.ts                           # TradeUnleashed-specific types
│
└── services/
    └── TradeUnleashedSyncService.ts    # Orchestrates both layers
```

## Data Flow Example

### Step 1: Integration Layer Fetches & Builds Payload

```typescript
// TradeUnleashedProductService.ts
const service = new TradeUnleashedProductService(config);

// Fetch from API
const response = await client.queryStock({ facilityIds: '886375309' });

// Build payload (NO DB access)
const payload: ProductPayload = {
  sourceSystem: 'tradeunleashed',
  sourceId: item.id,
  timestamp: new Date(),
  sku: item.sku,
  name: item.productName,
  categoryName: item.categoryName,
  // ... clean data structure
};
```

### Step 2: Generic Layer Receives & Processes Payload

```typescript
// ProductPayloadProcessor.ts
const processor = new ProductPayloadProcessor(prisma);

// Receive payload
const result = await processor.processProduct(payload);

// Inside processor:
// 1. Validate payload
// 2. Find or create category
// 3. Check if product exists
// 4. Create or update product via repository
// 5. Return result
```

### Step 3: Complete Flow

```typescript
// TradeUnleashedSyncService.ts (orchestrator)

// Integration layer: Fetch data → build payloads
const batchPayload = await productService.syncAllInventory({
  facilityIds: ['886375309'],
});

// Generic layer: Process payloads → save to DB
const result = await payloadProcessor.processBatch(batchPayload);

console.log(`Created: ${result.data.products.success}`);
console.log(`Errors: ${result.data.products.errors.length}`);
```

## Benefits

### 1. Clear Separation

- Integration code never touches DB
- Generic code never knows about specific APIs
- Easy to test each layer independently

### 2. Easy to Add New Integrations

To add Shopify:

```typescript
// 1. Create ShopifyProductService (integration layer)
class ShopifyProductService {
  async syncProducts() {
    // Fetch from Shopify API
    const products = await shopifyClient.getProducts();
    
    // Build same ProductPayload
    return products.map(p => ({
      sourceSystem: 'shopify',
      sourceId: p.id,
      sku: p.sku,
      name: p.title,
      // ...
    }));
  }
}

// 2. Generic layer already handles ProductPayload!
// No changes needed to processor or repositories
```

### 3. Testable

```typescript
// Test integration layer (mock API)
const mockClient = {
  queryStock: () => Promise.resolve(mockData)
};

// Test generic layer (mock payloads)
const mockPayload: ProductPayload = {
  sourceSystem: 'test',
  sourceId: '123',
  sku: 'TEST-001',
  name: 'Test Product',
  // ...
};
await processor.processProduct(mockPayload);
```

## Usage Examples

### Example 1: Complete Sync

```typescript
import { PrismaClient } from '@prisma/client';
import { TradeUnleashedSyncService } from './services/TradeUnleashedSyncService';

const prisma = new PrismaClient();

const config = {
  baseUrl: 'https://q-prod.tradeunleashed.com',
  username: 'your-username',
  password: 'your-password',
};

const syncService = new TradeUnleashedSyncService(config, prisma);

// Initialize (login)
await syncService.initialize();

// Sync (integration → payloads → generic → DB)
const result = await syncService.syncProducts({
  fullSync: true,
  batchSize: 50,
});

console.log(`Products created: ${result.productsCreated}`);
console.log(`Inventory synced: ${result.inventoryCreated}`);
```

### Example 2: Use Layers Separately

```typescript
// Integration layer only (build payloads)
import { TradeUnleashedProductService } from './integrations/tradeunleashed';

const productService = new TradeUnleashedProductService(config);
const batchPayload = await productService.syncInventory({
  facilityIds: ['886375309'],
});

console.log('Payloads built:', batchPayload.products.length);

// Generic layer only (process payloads)
import { ProductPayloadProcessor } from './core/processors';

const processor = new ProductPayloadProcessor(prisma);
const result = await processor.processBatch(batchPayload);

console.log('Saved to DB:', result.data.products.success);
```

### Example 3: Add Another Integration

```typescript
// Create new integration (e.g., Shopify)
class ShopifyProductService {
  async syncProducts(): Promise<ProductBatchPayload> {
    // 1. Call Shopify API
    const shopifyProducts = await this.client.getProducts();
    
    // 2. Transform to same payload format
    const products = shopifyProducts.map(sp => ({
      sourceSystem: 'shopify',
      sourceId: sp.id.toString(),
      sku: sp.variants[0].sku,
      name: sp.title,
      // ... build ProductPayload
    }));
    
    return { products, variants: [], inventory: [] };
  }
}

// Generic layer stays the same!
// Processor handles ProductPayload regardless of source
```

## Communication Protocol

### Payload → Processor → Result

```typescript
// INPUT: Payload (from integration)
{
  sourceSystem: 'tradeunleashed',
  sourceId: '12345',
  sku: 'PROD-001',
  name: 'Product Name',
  // ...
}

// PROCESS: Generic layer validates & saves

// OUTPUT: Result
{
  success: true,
  data: { id: 'uuid', sku: 'PROD-001', ... },
  validationErrors: []
}
```

## Best Practices

### ✅ DO

1. **Keep payloads simple** - just data, no logic
2. **Integration builds payloads** - from API responses
3. **Generic processes payloads** - validates & saves
4. **Use batch operations** - for better performance
5. **Log at boundaries** - when building/processing payloads

### ❌ DON'T

1. **Don't access DB in integration layer**
2. **Don't call APIs in generic layer**
3. **Don't put business logic in payloads**
4. **Don't bypass payload protocol**
5. **Don't couple layers directly**

## Adding New Integration Checklist

- [ ] Create `integrations/[platform]/` directory
- [ ] Create API client (API calls only)
- [ ] Create service (build payloads)
- [ ] Use existing payload types
- [ ] Create orchestrator service (optional)
- [ ] Generic layer automatically handles it!

## Summary

```
┌─────────────────────────────────────────────────────────┐
│  Integration Layer                                      │
│  - Knows about external APIs                            │
│  - Builds payloads                                      │
│  - NO database access                                   │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Payloads (DTOs)                                        │
│  - Common language                                      │
│  - Pure data structures                                 │
│  - No logic                                             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Generic Layer                                          │
│  - Receives payloads                                    │
│  - Business logic                                       │
│  - Database operations                                  │
│  - NO API calls                                         │
└─────────────────────────────────────────────────────────┘
```

**Key Insight**: Payloads are the contract. Integration layer produces them, generic layer consumes them. Neither layer knows about the other's implementation details.

