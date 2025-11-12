### 🐰 RabbitMQ Integration - Complete Setup Guide

## 📋 Overview

This guide shows how to use RabbitMQ for **asynchronous background sync** operations. Users get immediate API responses while sync happens in the background.

---

## 🎯 Architecture

```
┌──────────────────────────────────────────────────────────┐
│  User Request                                            │
│  POST /api/sync/queue/products                           │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────┐
│  SyncQueueService (Producer)                             │
│  - Queue message to RabbitMQ                             │
│  - Return immediately ✓                                  │
└───────────────────┬──────────────────────────────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │   RabbitMQ       │
          │  (Message Queue) │
          └────────┬──────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  SyncWorker (Consumer) - Background Process              │
│  1. Pick message from queue                              │
│  2. TradeUnleashed Integration → Build payloads          │
│  3. Generic Layer → Process payloads                     │
│  4. Save to DB                                           │
│  5. Publish result                                       │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Step 1: Install RabbitMQ

**Option A: Docker (Recommended)**
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management

# Access management UI: http://localhost:15672
# Username: guest
# Password: guest
```

**Option B: Local Installation**
- Windows: Download from https://www.rabbitmq.com/download.html
- Mac: `brew install rabbitmq`
- Linux: `sudo apt-get install rabbitmq-server`

### Step 2: Configure Environment

```env
# Add to .env file
RABBITMQ_URL=amqp://localhost:5672
QUEUE_NAME=pos-sync-jobs
QUEUE_TYPE=quorum
```

### Step 3: Start Background Worker

```bash
# Terminal 1: Start the worker
npm run worker:sync
```

Output:
```
═══════════════════════════════════════
  Sync Worker
═══════════════════════════════════════

[SyncWorker] 🚀 Started and waiting for sync jobs...
[SyncWorker] Queue: sync-jobs

✓ Worker is running
  Press Ctrl+C to stop
```

### Step 4: Start API Server

```bash
# Terminal 2: Start the API
npm run dev
```

### Step 5: Queue a Sync Job

```bash
# Terminal 3: Queue a product sync
curl -X POST http://localhost:4000/api/sync/queue/products \
  -H "Content-Type: application/json" \
  -d '{
    "integration": "tradeunleashed",
    "fullSync": true,
    "batchSize": 50
  }'
```

**Response (IMMEDIATE!):**
```json
{
  "success": true,
  "message": "Sync job queued successfully",
  "jobId": "tradeunleashed-sync.products-1704899471234",
  "queueName": "sync-jobs",
  "estimatedTime": "5-10 minutes"
}
```

Worker output:
```
[SyncWorker] 📬 Received job: {"type":"sync.products"...
[SyncWorker] Processing sync.products for tradeunleashed
[SyncWorker] ✅ Job completed successfully
[SyncWorker]   Created: 150
[SyncWorker]   Errors: 0
[SyncWorker]   Duration: 45232ms
```

---

## 📦 API Endpoints

### Queue Product Sync
```bash
POST /api/sync/queue/products
Content-Type: application/json

{
  "integration": "tradeunleashed",
  "fullSync": true,
  "facilityIds": ["886375309"],
  "fromDate": "2025-01-10T00:00:00Z",
  "batchSize": 50
}

# Response: 202 Accepted (immediate)
```

### Queue Order Sync
```bash
POST /api/sync/queue/orders
Content-Type: application/json

{
  "integration": "tradeunleashed",
  "fullSync": false,
  "fromDate": "2025-01-10T00:00:00Z",
  "batchSize": 50
}
```

### Queue Customer Sync
```bash
POST /api/sync/queue/customers
Content-Type: application/json

{
  "integration": "tradeunleashed",
  "fullSync": true,
  "batchSize": 50
}
```

### Get Queue Stats
```bash
GET /api/sync/queue/stats

# Response:
{
  "queueName": "sync-jobs",
  "messageCount": 3,
  "consumerCount": 1
}
```

---

## 💻 Usage Examples

### Example 1: Non-Blocking Sync

```typescript
import { SyncQueueService } from './services/SyncQueueService';

const syncQueue = new SyncQueueService();

// Queue job - returns immediately!
const result = await syncQueue.queueProductSync('tradeunleashed', {
  fullSync: true,
  batchSize: 50,
});

console.log('Queued!', result.jobId);
// User can continue working, sync happens in background
```

### Example 2: Multiple Jobs

```typescript
// Queue multiple jobs in parallel
const jobs = await Promise.all([
  syncQueue.queueProductSync('tradeunleashed', { fullSync: true }),
  syncQueue.queueOrderSync('tradeunleashed', { fullSync: true }),
  syncQueue.queueCustomerSync('tradeunleashed', { fullSync: true }),
]);

console.log(`Queued ${jobs.length} jobs`);
// All will process in background in parallel!
```

### Example 3: Scheduled Sync

```typescript
import cron from 'node-cron';

// Queue sync every hour
cron.schedule('0 * * * *', async () => {
  await syncQueue.queueProductSync('tradeunleashed', {
    fullSync: false,
    fromDate: new Date(Date.now() - 60 * 60 * 1000),
  });
  console.log('Hourly sync queued');
});
```

---

## 🎨 How It Works

### Producer Flow (SyncQueueService)

