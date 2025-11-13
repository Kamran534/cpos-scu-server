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

  constructor(config: TradeUnleashedConfig) {
    this.config = config;
    this.client = new TradeUnleashedClient(config);
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
  }): Promise<ProductBatchPayload> {
    // TradeUnleashed requires fromDate - default to 30 days ago if not provided
    const defaultFromDate = new Date();
    defaultFromDate.setDate(defaultFromDate.getDate() - 30);
    const fromDate = params?.fromDate || defaultFromDate;

    // Use provided facilityIds or default from config
    const facilityIds = params?.facilityIds?.join(',') || this.config.defaultFacilityId;

    // Build API params
    const apiParams: TradeUnleashedStockQueryParams = {
      facilityIds: facilityIds,
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

    console.log(`[TradeUnleashedProductService] Normalized ${normalizedItems.length} items from TradeUnleashed API`);

    // Build payloads from normalized items
    const products: ProductPayload[] = [];
    const variants: ProductVariantPayload[] = [];
    const inventory: InventoryItemPayload[] = [];
    const processedProducts = new Set<string>();

    for (const item of normalizedItems) {
      // Build product payload (one per unique SKU)
      if (!processedProducts.has(item.sku)) {
        products.push(this.buildProductPayload(item));
        processedProducts.add(item.sku);

        // Build variant payload
        variants.push(this.buildVariantPayload(item));
      }

      // Build inventory payload (one per SKU per facility)
      inventory.push(this.buildInventoryPayload(item));
    }

    // Return batch payload
    return {
      products,
      variants,
      inventory,
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
      hasMore = batch.products.length === batchSize;
      offset += batchSize;

      // Safety limit to prevent infinite loops
      if (offset >= 10000) {
        console.warn('TradeUnleashed sync: Reached safety limit of 10000 records');
        break;
      }
    }

    return {
      products: allProducts,
      variants: allVariants,
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
    return {
      sourceSystem: 'tradeunleashed',
      sourceId: item.id,
      timestamp: new Date(),
      sku: item.sku,
      name: item.name,
      description: item.description,
      categoryName: item.categoryName,
      brandName: item.brandName,
      supplierName: item.supplierName,
      isActive: item.isActive,
      tags: [],
      customFields: {
        tradeUnleashedId: item.id,
        productId: item.productId,
        imageUrl: item.imageUrl,
        continueSelling: item.continueSelling,
      },
    };
  }

  /**
   * Build ProductVariantPayload from normalized stock item
   * Now uses the POJO layer for consistent field access
   */
  private buildVariantPayload(item: NormalizedStockItem): ProductVariantPayload {
    return {
      sourceSystem: 'tradeunleashed',
      sourceId: item.id,
      timestamp: new Date(),
      productSku: item.sku,
      variantSku: item.sku, // TradeUnleashed doesn't have separate variant SKUs
      variantName: item.name,
      price: item.unitCost || 0,
      costPrice: item.unitCost,
      weight: item.weight,
      weightUnit: item.weightUnit,
      barcode: item.barcode,
      trackInventory: true,
      requiresShipping: true,
      isActive: item.isActive,
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

  /**
   * Get client instance
   */
  getClient(): TradeUnleashedClient {
    return this.client;
  }
}

