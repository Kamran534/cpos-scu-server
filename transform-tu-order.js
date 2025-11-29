import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Transform TradeUnleashed order format to API format
 * Maps location, customer, and products from database
 */
async function transformTradeUnleashedOrder(tuOrder) {
  // Extract facility ID (location) from orderRoles
  // Role type 113 = Ship From (facility role)
  const facilityRole = tuOrder.orderRoles?.find(role => role.orderRoleType?.id === 113);
  const tuFacilityId = facilityRole?.facility?.id;

  // Extract customer ID from orderRoles
  // Role type 112 = Customer (party role)
  const customerRole = tuOrder.orderRoles?.find(role => role.orderRoleType?.id === 112);
  const tuCustomerId = customerRole?.party?.id;

  // Extract cashier/salesperson from orderRoles
  // Role type 108 = Salesperson (party role)
  const salespersonRole = tuOrder.orderRoles?.find(role => role.orderRoleType?.id === 108);
  const tuSalespersonId = salespersonRole?.party?.id;

  // Map location by facility ID (using code)
  let locationId = null;
  if (tuFacilityId) {
    const location = await prisma.location.findFirst({
      where: {
        code: String(tuFacilityId)
      }
    });
    if (location) {
      locationId = location.id;
      console.log(`✅ Found location: ${location.name} (${location.code})`);
    } else {
      console.log(`⚠️  Location not found for facility ID: ${tuFacilityId}`);
      // Get default location
      const defaultLocation = await prisma.location.findFirst({
        where: { isActive: true }
      });
      if (defaultLocation) {
        locationId = defaultLocation.id;
        console.log(`⚠️  Using default location: ${defaultLocation.name} (${defaultLocation.code})`);
      }
    }
  } else {
    // Get default location if no facility ID
    const defaultLocation = await prisma.location.findFirst({
      where: { isActive: true }
    });
    if (defaultLocation) {
      locationId = defaultLocation.id;
      console.log(`⚠️  Using default location: ${defaultLocation.name} (${defaultLocation.code})`);
    }
  }

  // Map customer by party ID (using customerCode or other identifier)
  // Note: Customer model may not have externalId, so we'll skip customer mapping for now
  let customerId = null;
  if (tuCustomerId) {
    // Try to find by customerCode if it matches the party ID
    const customer = await prisma.customer.findFirst({
      where: {
        customerCode: String(tuCustomerId)
      }
    });
    if (customer) {
      customerId = customer.id;
      console.log(`✅ Found customer: ${customer.firstName || customer.email || customerId}`);
    } else {
      console.log(`⚠️  Customer not found for party ID: ${tuCustomerId} (will create order without customer)`);
    }
  }

  // Map cashier/user by party ID or posSession
  // Note: User model may not have externalId, so we'll use default
  let cashierId = null;
  if (tuSalespersonId) {
    // Try to find by username if it matches the party ID
    const user = await prisma.user.findFirst({
      where: {
        username: String(tuSalespersonId)
      }
    });
    if (user) {
      cashierId = user.id;
      console.log(`✅ Found cashier: ${user.username || user.firstName || cashierId}`);
    } else {
      console.log(`⚠️  Cashier not found for party ID: ${tuSalespersonId}`);
    }
  }

  // If no cashier found, get default
  if (!cashierId) {
    const defaultCashier = await prisma.user.findFirst({
      where: { isActive: true }
    });
    if (defaultCashier) {
      cashierId = defaultCashier.id;
      console.log(`⚠️  Using default cashier: ${defaultCashier.username || defaultCashier.id}`);
    }
  }

  // Transform line items - map inventoryItem.id to productId
  const lines = tuOrder.lineItems?.map(line => {
    const tuInventoryItemId = line.inventoryItem?.id;
    return {
      id: line.id,
      productId: tuInventoryItemId, // This will be mapped to variant by externalId
      quantity: line.quantity || 0,
      unitPrice: line.unitPrice || 0,
      discount: line.customDiscAmt || 0,
      taxAmount: 0, // Calculate from orderAdjustments if needed
      lineTotal: (line.unitPrice || 0) * (line.quantity || 0) - (line.customDiscAmt || 0)
    };
  }) || [];

  // Calculate total amount from payments or line items
  const totalAmount = tuOrder.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) ||
    lines.reduce((sum, line) => sum + line.lineTotal, 0);

  // Transform to API format
  const apiOrder = {
    id: tuOrder.id,
    orderNumber: tuOrder.orderReference || tuOrder.orderNumber || `TU-${tuOrder.id}`,
    customerId: tuCustomerId,
    orderDate: tuOrder.dateCreated || tuOrder.orderDate || new Date().toISOString(),
    status: tuOrder.orderStatuses?.[0]?.orderStatusType?.id === 133 ? 'confirmed' : 'pending',
    totalAmount: totalAmount,
    lastModifiedOn: tuOrder.lastModifiedOn || tuOrder.dateCreated || new Date().toISOString(),
    lines: lines
  };

  return {
    order: apiOrder,
    locationId,
    customerId,
    cashierId
  };
}