```typescript
// 1. User calls API
POST /api/sync/queue/products

// 2. Controller queues message
await syncQueue.queueProductSync(integration, options);

// 3. Message sent to RabbitMQ
{
  type: 'sync.products',
  integration: 'tradeunleashed',
  options: { fullSync: true },
  jobId: 'unique-id',
  timestamp: Date
}

// 4. Return immediately
HTTP 202 Accepted
{ jobId: 'unique-id', message: 'Queued successfully' }
```

### Consumer Flow (SyncWorker)

```typescript
// 1. Worker picks message from queue
message = await queue.consume()

// 2. Create integration service
const integration = new TradeUnleashedIntegration(config);

// 3. Create orchestrator
const orchestrator = new IntegrationOrchestrator(integration, prisma);

// 4. Execute sync
const result = await orchestrator.syncProducts(options);

// 5. Publish result
await publishResult(result);

// 6. Acknowledge message (remove from queue)
queue.ack(message);
```

---

## 🔧 Configuration

### Queue Options

```typescript
// src/services/SyncQueueService.ts

await channel.assertQueue(queueName, {
  durable: true,              // Survives broker restarts
  arguments: {
    'x-message-ttl': 86400000, // 24 hours TTL
  },
});
```

### Worker Options

```typescript
// src/workers/SyncWorker.ts

channel.prefetch(1);  // Process one job at a time
```

### Message Priority

```typescript
// Full sync = higher priority
priority: options?.fullSync ? 1 : 5
```

---

## 📊 Monitoring

### RabbitMQ Management UI

Access: http://localhost:15672

- View queues
- See message counts
- Monitor consumers
- View throughput

### Queue Stats API

```bash
GET /api/sync/queue/stats

{
  "queueName": "sync-jobs",
  "messageCount": 5,      # Pending jobs
  "consumerCount": 2      # Active workers
}
```

### Worker Logs

```bash
# Worker logs show:
- Jobs received
- Processing time
- Success/failure
- Created/updated counts
```

---

## 🎓 Advanced Usage

### Multiple Workers (Scale Up)

```bash
# Terminal 1
npm run worker:sync

# Terminal 2
npm run worker:sync

# Terminal 3
npm run worker:sync

# Now 3 workers process jobs in parallel!
```

### Dead Letter Queue (DLQ)

```typescript
// Configure DLQ for failed jobs
await channel.assertQueue('sync-jobs', {
  durable: true,
  arguments: {
    'x-dead-letter-exchange': 'dlx',
    'x-dead-letter-routing-key': 'failed-syncs',
  },
});
```

### Retry Logic

```typescript
// Worker auto-retries on failure
try {
  await processJob(message);
  channel.ack(message);  // Success
} catch (error) {
  channel.nack(message, false, true);  // Retry (requeue)
}
```

---

## 🎯 Benefits

### ✅ For Users
- **Instant response** - No waiting for long operations
- **Better UX** - Can continue working immediately
- **Progress tracking** - Can check job status

### ✅ For System
- **Scalable** - Add more workers to handle load
- **Reliable** - Messages persist, retry on failure
- **Decoupled** - API server and workers are independent
- **Flexible** - Easy to add new job types

---

## 🐛 Troubleshooting

### Worker not receiving messages?

```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check queue exists
# Visit: http://localhost:15672/#/queues

# Check worker is connected
# Look for: "[SyncWorker] 🚀 Started and waiting for sync jobs..."
```

### Messages stuck in queue?

```bash
# Check worker is running
ps aux | grep worker:sync

# Check for errors in worker logs
npm run worker:sync

# Purge queue (if needed)
# Visit: http://localhost:15672/#/queues
# Click queue → "Purge Messages"
```

### Connection errors?

```env
# Check RABBITMQ_URL in .env
RABBITMQ_URL=amqp://localhost:5672

# Test connection
telnet localhost 5672
```

---

## 📚 Run Examples

```bash
# Example 1: Queue Product Sync
npm run example:queue 1

# Example 2: Incremental Sync
npm run example:queue 2

# Example 3: Multiple Jobs
npm run example:queue 3

# Example 4: Queue Stats
npm run example:queue 4

# Example 5: Facility-Specific
npm run example:queue 5

# Example 6: API Simulation
npm run example:queue 6
```

---

## 📝 Files Created

1. **`src/types/queue.types.ts`** - Message types
2. **`src/services/SyncQueueService.ts`** - Producer
3. **`src/workers/SyncWorker.ts`** - Consumer
4. **`src/controllers/syncQueueController.ts`** - API controller
5. **`src/routes/syncQueueRoutes.ts`** - API routes
6. **`src/scripts/start-sync-worker.ts`** - Worker startup script
7. **`src/examples/rabbitmq-sync.example.ts`** - Examples

---

## 🎉 Summary

**Before RabbitMQ:**
```
User → API → Sync (30s) → Response
User waits 30 seconds! 😴
```

**After RabbitMQ:**
```
User → API → Queue → Response (50ms)
       Background Worker → Sync (30s)
User continues working! 🚀
```

---

**You now have a production-ready async sync system!** 🎊

Start with:
1. `npm run worker:sync` (Terminal 1)
2. `npm run dev` (Terminal 2)
3. Test: `curl -X POST http://localhost:4000/api/sync/queue/products -d '{"fullSync":true}'`

