/**
 * TradeUnleashed Product Service
 * 
 * Fetches products/inventory from TradeUnleashed
 * Builds ProductPayload and passes to generic layer
 * NO DB access, NO business logic
 */

import { TradeUnleashedClient } from '../api/TradeUnleashedClient.js';
import { TradeUnleashedConfig, TradeUnleashedStockQueryParams } from '../types.js';
import { 
  ProductPayload, 
  ProductVariantPayload, 
  InventoryItemPayload,
  ProductBatchPayload 
} from '../../../payloads/index.js';
import { normalizeStockItems, NormalizedStockItem } from '../mappers/index.js';

export class TradeUnleashedProductService {
  private client: TradeUnleashedClient;
  private config: TradeUnleashedConfig;

  constructor(config: TradeUnleashedConfig, client?: TradeUnleashedClient) {
    this.config = config;
    // Use provided client or create new one (for backwards compatibility)
    this.client = client || new TradeUnleashedClient(config);
  }

  /**
   * Sync inventory/stock from TradeUnleashed
   * Returns batch payload ready for generic layer
   */
  async syncInventory(params?: {
    facilityIds?: string[];
    fromDate?: Date;
    max?: number;
    offset?: number;
  }): Promise<ProductBatchPayload & { itemsReturned: number }> {
    // TradeUnleashed requires fromDate - default to 30 days ago if not provided
    const defaultFromDate = new Date();
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    const fromDate = params?.fromDate || defaultFromDate;

    const facilityResolution = this.resolveFacilityIds(params?.facilityIds);

    // Build API params
    const apiParams: TradeUnleashedStockQueryParams = {
      facilityIds: facilityResolution.value,
      fromDate: fromDate.toISOString(),
      max: params?.max || 300,
      offset: params?.offset || 0,
      orderBy: 'id,DESC',
    };

    // Fetch from TradeUnleashed
    const response = await this.client.queryStock(apiParams);

    // NORMALIZE: Transform raw API data using POJO mapper
    const facilityId = params?.facilityIds?.[0]; // Use first facility ID if provided
    const normalizedItems = normalizeStockItems(response.data, facilityId);

    // console.log(`[TradeUnleashedProductService] Normalized ${normalizedItems.length} items from TradeUnleashed API`);

    // Build payloads from normalized items
    const products: ProductPayload[] = [];
    const variants: ProductVariantPayload[] = [];
    const inventory: InventoryItemPayload[] = [];
    const processedProducts = new Set<string>(); // Track by productId
    const processedVariants = new Set<string>(); // Track by item.id (variant ID)

    for (const item of normalizedItems) {
      // Build product payload (one per unique productId)
      // If productId is not available, treat each item as a separate product
      const productKey = item.productId || item.id;
      if (!processedProducts.has(productKey)) {
        products.push(this.buildProductPayload(item));
        processedProducts.add(productKey);
      }

      // Build variant payload (one per unique item/variant)
      // Each inventory item represents a variant
      if (!processedVariants.has(item.id)) {
        variants.push(this.buildVariantPayload(item));
        processedVariants.add(item.id);
      }

      // Build inventory payload (one per item per facility)
      inventory.push(this.buildInventoryPayload(item));
    }

    // Return batch payload with itemsReturned count for pagination
    return {
      products,
      variants,
      inventory,
      itemsReturned: normalizedItems.length, // Actual number of stock items returned from API
      metadata: {
        batchId: `TU-${Date.now()}`,
        syncType: params?.fromDate ? 'incremental' : 'full',
        fromDate: fromDate.toISOString(),
      },
    };
  }

  /**
   * Sync with pagination (fetch all pages)
   */
  async syncAllInventory(params?: {
    facilityIds?: string[];
    fromDate?: Date;
    batchSize?: number;
  }): Promise<ProductBatchPayload> {
    const allProducts: ProductPayload[] = [];
    const allVariants: ProductVariantPayload[] = [];
    const allInventory: InventoryItemPayload[] = [];

    let offset = 0;
    const batchSize = params?.batchSize || 300;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.syncInventory({
        facilityIds: params?.facilityIds,
        fromDate: params?.fromDate,
        max: batchSize,
        offset,
      });

      allProducts.push(...batch.products);
      allVariants.push(...(batch.variants || []));
      allInventory.push(...(batch.inventory || []));

      // Check if there are more pages
      // Use itemsReturned (actual stock items from API) for pagination check
      // Multiple stock items can share the same product/SKU, so products.length may be less than itemsReturned
      const itemsReturned = batch.itemsReturned || 0;
      hasMore = itemsReturned === batchSize;
      offset += batchSize;

      // console.log(
      //   `[TradeUnleashedProductService] Pagination: offset=${offset}, itemsReturned=${itemsReturned}, products=${batch.products.length}, variants=${batch.variants?.length || 0}, inventory=${batch.inventory?.length || 0}, hasMore=${hasMore}`
      // );

      // Safety limit to prevent infinite loops
      if (offset >= 10000) {
        // console.warn('TradeUnleashed sync: Reached safety limit of 10000 records');
        break;
      }
    }

    // Deduplicate products and variants by SKU
    // (same product/variant can appear across multiple pages)
    const uniqueProducts = this.deduplicateBySku(allProducts);
    const uniqueVariants = this.deduplicateVariantsBySku(allVariants);

    // console.log(
    //   `[TradeUnleashedProductService] Total: ${allProducts.length} products (${uniqueProducts.length} unique), ${allVariants.length} variants (${uniqueVariants.length} unique), ${allInventory.length} inventory`
    // );

