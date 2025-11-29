import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

/**
 * Transform TradeUnleashed saleOrders format to API format
 */
async function transformTradeUnleashedOrders(tuOrders) {
  const results = [];

  for (const tuOrder of tuOrders) {
    // Extract facility ID (location) from orderRoles
    // Role type 113 = Ship From (facility role)
    const facilityRole = tuOrder.orderRoles?.find(role => role.orderRoleType?.id === 113);
    const tuFacilityId = facilityRole?.facility?.id;

    // Extract customer ID from orderRoles
    // Role type 112 = Customer (party role)
    const customerRole = tuOrder.orderRoles?.find(role => role.orderRoleType?.id === 112);
    const tuCustomerId = customerRole?.party?.id;

    // Map location by facility ID (using code)
    let locationId = null;
    let locationCode = null;
    if (tuFacilityId) {
      const location = await prisma.location.findFirst({
        where: { code: String(tuFacilityId) }
      });
      if (location) {
        locationId = location.id;
        locationCode = location.code;
        console.log(`✅ Found location: ${location.name} (${location.code}) -> ${locationId}`);
      } else {
        console.log(`⚠️  Location not found for facility ID: ${tuFacilityId}, will use default`);
      }
    }

    // Get default location if not found
    if (!locationId) {
      const defaultLocation = await prisma.location.findFirst({
        where: { isActive: true }
      });
      if (defaultLocation) {
        locationId = defaultLocation.id;
        locationCode = defaultLocation.code;
        console.log(`⚠️  Using default location: ${defaultLocation.name} (${defaultLocation.code})`);
      }
    }

    // Get default cashier
    const defaultCashier = await prisma.user.findFirst({
      where: { isActive: true }
    });
    let cashierId = null;
    if (defaultCashier) {
      cashierId = defaultCashier.id;
      console.log(`✅ Using cashier: ${defaultCashier.username || defaultCashier.id}`);
    }

    // Transform line items - map inventoryItem.id to productId
    const lines = tuOrder.lineItems?.map(line => {
      const tuInventoryItemId = line.inventoryItem?.id;
      return {
        id: line.id,
        productId: tuInventoryItemId, // TradeUnleashed inventory item ID
        quantity: line.quantity || 0,
        unitPrice: line.unitPrice || 0,
        discount: line.customDiscAmt || 0,
        taxAmount: 0, // Can be calculated from orderAdjustments if needed
        lineTotal: (line.unitPrice || 0) * (line.quantity || 0) - (line.customDiscAmt || 0)
      };
    }) || [];

    // Calculate total amount from payments or line items
    const totalAmount = tuOrder.payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) ||
      lines.reduce((sum, line) => sum + line.lineTotal, 0);

    // Determine status from orderStatuses
    const isApproved = tuOrder.orderStatuses?.some(status => status.orderStatusType?.id === 133);
    const status = isApproved ? 'confirmed' : 'pending';

    // Transform to API format
    const apiOrder = {
      id: tuOrder.id,
      orderNumber: tuOrder.orderReference || tuOrder.orderNumber || `TU-${tuOrder.id}`,
      customerId: tuCustomerId || null,
      orderDate: tuOrder.dateCreated || tuOrder.orderDate || new Date().toISOString(),
      status: status,
      totalAmount: totalAmount,
      lastModifiedOn: tuOrder.lastModifiedOn || tuOrder.dateCreated || new Date().toISOString(),
      lines: lines
    };

    results.push({
      order: apiOrder,
      locationId,
      locationCode,
      cashierId,
      tuFacilityId,
      tuCustomerId
    });
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  try {
    // TradeUnleashed orders data
    const tuData = {
      "saleOrders": [
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
        },
        {
          "id": 1657756891429,
          "orderReference": "6",
          "dateCreated": "2024-11-02T01:29:35.427Z",
          "deliveryDate": "2024-11-02T01:29:35.427Z",
          "customerName": "",
          "transient": true,
          "uniqueHash": "1657756891429",
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
              "id": 1653107871987,
              "serialNumber": null,
              "lineNum": 1,
              "orderAdjustments": [
                {
                  "id": 1161569094014,
                  "amount": null,
                  "percentage": 0,
                  "orderAdjustmentType": { "id": 140 }
                },
                {
                  "id": 526725025736,
                  "amount": null,
                  "percentage": 0,
                  "orderAdjustmentType": { "id": 141 }
                }
              ]
            }
          ],
          "orderRoles": [
            {
              "id": 676081359978,
              "orderRoleType": { "id": 109 },
              "facility": null,
              "party": null
            },
            {
              "id": 660766426543,
              "orderRoleType": { "id": 113 },
              "facility": { "id": 184806 },
              "party": null
            },
            {
              "id": 920235564005,
              "orderRoleType": { "id": 112 },
              "party": { "id": 182643 },
              "facility": null
            },
            {
              "id": 715488446186,
              "orderRoleType": { "id": 108 },
              "party": { "id": 182644 },
              "facility": null
            }
          ],
          "orderStatuses": [
            { "id": 795757055155, "orderStatusType": { "id": 133 } }
          ],
          "orderAdjustments": [
            {
              "id": 1118134651063,
              "amount": 0,
              "percentage": null,
              "orderAdjustmentType": { "id": 140 }
            }
          ],
          "payments": [
            {
              "id": 1548156563835,
              "datePaid": "2024-11-02T01:29:35.427Z",
              "amount": 1000,
              "paymentMethod": "CASH",
              "accountRef": {},
              "paymentType": { "id": 145 }
            }
          ],
          "sourceFacility": null,
          "destinationFacility": null
        }
      ]
    };

    console.log('=== Transforming TradeUnleashed Orders ===\n');

    const transformed = await transformTradeUnleashedOrders(tuData.saleOrders);

    // Use location and cashier from first order
    const locationId = transformed[0]?.locationId;
    const locationCode = transformed[0]?.locationCode;
    const cashierId = transformed[0]?.cashierId;

    // Build API payload
    const apiPayload = {
      storeId: 1,
      locationId: locationCode || locationId, // Use code if available, otherwise UUID
      cashierId: cashierId,
      orders: transformed.map(t => t.order)
    };

    console.log('\n=== API Payload ===');
    console.log(JSON.stringify(apiPayload, null, 2));

    // Save to file
    fs.writeFileSync('swagger-order-input.json', JSON.stringify(apiPayload, null, 2));
    console.log('\n✅ File created: swagger-order-input.json');
    console.log('\n📝 Instructions:');
    console.log('  1. Open Swagger UI at http://localhost:4000/api-docs');
    console.log('  2. Navigate to POST /api/sales-orders/bulk-save');
    console.log('  3. Copy the contents of swagger-order-input.json');
    console.log('  4. Replace productId values with products that exist in your database');
    console.log('  5. Verify locationId and cashierId are correct');
    console.log('  6. Execute the request');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

