-- AlterTable: Add currency column to PaymentMethod
ALTER TABLE "PaymentMethod" ADD COLUMN IF NOT EXISTS "currency" "Currency" NOT NULL DEFAULT 'USD';

-- CreateTable: ExchangeOrder
CREATE TABLE IF NOT EXISTS "ExchangeOrder" (
    "id" TEXT NOT NULL,
    "exchangeNumber" TEXT NOT NULL,
    "originalOrderId" TEXT NOT NULL,
    "newOrderId" TEXT NOT NULL,
    "priceDifference" DECIMAL(12,2) NOT NULL,
    "additionalPayment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "exchangeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT NOT NULL,
    "status" "ExchangeStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExchangeLineItem
CREATE TABLE IF NOT EXISTS "ExchangeLineItem" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "returnedVariantId" TEXT NOT NULL,
    "returnedQuantity" INTEGER NOT NULL,
    "returnedUnitPrice" DECIMAL(12,2) NOT NULL,
    "exchangedVariantId" TEXT NOT NULL,
    "exchangedQuantity" INTEGER NOT NULL,
    "exchangedUnitPrice" DECIMAL(12,2) NOT NULL,
    "priceDifference" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "ExchangeLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable: StoreConfig
CREATE TABLE IF NOT EXISTS "StoreConfig" (
    "id" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "organizationCode" TEXT NOT NULL,
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'USD',
    "returnPolicy" "ReturnPolicy" NOT NULL DEFAULT 'RefundAndExchange',
    "allowReturns" BOOLEAN NOT NULL DEFAULT true,
    "allowRefunds" BOOLEAN NOT NULL DEFAULT true,
    "allowExchanges" BOOLEAN NOT NULL DEFAULT true,
    "returnWindowDays" INTEGER NOT NULL DEFAULT 30,
    "requireOriginalReceipt" BOOLEAN NOT NULL DEFAULT true,
    "allowExchangeSameAmount" BOOLEAN NOT NULL DEFAULT true,
    "allowExchangeGreaterAmount" BOOLEAN NOT NULL DEFAULT true,
    "allowExchangeLowerAmount" BOOLEAN NOT NULL DEFAULT false,
    "restockFeePercentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxId" TEXT,
    "registrationNumber" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeOrder_exchangeNumber_key" ON "ExchangeOrder"("exchangeNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeOrder_exchangeNumber_idx" ON "ExchangeOrder"("exchangeNumber");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeOrder_originalOrderId_idx" ON "ExchangeOrder"("originalOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeOrder_newOrderId_idx" ON "ExchangeOrder"("newOrderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeOrder_status_idx" ON "ExchangeOrder"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeLineItem_exchangeId_idx" ON "ExchangeLineItem"("exchangeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeLineItem_returnedVariantId_idx" ON "ExchangeLineItem"("returnedVariantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeLineItem_exchangedVariantId_idx" ON "ExchangeLineItem"("exchangedVariantId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "StoreConfig_organizationCode_key" ON "StoreConfig"("organizationCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StoreConfig_organizationCode_idx" ON "StoreConfig"("organizationCode");

-- AddForeignKey
ALTER TABLE "ExchangeOrder" ADD CONSTRAINT "ExchangeOrder_originalOrderId_fkey" FOREIGN KEY ("originalOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeOrder" ADD CONSTRAINT "ExchangeOrder_newOrderId_fkey" FOREIGN KEY ("newOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeOrder" ADD CONSTRAINT "ExchangeOrder_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeLineItem" ADD CONSTRAINT "ExchangeLineItem_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "ExchangeOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeLineItem" ADD CONSTRAINT "ExchangeLineItem_returnedVariantId_fkey" FOREIGN KEY ("returnedVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeLineItem" ADD CONSTRAINT "ExchangeLineItem_exchangedVariantId_fkey" FOREIGN KEY ("exchangedVariantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

