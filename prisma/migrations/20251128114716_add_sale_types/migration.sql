-- CreateTable
CREATE TABLE "SaleType" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "priceListType" TEXT,
    "description" TEXT,
    "isDefault" BOOLEAN,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleType_pkey" PRIMARY KEY ("id")
);
