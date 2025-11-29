/**
 * Verify that all type IDs used in orders exist in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTypeIds() {
  console.log('\n=== Verifying Type IDs ===\n');

  try {
    // Check POS Session ID
    const posSessionId = 2250448529;
    const posSession = await prisma.posSession.findUnique({
      where: { id: BigInt(posSessionId) },
    });

    console.log(`1. POS Session ID: ${posSessionId}`);
    if (posSession) {
      console.log(`   ✓ EXISTS in database`);
      console.log(`   - Session Ref: ${posSession.sessionReference}`);
      console.log(`   - Start Time: ${posSession.startTime}`);
      console.log(`   - End Time: ${posSession.endTime || 'OPEN'}`);
      console.log(`   - Facility ID: ${posSession.facilityId}`);
      console.log(`   - User ID: ${posSession.userId}`);
    } else {
      console.log(`   ❌ NOT FOUND in database!`);
    }

    // Check Sale Type ID
    const saleTypeId = 432545517;
    const saleType = await prisma.saleType.findUnique({
      where: { id: BigInt(saleTypeId) },
    });

    console.log(`\n2. Sale Type ID: ${saleTypeId}`);
    if (saleType) {
      console.log(`   ✓ EXISTS: ${saleType.name}`);
    } else {
      console.log(`   ❌ NOT FOUND in database!`);
      // Show available sale types
      const available = await prisma.saleType.findMany({ take: 5 });
      console.log(`   Available sale types:`);
      available.forEach(st => {
        console.log(`   - ID: ${st.id}, Name: ${st.name}`);
      });
    }

    // Check Order Role Types
    console.log(`\n3. Order Role Types:`);
    const roleTypeIds = [109, 113];
    for (const id of roleTypeIds) {
      const roleType = await prisma.orderRoleType.findUnique({
        where: { id: BigInt(id) },
      });
      if (roleType) {
        console.log(`   ✓ ${id}: ${roleType.name}`);
      } else {
        console.log(`   ❌ ${id}: NOT FOUND`);
      }
    }

    // Check Order Status Type
    console.log(`\n4. Order Status Type:`);
    const statusType = await prisma.orderStatusType.findUnique({
      where: { id: BigInt(133) },
    });
    if (statusType) {
      console.log(`   ✓ 133: ${statusType.name}`);
    } else {
      console.log(`   ❌ 133: NOT FOUND`);
    }

    // Check Order Adjustment Type
    console.log(`\n5. Order Adjustment Type:`);
    const adjustmentType = await prisma.orderAdjustmentType.findUnique({
      where: { id: BigInt(140) },
    });
    if (adjustmentType) {
      console.log(`   ✓ 140: ${adjustmentType.name}`);
    } else {
      console.log(`   ❌ 140: NOT FOUND`);
    }

    // Check Payment Type
    console.log(`\n6. Payment Type:`);
    const paymentType = await prisma.paymentType.findUnique({
      where: { id: BigInt(145) },
    });
    if (paymentType) {
      console.log(`   ✓ 145: ${paymentType.name}`);
    } else {
      console.log(`   ❌ 145: NOT FOUND`);
    }

    console.log('\n=== CONCLUSION ===\n');
    console.log('If all IDs exist, the issue is likely:');
    console.log('1. Business logic validation on TradeUnleashed server');
    console.log('2. Missing required fields we haven\'t identified');
    console.log('3. Field value constraints (e.g., dates, amounts)');
    console.log('4. Request might need to be sent as individual orders, not batch');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTypeIds();
