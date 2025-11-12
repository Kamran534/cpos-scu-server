/**
 * IIntegrationService Interface
 * 
 * Contract that ALL integration services must implement
 * Generic layer only knows about this interface, not specific implementations
 * 
 * This is the OOP interface pattern - enforces consistency across integrations
 */

import { ProductBatchPayload, OrderBatchPayload, CustomerBatchPayload } from '../../payloads';

export interface ISyncOptions {
  facilityIds?: string[];
  fromDate?: Date;
  toDate?: Date;
  batchSize?: number;
  fullSync?: boolean;
  syncType?: string;
}

export interface ISyncResult {
  success: boolean;
  resourceType: string;
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{
    message: string;
    details?: unknown;
  }>;
  duration?: number;
}

/**
 * Base Integration Service Interface
 * All integrations (TradeUnleashed, Shopify, Square, etc.) must implement this
 */
export interface IIntegrationService {
  /**
   * Integration name (e.g., 'tradeunleashed', 'shopify')
   */
  readonly name: string;

  /**
   * Initialize the integration (login, setup, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Test connection to the integration
   */
  testConnection(): Promise<boolean>;

  /**
   * Sync products - returns ProductBatchPayload
   */
  syncProducts(options?: ISyncOptions): Promise<ProductBatchPayload>;

  /**
   * Sync orders - returns OrderBatchPayload
   */
  syncOrders(options?: ISyncOptions): Promise<OrderBatchPayload>;

  /**
   * Sync customers - returns CustomerBatchPayload
   */
  syncCustomers(options?: ISyncOptions): Promise<CustomerBatchPayload>;

  /**
   * Check if integration is initialized
   */
  isInitialized(): boolean;

  /**
   * Disconnect/cleanup
   */
  disconnect(): Promise<void>;
}

/**
 * Integration Configuration Interface
 * Each integration can extend this with specific config
 */
export interface IIntegrationConfig {
  name: string;
  enabled: boolean;
  credentials: Record<string, unknown>;
}

