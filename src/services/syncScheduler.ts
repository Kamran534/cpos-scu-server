/**
 * Sync Scheduler
 * 
 * Handles automatic synchronization on the server side
 * - Runs sync every hour automatically (calls integration layer APIs)
 * - Can be triggered manually
 * - Syncs on user login
 */

import cron from 'node-cron';
import { SyncQueueService } from './SyncQueueService.js';
import { orgAccountSettingService } from './orgAccountSettingService.js';
import { tradeUnleashedUserRoleService } from './tradeUnleashedUserRoleService.js';
import { tradeUnleashedFacilityRoleService } from './tradeUnleashedFacilityRoleService.js';
import { tradeUnleashedPartyRoleService } from './tradeUnleashedPartyRoleService.js';
import { posSessionService } from './posSessionService.js';
import { saleTypeService } from './saleTypeService.js';
import { orderAdjustmentTypeService } from './orderAdjustmentTypeService.js';
import { orderRoleTypeService } from './orderRoleTypeService.js';
import { orderStatusTypeService } from './orderStatusTypeService.js';
import { invoiceItemTypeService } from './invoiceItemTypeService.js';
import { paymentTypeService } from './paymentTypeService.js';
import { tradePaymentMethodService } from './tradePaymentMethodService.js';
import { contactMechanismTypeService } from './contactMechanismTypeService.js';
import { partyRoleTypeService } from './partyRoleTypeService.js';
import { partyRelationshipTypeService } from './partyRelationshipTypeService.js';
import { config } from '../config/index.js';

export interface SyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  tablesProcessed: number;
  recordsProcessed: number;
  errors: string[];
}

class SyncScheduler {
  private cronJob: ReturnType<typeof cron.schedule> | null = null;
  private isRunning: boolean = false;
  private lastSyncTime: Date | null = null;
  private syncHistory: SyncResult[] = [];
  private syncQueue: SyncQueueService;

  constructor() {
    this.syncQueue = new SyncQueueService();
  }

  /**
   * Start automatic sync (schedule from environment variable)
   */
  startAutomaticSync(): void {
    if (this.cronJob) {
      console.log('[SyncScheduler] Automatic sync already started');
      return;
    }

    const cronSchedule = config.sync.cronSchedule;

    // Validate cron expression
    if (!cron.validate(cronSchedule)) {
      console.error(`[SyncScheduler] ❌ Invalid cron schedule: "${cronSchedule}"`);
      console.error('[SyncScheduler] Please check SYNC_CRON_SCHEDULE in your .env file');
      return;
    }

    // Run sync based on cron schedule from environment variable
    this.cronJob = cron.schedule(cronSchedule, async () => {
      console.log('[SyncScheduler] ⏰ Running automatic sync...');
      await this.performIntegrationSync();
    });

    console.log(`[SyncScheduler] Automatic sync started (schedule: ${cronSchedule})`);
    console.log('[SyncScheduler] Calls integration APIs to fetch data from platform');
  }

