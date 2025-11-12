# Fix RabbitMQ Queue Configuration Mismatch

## 🐛 The Problem

You're getting this error:
```
PRECONDITION_FAILED - inequivalent arg 'x-message-ttl' for queue 'sync-jobs'
```

**Cause**: The queue was created with different settings (with TTL) than what the worker is trying to use (without TTL).

## ✅ Solution: Delete & Recreate the Queue

### Step 1: Delete the Existing Queue

**Option A: Via RabbitMQ Management UI (Recommended)**

1. Open: http://localhost:15672
2. Login:
   - Username: `guest`
   - Password: `guest`
3. Click **"Queues"** tab at the top
4. Find the queue `sync-jobs`
5. Click on it
6. Scroll down and click **"Delete"** button
7. Confirm deletion

**Option B: Via Command Line (Git Bash/WSL)**

```bash
curl -u guest:guest -X DELETE http://localhost:15672/api/queues/%2F/sync-jobs
curl -u guest:guest -X DELETE http://localhost:15672/api/queues/%2F/sync-results
```

### Step 2: Start the Worker Again

```bash
npm run worker:sync
```

The queue will be recreated automatically with the correct configuration!

You should see:
```
═══════════════════════════════════════
  Sync Worker
═══════════════════════════════════════

[SyncWorker] 🚀 Started and waiting for sync jobs...
[SyncWorker] Queue: sync-jobs

✓ Worker is running
```

### Step 3: Queue a New Job

```bash
npm run example:queue 1
```

The worker will immediately pick it up and process it!

---

## 🎯 What I Fixed

Updated `src/workers/SyncWorker.ts` to match the queue configuration from `SyncQueueService`:

```typescript
// Now both use the same configuration:
await channel.assertQueue(queueName, {
  durable: true,
  arguments: {
    'x-message-ttl': 24 * 60 * 60 * 1000, // 24 hours TTL
  },
});
```

This ensures the producer and consumer agree on queue properties!

