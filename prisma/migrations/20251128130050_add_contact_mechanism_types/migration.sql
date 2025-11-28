-- CreateTable
CREATE TABLE "ContactMechanismType" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactMechanismType_pkey" PRIMARY KEY ("id")
);
