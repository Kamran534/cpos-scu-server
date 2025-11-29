/**
 * Check available POS sessions in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPosSessions() {
  console.log('\n=== Checking POS Sessions ===\n');

  try {
    // Get all POS sessions
    const sessions = await prisma.posSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`Found ${sessions.length} POS sessions in database:\n`);

    sessions.forEach((session, index) => {
      console.log(`${index + 1}. ID: ${session.id}`);
      console.log(`   Ref: ${session.sessionReference}`);
      console.log(`   Start: ${session.startTime || 'N/A'}`);
      console.log(`   End: ${session.endTime || 'OPEN'}`);
      console.log(`   Facility: ${session.facilityId}`);
      console.log(`   User: ${session.userId}`);
      console.log('');
    });

    // Check what the login response POS session ID is
    const loginPosSessionId = 2250448529;
    console.log(`\nPOS Session from login response: ${loginPosSessionId}`);

    const loginSession = await prisma.posSession.findUnique({
      where: { id: BigInt(loginPosSessionId) },
    });

    if (loginSession) {
      console.log('✓ Found in database');
    } else {
      console.log('❌ NOT in database');
      console.log('\nRECOMMENDATION:');
      console.log('1. Use an existing POS session ID from the database');
      console.log('2. OR create a new POS session in database with ID from login');
      console.log('3. OR query TradeUnleashed for valid POS sessions and sync them');

      if (sessions.length > 0) {
        console.log(`\n Suggestion: Use session ID ${sessions[0].id} instead`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPosSessions();
