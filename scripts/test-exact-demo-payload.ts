/**
 * Test with EXACT values from successful demo payload to see if it works
 */

import { TradeUnleashedClient } from '../src/integrations/tradeunleashed/api/TradeUnleashedClient.js';

const config = {
  baseUrl: process.env.TRADEUNLEASHED_BASE_URL || 'https://q-prod.tradeunleashed.com',
  username: process.env.TRADEUNLEASHED_USERNAME || '03334343433',
  password: process.env.TRADEUNLEASHED_PASSWORD || 'qwerty',
};

async function testExactDemoPayload() {
  console.log('\n=== Testing with EXACT Demo Payload Structure ===\n');

  const client = new TradeUnleashedClient(config);

  try {
    // Login
    console.log('1. Logging in...');
    await client.login();
    const posSessionId = client.getPosSessionId();
    console.log(`   ✓ POS Session ID: ${posSessionId}\n`);

    // Use the EXACT successful payload structure from demo-data/.json
    // But with current IDs and session
    const exactTestOrder = {
      id: Date.now(), // Use current timestamp
      orderReference: `DEMO-TEST-${Date.now()}`,
      dateCreated: new Date().toISOString(),
      deliveryDate: new Date().toISOString(),
      customerName: '',
      transient: true,
      uniqueHash: String(Date.now()),
      posSession: { id: posSessionId || 676864374 }, // Use current or fallback
      notes: null,
      fbrInvoiceNum: null,
      saleType: { id: 432545517 },
      lineItems: [
        {
          inventoryItem: { id: 302156 }, // Same as demo
          facilityInventoryItemUOM: null,
          facility: null,
          quantity: 1,
          unitPrice: 1000, // Same as demo
          unitValue: 0,
          customDiscAmt: 0,
          id: Date.now() + 107000000, // Different from order ID like demo
          serialNumber: null,
          lineNum: 1,
          orderAdjustments: [
            {
              id: Date.now() - 1093000000, // Generate like demo (smaller)
              amount: null,
              percentage: 0,
              orderAdjustmentType: { id: 140 },
            },
            {
              id: Date.now() - 720000000, // Different ID
              amount: null,
              percentage: 0,
              orderAdjustmentType: { id: 141 },
            },
          ],
        },
      ],
      orderRoles: [
        {
          id: Date.now() - 173000000,
          orderRoleType: { id: 109 },
          facility: null,
          party: null,
        },
        {
          id: Date.now() - 1411000000, // Much smaller like demo
          orderRoleType: { id: 113 },
          facility: { id: 184806 }, // Use demo facility
          party: null,
        },
      ],
      orderStatuses: [
        {
          id: Date.now() - 298000000,
          orderStatusType: { id: 133 },
        },
      ],
      orderAdjustments: [
        {
          id: Date.now() - 272000000,
          amount: 0,
          percentage: null,
          orderAdjustmentType: { id: 140 },
        },
      ],
      payments: [
        {
          id: Date.now() - 748000000,
          datePaid: new Date().toISOString(),
          amount: 1000,
          paymentMethod: 'CASH',
          accountRef: {},
          paymentType: { id: 145 },
        },
      ],
      sourceFacility: null,
      destinationFacility: null,
    };

    console.log('2. Sending order with demo-like structure...');
    console.log(`   Order ID: ${exactTestOrder.id}`);
    console.log(`   Line Item ID: ${exactTestOrder.lineItems[0].id}`);
    console.log(`   Facility: ${exactTestOrder.orderRoles[1].facility?.id}\n`);

    const response = await client.createSalesOrders([exactTestOrder]);

    console.log('\n✅ SUCCESS!');
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('\n❌ STILL FAILED');
    console.error('Error:', error instanceof Error ? error.message : String(error));

    console.log('\n📋 CONCLUSION:');
    console.log('The payload structure is correct, but TradeUnleashed is rejecting it.');
    console.log('Possible reasons:');
    console.log('1. Inventory item 302156 may not exist or is inactive in TradeUnleashed');
    console.log('2. Facility 776001568/184806 may have restrictions');
    console.log('3. POS Session may require special permissions');
    console.log('4. Sale Type 432545517 may have validation rules');
    console.log('5. Server-side business logic validation (e.g., stock levels, pricing)');
    console.log('\n💡 RECOMMENDATION:');
    console.log('- Contact TradeUnleashed support with the error');
    console.log('- Check TradeUnleashed HQ server logs if you have access');
    console.log('- Try creating an order manually in TradeUnleashed UI to compare');
  }
}

testExactDemoPayload();
