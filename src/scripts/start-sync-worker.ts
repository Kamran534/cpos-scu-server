#!/usr/bin/env node
/**
 * Start Sync Worker
 * 
 * Starts the background worker that processes sync jobs from RabbitMQ
 * 
 * Usage:
 *   npm run worker:sync
 */

import { SyncWorker } from '../workers/SyncWorker';

const worker = new SyncWorker();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Worker] Received SIGINT, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Worker] Received SIGTERM, shutting down gracefully...');
  await worker.stop();
  process.exit(0);
});

// Start worker
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Sync Worker');
  console.log('═══════════════════════════════════════\n');

  try {
    await worker.start();
    
    console.log('\n✓ Worker is running');
    console.log('  Press Ctrl+C to stop\n');
  } catch (error) {
    console.error('✗ Failed to start worker:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

