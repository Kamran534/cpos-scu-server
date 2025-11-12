/**
 * Interface Pattern Example
 * 
 * Demonstrates OOP interface pattern in Node.js/TypeScript
 * Generic layer only knows about IIntegrationService interface
 * Specific integrations implement the interface
 */

import { PrismaClient } from '@prisma/client';
import { IIntegrationService } from '../core/interfaces/IIntegrationService';
import { IntegrationOrchestrator } from '../core/services/IntegrationOrchestrator';
import { TradeUnleashedIntegration } from '../integrations/tradeunleashed/TradeUnleashedIntegration';
import { config } from '../config';

// ============================================
// Example 1: Using TradeUnleashed through Interface
// ============================================

async function example1_interfacePattern() {
  const prisma = new PrismaClient();

  try {
    // Create TradeUnleashed integration (implements IIntegrationService)
    const tuIntegration: IIntegrationService = new TradeUnleashedIntegration(
      config.tradeUnleashed
    );

    // Generic orchestrator only knows about IIntegrationService
    // It doesn't know this is TradeUnleashed!
    const orchestrator = new IntegrationOrchestrator(tuIntegration, prisma);

    // Initialize
    await orchestrator.initialize();
    console.log(`✅ Initialized integration: ${orchestrator.getIntegrationName()}`);

    // Sync products - orchestrator doesn't care which integration it is
    const result = await orchestrator.syncProducts({
      fullSync: true,
      batchSize: 50,
    });

    console.log('\n═══════════════════════════════════════');
    console.log('Sync Results:');
    console.log(`  Integration: ${orchestrator.getIntegrationName()}`);
    console.log(`  Success: ${result.success}`);
    console.log(`  Created: ${result.created}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Duration: ${result.duration}ms`);
    console.log('═══════════════════════════════════════');

  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 2: Swapping Integrations
// ============================================

async function example2_swappableIntegrations() {
  const prisma = new PrismaClient();

  try {
    // This function works with ANY integration that implements IIntegrationService
    async function syncFromAnyIntegration(integration: IIntegrationService) {
      const orchestrator = new IntegrationOrchestrator(integration, prisma);
      
      await orchestrator.initialize();
      
      const result = await orchestrator.syncProducts({ fullSync: true });
      
      console.log(`Synced from ${integration.name}: ${result.created} items created`);
      
      return result;
    }

    // Use TradeUnleashed
    const tuIntegration: IIntegrationService = new TradeUnleashedIntegration(
      config.tradeUnleashed
    );
    await syncFromAnyIntegration(tuIntegration);

    // In the future, add Shopify - same code works!
    // const shopifyIntegration: IIntegrationService = new ShopifyIntegration(shopifyConfig);
    // await syncFromAnyIntegration(shopifyIntegration);

    // Add Square - same code works!
    // const squareIntegration: IIntegrationService = new SquareIntegration(squareConfig);
    // await syncFromAnyIntegration(squareIntegration);

  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 3: Multiple Integrations
// ============================================

async function example3_multipleIntegrations() {
  const prisma = new PrismaClient();

  try {
    // Array of integrations - all implement same interface
    const integrations: IIntegrationService[] = [
      new TradeUnleashedIntegration(config.tradeUnleashed),
      // new ShopifyIntegration(shopifyConfig),
      // new SquareIntegration(squareConfig),
    ];

    // Sync from all integrations
    for (const integration of integrations) {
      console.log(`\n📦 Syncing from ${integration.name}...`);
      
      const orchestrator = new IntegrationOrchestrator(integration, prisma);
      await orchestrator.initialize();
      
      const result = await orchestrator.syncProducts({ batchSize: 50 });
      
      console.log(`✅ ${integration.name}: ${result.created} created, ${result.errors.length} errors`);
    }

  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 4: Integration Factory Pattern
// ============================================

type IntegrationType = 'tradeunleashed' | 'shopify' | 'square';

class IntegrationFactory {
  static create(type: IntegrationType, config: Record<string, unknown>): IIntegrationService {
    switch (type) {
      case 'tradeunleashed':
        return new TradeUnleashedIntegration(config as never);
      // case 'shopify':
      //   return new ShopifyIntegration(config as ShopifyConfig);
      // case 'square':
      //   return new SquareIntegration(config as SquareConfig);
      default:
        throw new Error(`Unknown integration type: ${type}`);
    }
  }
}

async function example4_factoryPattern() {
  const prisma = new PrismaClient();

  try {
    // Create integration using factory
    const integration = IntegrationFactory.create('tradeunleashed', config.tradeUnleashed);

    // Use it - generic code doesn't care which integration
    const orchestrator = new IntegrationOrchestrator(integration, prisma);
    await orchestrator.initialize();
    
    const result = await orchestrator.syncProducts();
    console.log(`Factory-created ${integration.name} synced ${result.created} items`);

  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 5: Interface Contract Enforcement
// ============================================

async function example5_contractEnforcement() {
  // This demonstrates that TypeScript enforces the interface contract
  
  // If you try to create an integration that doesn't implement IIntegrationService:
  // class BadIntegration {
  //   // Missing required methods!
  // }
  
  // This won't compile:
  // const bad: IIntegrationService = new BadIntegration(); // ERROR!
  
  // TradeUnleashed MUST implement all methods from IIntegrationService
  const integration: IIntegrationService = new TradeUnleashedIntegration(
    config.tradeUnleashed
  );

  // TypeScript guarantees these methods exist
  console.log('Integration name:', integration.name);
  console.log('Has initialize():', typeof integration.initialize === 'function');
  console.log('Has syncProducts():', typeof integration.syncProducts === 'function');
  console.log('Has testConnection():', typeof integration.testConnection === 'function');
}

// ============================================
// Main Runner
// ============================================

async function main() {
  const examples = [
    { name: 'Interface Pattern', fn: example1_interfacePattern },
    { name: 'Swappable Integrations', fn: example2_swappableIntegrations },
    { name: 'Multiple Integrations', fn: example3_multipleIntegrations },
    { name: 'Factory Pattern', fn: example4_factoryPattern },
    { name: 'Contract Enforcement', fn: example5_contractEnforcement },
  ];

  const exampleNum = process.argv[2] ? parseInt(process.argv[2]) : 1;

  if (exampleNum < 1 || exampleNum > examples.length) {
    console.log('Available examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    return;
  }

  const example = examples[exampleNum - 1];
  console.log(`\nRunning: ${example.name}\n`);
  await example.fn();
}

if (require.main === module) {
  main().catch(console.error);
}

export {
  example1_interfacePattern,
  example2_swappableIntegrations,
  example3_multipleIntegrations,
  example4_factoryPattern,
  example5_contractEnforcement,
};

