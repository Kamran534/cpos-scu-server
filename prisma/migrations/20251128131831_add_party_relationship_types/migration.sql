-- CreateTable
CREATE TABLE "PartyRelationshipType" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyRelationshipType_pkey" PRIMARY KEY ("id")
);
