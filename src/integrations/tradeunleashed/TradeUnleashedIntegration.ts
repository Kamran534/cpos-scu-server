/**
 * TradeUnleashed Integration Implementation
 * 
 * Implements IIntegrationService interface
 * Generic layer only knows about IIntegrationService, not this specific implementation
 */

import { IIntegrationService, ISyncOptions } from '../../core/interfaces/IIntegrationService';
import { ProductBatchPayload, OrderBatchPayload, CustomerBatchPayload } from '../../payloads';
import { TradeUnleashedConfig } from './types';
import { TradeUnleashedClient } from './api/TradeUnleashedClient';
import { TradeUnleashedProductService } from './services/TradeUnleashedProductService';
import { TradeUnleashedOrderService } from './services/TradeUnleashedOrderService';

export class TradeUnleashedIntegration implements IIntegrationService {
  public readonly name = 'tradeunleashed';
  private client: TradeUnleashedClient;
  private productService: TradeUnleashedProductService;
  private orderService: TradeUnleashedOrderService;
  private initialized = false;

  constructor(config: TradeUnleashedConfig) {
    this.client = new TradeUnleashedClient(config);
    this.productService = new TradeUnleashedProductService(config);
    this.orderService = new TradeUnleashedOrderService(config);
  }

  /**
   * Initialize connection (login)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.client.login();
    this.initialized = true;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.client.testConnection();
    } catch {
      return false;
    }
  }

  /**
   * Sync products - builds ProductBatchPayload
   */
  async syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload> {
    this.ensureInitialized();

    return await this.productService.syncAllInventory({
      facilityIds: options?.facilityIds,
      fromDate: options?.fromDate,
      batchSize: options?.batchSize || 50,
    });
  }

  /**
   * Sync orders - builds OrderBatchPayload
   */
  async syncOrders(options?: ISyncOptions): Promise<OrderBatchPayload> {
    this.ensureInitialized();

    return await this.orderService.syncOrders({
      fromDate: options?.fromDate,
      toDate: options?.toDate,
      max: options?.batchSize || 50,
    });
  }

  /**
   * Sync customers - builds CustomerBatchPayload (placeholder)
   */
  async syncCustomers(): Promise<CustomerBatchPayload> {
    this.ensureInitialized();

    // TODO: Implement when TradeUnleashed provides customer API
    return {
      customers: [],
      metadata: {
        batchId: `TU-CUSTOMERS-${Date.now()}`,
        syncType: 'full',
      },
    };
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Disconnect/cleanup
   */
  async disconnect(): Promise<void> {
    this.initialized = false;
  }

  /**
   * Ensure integration is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('TradeUnleashed integration not initialized. Call initialize() first.');
    }
  }
}

