# Interface Pattern - Quick Start

## 🎯 What is This?

**OOP Interface Pattern** in Node.js/TypeScript - Generic layer only knows about the **interface**, not specific integrations.

## 📋 Key Components

### 1. Interface (Contract)
```typescript
// src/core/interfaces/IIntegrationService.ts
export interface IIntegrationService {
  readonly name: string;
  initialize(): Promise<void>;
  syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload>;
  // ... other methods
}
```

### 2. Implementation (TradeUnleashed)
```typescript
// src/integrations/tradeunleashed/TradeUnleashedIntegration.ts
export class TradeUnleashedIntegration implements IIntegrationService {
  public readonly name = 'tradeunleashed';
  
  async syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload> {
    // TradeUnleashed-specific API calls
    // Returns payloads
  }
}
```

### 3. Generic Orchestrator (Uses Interface)
```typescript
// src/core/services/IntegrationOrchestrator.ts
export class IntegrationOrchestrator {
  private integration: IIntegrationService; // Only knows interface!
  
  constructor(integration: IIntegrationService, prisma: PrismaClient) {
    this.integration = integration; // Can be ANY integration
  }
  
  async syncProducts(): Promise<ISyncResult> {
    // Call through interface
    const payloads = await this.integration.syncProducts();
    // Process in generic layer
  }
}
```

## 💻 Usage

```typescript
import { IntegrationOrchestrator } from './core/services/IntegrationOrchestrator';
import { TradeUnleashedIntegration } from './integrations/tradeunleashed';
import { config } from './config';

const prisma = new PrismaClient();

// Create integration (implements IIntegrationService)
const integration = new TradeUnleashedIntegration(config.tradeUnleashed);

// Generic orchestrator only knows about interface
const orchestrator = new IntegrationOrchestrator(integration, prisma);

// Initialize and sync
await orchestrator.initialize();
const result = await orchestrator.syncProducts({ fullSync: true });

console.log(`Synced from ${orchestrator.getIntegrationName()}: ${result.created} items`);
```

## 🚀 Run Examples

```bash
# Example 1: Interface Pattern
npm run example:interface 1

# Example 2: Swappable Integrations
npm run example:interface 2

# Example 3: Multiple Integrations
npm run example:interface 3

# Example 4: Factory Pattern
npm run example:interface 4

# Example 5: Contract Enforcement
npm run example:interface 5
```

## 🎨 Architecture Flow

```
┌─────────────────────────────────────┐
│  IntegrationOrchestrator            │
│  (Generic Layer)                    │
│                                     │
│  Uses: IIntegrationService ◄────────┼──── Interface Contract
│  Doesn't know specifics            │
└─────────────────────────────────────┘
                │
                │ calls through interface
                │
                ▼
┌─────────────────────────────────────┐
│  TradeUnleashedIntegration          │
│  (Specific Layer)                   │
│                                     │
│  Implements: IIntegrationService    │
│  - Calls TradeUnleashed APIs        │
│  - Builds payloads                  │
│  - Returns payloads                 │
└─────────────────────────────────────┘
```

## ✅ Benefits

1. **Loose Coupling**: Generic layer doesn't depend on specific integrations
2. **Swappable**: Can swap integrations without changing generic code
3. **Type Safe**: TypeScript enforces interface at compile-time
4. **Extensible**: Add new integrations by implementing interface
5. **Testable**: Easy to mock interfaces

## 📦 Files Created

- `src/core/interfaces/IIntegrationService.ts` - Interface contract
- `src/core/services/IntegrationOrchestrator.ts` - Generic orchestrator
- `src/integrations/tradeunleashed/TradeUnleashedIntegration.ts` - Implementation
- `src/examples/interface-pattern.example.ts` - 5 working examples
- `INTERFACE-PATTERN.md` - Detailed documentation

## 🎓 Adding New Integration

```typescript
// Step 1: Implement interface
export class ShopifyIntegration implements IIntegrationService {
  public readonly name = 'shopify';
  
  async syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload> {
    // Shopify-specific implementation
  }
  // ... implement all methods
}

// Step 2: Use it (generic code doesn't change!)
const shopify = new ShopifyIntegration(config);
const orchestrator = new IntegrationOrchestrator(shopify, prisma);
await orchestrator.syncProducts(); // Just works!
```

---

**This is OOP interface pattern in Node.js!** 🎉

See [INTERFACE-PATTERN.md](./INTERFACE-PATTERN.md) for detailed explanation.

