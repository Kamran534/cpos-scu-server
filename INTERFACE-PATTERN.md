## 🎯 Interface Pattern in Node.js/TypeScript

This document explains how we implement OOP interface pattern to decouple the generic layer from specific integrations.

## 📐 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│         Generic Layer (Core)                            │
│                                                          │
│  ┌─────────────────────────────────────────┐            │
│  │  IntegrationOrchestrator                │            │
│  │                                          │            │
│  │  Works with: IIntegrationService ◄──────┼────────┐   │
│  │  Doesn't know specific integrations     │        │   │
│  └─────────────────────────────────────────┘        │   │
│                                                      │   │
└──────────────────────────────────────────────────────┼───┘
                                                       │
                    ┌──────────────────────────────────┘
                    │  Interface Contract
                    │  (IIntegrationService)
                    │
         ┌──────────┴────────────┬───────────────┐
         │                       │               │
         ▼                       ▼               ▼
┌─────────────────┐    ┌─────────────────┐   ┌──────────────┐
│ TradeUnleashed  │    │    Shopify      │   │    Square    │
│  Integration    │    │  Integration    │   │ Integration  │
│                 │    │                 │   │              │
│ implements      │    │ implements      │   │ implements   │
│ IIntegration    │    │ IIntegration    │   │ IIntegration │
│ Service         │    │ Service         │   │ Service      │
└─────────────────┘    └─────────────────┘   └──────────────┘
```

## 🔑 Key Concept: Interface as Contract

### The Interface (Contract)

```typescript
// src/core/interfaces/IIntegrationService.ts

export interface IIntegrationService {
  readonly name: string;
  
  initialize(): Promise<void>;
  testConnection(): Promise<boolean>;
  syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload>;
  syncOrders(options?: ISyncOptions): Promise<OrderBatchPayload>;
  syncCustomers(options?: ISyncOptions): Promise<CustomerBatchPayload>;
  isInitialized(): boolean;
  disconnect(): Promise<void>;
}
```

**This is the contract ALL integrations MUST follow!**

## 📦 Implementation

### 1. Specific Integration Implements Interface

```typescript
// src/integrations/tradeunleashed/TradeUnleashedIntegration.ts

export class TradeUnleashedIntegration implements IIntegrationService {
  public readonly name = 'tradeunleashed';
  
  async initialize(): Promise<void> {
    // TradeUnleashed-specific login
  }
  
  async syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload> {
    // Call TradeUnleashed APIs
    // Build payloads
    // Return payloads
  }
  
  // ... implement all interface methods
}
```

### 2. Generic Layer Uses Interface

```typescript
// src/core/services/IntegrationOrchestrator.ts

export class IntegrationOrchestrator {
  private integration: IIntegrationService; // Only knows interface!
  
  constructor(integration: IIntegrationService, prisma: PrismaClient) {
    this.integration = integration; // Can be ANY integration
  }
  
  async syncProducts(options?: ISyncOptions): Promise<ISyncResult> {
    // Call through interface - doesn't know which integration
    const payloads = await this.integration.syncProducts(options);
    
    // Process payloads in generic layer
    const result = await this.processor.processBatch(payloads);
    
    return result;
  }
}
```

## 🎯 Benefits

### 1. **Loose Coupling**
- Generic layer doesn't depend on specific integrations
- Can add/remove integrations without changing generic code

### 2. **Polymorphism**
- Treat all integrations the same way
- Swap implementations easily

### 3. **Type Safety**
- TypeScript enforces contract at compile-time
- Can't forget to implement methods

### 4. **Testability**
- Easy to mock interfaces for testing
- Can test generic layer without real integrations

### 5. **Extensibility**
- Add new integrations by implementing interface
- No changes to existing code

## 💻 Usage Examples

### Example 1: Basic Usage

```typescript
import { IntegrationOrchestrator } from './core/services/IntegrationOrchestrator';
import { TradeUnleashedIntegration } from './integrations/tradeunleashed';

// Create integration (implements IIntegrationService)
const integration = new TradeUnleashedIntegration(config);

// Generic orchestrator only knows about interface
const orchestrator = new IntegrationOrchestrator(integration, prisma);

