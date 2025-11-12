/**
 * TradeUnleashed Sync Example - Using Config
 * 
 * Examples showing how to use environment variables from config
 */

import { PrismaClient } from '@prisma/client';
import { TradeUnleashedSyncService } from '../services/TradeUnleashedSyncService';
import { config } from '../config';

// ============================================
// Example 1: Basic Sync Using Config
// ============================================

async function example1_basicSyncWithConfig() {
  const prisma = new PrismaClient();

  // Get configuration from environment variables
  const tuConfig = config.tradeUnleashed;

  // Validate configuration
  if (!tuConfig.username || !tuConfig.password) {
    console.error('❌ TradeUnleashed credentials not configured');
    console.error('Please set TRADEUNLEASHED_USERNAME and TRADEUNLEASHED_PASSWORD in .env file');
    return;
  }

  console.log('Configuration loaded:');
  console.log(`  Base URL: ${tuConfig.baseUrl}`);
  console.log(`  Username: ${tuConfig.username}`);
  console.log(`  Password: ${'*'.repeat(tuConfig.password.length)}`);

  // Create sync service
  const syncService = new TradeUnleashedSyncService(tuConfig, prisma);

  try {
    // Initialize (login to TradeUnleashed)
    console.log('\n🔐 Initializing TradeUnleashed connection...');
    const connected = await syncService.initialize();
    
    if (!connected) {
      console.error('❌ Failed to connect to TradeUnleashed');
      console.error('Please check your credentials in .env file');
      return;
    }

    console.log('✅ Connected successfully!');

    // Sync products
    console.log('\n📦 Starting product sync...');
    const result = await syncService.syncProducts({
      fullSync: true,
      batchSize: 50,
    });

    // Display results
    console.log('\n═══════════════════════════════════════');
    console.log('✅ Sync completed!');
    console.log('═══════════════════════════════════════');
    console.log(`Products created:    ${result.productsCreated}`);
    console.log(`Variants created:    ${result.variantsCreated}`);
    console.log(`Inventory created:   ${result.inventoryCreated}`);
    console.log(`Errors:              ${result.errors.length}`);
    console.log(`Duration:            ${result.duration}ms`);
    console.log('═══════════════════════════════════════');

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.slice(0, 5).forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.sku || 'N/A'}: ${err.error}`);
      });
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more errors`);
      }
    }

  } catch (error) {
    console.error('\n❌ Sync error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 2: Incremental Sync Using Config
// ============================================

async function example2_incrementalSyncWithConfig() {
  const prisma = new PrismaClient();

  const syncService = new TradeUnleashedSyncService(
    config.tradeUnleashed,
    prisma
  );

  try {
    await syncService.initialize();

    // Only sync items modified in last 24 hours
    const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    console.log(`\n📅 Syncing changes since: ${fromDate.toISOString()}`);
    
    const result = await syncService.syncProducts({
      fullSync: false,
      fromDate: fromDate,
      batchSize: 50,
    });

    console.log(`\n✅ Incremental sync completed!`);
    console.log(`  Items synced: ${result.productsCreated + result.variantsCreated + result.inventoryCreated}`);
    console.log(`  Duration: ${result.duration}ms`);

  } catch (error) {
    console.error('❌ Sync error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 3: Test Connection
// ============================================

async function example3_testConnection() {
  const prisma = new PrismaClient();

  const tuConfig = config.tradeUnleashed;

  console.log('Testing TradeUnleashed connection...');
  console.log(`Base URL: ${tuConfig.baseUrl}`);
  console.log(`Username: ${tuConfig.username}`);

  const syncService = new TradeUnleashedSyncService(tuConfig, prisma);

  try {
    const isConnected = await syncService.testConnection();

    if (isConnected) {
      console.log('✅ Connection successful!');
      console.log('You can now run sync operations.');
    } else {
      console.error('❌ Connection failed!');
      console.error('Please check:');
      console.error('  1. TRADEUNLEASHED_BASE_URL is correct');
      console.error('  2. TRADEUNLEASHED_USERNAME is correct');
      console.error('  3. TRADEUNLEASHED_PASSWORD is correct');
      console.error('  4. Network connection is working');
    }

  } catch (error) {
    console.error('❌ Connection test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================
// Example 4: Display Configuration
// ============================================

function example4_displayConfig() {
  console.log('Current Configuration:');
  console.log('═══════════════════════════════════════');
  console.log('Server:');
  console.log(`  Port:        ${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Base URL:    ${config.baseUrl}`);
  console.log('');
  console.log('TradeUnleashed:');
  console.log(`  Base URL:    ${config.tradeUnleashed.baseUrl}`);
  console.log(`  Username:    ${config.tradeUnleashed.username || '(not set)'}`);
  console.log(`  Password:    ${config.tradeUnleashed.password ? '***' : '(not set)'}`);
  console.log('');
  console.log('Database:');
  console.log(`  URL:         ${config.databaseUrl ? config.databaseUrl.replace(/:[^:@]+@/, ':***@') : '(not set)'}`);
  console.log('═══════════════════════════════════════');

  // Validation
  const errors: string[] = [];
  if (!config.tradeUnleashed.username) {
    errors.push('TRADEUNLEASHED_USERNAME is not set');
  }
  if (!config.tradeUnleashed.password) {
    errors.push('TRADEUNLEASHED_PASSWORD is not set');
  }
  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is not set');
  }

  if (errors.length > 0) {
    console.log('\n⚠️  Configuration Issues:');
    errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
    console.log('\nPlease update your .env file with these values.');
  } else {
    console.log('\n✅ All required configuration is set!');
  }
}

// ============================================
// Example 5: Scheduled Sync Using Config
// ============================================

async function example5_scheduledSyncWithConfig() {
  const prisma = new PrismaClient();

  const syncService = new TradeUnleashedSyncService(
    config.tradeUnleashed,
    prisma
  );

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
        console.log(`✅ Sync successful. Next sync will fetch changes after ${lastSyncTime.toISOString()}`);
      } else {
        console.error(`❌ Sync failed with ${result.errors.length} errors`);
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
// Main Runner
// ============================================

async function main() {
  console.log('TradeUnleashed Sync Examples (Using Config)\n');
  
  const examples = [
    { name: '1. Display Configuration', fn: () => Promise.resolve(example4_displayConfig()) },
    { name: '2. Test Connection', fn: example3_testConnection },
    { name: '3. Basic Sync', fn: example1_basicSyncWithConfig },
    { name: '4. Incremental Sync', fn: example2_incrementalSyncWithConfig },
    { name: '5. Scheduled Sync', fn: example5_scheduledSyncWithConfig },
  ];

  // Get example number from command line or default to showing config
  const exampleNum = process.argv[2] ? parseInt(process.argv[2]) : 1;

  if (exampleNum < 1 || exampleNum > examples.length) {
    console.log('Available examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    console.log('\nUsage: npm run example:tu [number]');
    console.log('Example: npm run example:tu 3');
    return;
  }

  const example = examples[exampleNum - 1];
  console.log(`Running: ${example.name}\n`);
  await example.fn();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other files
export {
  example1_basicSyncWithConfig,
  example2_incrementalSyncWithConfig,
  example3_testConnection,
  example4_displayConfig,
  example5_scheduledSyncWithConfig,
};

