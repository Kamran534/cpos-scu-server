-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('Pending', 'Synced', 'Failed', 'Syncing');

-- AlterTable
ALTER TABLE "SaleOrder" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSystem" TEXT,
ADD COLUMN     "lastSyncAttempt" TIMESTAMP(3),
ADD COLUMN     "syncAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "syncError" TEXT,
ADD COLUMN     "syncStatus" "SyncStatus" NOT NULL DEFAULT 'Pending',
ADD COLUMN     "syncedAt" TIMESTAMP(3);
