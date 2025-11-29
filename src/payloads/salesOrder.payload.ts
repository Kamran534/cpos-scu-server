/**
 * Sales Order Payload Types
 *
 * DTOs for sales order data between POS and TradeUnleashed
 */

import { BasePayload, PayloadMetadata } from './base.payload.js';

export interface SalesOrderLineItemPayload {
  inventoryItemId: string;      // TradeUnleashed inventory item ID (externalId from ProductVariant)
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
  lineTax?: number;
  lineTotal: number;
  lineNum?: number;
  serialNumber?: string | null;
  customDiscountAmount?: number;
}

export interface SalesOrderPaymentPayload {
  amount: number;
  paymentMethod: string;        // CASH, CARD, etc.
  datePaid: Date;
  accountRef?: Record<string, unknown>;
}

export interface SalesOrderRolePayload {
  orderRoleTypeId: number;      // TradeUnleashed role type ID
  facilityId?: number | null;   // TradeUnleashed facility ID
  partyId?: number | null;      // TradeUnleashed party ID
}

export interface SalesOrderAdjustmentPayload {
  orderAdjustmentTypeId: number; // TradeUnleashed adjustment type ID
  amount?: number | null;
  percentage?: number | null;
}

export interface SalesOrderStatusPayload {
  orderStatusTypeId: number;    // TradeUnleashed status type ID
}

export interface SalesOrderPayload extends BasePayload {
  orderReference: string;        // POS order number
  dateCreated: Date;
  deliveryDate?: Date;
  customerName?: string;
  transient?: boolean;          // Temporary order flag
  uniqueHash?: string;          // Unique identifier
  posSessionId?: number;        // TradeUnleashed POS session ID
  saleTypeId?: number;          // TradeUnleashed sale type ID
  notes?: string | null;
  fbrInvoiceNum?: string | null;

  lineItems: SalesOrderLineItemPayload[];
  payments: SalesOrderPaymentPayload[];
  orderRoles?: SalesOrderRolePayload[];
  orderStatuses?: SalesOrderStatusPayload[];
  orderAdjustments?: SalesOrderAdjustmentPayload[];

  // Optional metadata for tracking
  metadata?: PayloadMetadata;
}

export interface SalesOrderBatchPayload {
  saleOrders: SalesOrderPayload[];
  metadata?: PayloadMetadata;
}

/**
 * Response from TradeUnleashed after creating sale order
 */
export interface TradeUnleashedSaleOrderResponse {
  id: number;                   // TradeUnleashed order ID
  orderReference: string;
  dateCreated: string;
  status?: string;
  // Add other fields as needed
}

/**
 * Bulk save response
 */
export interface BulkSaveResponse {
  success: boolean;
  data: {
    processed: number;
    succeeded: number;
    failed: number;
    orders: Array<{
      orderReference: string;
      status: 'success' | 'failed';
      tradeUnleashedId?: number;
      error?: string;
    }>;
  };
}
