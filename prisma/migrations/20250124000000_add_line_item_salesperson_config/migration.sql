-- AlterTable: Add requireLineItemSalesPerson column to StoreConfig
ALTER TABLE "StoreConfig" ADD COLUMN IF NOT EXISTS "requireLineItemSalesPerson" BOOLEAN NOT NULL DEFAULT false;
