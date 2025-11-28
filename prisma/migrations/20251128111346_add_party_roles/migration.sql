-- CreateTable
CREATE TABLE "PartyRole" (
    "id" BIGINT NOT NULL,
    "partyId" BIGINT NOT NULL,
    "partyName" TEXT,
    "partyTypeId" BIGINT,
    "partyTypeName" TEXT,
    "partyUserId" BIGINT,
    "partyUsername" TEXT,
    "partyRoleTypeId" BIGINT,
    "partyRoleTypeName" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyRole_partyId_idx" ON "PartyRole"("partyId");

-- CreateIndex
CREATE INDEX "PartyRole_partyRoleTypeName_idx" ON "PartyRole"("partyRoleTypeName");
