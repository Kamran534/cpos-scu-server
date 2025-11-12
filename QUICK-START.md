# TradeUnleashed Integration - Quick Start 🚀

## 1️⃣ Add to .env File

```env
TRADEUNLEASHED_BASE_URL=https://q-prod.tradeunleashed.com
TRADEUNLEASHED_USERNAME=your-username
TRADEUNLEASHED_PASSWORD=your-password
```

✅ **Done!** Configuration is automatically loaded from `src/config/index.ts`

## 2️⃣ Test Connection

```bash
npm run sync:tu:test
```

Expected output:
```
✅ Connected successfully!
✅ Connection test successful!
```

## 3️⃣ Run First Sync

```bash
npm run sync:tu
```

Expected output:
```
═══════════════════════════════════════
  Sync Results
═══════════════════════════════════════
Status:              ✅ Success
Products Created:    150
Variants Created:    150
Inventory Created:   450
Errors:              0
Duration:            5234ms (5.23s)
═══════════════════════════════════════
```

## 4️⃣ View Synced Data

```bash
npm run prisma:studio
```

## 📋 Available Commands

```bash
# Full sync
npm run sync:tu

# Test connection only
npm run sync:tu:test

# Incremental sync (since date)
npm run sync:tu -- --from=2025-01-10

# Specific facilities
npm run sync:tu -- --facilities=886375309

# Show help
npm run sync:tu -- --help

# Run examples
npm run example:tu
```

## 💻 Use in Your Code

```typescript
import { PrismaClient } from '@prisma/client';
import { TradeUnleashedSyncService } from './services/TradeUnleashedSyncService';
import { config } from './config';  // ← Loads from .env

const prisma = new PrismaClient();

const syncService = new TradeUnleashedSyncService(
  config.tradeUnleashed,  // ← Uses your .env values
  prisma
);

await syncService.initialize();
const result = await syncService.syncProducts();

console.log(`✅ Synced ${result.productsCreated} products`);
```

## 🏗️ Architecture Overview

```
1. TradeUnleashed API
        ↓
2. Integration Layer (builds payloads)
   - src/integrations/tradeunleashed/
        ↓
3. Payloads (DTOs - common language)
   - src/payloads/
        ↓
4. Generic Layer (processes & saves)
   - src/core/processors/
   - src/core/repositories/
        ↓
5. Database (PostgreSQL)
```

## 📁 Files Created

### Configuration
- ✅ `src/config/index.ts` - Updated with TradeUnleashed config
- ✅ `.env.example` - Template for environment variables

### Integration Layer (API Calls → Build Payloads)
- ✅ `src/integrations/tradeunleashed/api/TradeUnleashedClient.ts`
- ✅ `src/integrations/tradeunleashed/services/TradeUnleashedAuthService.ts`
- ✅ `src/integrations/tradeunleashed/services/TradeUnleashedProductService.ts`

### Payloads (Common Language)
- ✅ `src/payloads/product.payload.ts`
- ✅ `src/payloads/order.payload.ts`
- ✅ `src/payloads/customer.payload.ts`
- ✅ `src/payloads/auth.payload.ts`

### Generic Layer (Process Payloads → Save to DB)
- ✅ `src/core/processors/ProductPayloadProcessor.ts`
- ✅ `src/core/repositories/ProductRepository.ts`
- ✅ `src/core/repositories/CategoryRepository.ts`
- ✅ `src/core/repositories/BrandRepository.ts`
- ✅ `src/core/repositories/LocationRepository.ts`
- ✅ `src/core/repositories/InventoryItemRepository.ts`

### Orchestration & Scripts
- ✅ `src/services/TradeUnleashedSyncService.ts`
- ✅ `src/scripts/sync-tradeunleashed.ts`

### Examples & Documentation
- ✅ `src/examples/tradeunleashed-sync-with-config.example.ts`
- ✅ `SETUP-GUIDE.md`
- ✅ `PAYLOAD-ARCHITECTURE.md`
- ✅ `README-ARCHITECTURE.md`

## 🎯 Key Features

✅ **Payload-Based Architecture**
- Clear separation between integration and generic layers
- Easy to add new integrations (Shopify, Square, etc.)

✅ **Configuration from .env**
- All credentials loaded from environment variables
- Access via `config.tradeUnleashed`

✅ **CLI Scripts**
- `npm run sync:tu` - Full sync
- `npm run sync:tu:test` - Test connection
- `npm run example:tu` - Run examples

✅ **Complete Examples**
- 6 working examples in `src/examples/`
- Test connection, full sync, incremental sync, scheduled sync

✅ **TradeUnleashed APIs Integrated**
- Login API: `/api/login`
- Stock Query API: `/api/inventoryItems/stockQuery`

## 🔄 Data Flow Example

```typescript
// 1. Integration fetches from TradeUnleashed
const productService = new TradeUnleashedProductService(config.tradeUnleashed);
const batchPayload = await productService.syncInventory({
  facilityIds: ['886375309'],
});
// → Builds: { products: [...], variants: [...], inventory: [...] }

// 2. Generic layer processes payloads
const processor = new ProductPayloadProcessor(prisma);
const result = await processor.processBatch(batchPayload);
// → Validates, processes business logic, saves to DB

// Or use orchestrator (does both):
const syncService = new TradeUnleashedSyncService(config.tradeUnleashed, prisma);
const result = await syncService.syncProducts();
```

## 📚 Documentation

- **[SETUP-GUIDE.md](./SETUP-GUIDE.md)** - Complete setup guide
- **[PAYLOAD-ARCHITECTURE.md](./PAYLOAD-ARCHITECTURE.md)** - Architecture details
- **[README-ARCHITECTURE.md](./README-ARCHITECTURE.md)** - Overview

## 🐛 Troubleshooting

**Credentials not found?**
```bash
# Make sure .env file exists in project root
ls -la .env

# Check values are set
cat .env | grep TRADEUNLEASHED
```

**Connection failed?**
```bash
# Test connection first
npm run sync:tu:test

# Check credentials in .env
```

**Sync errors?**
```bash
# View detailed errors
npm run sync:tu

# Check database connection
npm run prisma:studio
```

## ⚡ Quick Commands Reference

| Command | Description |
|---------|-------------|
| `npm run sync:tu` | Full sync of all products |
| `npm run sync:tu:test` | Test connection only |
| `npm run sync:tu -- --from=2025-01-10` | Incremental sync |
| `npm run sync:tu -- --facilities=123` | Specific facilities |
| `npm run sync:tu -- --help` | Show all options |
| `npm run example:tu` | Run examples |
| `npm run prisma:studio` | View database |

---

**That's it!** 🎉 Your TradeUnleashed integration is ready to use.

Start with: `npm run sync:tu:test`

