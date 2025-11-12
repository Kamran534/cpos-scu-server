#!/usr/bin/env node
/**
 * Test TradeUnleashed Connection
 * 
 * Verifies that TradeUnleashed credentials are working
 * 
 * Usage:
 *   npm run test:tu-connection
 */

import { config } from '../config';
import { TradeUnleashedClient } from '../integrations/tradeunleashed/api/TradeUnleashedClient';

async function testConnection() {
  console.log('═══════════════════════════════════════');
  console.log('  TradeUnleashed Connection Test');
  console.log('═══════════════════════════════════════\n');

  // Check if credentials are configured
  console.log('📋 Configuration Check:');
  console.log(`  Base URL: ${config.tradeUnleashed.baseUrl}`);
  console.log(`  Username: ${config.tradeUnleashed.username ? '✓ Set' : '✗ Missing'}`);
  console.log(`  Password: ${config.tradeUnleashed.password ? '✓ Set' : '✗ Missing'}`);
  console.log();

  if (!config.tradeUnleashed.username || !config.tradeUnleashed.password) {
    console.error('❌ Error: TradeUnleashed credentials not configured!');
    console.log('\nPlease set in your .env file:');
    console.log('  TRADEUNLEASHED_USERNAME=your-username');
    console.log('  TRADEUNLEASHED_PASSWORD=your-password');
    process.exit(1);
  }

  // Test login
  console.log('🔐 Testing Authentication...');
  const client = new TradeUnleashedClient(config.tradeUnleashed);

  try {
    const loginResult = await client.login();
    console.log('✅ Login successful!');
    const token = loginResult.access_token || loginResult.token;
    if (token) {
      const tokenPreview = token.length > 20 ? token.substring(0, 20) + '...' : token;
      console.log(`  Token: ${tokenPreview}`);
    }
    console.log(`  Expires in: ${loginResult.expires_in || loginResult.expiresIn || 'N/A'} seconds`);
    console.log();

    // Test stock query with facility ID
    console.log('📦 Testing Stock Query API...');
    const facilityId = '886375309'; // From login response: organization.b2bStore.defaultFacility.id
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7); // Last 7 days
    
    const stockResult = await client.queryStock({
      facilityIds: facilityId,
      fromDate: fromDate.toISOString(),
      max: 10,
      offset: 0,
      orderBy: 'id,DESC',
    });

    console.log('✅ Stock query successful!');
    console.log(`  Total records: ${stockResult.total}`);
    console.log(`  Returned: ${stockResult.data.length}`);
    
    if (stockResult.data.length > 0) {
      const sample = stockResult.data[0];
      console.log('\n📋 Sample Product:');
      console.log(`  SKU: ${sample.sku}`);
      console.log(`  Name: ${sample.productName}`);
      console.log(`  Facility: ${sample.facilityName || sample.facilityId}`);
      console.log(`  Quantity: ${sample.quantityOnHand}`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ All tests passed! Connection is working!');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Connection test failed!');
    console.error('\nError details:');
    if (error instanceof Error) {
      console.error(`  Message: ${error.message}`);
      
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        console.error('\n💡 This is an authentication error. Please check:');
        console.error('  1. Username is correct');
        console.error('  2. Password is correct');
        console.error('  3. Account is active in TradeUnleashed');
        console.error('  4. Credentials are set in .env file');
      }
    } else {
      console.error(error);
    }
    console.log('\n═══════════════════════════════════════\n');
    process.exit(1);
  }
}

testConnection().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

