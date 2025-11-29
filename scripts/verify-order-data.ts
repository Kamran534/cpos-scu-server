/**
 * Verify that inventory items and facilities in pending orders exist in the system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyOrderData() {
  console.log('\n=== Verifying Order Data for TradeUnleashed Sync ===\n');

  try {
    // Get pending orders
    const pendingOrders = await prisma.saleOrder.findMany({
      where: {
        OR: [
          { status: 'Open' },
          { status: 'Completed' },
        ],
      },
      include: {
        lineItems: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
        location: true,
      },
      take: 10,
    });

    const filteredOrders = pendingOrders.filter((order: any) => {
      const syncStatus = (order as any).syncStatus;
      return syncStatus === 'Pending' || syncStatus === 'Failed' || syncStatus === null || syncStatus === undefined;
    });

    console.log(`Found ${filteredOrders.length} pending orders\n`);

    for (const order of filteredOrders.slice(0, 2)) {
      console.log(`\n📦 Order: ${order.orderNumber}`);
      console.log(`   Location: ${order.location.name} (Code: ${order.location.code})`);

      // Check if location code is a valid facility ID
      const facilityId = parseInt(order.location.code);
      if (isNaN(facilityId)) {
        console.log(`   ❌ Location code is not a number: ${order.location.code}`);
      } else {
        // Check if facility exists in PartyFacilityRole table
        const facilityRole = await prisma.partyFacilityRole.findFirst({
          where: { facilityId: BigInt(facilityId) },
        });

        if (facilityRole) {
          console.log(`   ✓ Facility ${facilityId} exists in PartyFacilityRole: ${facilityRole.facilityName}`);
        } else {
          console.log(`   ⚠️ Facility ${facilityId} NOT found in PartyFacilityRole table`);
          console.log(`      This facility may not exist in TradeUnleashed!`);
        }
      }

      // Check line items
      console.log(`\n   Line Items:`);
      for (const lineItem of order.lineItems) {
        const variant = lineItem.variant;
        console.log(`   - ${variant.product.name} (${variant.variantName})`);
        console.log(`     SKU: ${variant.sku}`);
        console.log(`     ExternalId: ${variant.externalId || 'NONE'}`);
        console.log(`     ExternalSystem: ${variant.externalSystem || 'NONE'}`);

        if (!variant.externalId || variant.externalSystem !== 'tradeunleashed') {
          console.log(`     ❌ PROBLEM: Variant does not have TradeUnleashed mapping!`);
        } else {
          // Verify the inventory item ID is a valid number
          const inventoryItemId = parseInt(variant.externalId);
          if (isNaN(inventoryItemId)) {
            console.log(`     ❌ PROBLEM: ExternalId is not a valid number: ${variant.externalId}`);
          } else {
            console.log(`     ✓ Inventory Item ID: ${inventoryItemId}`);

            // Try to verify if this inventory item still exists in TradeUnleashed
            // We can't directly query TU here, but we can check our product sync data
            const productCount = await prisma.productVariant.count({
              where: {
                externalId: variant.externalId,
                externalSystem: 'tradeunleashed',
              },
            });

            if (productCount > 0) {
              console.log(`     ✓ Product variant synced from TradeUnleashed`);
            }
          }
        }
      }
    }

    // Summary
    console.log('\n\n=== SUMMARY ===\n');
    console.log('Common issues that cause 500 errors:');
    console.log('1. Inventory Item ID does not exist in TradeUnleashed');
    console.log('2. Facility ID does not exist in TradeUnleashed');
    console.log('3. POS Session ID is invalid or expired');
    console.log('4. Sale Type ID does not exist');
    console.log('5. Order/Payment/Status type IDs are invalid');
    console.log('\nRecommendation: Test with a single order using a recently synced product');

  } catch (error) {
    console.error('Error verifying order data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyOrderData();
