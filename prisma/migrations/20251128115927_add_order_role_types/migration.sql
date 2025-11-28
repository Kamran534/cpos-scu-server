-- CreateTable
CREATE TABLE "OrderRoleType" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderRoleType_pkey" PRIMARY KEY ("id")
);
