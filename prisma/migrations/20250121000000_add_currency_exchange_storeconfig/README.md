# Migration: Add Currency, Exchange, and StoreConfig

This migration adds:
1. Currency column to PaymentMethod table
2. ExchangeOrder and ExchangeLineItem tables
3. StoreConfig table

## To apply this migration:

### For PostgreSQL (Server Database):
```bash
cd pos-server
npx prisma migrate deploy
```

Or if you want to create a new migration:
```bash
npx prisma migrate dev --name add_currency_exchange_storeconfig
```

### For SQLite (Desktop Database):
The SQLite schema in `apps/desktop/libsdb/schema.sql` already includes these changes. 
If you need to apply them to an existing database, run the SQL statements from the schema file.

## What this migration does:

1. **PaymentMethod.currency**: Adds a currency column with default 'USD'
2. **ExchangeOrder**: Creates table for product exchanges
3. **ExchangeLineItem**: Creates table for exchange line items
4. **StoreConfig**: Creates table for store/organization configuration

## Rollback:

If you need to rollback, you can manually drop the tables:
```sql
DROP TABLE IF EXISTS "ExchangeLineItem";
DROP TABLE IF EXISTS "ExchangeOrder";
DROP TABLE IF EXISTS "StoreConfig";
ALTER TABLE "PaymentMethod" DROP COLUMN IF EXISTS "currency";
```

