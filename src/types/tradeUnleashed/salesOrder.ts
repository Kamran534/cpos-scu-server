/**
 * Sales Order payload types for TradeUnleashed integration
 */

export interface SalesOrderLinePayload {
  id: number;
  productId: number; // TradeUnleashed product ID
  quantity: number;
  unitPrice?: number;
  discount?: number;
  taxAmount?: number;
  lineTotal?: number;
}

export interface SalesOrderPayload {
  id: number; // TradeUnleashed sales order ID
  orderNumber: string;
  customerId: number; // TradeUnleashed customer ID
  orderDate?: string;
  status?: string;
  totalAmount?: number;
  lastModifiedOn?: string;
  lines?: SalesOrderLinePayload[];
}

export interface BulkSaveSalesOrderRequest {
  storeId: number;
  orders: SalesOrderPayload[];
}

export interface SaveSalesOrderRequest {
  storeId: number;
  order: SalesOrderPayload;
}
