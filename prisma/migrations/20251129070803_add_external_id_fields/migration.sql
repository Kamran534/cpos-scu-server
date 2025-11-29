-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSystem" TEXT;

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSystem" TEXT;

-- CreateIndex
CREATE INDEX "Product_externalId_externalSystem_idx" ON "Product"("externalId", "externalSystem");

-- CreateIndex
CREATE INDEX "ProductVariant_externalId_externalSystem_idx" ON "ProductVariant"("externalId", "externalSystem");
