/*
  Warnings:

  - The primary key for the `UserRles` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "UserRles" DROP CONSTRAINT "UserRles_pkey",
ALTER COLUMN "id" SET DATA TYPE BIGINT,
ALTER COLUMN "remoteUserId" SET DATA TYPE BIGINT,
ALTER COLUMN "remoteRoleId" SET DATA TYPE BIGINT,
ADD CONSTRAINT "UserRles_pkey" PRIMARY KEY ("id");
