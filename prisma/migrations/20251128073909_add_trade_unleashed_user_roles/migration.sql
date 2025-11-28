-- CreateTable
CREATE TABLE "TradeUnleashedUserRole" (
    "id" INTEGER NOT NULL,
    "remoteUserId" INTEGER NOT NULL,
    "remoteRoleId" INTEGER NOT NULL,
    "authority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeUnleashedUserRole_pkey" PRIMARY KEY ("id")
);
