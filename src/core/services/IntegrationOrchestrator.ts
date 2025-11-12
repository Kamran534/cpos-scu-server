/**
 * Integration Orchestrator
 * 
 * Generic layer service that works with ANY integration through IIntegrationService interface
 * Does NOT know about TradeUnleashed, Shopify, or any specific integration
 * Only knows about the interface contract
 */

import { PrismaClient } from '@prisma/client';
import { IIntegrationService, ISyncOptions, ISyncResult } from '../interfaces/IIntegrationService';
import { ProductPayloadProcessor } from '../processors/ProductPayloadProcessor';

export class IntegrationOrchestrator {
  private integration: IIntegrationService; // Only knows about interface!
  private productProcessor: ProductPayloadProcessor;

  constructor(integration: IIntegrationService, prisma: PrismaClient) {
    this.integration = integration; // Can be ANY integration that implements interface
    this.productProcessor = new ProductPayloadProcessor(prisma);
  }

  /**
   * Initialize the integration
   */
  async initialize(): Promise<void> {
    console.log(`[Orchestrator] Initializing ${this.integration.name} integration...`);
    await this.integration.initialize();
    console.log(`[Orchestrator] ${this.integration.name} initialized successfully`);
  }

  /**
   * Sync products from integration to database
   * Works with ANY integration through interface
   */
  async syncProducts(options?: ISyncOptions): Promise<ISyncResult> {
    const startTime = Date.now();

    try {
      console.log(`[Orchestrator] Syncing products from ${this.integration.name}...`);

      // STEP 1: Integration layer builds payloads (through interface)
      const batchPayload = await this.integration.syncProducts(options);

      console.log(`[Orchestrator] Received ${batchPayload.products.length} products from ${this.integration.name}`);
      
      if (batchPayload.products.length === 0) {
        console.warn(`[Orchestrator] ⚠️ No products received from ${this.integration.name}. Check API credentials and connection.`);
      }

      // STEP 2: Generic layer processes payloads
      const result = await this.productProcessor.processBatch(batchPayload);

      interface ProcessorError {
        sku?: string;
        error?: string;
        validationErrors?: unknown[];
        location?: string;
      }

      const data = result.data as {
        products: { success: number; failed: number; errors: ProcessorError[] };
        variants: { success: number; failed: number; errors: ProcessorError[] };
        inventory: { success: number; failed: number; errors: ProcessorError[] };
      };

      // Log detailed errors
      if (data.products.errors.length > 0) {
        console.error(`[Orchestrator] Product errors:`, JSON.stringify(data.products.errors, null, 2));
      }
      if (data.variants.errors.length > 0) {
        console.error(`[Orchestrator] Variant errors:`, JSON.stringify(data.variants.errors, null, 2));
      }
      if (data.inventory.errors.length > 0) {
        console.error(`[Orchestrator] Inventory errors:`, JSON.stringify(data.inventory.errors, null, 2));
      }

      // Flatten errors
      const allErrors = [
        ...data.products.errors.map((e: ProcessorError) => ({ message: `Product error: ${e.error || 'Unknown'}`, sku: e.sku })),
        ...data.variants.errors.map((e: ProcessorError) => ({ message: `Variant error: ${e.error || 'Unknown'}`, sku: e.sku })),
        ...data.inventory.errors.map((e: ProcessorError) => ({ message: `Inventory error: ${e.error || 'Unknown'}`, location: e.location })),
      ];

      return {
        success: result.success,
        resourceType: 'products',
        created: data.products.success + data.variants.success + data.inventory.success,
        updated: 0,
        deleted: 0,
        errors: allErrors,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Orchestrator] ✗ Product sync failed:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[Orchestrator] Stack trace:`, error.stack);
      }
      
      return {
        success: false,
        resourceType: 'products',
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [{
          message: errorMessage,
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync orders from integration to database
   */
  async syncOrders(options?: ISyncOptions): Promise<ISyncResult> {
    const startTime = Date.now();

    try {
      console.log(`[Orchestrator] Syncing orders from ${this.integration.name}...`);

      // Integration layer builds payloads (through interface)
      const batchPayload = await this.integration.syncOrders(options);

      console.log(`[Orchestrator] Received ${batchPayload.orders.length} orders from ${this.integration.name}`);

      // TODO: Process orders through generic layer
      // const result = await orderProcessor.processBatch(batchPayload);

      return {
        success: true,
        resourceType: 'orders',
        created: batchPayload.orders.length,
        updated: 0,
        deleted: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        resourceType: 'orders',
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync customers from integration to database
   */
  async syncCustomers(options?: ISyncOptions): Promise<ISyncResult> {
    const startTime = Date.now();

    try {
      console.log(`[Orchestrator] Syncing customers from ${this.integration.name}...`);

      // Integration layer builds payloads (through interface)
      const batchPayload = await this.integration.syncCustomers(options);

      console.log(`[Orchestrator] Received ${batchPayload.customers.length} customers from ${this.integration.name}`);

      // TODO: Process customers through generic layer
      // const result = await customerProcessor.processBatch(batchPayload);

      return {
        success: true,
        resourceType: 'customers',
        created: batchPayload.customers.length,
        updated: 0,
        deleted: 0,
        errors: [],
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        resourceType: 'customers',
        created: 0,
        updated: 0,
        deleted: 0,
        errors: [{
          message: error instanceof Error ? error.message : String(error),
        }],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    return await this.integration.testConnection();
  }

  /**
   * Get integration name
   */
  getIntegrationName(): string {
    return this.integration.name;
  }

  /**
   * Disconnect
   */
  async disconnect(): Promise<void> {
    await this.integration.disconnect();
  }
}