/**
 * Main function to transform and create orders
 */
async function main() {
  try {
    // TradeUnleashed order data
    const tuOrders = [
      {
        "id": 1504723025127,
        "orderReference": "5",
        "dateCreated": "2024-11-02T01:29:27.859Z",
        "deliveryDate": "2024-11-02T01:29:27.859Z",
        "customerName": "",
        "transient": true,
        "uniqueHash": "1504723025127",
        "posSession": { "id": 676864374 },
        "notes": null,
        "fbrInvoiceNum": null,
        "saleType": { "id": 432545517 },
        "lineItems": [
          {
            "inventoryItem": { "id": 393165 },
            "facilityInventoryItemUOM": null,
            "facility": null,
            "quantity": 1,
            "unitPrice": 1000,
            "unitValue": 0,
            "customDiscAmt": 0,
            "id": 1611469024988,
            "serialNumber": null,
            "lineNum": 1,
            "orderAdjustments": [
              {
                "id": 411357806054,
                "amount": null,
                "percentage": 0,
                "orderAdjustmentType": { "id": 140 }
              },
              {
                "id": 784349208984,
                "amount": null,
                "percentage": 0,
                "orderAdjustmentType": { "id": 141 }
              }
            ]
          }
        ],
        "orderRoles": [
          {
            "id": 1331008416098,
            "orderRoleType": { "id": 109 },
            "facility": null,
            "party": null
          },
          {
            "id": 93923851707,
            "orderRoleType": { "id": 113 },
            "facility": { "id": 184806 },
            "party": null
          },
          {
            "id": 1508564164862,
            "orderRoleType": { "id": 112 },
            "party": { "id": 182643 },
            "facility": null
          },
          {
            "id": 570368832591,
            "orderRoleType": { "id": 108 },
            "party": { "id": 182644 },
            "facility": null
          }
        ],
        "orderStatuses": [
          { "id": 1206211949659, "orderStatusType": { "id": 133 } }
        ],
        "orderAdjustments": [
          {
            "id": 1231962514202,
            "amount": 0,
            "percentage": null,
            "orderAdjustmentType": { "id": 140 }
          }
        ],
        "payments": [
          {
            "id": 756147306460,
            "datePaid": "2024-11-02T01:29:27.859Z",
            "amount": 1000,
            "paymentMethod": "CASH",
            "accountRef": {},
            "paymentType": { "id": 145 }
          }
        ],
        "sourceFacility": null,
        "destinationFacility": null
      }
    ];

    console.log('=== Transforming TradeUnleashed Orders ===\n');

    const transformedOrders = [];
    const customerIdMap = new Map();
    let locationId = null;
    let cashierId = null;

    for (const tuOrder of tuOrders) {
      console.log(`\nProcessing order: ${tuOrder.orderReference || tuOrder.id}`);
      const transformed = await transformTradeUnleashedOrder(tuOrder);
      
      transformedOrders.push(transformed.order);
      
      // Store location and cashier from first order
      if (!locationId && transformed.locationId) {
        locationId = transformed.locationId;
      }
      if (!cashierId && transformed.cashierId) {
        cashierId = transformed.cashierId;
      }
      
      // Build customer ID map
      if (transformed.customerId && tuOrder.orderRoles) {
        const customerRole = tuOrder.orderRoles.find(role => role.orderRoleType?.id === 112);
        if (customerRole?.party?.id) {
          customerIdMap.set(customerRole.party.id, transformed.customerId);
        }
      }
    }

    // Prepare API request payload
    const apiPayload = {
      storeId: 1,
      orders: transformedOrders
    };

    // Prepare options with mapped IDs
    const options = {
      locationId: locationId,
      cashierId: cashierId,
      customerIdMap: customerIdMap.size > 0 ? customerIdMap : undefined
    };

    console.log('\n=== Transformed Order Data ===');
    console.log(JSON.stringify(apiPayload, null, 2));
    console.log('\n=== Options (locationId, cashierId, customerIdMap) ===');
    console.log(JSON.stringify({
      locationId: options.locationId,
      cashierId: options.cashierId,
      customerIdMap: options.customerIdMap ? Object.fromEntries(options.customerIdMap) : null
    }, null, 2));

    // Save to file
    const fs = await import('fs');
    fs.writeFileSync('transformed-order.json', JSON.stringify(apiPayload, null, 2));
    fs.writeFileSync('order-options.json', JSON.stringify(options, null, 2));
    
    console.log('\n✅ Files created:');
    console.log('  - transformed-order.json (API payload)');
    console.log('  - order-options.json (mapping options)');
    console.log('\nYou can now use these files to create the order via API.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

