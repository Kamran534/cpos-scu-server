/**
 * Test fetching POS sessions from TradeUnleashed API
 */

import { TradeUnleashedClient } from '../src/integrations/tradeunleashed/api/TradeUnleashedClient.js';

const config = {
  baseUrl: process.env.TRADEUNLEASHED_BASE_URL || 'https://q-prod.tradeunleashed.com',
  username: process.env.TRADEUNLEASHED_USERNAME || '03334343433',
  password: process.env.TRADEUNLEASHED_PASSWORD || 'qwerty',
};

async function testFetchPosSessions() {
  console.log('\n=== Testing POS Session Fetch ===\n');

  const client = new TradeUnleashedClient(config);

  try {
    // Login
    console.log('1. Logging in to TradeUnleashed...');
    const loginResponse = await client.login();
    console.log('\n2. Login Response POS Data:');
    console.log(JSON.stringify(loginResponse.pos, null, 2));

    const userId = client.getUserId();
    console.log(`\n3. User ID: ${userId}`);

    if (userId) {
      console.log('\n4. Fetching POS Sessions from API...');
      const sessions = await client.fetchPosSessions({
        userId: userId,
        currentSession: true
      });

      console.log(`\n✓ Found ${sessions.length} POS session(s):\n`);
      sessions.forEach((session, index) => {
        console.log(`Session ${index + 1}:`);
        console.log(`  ID (session.id): ${session.id} ← USE THIS FOR ORDERS`);
        console.log(`  POS ID (posId): ${session.posId}`);
        console.log(`  Reference: ${session.sessionReference}`);
        console.log(`  Start Time: ${session.startTime}`);
        console.log(`  End Time: ${session.endTime || 'OPEN'}`);
        console.log(`  Starting Cash: ${session.startingCash}`);
        console.log(`  POS Name: ${session.pos?.name || 'N/A'}`);
        console.log(`  Facility ID: ${session.pos?.facility?.id || 'N/A'}`);
        console.log('');
      });

      // Get the session ID that should be used
      if (sessions.length > 0) {
        const sessionToUse = sessions[sessions.length - 1]; // Use last one (most recent)
        console.log(`\n📌 RECOMMENDED SESSION ID FOR ORDERS: ${sessionToUse.id}`);
        console.log(`   (This is session.id, NOT session.posId)`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

testFetchPosSessions();
