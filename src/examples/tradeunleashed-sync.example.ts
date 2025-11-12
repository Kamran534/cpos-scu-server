/**
 * TradeUnleashed Sync Example
 * 
 * Complete end-to-end example showing:
 * 1. Integration layer (TradeUnleashed) fetches data → builds payloads
 * 2. Generic layer receives payloads → processes → saves to DB
 */

import { PrismaClient } from '@prisma/client';
import { TradeUnleashedSyncService } from '../services/TradeUnleashedSyncService';
import { TradeUnleashedConfig } from '../integrations/tradeunleashed';

// ============================================
// Example 1: Basic Sync
// ============================================

async function example1_basicSync() {
  const prisma = new PrismaClient();

  // Configuration
  const config: TradeUnleashedConfig = {
    baseUrl: process.env.TRADEUNLEASHED_BASE_URL || 'https://q-prod.tradeunleashed.com',
    username: process.env.TRADEUNLEASHED_USERNAME || 'your-username',
    password: process.env.TRADEUNLEASHED_PASSWORD || 'your-password',
  };

  // Create sync service (orchestrates integration + generic layers)
  const syncService = new TradeUnleashedSyncService(config, prisma);

  try {
    // Initialize (login to TradeUnleashed)
    console.log('Initializing TradeUnleashed connection...');
    const connected = await syncService.initialize();
    
    if (!connected) {
      console.error('Failed to connect to TradeUnleashed');
      return;
    }

    // Sync products
    console.log('Starting product sync...');
    const result = await syncService.syncProducts({
      fullSync: true,
      batchSize: 50,
    });

    // Display results
    console.log('\n✓ Sync completed!');
    console.log(`  Products created: ${result.productsCreated}`);
    console.log(`  Variants created: ${result.variantsCreated}`);
    console.log(`  Inventory items created: ${result.inventoryCreated}`);
    console.log(`  Errors: ${result.errors.length}`);
    console.log(`  Duration: ${result.duration}ms`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.sku || 'N/A'}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 2: Incremental Sync (Changes Only)
// ============================================

async function example2_incrementalSync() {
  const prisma = new PrismaClient();

  const config: TradeUnleashedConfig = {
    baseUrl: process.env.TRADEUNLEASHED_BASE_URL!,
    username: process.env.TRADEUNLEASHED_USERNAME!,
    password: process.env.TRADEUNLEASHED_PASSWORD!,
  };

  const syncService = new TradeUnleashedSyncService(config, prisma);

  try {
    await syncService.initialize();

    // Only sync items modified in last 24 hours
    const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`Syncing changes since: ${fromDate.toISOString()}`);
    
    const result = await syncService.syncProducts({
      fullSync: false,
      fromDate: fromDate,
      batchSize: 50,
    });

    console.log(`\n✓ Incremental sync completed!`);
    console.log(`  Items synced: ${result.productsCreated + result.variantsCreated + result.inventoryCreated}`);
    console.log(`  Duration: ${result.duration}ms`);

  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 3: Sync Specific Facilities
// ============================================

async function example3_syncSpecificFacilities() {
  const prisma = new PrismaClient();

  const config: TradeUnleashedConfig = {
    baseUrl: process.env.TRADEUNLEASHED_BASE_URL!,
    username: process.env.TRADEUNLEASHED_USERNAME!,
    password: process.env.TRADEUNLEASHED_PASSWORD!,
  };

  const syncService = new TradeUnleashedSyncService(config, prisma);

  try {
    await syncService.initialize();

    // Sync only specific facilities
    const facilityIds = ['886375309', '886375310'];

    console.log(`Syncing facilities: ${facilityIds.join(', ')}`);
    
    const result = await syncService.syncProducts({
      facilityIds: facilityIds,
      fullSync: true,
      batchSize: 100,
    });

    console.log(`\n✓ Facility sync completed!`);
    console.log(`  Inventory items: ${result.inventoryCreated}`);

  } catch (error) {
    console.error('Sync error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 4: Using Integration Layer Directly
// ============================================

async function example4_directIntegrationUsage() {
  const prisma = new PrismaClient();

  const config: TradeUnleashedConfig = {
    baseUrl: process.env.TRADEUNLEASHED_BASE_URL!,
    username: process.env.TRADEUNLEASHED_USERNAME!,
    password: process.env.TRADEUNLEASHED_PASSWORD!,
  };

  try {
    // Use integration layer directly (just builds payloads)
    const { TradeUnleashedProductService } = await import('../integrations/tradeunleashed');
    const productService = new TradeUnleashedProductService(config);

    console.log('Fetching from TradeUnleashed...');
    
    // Get payloads (NO DB access here)
    const batchPayload = await productService.syncInventory({
      facilityIds: ['886375309'],
      max: 10,
    });

    console.log('\nPayloads built:');
    console.log(`  Products: ${batchPayload.products.length}`);
    console.log(`  Variants: ${batchPayload.variants?.length || 0}`);
    console.log(`  Inventory: ${batchPayload.inventory?.length || 0}`);

    // Display first product payload
    if (batchPayload.products.length > 0) {
      console.log('\nFirst product payload:');
      console.log(JSON.stringify(batchPayload.products[0], null, 2));
    }

    // Now pass to generic layer processor
    const { ProductPayloadProcessor } = await import('../core/processors');
    const processor = new ProductPayloadProcessor(prisma);

    console.log('\nProcessing payloads...');
    const result = await processor.processBatch(batchPayload);

    console.log('\nProcessing result:');
    console.log(JSON.stringify(result.data, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 5: Scheduled Sync (Cron-like)
// ============================================

async function example5_scheduledSync() {
  const prisma = new PrismaClient();

  const config: TradeUnleashedConfig = {
    baseUrl: process.env.TRADEUNLEASHED_BASE_URL!,
    username: process.env.TRADEUNLEASHED_USERNAME!,
    password: process.env.TRADEUNLEASHED_PASSWORD!,
  };

  const syncService = new TradeUnleashedSyncService(config, prisma);

  try {
    await syncService.initialize();

    // Track last sync time
    let lastSyncTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    // Simulate scheduled job
    const runSync = async () => {
      console.log(`\n[${new Date().toISOString()}] Running scheduled sync...`);

      const result = await syncService.syncProducts({
        fullSync: false,
        fromDate: lastSyncTime,
        batchSize: 50,
      });

      if (result.success) {
        lastSyncTime = new Date();
        console.log(`✓ Sync successful. Next sync will fetch changes after ${lastSyncTime.toISOString()}`);
      } else {
        console.error(`✗ Sync failed with ${result.errors.length} errors`);
      }
    };

    // Run once
    await runSync();

    // In production, use node-cron:
    // import cron from 'node-cron';
    // cron.schedule('*/30 * * * *', runSync); // Every 30 minutes

  } catch (error) {
    console.error('Scheduled sync error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 6: Error Handling
// ============================================

async function example6_errorHandling() {
  const prisma = new PrismaClient();

  const config: TradeUnleashedConfig = {
    baseUrl: process.env.TRADEUNLEASHED_BASE_URL!,
    username: process.env.TRADEUNLEASHED_USERNAME!,
    password: process.env.TRADEUNLEASHED_PASSWORD!,
  };

  const syncService = new TradeUnleashedSyncService(config, prisma);

  try {
    // Test connection first
    console.log('Testing connection...');
    const isConnected = await syncService.testConnection();
    
    if (!isConnected) {
      console.error('✗ Cannot connect to TradeUnleashed');
      console.error('  Check credentials and network connection');
      return;
    }

    console.log('✓ Connection successful');

    // Initialize
    await syncService.initialize();

    // Sync with error handling
    const result = await syncService.syncProducts({
      fullSync: true,
      batchSize: 50,
    });

    // Check for errors
    if (!result.success) {
      console.error(`\n✗ Sync completed with ${result.errors.length} errors:`);
      
      // Group errors by type
      const errorsByType = result.errors.reduce((acc, err) => {
        acc[err.type] = acc[err.type] || [];
        acc[err.type].push(err);
        return acc;
      }, {} as Record<string, typeof result.errors>);

      Object.entries(errorsByType).forEach(([type, errors]) => {
        console.error(`\n  ${type.toUpperCase()} errors (${errors.length}):`);
        errors.slice(0, 5).forEach(err => {
          console.error(`    - ${err.sku || 'N/A'}: ${err.error}`);
        });
        if (errors.length > 5) {
          console.error(`    ... and ${errors.length - 5} more`);
        }
      });
    } else {
      console.log('✓ Sync completed successfully with no errors');
    }

  } catch (error) {
    if (error instanceof Error) {
      console.error(`\n✗ Fatal error: ${error.message}`);
      console.error(error.stack);
    } else {
      console.error(`\n✗ Unknown error:`, error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Run Examples
// ============================================

// Uncomment to run:
// example1_basicSync();
// example2_incrementalSync();
// example3_syncSpecificFacilities();
// example4_directIntegrationUsage();
// example5_scheduledSync();
// example6_errorHandling();

export {
  example1_basicSync,
  example2_incrementalSync,
  example3_syncSpecificFacilities,
  example4_directIntegrationUsage,
  example5_scheduledSync,
  example6_errorHandling,
};

