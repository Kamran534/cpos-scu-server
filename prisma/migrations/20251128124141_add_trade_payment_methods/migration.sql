-- CreateTable
CREATE TABLE "TradePaymentMethod" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "paymentMethodType" TEXT,
    "accountRef" JSONB,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradePaymentMethod_pkey" PRIMARY KEY ("id")
);
