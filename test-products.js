import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testProducts = [
  [359735, "Test 2", "test2", "123", 359734, 0.0, 0.0, 0.0, null, null],
  [362033, "testing123", "33333", "22212222", 362032, 0.0, 0.0, 0.0, null, null],
  [362040, "testing123", "33333", "22212222", 362032, 0.0, 0.0, 0.0, null, null],
];

async function checkMultipleProducts() {
  console.log('=== Checking Multiple Products ===\n');

  for (let i = 0; i < testProducts.length; i++) {
    const product = testProducts[i];
    const [id, name, sku, barcode, productId] = product;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Product ${i + 1} of ${testProducts.length}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`ID: ${id}, Name: "${name}", SKU: "${sku}", Barcode: "${barcode}", ProductID: ${productId}`);
    console.log('');

    try {
      // Search by externalId (item ID)
      const variant = await prisma.productVariant.findFirst({
        where: {
          externalId: String(id),
          externalSystem: 'tradeunleashed'
        },
        include: {
          product: true,
          inventoryItems: {
            include: { location: true }
          }
        }
      });

      if (variant) {
        console.log(`✅ FOUND in database`);
        console.log(`   Variant SKU: ${variant.sku}`);
        console.log(`   Variant Name: ${variant.variantName}`);
        console.log(`   External ID: ${variant.externalId}`);
        console.log(`   Product Code: ${variant.product.productCode}`);
        console.log(`   Product External ID: ${variant.product.externalId}`);
        console.log(`   Inventory Items: ${variant.inventoryItems.length}`);
      } else {
        console.log(`❌ NOT FOUND in database`);

        // Try searching by SKU
        const bySku = await prisma.productVariant.findUnique({
          where: { sku: sku }
        });

        if (bySku) {
          console.log(`   ⚠️ Found by SKU but different externalId: ${bySku.externalId}`);
        }
      }
    } catch (error) {
      console.error(`   Error checking product: ${error.message}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('Summary');
  console.log(`${'='.repeat(80)}\n`);

  // Get database counts
  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  const inventoryCount = await prisma.inventoryItem.count();

  console.log(`Total Products in DB: ${productCount}`);
  console.log(`Total Variants in DB: ${variantCount}`);
  console.log(`Total Inventory Items in DB: ${inventoryCount}`);

  await prisma.$disconnect();
}

checkMultipleProducts().catch(error => {
  console.error('Fatal error:', error);
  prisma.$disconnect();
});