    return {
      products: uniqueProducts,
      variants: uniqueVariants,
      inventory: allInventory,
      metadata: {
        batchId: `TU-ALL-${Date.now()}`,
        syncType: params?.fromDate ? 'incremental' : 'full',
      },
    };
  }

  /**
   * Build ProductPayload from normalized stock item
   * Now uses the POJO layer for consistent field access
   */
  private buildProductPayload(item: NormalizedStockItem): ProductPayload {
    // Use productId as sourceId if available (represents the parent product)
    // Otherwise use the item's own ID
    const sourceId = item.productId || item.id;

    // For product SKU, use productId directly (no prefix)
    // If no productId, use the item's SKU
    const productSku = item.productId ? String(item.productId) : item.sku;

    return {
      sourceSystem: 'tradeunleashed',
      sourceId: sourceId, // TradeUnleashed productId or item.id if no productId
      timestamp: new Date(),
      sku: productSku,
      name: item.name,
      description: item.description,
      categoryName: item.categoryName,
      brandName: item.brandName,
      supplierName: item.supplierName,
      isActive: item.isActive,
      tags: [],
      customFields: {
        // CRITICAL: Store TradeUnleashed productId for sales order API mapping
        externalId: sourceId, // productId or item.id - THIS IS WHAT HQ NEEDS
        externalSystem: 'tradeunleashed',
        tradeUnleashedProductId: item.productId, // The productId from API
        tradeUnleashedItemId: item.id, // The item/variant ID from API (represents a variant)
        imageUrl: item.imageUrl,
        continueSelling: item.continueSelling,
        sourceSystem: 'tradeunleashed',
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Build ProductVariantPayload from normalized stock item
   * Now uses the POJO layer for consistent field access
   */
  private buildVariantPayload(item: NormalizedStockItem): ProductVariantPayload {
    // Product SKU should match what we used in buildProductPayload (no prefix)
    const productSku = item.productId ? String(item.productId) : item.sku;

    return {
      sourceSystem: 'tradeunleashed',
      sourceId: item.id, // TradeUnleashed item/variant ID
      timestamp: new Date(),
      productSku: productSku, // Links to parent product
      variantSku: item.sku, // Each variant has its own SKU
      variantName: item.name,
      price: item.unitCost || 0,
      costPrice: item.unitCost,
      weight: item.weight,
      weightUnit: item.weightUnit,
      barcode: item.barcode,
      trackInventory: true,
      requiresShipping: true,
      isActive: item.isActive,
      customFields: {
        // CRITICAL: Store TradeUnleashed item ID (730467712) for sales order API mapping
        externalId: String(item.id), // MUST send this ID when creating sales orders at HQ
        externalSystem: 'tradeunleashed',
        tradeUnleashedItemId: item.id, // The item ID from stockQuery API
        tradeUnleashedProductId: item.productId, // The parent productId (if available)
        imageUrl: item.imageUrl,
        continueSelling: item.continueSelling,
        barcode: item.barcode,
        sourceSystem: 'tradeunleashed',
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Build InventoryItemPayload from normalized stock item
   * Now uses the POJO layer for consistent field access
   */
  private buildInventoryPayload(item: NormalizedStockItem): InventoryItemPayload {
    return {
      sourceSystem: 'tradeunleashed',
      sourceId: item.id,
      timestamp: new Date(),
      variantSku: item.sku,
      locationCode: item.facilityId || 'default',
      locationName: item.facilityName || 'Default Location',
      quantityOnHand: item.quantityOnHand,
      quantityReserved: item.quantityCommitted,
      quantityAvailable: item.quantityAvailable,
      lastCountDate: item.lastUpdated ? new Date(item.lastUpdated) : undefined,
    };
  }

  private resolveFacilityIds(requestedIds?: string[]): { value?: string; source: 'request' | 'login' | 'config' | 'none' } {
    // PRIORITY 1: Use .env config facility ID if set (for product sync)
    if (this.config.defaultFacilityId) {
      // console.log('[TradeUnleashedProductService] Using facilityId from .env config:', this.config.defaultFacilityId);
      return { value: this.config.defaultFacilityId, source: 'config' };
    }

    // PRIORITY 2: Use requested facility IDs (from API params)
    if (requestedIds && requestedIds.length > 0) {
      const joined = requestedIds.join(',');
      // console.log('[TradeUnleashedProductService] Using facilityIds from request:', joined);
      return { value: joined, source: 'request' };
    }

    // PRIORITY 3: Use facility IDs from login response
    const clientFacilities = this.client.getFacilityIds();
    if (clientFacilities.length > 0) {
      const joined = clientFacilities.join(',');
      // console.log('[TradeUnleashedProductService] Using facilityIds from login response:', joined);
      return { value: joined, source: 'login' };
    }

    console.warn('[TradeUnleashedProductService] No facilityIds available (config/request/login); TradeUnleashed defaults may apply.');
    return { value: undefined, source: 'none' };
  }

  /**
   * Get client instance
   */
  getClient(): TradeUnleashedClient {
    return this.client;
  }

  /**
   * Deduplicate products by SKU (keep first occurrence)
   */
  private deduplicateBySku(products: ProductPayload[]): ProductPayload[] {
    const seen = new Set<string>();
    const unique: ProductPayload[] = [];

    for (const product of products) {
      if (!seen.has(product.sku)) {
        seen.add(product.sku);
        unique.push(product);
      }
    }

    return unique;
  }

  /**
   * Deduplicate variants by variant SKU (keep first occurrence)
   */
  private deduplicateVariantsBySku(variants: ProductVariantPayload[]): ProductVariantPayload[] {
    const seen = new Set<string>();
    const unique: ProductVariantPayload[] = [];

    for (const variant of variants) {
      if (!seen.has(variant.variantSku)) {
        seen.add(variant.variantSku);
        unique.push(variant);
      }
    }

    return unique;
  }
}

