-- CreateTable
CREATE TABLE "PartyFacilityRole" (
    "id" BIGINT NOT NULL,
    "partyId" BIGINT NOT NULL,
    "facilityId" BIGINT NOT NULL,
    "facilityRoleTypeId" BIGINT,
    "facilityRoleTypeName" TEXT,
    "facilityName" TEXT,
    "facility" JSONB,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartyFacilityRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyFacilityRole_partyId_idx" ON "PartyFacilityRole"("partyId");

-- CreateIndex
CREATE INDEX "PartyFacilityRole_facilityId_idx" ON "PartyFacilityRole"("facilityId");

-- CreateIndex
CREATE INDEX "PartyFacilityRole_facilityRoleTypeName_idx" ON "PartyFacilityRole"("facilityRoleTypeName");
