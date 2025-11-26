-- AlterTable
ALTER TABLE "OrderLineItem" ADD COLUMN "lineDiscountType" TEXT,
ADD COLUMN "lineDiscountPercent" DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN "OrderLineItem"."lineDiscountType" IS 'Type of line discount: amount or percent';
COMMENT ON COLUMN "OrderLineItem"."lineDiscountPercent" IS 'Original percent value if discount was percentage-based';
