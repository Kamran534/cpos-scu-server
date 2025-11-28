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
    person?: {
      id?: number | string;
      name?: string;
      facilityRoles?: Array<TradeUnleashedFacilityRole>;
    };
  };
  organization?: unknown;
  pos?: unknown[];
  userName?: string;
  person?: {
    id?: number | string;
    name?: string;
    facilityRoles?: Array<TradeUnleashedFacilityRole>;
  };
}

export interface TradeUnleashedPosSession {
  id: number;
  sessionReference: string;
  startTime?: string | null;
  endTime?: string | null;
  startingCash?: number | null;
  actualAmount?: number | null;
  posId?: number | string;
  pos?: {
    id?: number | string;
    name?: string;
    showOrderCreatedDate?: boolean;
    allowCreditSales?: boolean;
    allowEditingSalePrices?: boolean;
    productWriteAccess?: boolean;
    stockPurchaseAccess?: boolean;
    facility?: {
      id?: number | string;
      name?: string;
    };
    priceList?: { id?: number | string };
    salePriceList?: { id?: number | string };
    [key: string]: unknown;
  } | null;
  user?: {
    id?: number | string;
    username?: string;
  } | null;
  [key: string]: unknown;
}

export interface TradeUnleashedSaleType {
  id: number | string;
  name: string;
  code?: string | null;
  priceListType?: string | null;
  description?: string | null;
  isDefault?: boolean | null;
  [key: string]: unknown;
}

