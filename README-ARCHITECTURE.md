# POS Server - Payload-Based Architecture

## 🎯 Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
export TRADEUNLEASHED_BASE_URL="https://q-prod.tradeunleashed.com"
export TRADEUNLEASHED_USERNAME="your-username"
export TRADEUNLEASHED_PASSWORD="your-password"
export DATABASE_URL="postgresql://..."

# Run example sync
npm run dev
```

Then in your code:

```typescript
import { TradeUnleashedSyncService } from './services/TradeUnleashedSyncService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const syncService = new TradeUnleashedSyncService(config, prisma);

await syncService.initialize();
const result = await syncService.syncProducts();
```

## 📋 Architecture Overview

This project uses a **payload-based architecture** with two distinct layers:

### Layer 1: Integration Layer (Specific)
- **Location**: `src/integrations/tradeunleashed/`
- **Purpose**: Call TradeUnleashed APIs, build payloads
- **NO** database access
- **NO** business logic

### Layer 2: Generic Layer (Core)
- **Location**: `src/core/`
- **Purpose**: Process payloads, business logic, save to DB
- **NO** API calls
- **NO** integration-specific code

### Communication: Payloads (DTOs)
- **Location**: `src/payloads/`
- **Purpose**: Common language between layers
- Pure data structures, no logic

## 📁 Project Structure

```
src/
├── payloads/                           # Common Language (DTOs)
│   ├── product.payload.ts              # ProductPayload, InventoryItemPayload
│   ├── order.payload.ts
│   ├── customer.payload.ts
│   └── auth.payload.ts
│
├── core/                               # GENERIC LAYER (SCU Model/DB)
│   ├── processors/
│   │   └── ProductPayloadProcessor.ts  # Receives payloads → saves to DB
│   └── repositories/
│       ├── ProductRepository.ts        # DB operations only
│       ├── CategoryRepository.ts
│       ├── LocationRepository.ts
│       └── InventoryItemRepository.ts
│
├── integrations/                       # INTEGRATION LAYER (Specific)
│   └── tradeunleashed/
│       ├── api/
│       │   └── TradeUnleashedClient.ts         # API calls (/login, /stockQuery)
│       └── services/
│           ├── TradeUnleashedAuthService.ts    # Auth handling
│           └── TradeUnleashedProductService.ts # Fetch → build payloads
│
└── services/
    └── TradeUnleashedSyncService.ts    # Orchestrates: Integration → Generic
```

## 🔄 Data Flow

```
1. TradeUnleashedProductService
   ↓ (calls API)
2. TradeUnleashed API Response
   ↓ (transform)
3. ProductPayload (DTO)
   ↓ (pass to generic layer)
4. ProductPayloadProcessor
   ↓ (validate, process)
5. ProductRepository
   ↓ (save)
6. Database
```

## 💻 Code Examples

### Example 1: Complete Sync Flow

```typescript
import { PrismaClient } from '@prisma/client';
import { TradeUnleashedSyncService } from './services/TradeUnleashedSyncService';

const prisma = new PrismaClient();

const config = {
  baseUrl: 'https://q-prod.tradeunleashed.com',
  username: process.env.TRADEUNLEASHED_USERNAME!,
  password: process.env.TRADEUNLEASHED_PASSWORD!,
};

const syncService = new TradeUnleashedSyncService(config, prisma);

// Initialize (login)
await syncService.initialize();

// Sync products and inventory
const result = await syncService.syncProducts({
  facilityIds: ['886375309'],
  fullSync: true,
  batchSize: 50,
});

console.log(`✓ Products created: ${result.productsCreated}`);
console.log(`✓ Inventory synced: ${result.inventoryCreated}`);
console.log(`✗ Errors: ${result.errors.length}`);
```

### Example 2: Integration Layer Only (Build Payloads)

```typescript
import { TradeUnleashedProductService } from './integrations/tradeunleashed';

const service = new TradeUnleashedProductService(config);

// Fetch from TradeUnleashed → build payloads (NO DB access)
const batchPayload = await service.syncInventory({
  facilityIds: ['886375309'],
  fromDate: new Date('2025-01-10'),
  max: 50,
});

console.log(`Built ${batchPayload.products.length} product payloads`);
console.log(`Built ${batchPayload.inventory.length} inventory payloads`);

// Payloads are ready to pass to generic layer
```

### Example 3: Generic Layer Only (Process Payloads)

```typescript
import { ProductPayloadProcessor } from './core/processors';

const processor = new ProductPayloadProcessor(prisma);

// Process payloads (NO API calls, just DB operations)
const result = await processor.processBatch(batchPayload);

