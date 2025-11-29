/**
 * TradeUnleashed Stock Item Mapper (POJO Layer)
 * 
 * This layer normalizes the raw TradeUnleashed API response into our internal format.
 * If TradeUnleashed changes their API, we only need to update this mapper.
 * 
 * Purpose:
 * - Isolate external API structure from internal data structure
 * - Provide clear field mapping documentation
 * - Handle missing/optional fields gracefully
 * - Convert data types as needed
 */

/**
 * Raw API Response from TradeUnleashed stockQuery endpoint
 * This is exactly what comes from the API (no assumptions)
 */
export interface RawStockItem {
  id: string | number;
  name: string;
  sku: string | null;
  barCode?: string | null;
  productId?: string | number;
  onhand: number;
  committed?: number;
  incoming?: number;
  continueSelling?: boolean;
  imageUrl?: string | null;

  // Allow any other fields that might come from API
  [key: string]: unknown;
}

/**
 * Normalized Stock Item (our internal standardized format)
 * This is what our application uses internally
 */
export interface NormalizedStockItem {
  // Identity
  id: string;
  sku: string;
  productId?: string;
  
  // Product Info
  name: string;
  description?: string;
  barcode?: string;
  imageUrl?: string;
  
  // Inventory Quantities
  quantityOnHand: number;
  quantityCommitted: number;
  quantityAvailable: number;
  quantityIncoming: number;
  
  // Location (if available)
  facilityId?: string;
  facilityName?: string;
  
  // Product Attributes (if available)
  categoryName?: string;
  brandName?: string;
  supplierName?: string;
  unitCost?: number;
  weight?: number;
  weightUnit?: string;
  
  // Flags
  isActive: boolean;
  continueSelling: boolean;
  
  // Metadata
  lastUpdated?: string;
  rawData: RawStockItem; // Keep original for debugging
}

/**
 * StockItemMapper - Transforms raw API data to normalized format
 */
export class StockItemMapper {
  /**
   * Map a single raw stock item to normalized format
   */
  static toNormalized(raw: RawStockItem, facilityId?: string): NormalizedStockItem {
    // Calculate available quantity (onhand - committed)
    const onhand = raw.onhand || 0;
    const committed = raw.committed || 0;
    const available = Math.max(0, onhand - committed); // Can't be negative

    // Generate SKU: use sku field, fallback to barCode, then generate from ID
    const sku = raw.sku || raw.barCode || `TU-${raw.id}`;

    return {
      // Identity - Ensure all IDs are strings
      id: String(raw.id),
      sku: sku,
      productId: raw.productId ? String(raw.productId) : undefined,
      
      // Product Info
      name: raw.name,
      description: undefined, // Not provided by stock query API
      barcode: raw.barCode ?? undefined, // Note: API uses camelCase 'barCode'
      imageUrl: raw.imageUrl ?? undefined,
      
      // Inventory Quantities
      quantityOnHand: onhand,
      quantityCommitted: committed,
      quantityAvailable: available,
      quantityIncoming: raw.incoming || 0,
      
      // Location - Stock query doesn't return facility info
      // We inject it from the query parameters
      facilityId: facilityId,
      facilityName: undefined, // Not provided by stock query API
      
      // Product Attributes - Not provided by stock query API
      categoryName: undefined,
      brandName: undefined,
      supplierName: undefined,
      unitCost: undefined,
      weight: undefined,
      weightUnit: undefined,
      
      // Flags
      isActive: true, // Assume active if returned by API
      continueSelling: raw.continueSelling ?? true,
      
      // Metadata
      lastUpdated: undefined, // Not provided by stock query API
      rawData: raw, // Keep original for debugging/future use
    };
  }
  
  /**
   * Map multiple raw stock items to normalized format
   */
  static toNormalizedArray(
    rawItems: RawStockItem[], 
    facilityId?: string
  ): NormalizedStockItem[] {
    return rawItems.map(item => this.toNormalized(item, facilityId));
  }
  
  /**
   * Extract unique SKUs from raw items
   */
  static extractUniqueSKUs(rawItems: RawStockItem[]): string[] {
    return [...new Set(rawItems.map(item => item.sku).filter((sku): sku is string => sku !== null))];
  }
  
  /**
   * Group normalized items by SKU
   */
  static groupBySKU(items: NormalizedStockItem[]): Map<string, NormalizedStockItem[]> {
    const grouped = new Map<string, NormalizedStockItem[]>();
    
    for (const item of items) {
      const existing = grouped.get(item.sku) || [];
      existing.push(item);
      grouped.set(item.sku, existing);
    }
    
    return grouped;
  }
  
  /**
   * Validate that a raw item has required fields
   * SKU can be null - we'll generate it from barCode or ID
   */
  static isValid(raw: unknown): raw is RawStockItem {
    if (!raw || typeof raw !== 'object') {
      return false;
    }
    const item = raw as Record<string, unknown>;
    return (
      (typeof item.id === 'string' || typeof item.id === 'number') &&
      typeof item.name === 'string' &&
      (typeof item.sku === 'string' || item.sku === null) &&
      typeof item.onhand === 'number'
    );
  }
  
  /**
   * Filter out invalid items and log warnings
   */
  static validateAndFilter(rawItems: unknown[]): RawStockItem[] {
    const valid: RawStockItem[] = [];
    
    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      if (this.isValid(item)) {
        valid.push(item);
      } else {
        console.warn(
          `[StockItemMapper] Invalid item at index ${i}:`,
          JSON.stringify(item)
        );
      }
    }
    
    return valid;
  }
}

/**
 * Helper function for quick transformation
 */
export function normalizeStockItems(
  rawItems: RawStockItem[],
  facilityId?: string
): NormalizedStockItem[] {
  // Validate and filter
  const validItems = StockItemMapper.validateAndFilter(rawItems);
  
  // Transform to normalized format
  return StockItemMapper.toNormalizedArray(validItems, facilityId);
}

