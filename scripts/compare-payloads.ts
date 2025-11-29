/**
 * Compare current failing payload with successful demo payload
 */

const successfulPayload = {
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
  "lineItems": [{
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
      { "id": 411357806054, "amount": null, "percentage": 0, "orderAdjustmentType": { "id": 140 } },
      { "id": 784349208984, "amount": null, "percentage": 0, "orderAdjustmentType": { "id": 141 } }
    ]
  }],
  "orderRoles": [
    { "id": 1331008416098, "orderRoleType": { "id": 109 }, "facility": null, "party": null },
    { "id": 93923851707, "orderRoleType": { "id": 113 }, "facility": { "id": 184806 }, "party": null },
    { "id": 1508564164862, "orderRoleType": { "id": 112 }, "party": { "id": 182643 }, "facility": null },
    { "id": 570368832591, "orderRoleType": { "id": 108 }, "party": { "id": 182644 }, "facility": null }
  ],
  "orderStatuses": [
    { "id": 1206211949659, "orderStatusType": { "id": 133 } }
  ],
  "orderAdjustments": [
    { "id": 1231962514202, "amount": 0, "percentage": null, "orderAdjustmentType": { "id": 140 } }
  ],
  "payments": [
    { "id": 756147306460, "datePaid": "2024-11-02T01:29:27.859Z", "amount": 1000, "paymentMethod": "CASH", "accountRef": {}, "paymentType": { "id": 145 } }
  ],
  "sourceFacility": null,
  "destinationFacility": null
};

const currentPayload = {
  "id": 1764423721796,
  "orderReference": "ORD-20251129-0001",
  "dateCreated": "2025-11-29T11:46:59.313Z",
  "deliveryDate": "2025-11-29T11:46:59.313Z",
  "customerName": "",
  "transient": true,
  "uniqueHash": "ecbfe075-6a11-4396-a281-fca15fa09354",
  "posSession": { "id": 2250448529 },
  "saleType": { "id": 432545517 },
  "notes": null,
  "fbrInvoiceNum": null,
  "lineItems": [{
    "inventoryItem": { "id": 302156 },
    "facilityInventoryItemUOM": null,
    "facility": null,
    "quantity": 1,
    "unitPrice": 100,
    "unitValue": 0,
    "customDiscAmt": 0,
    "id": 1764423721796,
    "serialNumber": null,
    "lineNum": 1,
    "orderAdjustments": [
      { "id": 1764423721797, "amount": null, "percentage": 0, "orderAdjustmentType": { "id": 140 } },
      { "id": 1764423721798, "amount": null, "percentage": 0, "orderAdjustmentType": { "id": 141 } }
    ]
  }],
  "orderRoles": [
    { "id": 1764423722115, "orderRoleType": { "id": 109 }, "facility": null, "party": null },
    { "id": 1764423732793, "orderRoleType": { "id": 113 }, "facility": { "id": 776001568 }, "party": null }
  ],
  "orderStatuses": [
    { "id": 1764423726174, "orderStatusType": { "id": 133 } }
  ],
  "orderAdjustments": [
    { "id": 1764423799478, "amount": 0, "percentage": null, "orderAdjustmentType": { "id": 140 } }
  ],
  "payments": [
    { "id": 1764423723355, "datePaid": "2025-11-29T11:46:59.500Z", "amount": 100, "paymentMethod": "CASH", "accountRef": null, "paymentType": { "id": 145 } }
  ],
  "sourceFacility": null,
  "destinationFacility": null
};

console.log('\n=== PAYLOAD COMPARISON ===\n');

console.log('SUCCESSFUL PAYLOAD:');
console.log('  - Order ID same as Line Item ID: NO (order: 1504723025127, lineItem: 1611469024988)');
console.log('  - orderRoles count: 4 (includes roles 109, 113, 112, 108)');
console.log('  - accountRef: {} (empty object)');
console.log('  - Field order preserved: YES');

console.log('\nCURRENT PAYLOAD:');
console.log('  - Order ID same as Line Item ID: YES (both: 1764423721796) ⚠️ PROBLEM!');
console.log('  - orderRoles count: 2 (only roles 109, 113) ⚠️ MISSING CUSTOMER/SALESPERSON');
console.log('  - accountRef: null ⚠️ DIFFERENT FROM SUCCESSFUL');
console.log('  - Field order: DIFFERENT ⚠️');

console.log('\n=== KEY DIFFERENCES ===\n');
console.log('1. ❌ Order ID and Line Item ID are IDENTICAL in current payload');
console.log('   Success: order=1504723025127, lineItem=1611469024988 (different)');
console.log('   Current: order=1764423721796, lineItem=1764423721796 (SAME!)');

console.log('\n2. ⚠️ accountRef field');
console.log('   Success: {} (empty object)');
console.log('   Current: null');

console.log('\n3. ⚠️ Field ordering in root object');
console.log('   Success order: id, orderReference, dateCreated, deliveryDate, customerName, transient, uniqueHash, posSession, notes, fbrInvoiceNum, saleType, lineItems, orderRoles, orderStatuses, orderAdjustments, payments, sourceFacility, destinationFacility');
console.log('   Current order: id, orderReference, dateCreated, deliveryDate, customerName, transient, uniqueHash, posSession, saleType, notes, fbrInvoiceNum, lineItems, ...');
console.log('   (saleType appears AFTER posSession in current, but AFTER fbrInvoiceNum in success)');

console.log('\n4. ⚠️ Missing orderRoles');
console.log('   Success has 4 roles: PLACING_CUSTOMER(109), SHIP_FROM_FACILITY(113), INTERNAL_ORGANIZATION(112), SALES_AGENT(108)');
console.log('   Current has 2 roles: PLACING_CUSTOMER(109), SHIP_FROM_FACILITY(113)');

console.log('\n=== RECOMMENDATIONS ===\n');
console.log('1. ✓ FIX: Ensure Order ID and Line Item ID are DIFFERENT');
console.log('2. ✓ FIX: Change accountRef back to {} (empty object)');
console.log('3. ✓ FIX: Reorder fields to match successful payload exactly');
console.log('4. ? OPTIONAL: Add customer/salesperson roles if available');