await orchestrator.initialize();
const result = await orchestrator.syncProducts();
```

### Example 2: Swappable Integrations

```typescript
// Same function works with ANY integration
async function syncFrom(integration: IIntegrationService) {
  const orchestrator = new IntegrationOrchestrator(integration, prisma);
  await orchestrator.initialize();
  return await orchestrator.syncProducts();
}

// Use TradeUnleashed
const tuResult = await syncFrom(new TradeUnleashedIntegration(config));

// Use Shopify (when implemented)
const shopifyResult = await syncFrom(new ShopifyIntegration(config));

// Same code, different implementations!
```

### Example 3: Multiple Integrations

```typescript
const integrations: IIntegrationService[] = [
  new TradeUnleashedIntegration(tuConfig),
  new ShopifyIntegration(shopifyConfig),
  new SquareIntegration(squareConfig),
];

// Loop through all integrations - all implement same interface
for (const integration of integrations) {
  const orchestrator = new IntegrationOrchestrator(integration, prisma);
  await orchestrator.initialize();
  await orchestrator.syncProducts();
}
```

### Example 4: Factory Pattern

```typescript
class IntegrationFactory {
  static create(type: string, config: unknown): IIntegrationService {
    switch (type) {
      case 'tradeunleashed':
        return new TradeUnleashedIntegration(config);
      case 'shopify':
        return new ShopifyIntegration(config);
      default:
        throw new Error(`Unknown integration: ${type}`);
    }
  }
}

// Create integration dynamically
const integration = IntegrationFactory.create('tradeunleashed', config);
const orchestrator = new IntegrationOrchestrator(integration, prisma);
```

## 📂 File Structure

```
src/
├── core/
│   ├── interfaces/
│   │   ├── IIntegrationService.ts     # Interface contract
│   │   └── index.ts
│   │
│   ├── services/
│   │   └── IntegrationOrchestrator.ts # Works with interface only
│   │
│   └── processors/
│       └── ProductPayloadProcessor.ts  # Processes payloads
│
├── integrations/
│   └── tradeunleashed/
│       └── TradeUnleashedIntegration.ts # Implements interface
│
└── examples/
    └── interface-pattern.example.ts    # 5 examples
```

## 🎓 Adding New Integration

To add a new integration (e.g., Shopify):

### Step 1: Implement Interface

```typescript
// src/integrations/shopify/ShopifyIntegration.ts

export class ShopifyIntegration implements IIntegrationService {
  public readonly name = 'shopify';
  
  async initialize(): Promise<void> {
    // Shopify-specific initialization
  }
  
  async syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload> {
    // Call Shopify API
    // Transform to payloads
    // Return payloads
  }
  
  // Implement all other interface methods...
}
```

### Step 2: Use It (Generic Code Doesn't Change!)

```typescript
// Same orchestrator works!
const shopify = new ShopifyIntegration(config);
const orchestrator = new IntegrationOrchestrator(shopify, prisma);

await orchestrator.syncProducts(); // Just works!
```

## 🧪 Run Examples

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

## 🔍 Key Takeaways

1. **Interface = Contract**: All integrations must implement `IIntegrationService`

2. **Generic Layer = Interface-Aware**: `IntegrationOrchestrator` only knows about the interface, not specific implementations

3. **Specific Layers = Implementations**: `TradeUnleashedIntegration`, `ShopifyIntegration`, etc. implement the interface

4. **TypeScript Enforces**: Compiler ensures all methods are implemented

5. **Swappable**: Can swap integrations without changing generic code

## 📊 Comparison

### ❌ Without Interface (Tight Coupling)

```typescript
// Generic layer depends on specific implementation
class GenericService {
  private tu: TradeUnleashedService; // Tightly coupled!
  
  async sync() {
    await this.tu.doTradeUnleashedSpecificThing(); // Can't swap!
  }
}
```

### ✅ With Interface (Loose Coupling)

```typescript
// Generic layer depends on interface only
class IntegrationOrchestrator {
  private integration: IIntegrationService; // Loosely coupled!
  
  async sync() {
    await this.integration.syncProducts(); // Works with ANY integration!
  }
}
```

---

**This is how we implement OOP interface pattern in Node.js/TypeScript!** 🎉

