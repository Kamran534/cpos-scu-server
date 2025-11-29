/**
 * Sales Order Mapper
 *
 * Maps between POS SaleOrder data and TradeUnleashed saleOrder format
 */

import { SaleOrder, OrderLineItem, OrderPayment } from '@prisma/client';
import {
  SalesOrderPayload,
  SalesOrderLineItemPayload,
  SalesOrderPaymentPayload,
  SalesOrderRolePayload,
  SalesOrderAdjustmentPayload,
  SalesOrderStatusPayload,
} from '../../../payloads/salesOrder.payload.js';

export interface SaleOrderWithRelations extends SaleOrder {
  lineItems: Array<
    OrderLineItem & {
      variant: {
        externalId: string | null;
        externalSystem: string | null;
        sku: string;
        variantName: string;
      };
    }
  >;
  payments: OrderPayment[];
  location: {
    id: string;
    code: string;
    name: string;
  };
  customer?: {
    id: string;
    customerCode: string;
    firstName: string;
    lastName: string;
  } | null;
}

/**
 * Map POS SaleOrder to TradeUnleashed payload format
 */
export async function mapSaleOrderToTU(
  order: SaleOrderWithRelations
): Promise<SalesOrderPayload> {
  // Validate that all line items have TradeUnleashed IDs
  for (const lineItem of order.lineItems) {
    if (!lineItem.variant.externalId || lineItem.variant.externalSystem !== 'tradeunleashed') {
      throw new Error(
        `Line item variant ${lineItem.variant.sku} does not have TradeUnleashed mapping. ` +
          `Ensure product is synced from TradeUnleashed before creating orders.`
      );
    }
  }

  // Map line items
  const lineItems: SalesOrderLineItemPayload[] = order.lineItems.map((item, index) => ({
    inventoryItemId: item.variant.externalId!, // TradeUnleashed item ID
    quantity: item.quantity,
    unitPrice: parseFloat(item.unitPrice.toString()),
    lineDiscount: parseFloat(item.lineDiscount.toString()),
    lineTax: parseFloat(item.lineTax.toString()),
    lineTotal: parseFloat(item.lineTotal.toString()),
    lineNum: index + 1,
    serialNumber: item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers[0] : null,
    customDiscountAmount: parseFloat(item.lineDiscount.toString()),
  }));

  // Map payments
  const payments: SalesOrderPaymentPayload[] = order.payments.map((payment) => ({
    amount: parseFloat(payment.amount.toString()),
    paymentMethod: getTradeUnleashedPaymentMethod(),
    datePaid: payment.processedAt,
    accountRef: {},
  }));

  // Build order roles
  // TradeUnleashed requires at least 4 roles:
  // 109: Default role (no facility, no party)
  // 113: Ship From (facility role)
  // 112: Customer (party role) - optional
  // 108: Salesperson (party role) - optional
  const orderRoles: SalesOrderRolePayload[] = [];

  // Add default role - Role Type 109 (required by TradeUnleashed)
  orderRoles.push({
    orderRoleTypeId: 109,
    facilityId: null,
    partyId: null,
  });

  // Add facility role (source/selling location) - Role Type 113 = Ship From
  // Location.code contains the TradeUnleashed facility ID
  if (order.location.code) {
    const facilityId = parseInt(order.location.code);
    if (!isNaN(facilityId)) {
      orderRoles.push({
        orderRoleTypeId: 113, // Ship From (facility role type in TU)
        facilityId: facilityId,
        partyId: null,
      });
    }
  }

  // Add customer role - Role Type 112 = Customer
  // Customer.customerCode may contain TradeUnleashed party ID
  if (order.customer?.customerCode) {
    const partyId = parseInt(order.customer.customerCode);
    if (!isNaN(partyId)) {
      orderRoles.push({
        orderRoleTypeId: 112, // Customer
        facilityId: null,
        partyId: partyId,
      });
    }
  }

  // Add salesperson role - Role Type 108 = Salesperson (if cashier has externalId)
  // Note: You may need to add cashier externalId mapping
  // For now, we'll skip this if not available

  // Add order statuses
  const orderStatuses: SalesOrderStatusPayload[] = [
    {
      orderStatusTypeId: 133, // Approved status in TradeUnleashed
    },
  ];

  // Build order adjustments (discounts/taxes)
  const orderAdjustments: SalesOrderAdjustmentPayload[] = [];

  if (order.discountAmount && parseFloat(order.discountAmount.toString()) > 0) {
    orderAdjustments.push({
      orderAdjustmentTypeId: 140, // Discount adjustment type
      amount: parseFloat(order.discountAmount.toString()),
      percentage: null,
    });
  }

  return {
    sourceSystem: 'pos',
    sourceId: order.id,
    timestamp: new Date(),
    orderReference: order.orderNumber,
    dateCreated: order.orderDate,
    deliveryDate: order.orderDate,
    customerName: '', // Will be populated if customer exists
    transient: true,
    uniqueHash: order.id, // Use POS order ID as unique hash
    notes: order.notes || null,
    fbrInvoiceNum: null,
    lineItems,
    payments,
    orderRoles,
    orderStatuses,
    orderAdjustments,
  };
}

