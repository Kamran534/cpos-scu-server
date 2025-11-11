/**
 * Sync Scheduler
 * 
 * Handles automatic synchronization on the server side
 * - Runs sync every hour automatically
 * - Can be triggered manually
 * - Syncs on user login
 */

import cron from 'node-cron';

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

  /**
   * Start automatic sync (runs every hour)
   */
  startAutomaticSync(): void {
    if (this.cronJob) {
      console.log('[SyncScheduler] Automatic sync already started');
      return;
    }

    // Run sync every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('[SyncScheduler] Running automatic hourly sync...');
      await this.performSync();
    });

    console.log('[SyncScheduler] Automatic sync started (runs every hour)');
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

