# TradeUnleashed Integration - Setup Guide

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- TradeUnleashed account with API access

## 🚀 Quick Setup

### Step 1: Clone and Install

```bash
cd pos-server
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the project root (or update existing):

```bash
# Copy example file
cp .env.example .env

# Edit .env file
nano .env
```

Add these TradeUnleashed credentials:

```env
# TradeUnleashed Integration
TRADEUNLEASHED_BASE_URL=https://q-prod.tradeunleashed.com
TRADEUNLEASHED_USERNAME=your-username
TRADEUNLEASHED_PASSWORD=your-password

# Database (if not already set)
DATABASE_URL=postgresql://user:password@localhost:5432/pos_db
```

### Step 3: Setup Database

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### Step 4: Test Connection

```bash
# Test connection to TradeUnleashed
npm run sync:tu:test
```

You should see:
```
✅ Connected successfully!
✅ Connection test successful!
```

### Step 5: Run First Sync

```bash
# Full sync of all products
npm run sync:tu
```

## 📦 Available Commands

### Sync Commands

```bash
# Full sync (all products)
npm run sync:tu

# Test connection only
npm run sync:tu:test

# Incremental sync (changes since date)
npm run sync:tu -- --from=2025-01-10

# Sync specific facilities
npm run sync:tu -- --facilities=886375309,886375310

# Custom batch size
npm run sync:tu -- --batch-size=100

# Show help
npm run sync:tu -- --help
```

### Example Commands

```bash
# Run examples (interactive)
npm run example:tu

# Run specific example
npm run example:tu 1    # Display configuration
npm run example:tu 2    # Test connection
npm run example:tu 3    # Basic sync
npm run example:tu 4    # Incremental sync
npm run example:tu 5    # Scheduled sync
```

## 🔧 Configuration Details

### Configuration File Location

All configuration is loaded from `.env` and accessed via:
```typescript
import { config } from './config';

// Access TradeUnleashed config
const tuConfig = config.tradeUnleashed;
console.log(tuConfig.baseUrl);    // https://q-prod.tradeunleashed.com
console.log(tuConfig.username);   // your-username
console.log(tuConfig.password);   // your-password
```

### Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TRADEUNLEASHED_BASE_URL` | Yes | `https://q-prod.tradeunleashed.com` | TradeUnleashed API URL |
| `TRADEUNLEASHED_USERNAME` | Yes | - | Your TradeUnleashed username |
| `TRADEUNLEASHED_PASSWORD` | Yes | - | Your TradeUnleashed password |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `PORT` | No | `4000` | Server port |
| `NODE_ENV` | No | `development` | Environment |

## 💻 Usage in Code

### Option 1: Use Sync Service (Recommended)

```typescript
import { PrismaClient } from '@prisma/client';
import { TradeUnleashedSyncService } from './services/TradeUnleashedSyncService';
import { config } from './config';

const prisma = new PrismaClient();

// Config is loaded from .env automatically
const syncService = new TradeUnleashedSyncService(
  config.tradeUnleashed,  // ← Uses .env values
  prisma
);

await syncService.initialize();
const result = await syncService.syncProducts();
```

### Option 2: Use Integration Layer Directly

```typescript
import { TradeUnleashedProductService } from './integrations/tradeunleashed';
import { config } from './config';

const service = new TradeUnleashedProductService(
  config.tradeUnleashed  // ← Uses .env values
);

const batchPayload = await service.syncInventory({
  facilityIds: ['886375309'],
});
```

### Option 3: Manual Configuration (Not Recommended)

```typescript
// Only use if you need to override .env values
const customConfig = {
  baseUrl: 'https://custom-url.com',
  username: 'custom-user',
  password: 'custom-pass',
};

const service = new TradeUnleashedSyncService(customConfig, prisma);
```

## 🎯 Common Use Cases

### 1. Daily Full Sync

```bash
# Add to crontab
0 2 * * * cd /path/to/pos-server && npm run sync:tu
```

### 2. Hourly Incremental Sync

```bash
# Sync changes from last hour
0 * * * * cd /path/to/pos-server && npm run sync:tu -- --from=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
```