export interface TradeUnleashedOrderAdjustmentType {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface TradeUnleashedOrderRoleType {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface TradeUnleashedOrderStatusType {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface TradeUnleashedInvoiceItemType {
  id: number | string;
  name: string;
  description?: string | null;
  properties?: {
    name?: string;
    description?: string | null;
    [key: string]: unknown;
  } | null;
  attached?: boolean;
  dirty?: boolean;
  dirtyPropertyNames?: string[];
  errors?: unknown;
  version?: number;
  [key: string]: unknown;
}

export interface TradeUnleashedPaymentType {
  id: number | string;
  name: string;
  description?: string | null;
  [key: string]: unknown;
}

export interface TradeUnleashedPaymentMethod {
  id: number | string;
  name: string;
  description?: string | null;
  paymentMethodType?: string | null;
  accountRef?: {
    id?: number | string;
    name?: string;
    code?: string | null;
    description?: string | null;
    openingBalance?: number | null;
    openingBalanceDate?: string | null;
    fromDate?: string | null;
    thruDate?: string | null;
    accountType?: {
      id?: number | string;
      name?: string;
      description?: string | null;
    } | null;
    accountDetailType?: {
      id?: number | string;
      name?: string;
      description?: string | null;
    } | null;
    parentGeneralLedgerAccount?: unknown;
    defaultAccountFor?: unknown;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface TradeUnleashedContactMechanismType {
  id: number | string;
  name: string;
  description?: string | null;
  [key: string]: unknown;
}

export interface TradeUnleashedPartyRoleType {
  id: number | string;
  name: string;
  [key: string]: unknown;
}

export interface TradeUnleashedPartyRelationshipType {
  id: number | string;
  name: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
}

export interface TradeUnleashedStockQueryResponse {
  data: TradeUnleashedStockItem[];
  total: number;
  offset: number;
  max: number;
  hasMore?: boolean;
}

// ============================================
// Organization Account Settings
// ============================================

export interface TradeUnleashedOrgAccountSetting {
  id: number;
  enableSerializedInventory?: boolean;
  enableGroupedProducts?: boolean;
  scanBundleItems?: boolean;
  generateBarcodeByName?: boolean;
  generateBarcodeBySeries?: boolean;
  generateSkuByName?: boolean;
  generateSkuBySeries?: boolean;
  barcodePrefix?: string | null;
  skuPrefix?: string | null;
  startingSeqNum?: number | null;
  attrCharLength?: number | null;
  keepSellingOnOutOfStock?: boolean;
  continueTransferOnOutOfStock?: boolean;
  printSkuOnDocuments?: boolean | null;
  printBarcodeOnDocuments?: boolean | null;
  verifyItemsBeforeFulfill?: boolean | null;
  barcodeLabelWidth?: number | null;
  barcodeLabelHeight?: number | null;
  barcodeWidth?: number | null;
  barcodeHeight?: number | null;
  barcodeLabelLeftPadding?: number | null;
  barcodeLabelGap?: number | null;
  printProductName?: boolean;
  printVariantName?: boolean;
  printRetailPrice?: boolean;
  printSKU?: boolean;
  printProductAttributes?: boolean;
  barcodeLabelColumns?: number | null;
  multipelUoms?: boolean | null;
  taxInclusive?: boolean;
  gst?: string | null;
  fbrPCTCode?: string | null;
  enableCustomOrderStages?: boolean | null;
  maxDiscountForReturn?: number | null;
  paymentDueAlert?: boolean | null;
  lastPaymentAlert?: boolean | null;
  lockAccount?: boolean;
  autoOrderDiscount?: number | null;
  enableMto?: boolean | null;
  maxAllowedRefund?: number | null;
  courierServiceSelection?: boolean;
  currencyCode?: string | null;
  organizationContent?: string | null;
  printPackingList?: boolean;
  isMultiVendor?: boolean | null;
  vendorName?: string | null;
  pickListSmall?: boolean | null;
  useMtoImages?: boolean | null;
  askForCustomer?: boolean | null;
  askForSalesPerson?: boolean | null;
  enablePosOrderSeq?: boolean;
  enablePurchaseOrderTypes?: boolean | null;
  maxSubOrders?: number | null;
  softAdjustmentOpeningDate?: string | null;
  compactShippingLabel?: boolean;
  enablePickerAssignment?: boolean | null;
  enableSaleOrderAssignment?: boolean | null;
  saleOrderReAssignment?: boolean | null;
  enableAccountCodes?: boolean;
  invoiceControlPaymentAccount?: {
    id?: number | null;
    name?: string | null;
  } | null;
  defaultPriceList?: string | null;
  shippingLabelDocument?: {
    id?: number | null;
    description?: boolean | null;
    productName?: boolean | null;
    productSku?: boolean | null;
    remarks?: boolean | null;
    printBarcode?: boolean | null;
    numOfLabels?: number | null;
    sortLabelBySku?: boolean | null;
    defaultRemarks?: string | null;
  } | null;
  stockAllocationRules?: boolean;
  isDropShippingAccount?: boolean | null;
  enableMultiLocationFulfillment?: boolean;
  applyThreeLevelBuffer?: boolean | null;
  fbrPosFeeOnlineOrders?: number | null;
  isCustomerRequired?: boolean;
  isSalesPersonRequired?: boolean;
  showCustomerSelectionAlert?: boolean;
  disableManualBarcodeEntryInDispatch?: boolean | null;
  manualCompletionInDispatch?: boolean | null;
  syncDraftQuantityToExternalApps?: boolean;
  splitFulfillment?: boolean;
  distanceOptimisedFulfillment?: boolean;
  maxDistanceForFullOrderFulfillment?: number | null;
  useSequenceBarcoding?: boolean;
  duplicateResolutionLimit?: number | null;
  receivePurchaseOrderByGrn?: boolean;
  productionOrderScanning?: boolean;
  useRevisedShippingLabel?: boolean;
  allowManualQtyInScan?: boolean | null;
  autoReplaceErrorCodeInDispatch?: boolean;
  [key: string]: unknown;
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
  
  [key: string]: unknown;
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
  
  [key: string]: unknown;
}

export interface TradeUnleashedOrderLineItem {
  id: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  
  [key: string]: unknown;
}

// ============================================
// API Response Wrapper
// ============================================

export interface TradeUnleashedApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// ============================================
// User Roles
// ============================================

export interface TradeUnleashedUserRole {
  id: number;
  user: {
    id: number;
  };
  role: {
    id: number;
    authority: string;
  };
}

export interface TradeUnleashedFacility {
  id: number | string;
    name?: string;
    facilityType?: {
      id?: number | string;
      name?: string;
      description?: string | null;
    };
    isWarehouse?: boolean | null;
    isFranchise?: boolean | null;
    description?: string | null;
    streetAddress?: string | null;
    locality?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zipCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    paymentMethods?: unknown[];
    cashAccount?: unknown;
    incomeAccount?: unknown;
    cogs?: unknown;
    cogsAccount?: unknown;
    discountGivenAccount?: unknown;
    sync?: unknown;
    [key: string]: unknown;
}

export interface TradeUnleashedFacilityRole {
  id?: number | string;
  facilityId?: number | string;
  partyId?: number | string;
  facilityRoleType?: {
    id?: number | string;
    name?: string;
    description?: string | null;
  };
  facility?: TradeUnleashedFacility | null;
  [key: string]: unknown;
}

export interface TradeUnleashedPartyRole {
  id?: number | string;
  partyId?: number | string;
  party?: {
    id?: number | string;
    name?: string;
    partyType?: {
      id?: number | string;
      name?: string;
    };
    user?: {
      id?: number | string;
      username?: string;
    } | null;
  } | null;
  partyRoleType?: {
    id?: number | string;
    name?: string;
  } | null;
  [key: string]: unknown;
}

