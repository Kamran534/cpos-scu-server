-- CreateTable
CREATE TABLE "PosSession" (
    "id" BIGINT NOT NULL,
    "sessionReference" TEXT NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "startingCash" DECIMAL(65,30),
    "actualAmount" DECIMAL(65,30),
    "posId" BIGINT,
    "posName" TEXT,
    "posShowOrderCreated" BOOLEAN,
    "posAllowCreditSales" BOOLEAN,
    "posAllowEditingSalePrices" BOOLEAN,
    "posProductWriteAccess" BOOLEAN,
    "posStockPurchaseAccess" BOOLEAN,
    "facilityId" BIGINT,
    "priceListId" BIGINT,
    "salePriceListId" BIGINT,
    "fbrPosId" BIGINT,
    "userId" BIGINT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PosSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosSession_posId_idx" ON "PosSession"("posId");

-- CreateIndex
CREATE INDEX "PosSession_userId_idx" ON "PosSession"("userId");