/**
 * Map POS payment method ID to TradeUnleashed payment method string
 */
function getTradeUnleashedPaymentMethod(): string {
  // This mapping should be configured based on your payment methods
  // For now, return a default
  // TODO: Implement proper payment method mapping
  return 'CASH'; // Default to CASH
}

/**
 * TradeUnleashed Sales Order API payload structure
 */
export interface TradeUnleashedSaleOrderPayload {
  id: number;
  orderReference: string;
  dateCreated: string;
  deliveryDate: string;
  customerName: string | null;
  transient: boolean;
  uniqueHash: string;
  posSession: { id: number };
  notes: string | null;
  fbrInvoiceNum: string | null;
  saleType: { id: number };
  lineItems: Array<{
    inventoryItem: { id: number };
    facilityInventoryItemUOM: null;
    facility: null;
    quantity: number;
    unitPrice: number;
    unitValue: number;
    customDiscAmt: number;
    id: number;
    serialNumber: string | null;
    lineNum: number;
    orderAdjustments: Array<{
      id: number;
      amount: number | null;
      percentage: number;
      orderAdjustmentType: { id: number };
    }>;
  }>;
  orderRoles: Array<{
    id: number;
    orderRoleType: { id: number };
    facility: { id: number } | null;
    party: { id: number } | null;
  }>;
  orderStatuses: Array<{
    id: number;
    orderStatusType: { id: number };
  }>;
  orderAdjustments: Array<{
    id: number;
    amount: number | null;
    percentage: number | null;
    orderAdjustmentType: { id: number };
  }>;
  payments: Array<{
    id: number;
    datePaid: string;
    amount: number;
    paymentMethod: string;
    accountRef: Record<string, unknown>;
    paymentType: { id: number };
  }>;
  sourceFacility: null;
  destinationFacility: null;
}

/**
 * Build TradeUnleashed API payload from SalesOrderPayload
 *
 * CRITICAL: Order ID and Line Item IDs MUST be different!
 *
 * ID Pattern Analysis from successful TradeUnleashed orders:
 * - Order ID: 13 digits (e.g., 1504723025127)
 * - Line Item IDs: 13 digits BUT DIFFERENT from order ID (e.g., 1611469024988)
 * - Order Role IDs: 11-13 digits (e.g., 1331008416098)
 * - Order Status IDs: 12-13 digits (e.g., 1206211949659)
 * - Payment IDs: 12 digits (e.g., 756147306460)
 * - Line Item Adjustment IDs: 11-12 digits (e.g., 411357806054)
 * - Order Adjustment IDs: 12-13 digits (e.g., 1231962514202)
 * - POS Session ID: Use from database (6-9 digits)
 * - Entity IDs (inventory, facility, party, type IDs): Use from database (3-10 digits)
 */