  /**
   * Stop automatic sync
   */
  stopAutomaticSync(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[SyncScheduler] Automatic sync stopped');
    }
  }

  /**
   * Perform integration layer sync
   * Calls platform APIs (TradeUnleashed, etc.) and queues jobs for processing
   */
  async performIntegrationSync(): Promise<void> {
    if (this.isRunning) {
      console.log('[SyncScheduler] ⚠️  Sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = new Date();

    try {
      console.log('[SyncScheduler] 🚀 Starting integration layer sync...');
      console.log('[SyncScheduler] Queuing jobs to fetch data from platform APIs...');

      // Queue product sync job (calls TradeUnleashed API → Worker processes → saves to DB)
      console.log('[SyncScheduler] → Queuing product sync job...');
      const productJob = await this.syncQueue.queueProductSync('tradeunleashed', {
        fullSync: false, // Incremental sync
        fromDate: this.lastSyncTime || new Date(Date.now() - 3600000), // Last sync or 1 hour ago
        batchSize: 100,
      });
      console.log(`[SyncScheduler] ✓ Product sync job queued: ${productJob.jobId}`);

      // Queue order sync job
      console.log('[SyncScheduler] → Queuing order sync job...');
      const orderJob = await this.syncQueue.queueOrderSync('tradeunleashed', {
        fullSync: false,
        fromDate: this.lastSyncTime || new Date(Date.now() - 3600000),
      });
      console.log(`[SyncScheduler] ✓ Order sync job queued: ${orderJob.jobId}`);

      // Queue customer sync job
      console.log('[SyncScheduler] → Queuing customer sync job...');
      const customerJob = await this.syncQueue.queueCustomerSync('tradeunleashed', {
        fullSync: false,
        fromDate: this.lastSyncTime || new Date(Date.now() - 3600000),
      });
      console.log(`[SyncScheduler] ✓ Customer sync job queued: ${customerJob.jobId}`);

      await orgAccountSettingService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Org account settings up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Org account settings synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate org account settings sync:', error);
        });

      await tradeUnleashedUserRoleService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] User roles up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ User roles synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate user roles sync:', error);
        });

      await tradeUnleashedFacilityRoleService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Facility roles up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Facility roles synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate facility roles sync:', error);
        });

      await tradeUnleashedPartyRoleService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Party roles up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Party roles synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate party roles sync:', error);
        });

      await partyRoleTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Party role types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Party role types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate party role types sync:', error);
        });

      await posSessionService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] POS sessions up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ POS sessions synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate POS session sync:', error);
        });

      await saleTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Sale types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Sale types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate sale types sync:', error);
        });

      await orderAdjustmentTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Order adjustment types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Order adjustment types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate order adjustment types sync:', error);
        });

      await orderRoleTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Order role types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Order role types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate order role types sync:', error);
        });

      await orderStatusTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Order status types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Order status types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate order status types sync:', error);
        });

      await invoiceItemTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Invoice item types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Invoice item types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate invoice item types sync:', error);
        });

      await paymentTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Payment types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Payment types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate payment types sync:', error);
        });

      await tradePaymentMethodService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Payment methods up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Payment methods synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate payment methods sync:', error);
        });

      await contactMechanismTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Contact mechanism types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Contact mechanism types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate contact mechanism types sync:', error);
        });

      await partyRelationshipTypeService
        .syncIfNewIds()
        .then((result) => {
          if (result.skipped) {
            console.log('[SyncScheduler] Party relationship types up to date (no new IDs)');
          } else {
            console.log('[SyncScheduler] ✓ Party relationship types synced (empty or new IDs found)');
          }
        })
        .catch((error) => {
          console.error('[SyncScheduler] Failed to evaluate party relationship types sync:', error);
        });

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.lastSyncTime = endTime;

      console.log(`[SyncScheduler] ✅ Integration sync jobs queued successfully (${duration}ms)`);
      console.log(`[SyncScheduler] 📋 Jobs: ${productJob.jobId}, ${orderJob.jobId}, ${customerJob.jobId}`);
      console.log(`[SyncScheduler] ⏳ Jobs will be processed by SyncWorker in background`);
    } catch (error) {
      console.error('[SyncScheduler] ❌ Failed to queue integration sync jobs:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Trigger manual integration sync
   * Same as automatic sync but triggered via API
   */
  async triggerManualIntegrationSync(): Promise<{
    success: boolean;
    message: string;
    jobs?: { productJob: string; orderJob: string; customerJob: string };
  }> {
    try {
      console.log('[SyncScheduler] 📱 Manual integration sync triggered');
      
      if (this.isRunning) {
        return {
          success: false,
          message: 'Sync already in progress',
        };
      }

      this.isRunning = true;

      // Queue jobs with full sync
      const productJob = await this.syncQueue.queueProductSync('tradeunleashed', {
        fullSync: true, // Full sync for manual trigger
        batchSize: 100,
      });

      const orderJob = await this.syncQueue.queueOrderSync('tradeunleashed', {
        fullSync: true,
      });

      const customerJob = await this.syncQueue.queueCustomerSync('tradeunleashed', {
        fullSync: true,
      });

      this.lastSyncTime = new Date();
      try {
        await orgAccountSettingService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Org account settings synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync org account settings during manual trigger:', error);
      }

      try {
        await tradeUnleashedUserRoleService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ User roles synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync user roles during manual trigger:', error);
      }

      try {
        await tradeUnleashedFacilityRoleService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Facility roles synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync facility roles during manual trigger:', error);
      }

      try {
        await tradeUnleashedPartyRoleService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Party roles synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync party roles during manual trigger:', error);
      }

      try {
        await partyRoleTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Party role types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync party role types during manual trigger:', error);
      }

      try {
        await posSessionService.syncFromTradeUnleashed({ currentSession: true });
        console.log('[SyncScheduler] ✓ POS sessions synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync POS sessions during manual trigger:', error);
      }

      try {
        await saleTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Sale types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync sale types during manual trigger:', error);
      }

      try {
        await orderAdjustmentTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Order adjustment types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync order adjustment types during manual trigger:', error);
      }

      try {
        await orderRoleTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Order role types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync order role types during manual trigger:', error);
      }

      try {
        await orderStatusTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Order status types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync order status types during manual trigger:', error);
      }

      try {
        await invoiceItemTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Invoice item types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync invoice item types during manual trigger:', error);
      }

      try {
        await paymentTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Payment types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync payment types during manual trigger:', error);
      }

      try {
        await tradePaymentMethodService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Payment methods synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync payment methods during manual trigger:', error);
      }

      try {
        await contactMechanismTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Contact mechanism types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync contact mechanism types during manual trigger:', error);
      }

      try {
        await partyRelationshipTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Party relationship types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync party relationship types during manual trigger:', error);
      }

      try {
        await partyRoleTypeService.syncFromTradeUnleashed();
        console.log('[SyncScheduler] ✓ Party role types synced during manual trigger');
      } catch (error) {
        console.error('[SyncScheduler] Failed to sync party role types during manual trigger:', error);
      }
      this.isRunning = false;

      console.log('[SyncScheduler] ✅ Manual sync jobs queued successfully');

      return {
        success: true,
        message: 'Integration sync jobs queued successfully',
        jobs: {
          productJob: productJob.jobId,
          orderJob: orderJob.jobId,
          customerJob: customerJob.jobId,
        },
      };
    } catch (error) {
      this.isRunning = false;
      console.error('[SyncScheduler] ❌ Manual sync failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Perform full sync of all tables
   */
  async performSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync is already in progress');
    }

    this.isRunning = true;
    const startTime = new Date();
    const result: SyncResult = {
      success: false,
      startTime,
      endTime: new Date(),
      duration: 0,
      tablesProcessed: 0,
      recordsProcessed: 0,
      errors: [],
    };

    try {
      console.log('[SyncScheduler] Starting sync...');

      // List of all tables to sync
      const tables = [
        'CustomerGroup',
        'Location',
        'Category',
        'Brand',
        'Supplier',
        'TaxCategory',
        'PaymentMethod',
        'Role',
        'TaxRate',
        'ExpenseAccount',
        'CashRegister',
        'Customer',
        'CustomerAddress',
        'Product',
        'ProductVariant',
        'InventoryItem',
        'User',
        'UserLocation',
        'StockAdjustment',
        'StockAdjustmentLine',
        'StockTransfer',
        'StockTransferLine',
        'Barcode',
        'SerialNumber',
        'SaleOrder',
        'OrderLineItem',
        'OrderPayment',
        'OrderDiscount',
        'ReturnOrder',
        'ReturnLineItem',
        'ExchangeOrder',
        'GiftCard',
        'StoreCredit',
        'Shift',
        'ShiftTransaction',
        'CashMovement',
        'Expense',
        'BankAccount',
        'BankDeposit',
        'CashAccount',
        'Promotion',
        'ParkedOrder',
        'AuditLog',
        'SystemSetting',
      ];

      const totalRecords = 0;
      const errors: string[] = [];

      // Sync each table
      for (const table of tables) {
        try {
          // For server-side sync, we prepare data for clients
          // This could involve data validation, cleanup, or preparation
          // For now, we'll just log the sync
          console.log(`[SyncScheduler] Processing table: ${table}`);
          
          // You can add custom sync logic here
          // For example: validate data, update sync timestamps, etc.
          
          result.tablesProcessed++;
        } catch (error) {
          const errorMsg = `Error syncing table ${table}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error(`[SyncScheduler] ${errorMsg}`, error);
        }
      }

      const endTime = new Date();
      result.endTime = endTime;
      result.duration = endTime.getTime() - startTime.getTime();
      result.recordsProcessed = totalRecords;
      result.errors = errors;
      result.success = errors.length === 0;

      this.lastSyncTime = endTime;
      this.syncHistory.push(result);

      // Keep only last 100 sync results
      if (this.syncHistory.length > 100) {
        this.syncHistory.shift();
      }

      console.log(`[SyncScheduler] Sync completed: ${result.tablesProcessed} tables, ${result.recordsProcessed} records, ${result.duration}ms`);

      return result;
    } catch (error) {
      const endTime = new Date();
      result.endTime = endTime;
      result.duration = endTime.getTime() - startTime.getTime();
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      result.success = false;

      console.error('[SyncScheduler] Sync failed:', error);
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Trigger manual sync
   */
  async triggerManualSync(): Promise<SyncResult> {
    console.log('[SyncScheduler] Manual sync triggered');
    return await this.performSync();
  }

  /**
   * Sync on user login (prepares server data for client download)
   * 
   * NOTE: This is server-side only. It prepares data for download but doesn't access client's local DB.
   * 
   * For true bidirectional sync, the CLIENT must:
   * 1. After login, call bidirectional sync endpoints for each table
   * 2. Upload local changes first, then download server updates
   * 
   * This method ensures server data is ready and logs sync preparation.
   */
  async syncOnLogin(userId: string): Promise<void> {
    try {
      console.log(`[SyncScheduler] Preparing sync data for user: ${userId}`);
      console.log(`[SyncScheduler] Note: Client should call bidirectional sync endpoints after login`);
      
      // Essential tables for POS operations - these will be available for client to sync
      const essentialTables = [
        // Master data (no dependencies)
        'Location',
        'Brand',
        'Supplier',
        'TaxCategory',
        // Categories (can have parent categories, but we sync all)
        'Category',
        // Products (depends on Category, Brand, Supplier)
        'Product',
        // Product Variants (depends on Product)
        'ProductVariant',
        // Inventory (depends on ProductVariant and Location)
        'InventoryItem',
        // User-specific data
        'User',
        'UserLocation',
      ];

      // Log table counts for monitoring
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      try {
        for (const table of essentialTables) {
          try {
            // Get record count for logging
            type PrismaModelWithCount = {
              count: () => Promise<number>;
            };
            const modelMap: Record<string, PrismaModelWithCount> = {
              Location: prisma.location,
              Brand: prisma.brand,
              Supplier: prisma.supplier,
              TaxCategory: prisma.taxCategory,
              Category: prisma.category,
              Product: prisma.product,
              ProductVariant: prisma.productVariant,
              InventoryItem: prisma.inventoryItem,
              User: prisma.user,
              UserLocation: prisma.userLocation,
            };

            const model = modelMap[table];
            if (model) {
              const count = await model.count();
              console.log(`[SyncScheduler] ${table}: ${count} records available for sync`);
            }
          } catch (error) {
            // Ignore count errors
          }
        }
      } finally {
        await prisma.$disconnect();
      }

      console.log(`[SyncScheduler] ✅ Sync data prepared for user: ${userId}`);
      console.log(`[SyncScheduler] Client should now call bidirectional sync endpoints to sync local and server data`);
    } catch (error) {
      console.error(`[SyncScheduler] Error preparing sync for user ${userId}:`, error);
    }
  }

  /**
   * Get sync status
   */
  getStatus(): {
    isRunning: boolean;
    lastSyncTime: Date | null;
    isAutomaticSyncActive: boolean;
    syncHistory: SyncResult[];
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      isAutomaticSyncActive: this.cronJob !== null,
      syncHistory: this.syncHistory.slice(-10), // Last 10 syncs
    };
  }

  /**
   * Check if sync is running
   */
  isSyncRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}

export const syncScheduler = new SyncScheduler();

