/**
 * Test sending a single order to TradeUnleashed to isolate the issue
 */

import { TradeUnleashedClient } from '../src/integrations/tradeunleashed/api/TradeUnleashedClient.js';

const config = {
  baseUrl: process.env.TRADEUNLEASHED_BASE_URL || 'https://q-prod.tradeunleashed.com',
  username: process.env.TRADEUNLEASHED_USERNAME || '03334343433',
  password: process.env.TRADEUNLEASHED_PASSWORD || 'qwerty',
};

async function testSingleOrder() {
  console.log('\n=== Testing Single Order Creation ===\n');

  const client = new TradeUnleashedClient(config);

  try {
    // Login
    console.log('1. Logging in to TradeUnleashed...');
    await client.login();
    const posSessionId = client.getPosSessionId();
    console.log(`   ✓ Logged in. POS Session ID: ${posSessionId}\n`);

    // Create a minimal test order matching the successful demo payload structure
    const testOrder = {
      id: Date.now(),
      orderReference: `TEST-${Date.now()}`,
      dateCreated: new Date().toISOString(),
      deliveryDate: new Date().toISOString(),
      customerName: '',
      transient: true,
      uniqueHash: `test-${Date.now()}`,
      posSession: { id: posSessionId },
      notes: null,
      fbrInvoiceNum: null,
      saleType: { id: 432545517 },
      lineItems: [
        {
          inventoryItem: { id: 302156 }, // Existing product from your DB
          facilityInventoryItemUOM: null,
          facility: null,
          quantity: 1,
          unitPrice: 100,
          unitValue: 0,
          customDiscAmt: 0,
          id: Date.now() + 1000000,
          serialNumber: null,
          lineNum: 1,
          orderAdjustments: [
            {
              id: Date.now() + 2000000,
              amount: null,
              percentage: 0,
              orderAdjustmentType: { id: 140 },
            },
            {
              id: Date.now() + 2000001,
              amount: null,
              percentage: 0,
              orderAdjustmentType: { id: 141 },
            },
          ],
        },
      ],
      orderRoles: [
        {
          id: Date.now() + 3000000,
          orderRoleType: { id: 109 },
          facility: null,
          party: null,
        },
        {
          id: Date.now() + 3000001,
          orderRoleType: { id: 113 },
          facility: { id: 776001568 }, // Ahsan facility
          party: null,
        },
      ],
      orderStatuses: [
        {
          id: Date.now() + 4000000,
          orderStatusType: { id: 133 },
        },
      ],
      orderAdjustments: [
        {
          id: Date.now() + 5000000,
          amount: 0,
          percentage: null,
          orderAdjustmentType: { id: 140 },
        },
      ],
      payments: [
        {
          id: Date.now() + 6000000,
          datePaid: new Date().toISOString(),
          amount: 100,
          paymentMethod: 'CASH',
          accountRef: {},
          paymentType: { id: 145 },
        },
      ],
      sourceFacility: null,
      destinationFacility: null,
    };

    console.log('2. Sending SINGLE order to TradeUnleashed...');
    console.log('   Order payload:', JSON.stringify(testOrder, null, 2));

    // Send as single order (not array)
    const response = await client.createSalesOrders([testOrder]);

    console.log('\n✅ SUCCESS! Order created successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('\n❌ FAILED!');
    console.error('Error:', error instanceof Error ? error.message : String(error));

    // Try alternative: Send without wrapping in saleOrders array
    console.log('\n3. Trying alternative payload format...');
    console.log('   Testing if TradeUnleashed expects different structure\n');
  }
}

testSingleOrder();
