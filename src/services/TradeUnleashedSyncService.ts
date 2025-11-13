/**
 * TradeUnleashed Sync Service
 * 
 * Orchestrates the complete sync flow:
 * 1. TradeUnleashed integration fetches data and builds payloads
 * 2. Generic layer processor receives payloads and saves to DB
 * 
 * This is the glue that connects integration layer with generic layer
 */

import { PrismaClient } from '@prisma/client';
import { 
  TradeUnleashedProductService,
  TradeUnleashedAuthService,
  TradeUnleashedConfig 
} from '../integrations/tradeunleashed/index.js';
import { ProductPayloadProcessor } from '../core/processors/index.js';
import { ProductBatchPayload } from '../payloads/index.js';

export interface SyncOptions {
  facilityIds?: string[];
  fromDate?: Date;
  batchSize?: number;
  fullSync?: boolean;
}

export interface SyncResult {
  success: boolean;
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  inventoryCreated: number;
  inventoryUpdated: number;
  errors: Array<{
    type: 'product' | 'variant' | 'inventory';
    sku?: string;
    error: string;
  }>;
  duration: number;
  timestamp: Date;
}

export class TradeUnleashedSyncService {
  private config: TradeUnleashedConfig;
  private authService: TradeUnleashedAuthService;
  private productService: TradeUnleashedProductService;
  private payloadProcessor: ProductPayloadProcessor;

  constructor(config: TradeUnleashedConfig, prisma: PrismaClient) {
    this.config = config;
    
    // Initialize integration services (builds payloads)
    this.authService = new TradeUnleashedAuthService(config);
    this.productService = new TradeUnleashedProductService(config);
    
    // Initialize generic layer processor (processes payloads)
    this.payloadProcessor = new ProductPayloadProcessor(prisma);
  }

  /**
   * Initialize connection to TradeUnleashed
   */
  async initialize(): Promise<boolean> {
    console.log('[TradeUnleashedSync] Initializing connection...');
    
    const loginResult = await this.authService.login();
    if (!loginResult.success) {
      console.error('[TradeUnleashedSync] Login failed:', loginResult.error);
      return false;
    }

    console.log('[TradeUnleashedSync] ✓ Connected successfully');
    return true;
  }

  /**
   * Sync products and inventory from TradeUnleashed
   */
  async syncProducts(options?: SyncOptions): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      productsCreated: 0,
      productsUpdated: 0,
      variantsCreated: 0,
      variantsUpdated: 0,
      inventoryCreated: 0,
      inventoryUpdated: 0,
      errors: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      console.log('[TradeUnleashedSync] Starting product sync...');

      // STEP 1: Integration layer - Fetch from TradeUnleashed and build payloads
      console.log('[TradeUnleashedSync] → Fetching from TradeUnleashed API...');
      const batchPayload: ProductBatchPayload = await this.productService.syncAllInventory({
        facilityIds: options?.facilityIds,
        fromDate: options?.fullSync ? undefined : options?.fromDate,
        batchSize: options?.batchSize || 300,
      });

      console.log(`[TradeUnleashedSync] ✓ Fetched ${batchPayload.products.length} products`);
      console.log(`[TradeUnleashedSync] ✓ Fetched ${batchPayload.variants?.length || 0} variants`);
      console.log(`[TradeUnleashedSync] ✓ Fetched ${batchPayload.inventory?.length || 0} inventory items`);

      // STEP 2: Generic layer - Process payloads and save to DB
      console.log('[TradeUnleashedSync] → Processing payloads and saving to DB...');
      const processResult = await this.payloadProcessor.processBatch(batchPayload);

      if (processResult.success) {
        console.log('[TradeUnleashedSync] ✓ All payloads processed successfully');
      } else {
        console.warn('[TradeUnleashedSync] ⚠ Some payloads failed to process');
      }

      // Extract results
      const data = processResult.data as any;
      result.productsCreated = data.products.success;
      result.variantsCreated = data.variants.success;
      result.inventoryCreated = data.inventory.success;

      // Collect errors
      if (data.products.errors.length > 0) {
        data.products.errors.forEach((err: any) => {
          result.errors.push({
            type: 'product',
            sku: err.sku,
            error: err.error || 'Unknown error',
          });
        });
      }

      if (data.variants.errors.length > 0) {
        data.variants.errors.forEach((err: any) => {
          result.errors.push({
            type: 'variant',
            sku: err.sku,
            error: err.error || 'Unknown error',
          });
        });
      }

      if (data.inventory.errors.length > 0) {
        data.inventory.errors.forEach((err: any) => {
          result.errors.push({
            type: 'inventory',
            sku: err.sku,
            error: err.error || 'Unknown error',
          });
        });
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // Log summary
      console.log('[TradeUnleashedSync] ═══════════════════════════════════');
      console.log('[TradeUnleashedSync] Sync Summary:');
      console.log(`[TradeUnleashedSync]   Products: ${result.productsCreated} created`);
      console.log(`[TradeUnleashedSync]   Variants: ${result.variantsCreated} created`);
      console.log(`[TradeUnleashedSync]   Inventory: ${result.inventoryCreated} created`);
      console.log(`[TradeUnleashedSync]   Errors: ${result.errors.length}`);
      console.log(`[TradeUnleashedSync]   Duration: ${result.duration}ms`);
      console.log('[TradeUnleashedSync] ═══════════════════════════════════');

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        type: 'product',
        error: error instanceof Error ? error.message : String(error),
      });
      result.duration = Date.now() - startTime;

      console.error('[TradeUnleashedSync] ✗ Sync failed:', error);
      return result;
    }
  }

  /**
   * Test connection to TradeUnleashed
   */
  async testConnection(): Promise<boolean> {
    return await this.authService.testConnection();
  }

  /**
   * Get sync status/info
   */
  getInfo(): {
    integration: string;
    baseUrl: string;
    username: string;
  } {
    return {
      integration: 'TradeUnleashed',
      baseUrl: this.config.baseUrl,
      username: this.config.username,
    };
  }
}