### 3. Sync Specific Warehouses

```bash
# Only sync specific facilities
npm run sync:tu -- --facilities=886375309,886375310
```

### 4. Scheduled Sync with Node-Cron

```typescript
import cron from 'node-cron';
import { TradeUnleashedSyncService } from './services/TradeUnleashedSyncService';
import { config } from './config';

const syncService = new TradeUnleashedSyncService(
  config.tradeUnleashed,
  prisma
);

await syncService.initialize();

// Run every hour
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled sync...');
  const result = await syncService.syncProducts({
    fullSync: false,
    fromDate: new Date(Date.now() - 60 * 60 * 1000),
  });
  console.log(`Synced ${result.productsCreated} products`);
});
```

## 🐛 Troubleshooting

### Error: "TradeUnleashed credentials not configured"

**Solution**: Make sure `.env` file exists and contains:
```env
TRADEUNLEASHED_USERNAME=your-username
TRADEUNLEASHED_PASSWORD=your-password
```

### Error: "Failed to connect to TradeUnleashed"

**Possible causes**:
1. Wrong username/password
2. Network connectivity issues
3. Wrong base URL

**Solution**: Test connection first:
```bash
npm run sync:tu:test
```

### Error: "Database connection failed"

**Solution**: Check your `DATABASE_URL` in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/pos_db
```

### Sync is slow

**Solution**: Increase batch size:
```bash
npm run sync:tu -- --batch-size=100
```

### Some products failed to sync

**Solution**: Check the error output at the end of sync. Common issues:
- Invalid SKU format
- Missing required fields
- Duplicate SKUs

Run with smaller batch to isolate issues:
```bash
npm run sync:tu -- --batch-size=10
```

## 📊 Monitoring Sync Results

After each sync, you'll see:

```
═══════════════════════════════════════
  Sync Results
═══════════════════════════════════════
Status:              ✅ Success
Products Created:    150
Variants Created:    150
Inventory Created:   450
Errors:              0
Duration:            5234ms (5.23s)
═══════════════════════════════════════
```

### View Synced Data

```bash
# Open Prisma Studio
npm run prisma:studio
```

Then browse:
- `Product` table
- `ProductVariant` table
- `InventoryItem` table
- `Category` table
- `Brand` table
- `Location` table

## 🔒 Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Use environment-specific configs**
   ```env
   # .env.development
   TRADEUNLEASHED_BASE_URL=https://sandbox.tradeunleashed.com
   
   # .env.production
   TRADEUNLEASHED_BASE_URL=https://q-prod.tradeunleashed.com
   ```

3. **Rotate credentials regularly**
   - Update `.env` file
   - Restart application

4. **Use read-only credentials if possible**
   - Only sync, don't modify TradeUnleashed data

## 📈 Performance Tips

1. **Use incremental sync for frequent updates**
   ```bash
   npm run sync:tu -- --from=2025-01-10
   ```

2. **Adjust batch size based on network**
   - Slow network: `--batch-size=25`
   - Fast network: `--batch-size=100`

3. **Run during off-peak hours**
   - Schedule full sync at night
   - Run incremental sync during day

4. **Monitor database size**
   ```bash
   npm run prisma:studio
   ```

## 🎓 Next Steps

1. ✅ Test connection
2. ✅ Run first full sync
3. ✅ Verify data in Prisma Studio
4. ✅ Set up scheduled sync
5. ✅ Monitor sync results
6. ✅ Add error notifications (email/Slack)

## 📚 Additional Resources

- [Payload Architecture](./PAYLOAD-ARCHITECTURE.md) - Detailed architecture guide
- [README Architecture](./README-ARCHITECTURE.md) - Quick start guide
- [Examples](./src/examples/tradeunleashed-sync-with-config.example.ts) - Code examples

## 💬 Support

If you encounter issues:
1. Check `.env` configuration
2. Test connection: `npm run sync:tu:test`
3. Check logs for error messages
4. Review TradeUnleashed API documentation

---

**Ready to sync!** 🚀

Start with: `npm run sync:tu:test`