console.log(`Saved ${result.data.products.success} products`);
console.log(`Saved ${result.data.inventory.success} inventory items`);
```

### Example 4: Incremental Sync

```typescript
// Only sync changes from last 24 hours
const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

const result = await syncService.syncProducts({
  fullSync: false,
  fromDate: fromDate,
  batchSize: 50,
});
```

## 🚀 TradeUnleashed APIs Integrated

### 1. Login API
- **Endpoint**: `POST /api/login`
- **Purpose**: Authentication
- **Service**: `TradeUnleashedAuthService`

### 2. Stock Query API
- **Endpoint**: `GET /api/inventoryItems/stockQuery`
- **Parameters**: 
  - `facilityIds` - comma-separated facility IDs
  - `fromDate` - ISO date string
  - `max` - page size
  - `offset` - pagination
  - `orderBy` - sorting
- **Service**: `TradeUnleashedProductService`

## 📦 Payloads (DTOs)

### ProductPayload
```typescript
{
  sourceSystem: 'tradeunleashed',
  sourceId: '12345',
  timestamp: Date,
  sku: 'PROD-001',
  name: 'Product Name',
  categoryName: 'Electronics',
  brandName: 'Sony',
  isActive: true
}
```

### InventoryItemPayload
```typescript
{
  sourceSystem: 'tradeunleashed',
  sourceId: '12345',
  timestamp: Date,
  variantSku: 'PROD-001',
  locationCode: '886375309',
  locationName: 'Main Warehouse',
  quantityOnHand: 100,
  quantityAvailable: 95,
  quantityReserved: 5
}
```

## 🎨 Architecture Principles

### ✅ Integration Layer

**DOES**:
- Call external APIs
- Parse API responses
- Build payloads
- Handle authentication

**DOES NOT**:
- Access database
- Business logic
- Data validation

### ✅ Generic Layer

**DOES**:
- Receive payloads
- Validate data
- Business logic
- Database operations

**DOES NOT**:
- Call external APIs
- Parse API responses
- Know about integrations

### ✅ Payloads

**ARE**:
- Pure data structures
- DTOs (Data Transfer Objects)
- Common language

**ARE NOT**:
- Classes with methods
- Business logic
- Validation logic

## 📚 Documentation

- **[PAYLOAD-ARCHITECTURE.md](./PAYLOAD-ARCHITECTURE.md)** - Detailed architecture guide
- **[src/examples/tradeunleashed-sync.example.ts](./src/examples/tradeunleashed-sync.example.ts)** - 6 working examples

## 🔧 Environment Variables

```bash
# TradeUnleashed Configuration
TRADEUNLEASHED_BASE_URL=https://q-prod.tradeunleashed.com
TRADEUNLEASHED_USERNAME=your-username
TRADEUNLEASHED_PASSWORD=your-password

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/pos_db
```

## 🧪 Testing

```bash
# Test connection
npm run test:connection

# Run sync
npm run sync:tradeunleashed

# Run examples
npm run examples
```

## 📈 Adding New Integration

To add another integration (e.g., Shopify):

1. **Create integration directory**:
   ```
   src/integrations/shopify/
   ├── api/ShopifyClient.ts
   └── services/ShopifyProductService.ts
   ```

2. **Build same payloads**:
   ```typescript
   class ShopifyProductService {
     async syncProducts(): Promise<ProductBatchPayload> {
       // Call Shopify API
       // Transform to ProductPayload
       return { products, variants, inventory };
     }
   }
   ```

3. **Generic layer already handles it!**
   - No changes needed to processors
   - No changes needed to repositories
   - Same `ProductPayloadProcessor` works for all integrations

## 🎯 Benefits

1. **Clear Separation**: Integration never touches DB, Generic never calls APIs
2. **Easy to Test**: Mock payloads or API responses independently
3. **Scalable**: Add 10 integrations, generic layer stays the same
4. **Maintainable**: Change integration without affecting generic logic
5. **Flexible**: Can use layers separately or together

## 📊 File Count

- **Payloads**: 6 files (DTOs)
- **Core (Generic)**: 11 files (processors + repositories)
- **Integrations (TradeUnleashed)**: 7 files (client + services)
- **Examples**: 2 files (usage examples)
- **Documentation**: 3 files

**Total**: 29 new files created

## 🤝 Contributing

When adding features:
1. Integration code goes in `src/integrations/[platform]/`
2. Generic code goes in `src/core/`
3. Never mix the two
4. Always use payloads to communicate
5. Keep payloads simple (pure data)

## 📝 License

MIT

---

**Ready to sync?** Check the examples in `src/examples/tradeunleashed-sync.example.ts`!

