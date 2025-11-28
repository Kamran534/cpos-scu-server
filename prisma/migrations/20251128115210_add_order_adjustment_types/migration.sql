-- CreateTable
CREATE TABLE "OrderAdjustmentType" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderAdjustmentType_pkey" PRIMARY KEY ("id")
);