export function buildTradeUnleashedAPIPayload(
  payload: SalesOrderPayload,
  orderId?: number,
  posSessionId?: number | null
): TradeUnleashedSaleOrderPayload {
  // Generate a unique ID for TradeUnleashed if not provided
  // Use timestamp for 13-digit ID (matches TradeUnleashed pattern)
  const baseTimestamp = Date.now();
  const tuOrderId = orderId || baseTimestamp;

  // Use provided posSessionId, or throw error if not available
  if (!posSessionId && !payload.posSessionId) {
    throw new Error('POS Session ID is required for TradeUnleashed order creation');
  }
  const sessionId = posSessionId || payload.posSessionId!;

  // CustomerName should be null if empty, not empty string
  const customerName = payload.customerName && payload.customerName.trim() !== ''
    ? payload.customerName
    : null;

  return {
    id: tuOrderId,
    orderReference: payload.orderReference,
    dateCreated: payload.dateCreated.toISOString(),
    deliveryDate: payload.deliveryDate?.toISOString() || payload.dateCreated.toISOString(),
    customerName: customerName || '',
    transient: payload.transient !== false,
    uniqueHash: payload.uniqueHash || payload.orderReference || String(tuOrderId),
    posSession: { id: sessionId },
    notes: payload.notes ?? null,
    fbrInvoiceNum: payload.fbrInvoiceNum ?? null,
    saleType: payload.saleTypeId ? { id: payload.saleTypeId } : { id: 432545517 }, // Default sale type
    lineItems: payload.lineItems.map((item, index) => {
      // Validate inventoryItemId is a valid number
      const inventoryItemId = parseInt(item.inventoryItemId);
      if (isNaN(inventoryItemId) || inventoryItemId <= 0) {
        throw new Error(`Invalid inventoryItemId: ${item.inventoryItemId} for line item ${index + 1}`);
      }

      // CRITICAL: Line item ID must be DIFFERENT from order ID
      // Generate line item ID by adding a large offset to base timestamp
      // This ensures line item IDs are different from order ID
      const lineItemId = baseTimestamp + 100000000 + (index * 1000);

      // Generate unique adjustment IDs (11-12 digits)
      // Use different base to ensure they're unique from line items
      const adjustmentId1 = baseTimestamp + 200000000 + (index * 10000) + 1;
      const adjustmentId2 = baseTimestamp + 200000000 + (index * 10000) + 2;

      return {
        inventoryItem: { id: inventoryItemId },
        facilityInventoryItemUOM: null,
        facility: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitValue: 0,
        customDiscAmt: item.customDiscountAmount || 0,
        id: lineItemId,
        serialNumber: item.serialNumber ?? null,
        lineNum: item.lineNum || index + 1,
        orderAdjustments: [
          {
            id: adjustmentId1,
            amount: null,
            percentage: 0,
            orderAdjustmentType: { id: 140 }, // Discount
          },
          {
            id: adjustmentId2,
            amount: null,
            percentage: 0,
            orderAdjustmentType: { id: 141 }, // Tax
          },
        ],
      };
    }),
    // orderRoles - TradeUnleashed requires at least role 109 and 113
    orderRoles: payload.orderRoles && payload.orderRoles.length > 0
      ? payload.orderRoles.map((role, index) => {
          // Validate facilityId if provided
          if (role.facilityId && (isNaN(role.facilityId) || role.facilityId <= 0)) {
            throw new Error(`Invalid facilityId: ${role.facilityId} for orderRole ${index + 1}`);
          }
          // Validate partyId if provided
          if (role.partyId && (isNaN(role.partyId) || role.partyId <= 0)) {
            throw new Error(`Invalid partyId: ${role.partyId} for orderRole ${index + 1}`);
          }

          // Generate IDs (11-13 digits) using baseTimestamp + offset
          const roleId = baseTimestamp + 300000000 + (index * 10000) + Math.floor(Math.random() * 1000);
          return {
            id: roleId,
            orderRoleType: { id: role.orderRoleTypeId },
            facility: role.facilityId ? { id: role.facilityId } : null,
            party: role.partyId ? { id: role.partyId } : null,
          };
        })
      : [],
    // orderStatuses - required by TradeUnleashed
    orderStatuses: payload.orderStatuses && payload.orderStatuses.length > 0
      ? payload.orderStatuses.map((status, index) => {
          // Generate status ID (12-13 digits)
          const statusId = baseTimestamp + 400000000 + (index * 100000) + Math.floor(Math.random() * 10000);
          return {
            id: statusId,
            orderStatusType: { id: status.orderStatusTypeId },
          };
        })
      : [
          {
            id: baseTimestamp + 400000000 + Math.floor(Math.random() * 10000),
            orderStatusType: { id: 133 }, // Fulfilled status
          },
        ],
    // orderAdjustments at order level - required by TradeUnleashed
    // If no adjustments provided, include a default one with amount 0
    orderAdjustments: payload.orderAdjustments && payload.orderAdjustments.length > 0
      ? payload.orderAdjustments.map((adj, index) => {
          // Generate adjustment ID (12-13 digits)
          const adjId = baseTimestamp + 500000000 + (index * 1000000) + Math.floor(Math.random() * 100000);
          return {
            id: adjId,
            amount: adj.amount !== undefined ? adj.amount : 0,
            percentage: adj.percentage || null,
            orderAdjustmentType: { id: adj.orderAdjustmentTypeId },
          };
        })
      : [
          {
            id: baseTimestamp + 500000000 + Math.floor(Math.random() * 100000),
            amount: 0,
            percentage: null,
            orderAdjustmentType: { id: 140 }, // Default discount adjustment
          },
        ],
    payments: payload.payments.map((payment, index) => {
      // Generate payment ID (12 digits)
      // Use different base to avoid conflicts
      const paymentId = baseTimestamp + 700000000 + (index * 100000) + Math.floor(Math.random() * 10000);
      return {
        id: paymentId,
        datePaid: payment.datePaid.toISOString(),
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        accountRef: {}, // Empty object (matches successful payload)
        paymentType: { id: 145 }, // RECEIPT payment type
      };
    }),
    sourceFacility: null,
    destinationFacility: null,
  };
}
