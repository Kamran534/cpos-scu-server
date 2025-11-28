/*
  Warnings:

  - You are about to drop the `TradeUnleashedUserRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "TradeUnleashedUserRole";

-- CreateTable
CREATE TABLE "UserRles" (
    "id" INTEGER NOT NULL,
    "remoteUserId" INTEGER NOT NULL,
    "remoteRoleId" INTEGER NOT NULL,
    "authority" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRles_pkey" PRIMARY KEY ("id")
);
