-- CreateTable
CREATE TABLE "PaymentType" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentType_pkey" PRIMARY KEY ("id")
);
