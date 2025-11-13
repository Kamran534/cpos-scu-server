/**
 * TradeUnleashed Types
 * 
 * TradeUnleashed-specific types from their API
 */

// ============================================
// Configuration
// ============================================

export interface TradeUnleashedConfig {
  baseUrl: string;                    // e.g., 'https://q-prod.tradeunleashed.com'
  username: string;
  password: string;
  tenantId?: string;
  defaultFacilityId?: string;         // Default facility ID for inventory queries
}

// ============================================
// Authentication
// ============================================

export interface TradeUnleashedLoginRequest {
  username: string;
  password: string;
}

export interface TradeUnleashedLoginResponse {
  access_token: string;  // Note: TradeUnleashed uses 'access_token' not 'token'
  token?: string;         // Keeping for backward compatibility
  refresh_token?: string;
  refreshToken?: string;
  expires_in?: number;
  expiresIn?: number;
  user?: {
    id: string | number;
    username: string;
    email?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  organization?: unknown;
  pos?: unknown[];
  userName?: string;
}

// ============================================
// Inventory/Stock Types
// ============================================

export interface TradeUnleashedStockQueryParams {
  facilityIds?: string;               // comma-separated facility IDs
  fromDate?: string;                  // ISO date string
  toDate?: string;                    // ISO date string
  max?: number;                       // page size
  offset?: number;                    // pagination offset
  orderBy?: string;                   // e.g., 'id,DESC'
}

export interface TradeUnleashedStockItem {
  // Actual fields from TradeUnleashed API
  id: string | number;
  name: string;                   // Product name
  sku: string;
  barCode?: string;               // Note: API uses camelCase
  productId?: string | number;
  onhand: number;                 // Quantity on hand
  committed?: number;             // Reserved/committed quantity
  incoming?: number;              // Incoming quantity
  continueSelling?: boolean;
  imageUrl?: string;
  
  // Legacy field names (for backward compatibility)
  productName?: string;
  productDescription?: string;
  facilityId?: string;
  facilityName?: string;
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  unitCost?: number;
  totalValue?: number;
  lastUpdated?: string;
  categoryName?: string;
  brandName?: string;
  supplierName?: string;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  
  // Additional fields that might come from TradeUnleashed
  [key: string]: any;
}

export interface TradeUnleashedStockQueryResponse {
  data: TradeUnleashedStockItem[];
  total: number;
  offset: number;
  max: number;
  hasMore?: boolean;
}

// ============================================
// Product Types
// ============================================

export interface TradeUnleashedProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  supplier?: string;
  isActive: boolean;
  price?: number;
  cost?: number;
  barcode?: string;
  weight?: number;
  weightUnit?: string;
  createdAt?: string;
  updatedAt?: string;
  
  [key: string]: any;
}

// ============================================
// Order Types (for future use)
// ============================================

export interface TradeUnleashedOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  lineItems: TradeUnleashedOrderLineItem[];
  
  [key: string]: any;
}

export interface TradeUnleashedOrderLineItem {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  
  [key: string]: any;
}

// ============================================
// API Response Wrapper
// ============================================

export interface TradeUnleashedApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

