# RabbitMQ Async Sync - Quick Start 🐰

## 🎯 What Is This?

**Before**: User waits 30+ seconds for sync to complete  
**After**: User gets response in 50ms, sync happens in background

---

## ⚡ Quick Setup (3 Steps)

### 1. Start RabbitMQ
```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 2. Start Background Worker
```bash
npm run worker:sync
```

### 3. Queue a Sync Job
```bash
curl -X POST http://localhost:4000/api/sync/queue/products \
  -H "Content-Type: application/json" \
  -d '{"integration":"tradeunleashed","fullSync":true}'
```

**Response (Immediate!):**
```json
{
  "success": true,
  "message": "Sync job queued successfully",
  "jobId": "tradeunleashed-sync.products-1704899471234",
  "estimatedTime": "5-10 minutes"
}
```

---

## 📋 API Endpoints

### Queue Product Sync (Non-Blocking)
```bash
POST /api/sync/queue/products

{
  "integration": "tradeunleashed",
  "fullSync": true,
  "facilityIds": ["886375309"],
  "batchSize": 50
}

# Returns immediately! (202 Accepted)
```

### Queue Order Sync
```bash
POST /api/sync/queue/orders
```

### Queue Customer Sync
```bash
POST /api/sync/queue/customers
```

### Get Queue Stats
```bash
GET /api/sync/queue/stats
```

---

## 🎨 How It Works

```
User Request
    ↓
API queues message to RabbitMQ (50ms)
    ↓
Return immediately ✓
    ↓
Background Worker picks up message
    ↓
Syncs from TradeUnleashed (30s)
    ↓
Saves to database
    ↓
Publishes result
```

---

## 💻 Usage in Code

```typescript
import { SyncQueueService } from './services/SyncQueueService';

const syncQueue = new SyncQueueService();

// Queue sync - returns immediately!
const result = await syncQueue.queueProductSync('tradeunleashed', {
  fullSync: true,
});

console.log('Queued!', result.jobId);
// Sync happens in background, user can continue working
```

---

## 🚀 Commands

```bash
# Start worker
npm run worker:sync

# Run examples
npm run example:queue 1   # Queue product sync
npm run example:queue 2   # Incremental sync
npm run example:queue 3   # Multiple jobs
npm run example:queue 4   # Queue stats
```

---

## 📊 Monitor

**RabbitMQ UI**: http://localhost:15672  
(Username: `guest`, Password: `guest`)

**Queue Stats API**:
```bash
GET /api/sync/queue/stats

{
  "queueName": "sync-jobs",
  "messageCount": 3,      # Pending jobs
  "consumerCount": 1      # Active workers
}
```

---

## 🎯 Benefits

✅ **Instant Response** - API returns immediately  
✅ **Better UX** - Users don't wait  
✅ **Scalable** - Add more workers  
✅ **Reliable** - Messages persist, auto-retry  
✅ **Decoupled** - Workers independent of API

---

## 📦 Files Created (7 files)

1. `src/types/queue.types.ts` - Message types
2. `src/services/SyncQueueService.ts` - Producer
3. `src/workers/SyncWorker.ts` - Consumer
4. `src/controllers/syncQueueController.ts` - API
5. `src/routes/syncQueueRoutes.ts` - Routes
6. `src/scripts/start-sync-worker.ts` - Worker script
7. `src/examples/rabbitmq-sync.example.ts` - Examples

---

## 🐛 Troubleshooting

**Worker not receiving messages?**
```bash
# Check RabbitMQ is running
docker ps | grep rabbitmq

# Check worker is running
ps aux | grep worker:sync
```

**Connection error?**
```env
# Check .env
RABBITMQ_URL=amqp://localhost:5672
```

---

## 🎉 Complete!

**Before RabbitMQ:**
```
User → Sync (30s) → Response
User waits! 😴
```

**After RabbitMQ:**
```
User → Queue (50ms) → Response
Background → Sync (30s)
User continues! 🚀
```

---

See [RABBITMQ-SETUP.md](./RABBITMQ-SETUP.md) for detailed documentation.

**Start now:**
1. `docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management`
2. `npm run worker:sync`
3. Queue a job and see it process in background!

