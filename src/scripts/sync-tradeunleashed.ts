#!/usr/bin/env node
/**
 * TradeUnleashed Sync Script
 * 
 * CLI script to sync products from TradeUnleashed
 * Uses configuration from .env file
 * 
 * Usage:
 *   npm run sync:tu              # Full sync
 *   npm run sync:tu -- --test    # Test connection only
 *   npm run sync:tu -- --from=2025-01-10  # Incremental sync
 */

import { PrismaClient } from '@prisma/client';
import { TradeUnleashedSyncService } from '../services/TradeUnleashedSyncService';
import { config } from '../config';

interface CliOptions {
  test?: boolean;
  from?: string;
  facilities?: string;
  batchSize?: number;
  help?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};

  for (const arg of args) {
    if (arg === '--test') {
      options.test = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--from=')) {
      options.from = arg.split('=')[1];
    } else if (arg.startsWith('--facilities=')) {
      options.facilities = arg.split('=')[1];
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    }
  }

  return options;
}

function showHelp() {
  console.log(`
TradeUnleashed Sync Script

Usage:
  npm run sync:tu [options]

Options:
  --test                  Test connection only (no sync)
  --from=DATE            Sync changes since date (YYYY-MM-DD)
  --facilities=IDS       Comma-separated facility IDs
  --batch-size=N         Number of items per batch (default: 50)
  --help, -h             Show this help message

Examples:
  npm run sync:tu
    Full sync of all products

  npm run sync:tu -- --test
    Test connection to TradeUnleashed

  npm run sync:tu -- --from=2025-01-10
    Sync changes since January 10, 2025

  npm run sync:tu -- --facilities=886375309,886375310
    Sync specific facilities only

  npm run sync:tu -- --from=2025-01-10 --batch-size=100
    Incremental sync with larger batch size

Environment Variables (set in .env):
  TRADEUNLEASHED_BASE_URL    TradeUnleashed API URL
  TRADEUNLEASHED_USERNAME    Your username
  TRADEUNLEASHED_PASSWORD    Your password
  DATABASE_URL               PostgreSQL connection string
`);
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('═══════════════════════════════════════');
  console.log('  TradeUnleashed Sync Script');
  console.log('═══════════════════════════════════════');

  // Validate configuration
  const tuConfig = config.tradeUnleashed;
  if (!tuConfig.username || !tuConfig.password) {
    console.error('\n❌ TradeUnleashed credentials not configured!');
    console.error('\nPlease add these to your .env file:');
    console.error('  TRADEUNLEASHED_BASE_URL=https://q-prod.tradeunleashed.com');
    console.error('  TRADEUNLEASHED_USERNAME=your-username');
    console.error('  TRADEUNLEASHED_PASSWORD=your-password');
    process.exit(1);
  }

  console.log('\nConfiguration:');
  console.log(`  Base URL:    ${tuConfig.baseUrl}`);
  console.log(`  Username:    ${tuConfig.username}`);
  console.log(`  Password:    ${'*'.repeat(tuConfig.password.length)}`);

  const prisma = new PrismaClient();
  const syncService = new TradeUnleashedSyncService(tuConfig, prisma);

  try {
    // Initialize connection
    console.log('\n🔐 Connecting to TradeUnleashed...');
    const connected = await syncService.initialize();

    if (!connected) {
      console.error('❌ Failed to connect to TradeUnleashed');
      console.error('Please check your credentials in .env file');
      process.exit(1);
    }

    console.log('✅ Connected successfully!');

    // Test connection only
    if (options.test) {
      console.log('\n✅ Connection test successful!');
      console.log('You can now run full sync by removing --test flag');
      return;
    }

    // Parse options
    const facilityIds = options.facilities?.split(',').map(id => id.trim());
    const fromDate = options.from ? new Date(options.from) : undefined;
    const batchSize = options.batchSize || 50;

    console.log('\nSync Options:');
    console.log(`  Type:        ${fromDate ? 'Incremental' : 'Full'}`);
    if (fromDate) {
      console.log(`  From Date:   ${fromDate.toISOString()}`);
    }
    if (facilityIds) {
      console.log(`  Facilities:  ${facilityIds.join(', ')}`);
    }
    console.log(`  Batch Size:  ${batchSize}`);

    // Run sync
    console.log('\n📦 Starting sync...\n');
    const startTime = Date.now();

    const result = await syncService.syncProducts({
      facilityIds,
      fromDate,
      fullSync: !fromDate,
      batchSize,
    });

    const totalTime = Date.now() - startTime;

    // Display results
    console.log('\n═══════════════════════════════════════');
    console.log('  Sync Results');
    console.log('═══════════════════════════════════════');
    console.log(`Status:              ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Products Created:    ${result.productsCreated}`);
    console.log(`Variants Created:    ${result.variantsCreated}`);
    console.log(`Inventory Created:   ${result.inventoryCreated}`);
    console.log(`Errors:              ${result.errors.length}`);
    console.log(`Duration:            ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log('═══════════════════════════════════════');

    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.slice(0, 10).forEach((err, i) => {
        console.log(`  ${i + 1}. [${err.type}] ${err.sku || 'N/A'}: ${err.error}`);
      });
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more errors`);
      }
      process.exit(1);
    } else {
      console.log('\n✅ Sync completed successfully with no errors!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

