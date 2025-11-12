/**
 * Order Payload
 * 
 * Common language for order data between integration layer and generic layer
 */

import { BasePayload, PayloadMetadata } from './base.payload';

export interface OrderPayload extends BasePayload {
  // Order identification
  orderNumber: string;
  
  // Customer
  customerCode?: string;
  customerEmail?: string;
  
  // Location
  locationCode: string;
  
  // Order details
  lineItems: OrderLineItemPayload[];
  
  // Financial
  subtotalAmount: number;
  taxAmount: number;
  discountAmount: number;
  shippingAmount?: number;
  totalAmount: number;
  
  // Status
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'partially_paid' | 'refunded';
  fulfillmentStatus?: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled';
  
  // Dates
  orderDate: Date;
  
  // Additional info
  notes?: string;
  currency?: string;
  
  // Optional metadata
  metadata?: PayloadMetadata;
}

export interface OrderLineItemPayload {
  // Product reference
  variantSku: string;
  productName: string;
  
  // Quantity and pricing
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  
  // Tax and discount
  taxAmount?: number;
  discountAmount?: number;
  
  // Additional info
  notes?: string;
}

export interface OrderBatchPayload {
  orders: OrderPayload[];
  metadata?: PayloadMetadata;
}

