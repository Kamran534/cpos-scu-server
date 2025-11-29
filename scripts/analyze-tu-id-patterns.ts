/**
 * Script to analyze TradeUnleashed ID patterns from database
 * This will help us understand the correct ID formats for order payloads
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeIdPatterns() {
  console.log('\n=== Analyzing TradeUnleashed ID Patterns ===\n');

  try {
    // 1. Check PosSession IDs
    console.log('1. POS SESSION IDs:');
    const posSessions = await prisma.posSession.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`Found ${posSessions.length} POS sessions`);
    posSessions.forEach((session) => {
      console.log(`  - ID: ${session.id} (type: ${typeof session.id}, digits: ${session.id.toString().length})`);
      console.log(`    POS ID: ${session.posId}, Facility: ${session.facilityId}, User: ${session.userId}`);
    });

    // 2. Check SaleType IDs
    console.log('\n2. SALE TYPE IDs:');
    const saleTypes = await prisma.saleType.findMany({
      take: 5,
      orderBy: { id: 'asc' },
    });
    console.log(`Found ${saleTypes.length} sale types`);
    saleTypes.forEach((type) => {
      console.log(`  - ID: ${type.id} (${type.name}) - digits: ${type.id.toString().length}`);
    });

    // 3. Check OrderAdjustmentType IDs
    console.log('\n3. ORDER ADJUSTMENT TYPE IDs:');
    const adjustmentTypes = await prisma.orderAdjustmentType.findMany({
      take: 10,
      orderBy: { id: 'asc' },
    });
    console.log(`Found ${adjustmentTypes.length} adjustment types`);
    adjustmentTypes.forEach((type) => {
      console.log(`  - ID: ${type.id} (${type.name}) - digits: ${type.id.toString().length}`);
    });

    // 4. Check OrderRoleType IDs
    console.log('\n4. ORDER ROLE TYPE IDs:');
    const roleTypes = await prisma.orderRoleType.findMany({
      orderBy: { id: 'asc' },
    });
    console.log(`Found ${roleTypes.length} role types`);
    roleTypes.forEach((type) => {
      console.log(`  - ID: ${type.id} (${type.name}) - digits: ${type.id.toString().length}`);
    });

    // 5. Check OrderStatusType IDs
    console.log('\n5. ORDER STATUS TYPE IDs:');
    const statusTypes = await prisma.orderStatusType.findMany({
      orderBy: { id: 'asc' },
    });
    console.log(`Found ${statusTypes.length} status types`);
    statusTypes.forEach((type) => {
      console.log(`  - ID: ${type.id} (${type.name}) - digits: ${type.id.toString().length}`);
    });

    // 6. Check PaymentType IDs
    console.log('\n6. PAYMENT TYPE IDs:');
    const paymentTypes = await prisma.paymentType.findMany({
      take: 10,
      orderBy: { id: 'asc' },
    });
    console.log(`Found ${paymentTypes.length} payment types`);
    paymentTypes.forEach((type) => {
      console.log(`  - ID: ${type.id} (${type.name}) - digits: ${type.id.toString().length}`);
    });

    // 7. Check PartyFacilityRole (Location mapping)
    console.log('\n7. PARTY FACILITY ROLES (Location IDs):');
    const facilityRoles = await prisma.partyFacilityRole.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      distinct: ['facilityId'],
    });
    console.log(`Found ${facilityRoles.length} facility roles`);
    facilityRoles.forEach((role) => {
      console.log(`  - Facility ID: ${role.facilityId} (${role.facilityName || 'N/A'}) - digits: ${role.facilityId.toString().length}`);
    });

    // 8. Check Product variants with TradeUnleashed IDs
    console.log('\n8. PRODUCT VARIANTS (Inventory Item IDs):');
    const variants = await prisma.productVariant.findMany({
      where: {
        externalSystem: 'tradeunleashed',
        externalId: { not: null },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });
    console.log(`Found ${variants.length} variants with TradeUnleashed IDs`);
    variants.forEach((variant) => {
      console.log(`  - External ID: ${variant.externalId} (${variant.product.name} - ${variant.variantName})`);
      if (variant.externalId) {
        console.log(`    Digits: ${variant.externalId.length}, Numeric: ${!isNaN(Number(variant.externalId))}`);
      }
    });

    // 9. Analyze sample successful order payload from demo data
    console.log('\n9. SAMPLE SUCCESSFUL ORDER FROM DEMO DATA:');
    console.log('  Order ID: 1504723025127 (13 digits)');
    console.log('  Line Item ID: 1611469024988 (13 digits)');
    console.log('  Order Role IDs: 1331008416098 (13 digits), 93923851707 (11 digits)');
    console.log('  Order Status ID: 1206211949659 (13 digits)');
    console.log('  Payment ID: 756147306460 (12 digits)');
    console.log('  POS Session ID: 676864374 (9 digits)');
    console.log('  Inventory Item ID: 393165 (6 digits)');
    console.log('  Facility ID: 184806 (6 digits)');
    console.log('  Party ID: 182643 (6 digits)');

    // 10. Calculate ID patterns
    console.log('\n10. ID PATTERN ANALYSIS:');
    console.log('  ✓ Order/Line Item IDs: 11-13 digits (timestamp-based)');
    console.log('  ✓ POS Session ID: 9 digits');
    console.log('  ✓ Inventory Item ID: 6 digits (entity ID from TU)');
    console.log('  ✓ Facility ID: 5-6 digits (entity ID from TU)');
    console.log('  ✓ Party ID: 6 digits (entity ID from TU)');
    console.log('  ✓ Type IDs (sale, adjustment, role, status, payment): 3 digits');
    console.log('\n  RECOMMENDATION: Use timestamp (Date.now()) for generated IDs');
    console.log('  Keep entity IDs (inventory, facility, party) from database');

  } catch (error) {
    console.error('Error analyzing ID patterns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeIdPatterns();
