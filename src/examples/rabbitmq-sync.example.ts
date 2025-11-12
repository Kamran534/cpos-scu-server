/**
 * RabbitMQ Sync Examples
 * 
 * Demonstrates queue-based async sync operations
 */

import { SyncQueueService } from '../services/SyncQueueService';

const syncQueue = new SyncQueueService();

// ============================================
// Example 1: Queue Product Sync (Non-Blocking)
// ============================================

async function example1_queueProductSync() {
  console.log('Example 1: Queue Product Sync (Non-Blocking)\n');

  // Queue the job - returns immediately!
  const result = await syncQueue.queueProductSync('tradeunleashed', {
    fullSync: true,
    batchSize: 50,
  });

  console.log('Response (immediate):');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n✓ API returned immediately!');
  console.log('  The sync will happen in the background.');
  console.log(`  Job ID: ${result.jobId}`);
  console.log(`  Estimated time: ${result.estimatedTime}`);
}

// ============================================
// Example 2: Queue Incremental Sync
// ============================================

async function example2_incrementalSync() {
  console.log('Example 2: Queue Incremental Sync\n');

  const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  const result = await syncQueue.queueProductSync('tradeunleashed', {
    fullSync: false,
    fromDate,
    batchSize: 50,
  });

  console.log(`✓ Queued incremental sync (since ${fromDate.toISOString()})`);
  console.log(`  Job ID: ${result.jobId}`);
}

// ============================================
// Example 3: Queue Multiple Sync Jobs
// ============================================

async function example3_multipleSyncJobs() {
  console.log('Example 3: Queue Multiple Sync Jobs\n');

  // Queue multiple jobs - all return immediately
  const jobs = await Promise.all([
    syncQueue.queueProductSync('tradeunleashed', { fullSync: true }),
    syncQueue.queueOrderSync('tradeunleashed', { fullSync: true }),
    syncQueue.queueCustomerSync('tradeunleashed', { fullSync: true }),
  ]);

  console.log('✓ Queued 3 sync jobs:');
  jobs.forEach((job, i) => {
    console.log(`  ${i + 1}. ${job.jobId}`);
  });
  console.log('\nAll will process in parallel in background!');
}

// ============================================
// Example 4: Get Queue Stats
// ============================================

async function example4_queueStats() {
  console.log('Example 4: Get Queue Stats\n');

  const stats = await syncQueue.getQueueStats();

  console.log('Queue Statistics:');
  console.log(`  Queue Name: ${stats.queueName}`);
  console.log(`  Pending Jobs: ${stats.messageCount}`);
  console.log(`  Active Workers: ${stats.consumerCount}`);
}

// ============================================
// Example 5: Facility-Specific Sync
// ============================================

async function example5_facilitySync() {
  console.log('Example 5: Facility-Specific Sync\n');

  const result = await syncQueue.queueProductSync('tradeunleashed', {
    facilityIds: ['886375309', '886375310'],
    fullSync: false,
    batchSize: 100,
  });

  console.log(`✓ Queued sync for 2 facilities`);
  console.log(`  Job ID: ${result.jobId}`);
}

// ============================================
// Example 6: Simulating API Endpoint
// ============================================

async function example6_apiEndpoint() {
  console.log('Example 6: Simulating API Endpoint\n');

  // This simulates what happens when user calls POST /api/sync/queue/products
  console.log('User: POST /api/sync/queue/products');
  console.log('Body: { integration: "tradeunleashed", fullSync: true }\n');

  const startTime = Date.now();
  
  const result = await syncQueue.queueProductSync('tradeunleashed', {
    fullSync: true,
  });
  
  const responseTime = Date.now() - startTime;

  console.log(`✓ Response received in ${responseTime}ms`);
  console.log('Response:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\nUser experience: Instant response!');
  console.log('Backend: Sync happens in background');
}

// ============================================
// Main Runner
// ============================================

async function main() {
  const examples = [
    { name: 'Queue Product Sync', fn: example1_queueProductSync },
    { name: 'Incremental Sync', fn: example2_incrementalSync },
    { name: 'Multiple Sync Jobs', fn: example3_multipleSyncJobs },
    { name: 'Queue Stats', fn: example4_queueStats },
    { name: 'Facility-Specific Sync', fn: example5_facilitySync },
    { name: 'API Endpoint Simulation', fn: example6_apiEndpoint },
  ];

  const exampleNum = process.argv[2] ? parseInt(process.argv[2]) : 1;

  if (exampleNum < 1 || exampleNum > examples.length) {
    console.log('Available examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    console.log('\nUsage: npm run example:queue [number]');
    return;
  }

  const example = examples[exampleNum - 1];
  console.log(`\nRunning: ${example.name}\n`);
  console.log('═══════════════════════════════════════\n');
  
  await example.fn();
  
  console.log('\n═══════════════════════════════════════');
}

// Run if executed directly
main().catch(console.error);

export {
  example1_queueProductSync,
  example2_incrementalSync,
  example3_multipleSyncJobs,
  example4_queueStats,
  example5_facilitySync,
  example6_apiEndpoint,
};

