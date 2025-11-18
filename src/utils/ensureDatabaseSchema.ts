import { PrismaClient } from '@prisma/client';

async function ensureColumn(
  prisma: PrismaClient,
  tableName: string,
  columnName: string,
  definition: string
): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE LOWER(table_name) = LOWER('${tableName}')
          AND LOWER(column_name) = LOWER('${columnName}')
      ) THEN
        ALTER TABLE "${tableName}" ADD COLUMN "${columnName}" ${definition};
      END IF;
    END $$;
  `);
}

export async function ensureDatabaseSchema(prisma: PrismaClient): Promise<void> {
  await ensureColumn(prisma, 'SaleOrder', 'discountPercent', 'DECIMAL(5,2) NOT NULL DEFAULT 0');
  await ensureColumn(prisma, 'SaleOrder', 'adjustmentAmount', 'DECIMAL(12,2) NOT NULL DEFAULT 0');
  await ensureColumn(prisma, 'SaleOrder', 'adjustmentReason', 'TEXT');
}

