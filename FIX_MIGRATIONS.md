# Fix PostgreSQL Migration Issue

## Problem
The existing migrations try to alter tables that don't exist yet in a fresh database.

## Solution
Create a fresh baseline migration from your current Prisma schema.

## Steps to Fix

### Option 1: Reset Migrations (Recommended for Fresh Database)

```bash
cd pos-server

# 1. Stop the database
npm run db:stop

# 2. Delete existing migration files (backup first if needed)
# On Windows:
rmdir /s /q prisma\migrations

# On Linux/Mac:
# rm -rf prisma/migrations

# 3. Start fresh database
npm run db:reset

# 4. Create new baseline migration from schema
npx prisma migrate dev --name init

# 5. Seed the database
npm run prisma:seed

# 6. Start the server
npm run dev
```

### Option 2: Use db push (Quick Fix - No Migration History)

```bash
cd pos-server

# 1. Make sure database is running
npm run db:start

# 2. Push schema directly without migrations
npx prisma db push --accept-data-loss

# 3. Seed the database
npm run prisma:seed

# 4. Start the server
npm run dev
```

### Option 3: Manual Fix (Keep Existing Migrations)

If you want to keep your migration history:

```bash
cd pos-server

# 1. Drop and recreate the database
docker exec -it cpos-postgres psql -U postgres -c "DROP DATABASE IF EXISTS cpos;"
docker exec -it cpos-postgres psql -U postgres -c "CREATE DATABASE cpos;"

# 2. Create baseline migration manually
mkdir -p prisma/migrations/20250101000000_init

# 3. Generate SQL from schema
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20250101000000_init/migration.sql

# 4. Apply all migrations
npx prisma migrate deploy

# 5. Seed database
npm run prisma:seed
```

## Quick Commands

### Start Fresh (Easiest)
```bash
# Delete migrations folder, reset DB, create new migration
rm -rf prisma/migrations
npm run db:reset
npx prisma migrate dev --name init
npm run prisma:seed
```

### Using db push (Fastest)
```bash
# Just push schema without migration history
npm run db:start
npx prisma db push --accept-data-loss
npm run prisma:seed
```

## Verify Setup

After applying the fix:

```bash
# Check if all tables exist
docker exec -it cpos-postgres psql -U postgres -d cpos -c "\dt"

# View data in Prisma Studio
npx prisma studio

# Start the server
npm run dev
```

## Troubleshooting

### If migration fails again
```bash
# Reset everything
npm run db:reset
npx prisma db push --accept-data-loss
npm run prisma:seed
```

### If seed fails
```bash
# Check seed file for errors
npx tsx prisma/seed.ts
```

### View database logs
```bash
npm run db:logs
```
