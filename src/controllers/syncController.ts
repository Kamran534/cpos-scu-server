/**
 * Sync Controller
 * 
 * Handles HTTP requests for database synchronization
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { syncService, SyncRecord } from '../services/syncService.js';
import { syncScheduler } from '../services/syncScheduler.js';
import { orgAccountSettingService } from '../services/orgAccountSettingService.js';
import { tradeUnleashedUserRoleService } from '../services/tradeUnleashedUserRoleService.js';
import { tradeUnleashedFacilityRoleService } from '../services/tradeUnleashedFacilityRoleService.js';
import { tradeUnleashedPartyRoleService } from '../services/tradeUnleashedPartyRoleService.js';
import { posSessionService } from '../services/posSessionService.js';
import { saleTypeService } from '../services/saleTypeService.js';
import { orderAdjustmentTypeService } from '../services/orderAdjustmentTypeService.js';
import { orderRoleTypeService } from '../services/orderRoleTypeService.js';
import { orderStatusTypeService } from '../services/orderStatusTypeService.js';
import { invoiceItemTypeService } from '../services/invoiceItemTypeService.js';
import { paymentTypeService } from '../services/paymentTypeService.js';
import { tradePaymentMethodService } from '../services/tradePaymentMethodService.js';
import { contactMechanismTypeService } from '../services/contactMechanismTypeService.js';
import { partyRelationshipTypeService } from '../services/partyRelationshipTypeService.js';

export class SyncController {
  /**
   * Upload records from client to server
   * POST /api/sync/:table/upload
   */
  async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { table } = req.params;
      const { records } = req.body;

      if (!records || !Array.isArray(records)) {
        res.status(400).json({
          success: false,
          error: 'Records array is required',
        });
        return;
      }

      const result = await syncService.uploadRecords(table, records);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Sync upload error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }

  /**
   * Download records from server to client
   * GET /api/sync/:table/download
   */
  async download(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { table } = req.params;
      const { lastSyncedAt, limit, offset } = req.query;

      const result = await syncService.downloadRecords(table, {
        lastSyncedAt: lastSyncedAt as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Sync download error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      });
    }
  }

  /**
   * Get sync status for all tables
   * GET /api/sync/status
   */
  async getStatus(_req: AuthRequest, res: Response): Promise<void> {
    try {
      // Return list of tables that can be synced
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
        'SalesPerson',
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
        'StoreConfig',
      ];

      // Get scheduler status
      const schedulerStatus = syncScheduler.getStatus();

      res.status(200).json({
        success: true,
        data: {
          tables,
          timestamp: new Date().toISOString(),
          scheduler: {
            isRunning: schedulerStatus.isRunning,
            lastSyncTime: schedulerStatus.lastSyncTime?.toISOString() || null,
            isAutomaticSyncActive: schedulerStatus.isAutomaticSyncActive,
            recentSyncs: schedulerStatus.syncHistory,
          },
        },
      });
    } catch (error) {
      console.error('Sync status error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status',
      });
    }
  }

  /**
   * Bidirectional sync for a table (upload then download)
   * POST /api/sync/:table/bidirectional
   */
  async bidirectionalSync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { table } = req.params;
      const { records, lastSyncedAt } = req.body;

      const results: {
        upload: { created: number; updated: number; errors: string[] };
        download: { records: SyncRecord[]; hasMore: boolean; totalCount: number };
      } = {
        upload: { created: 0, updated: 0, errors: [] },
        download: { records: [], hasMore: false, totalCount: 0 },
      };

      // Step 1: Upload client changes to server
      if (records && Array.isArray(records) && records.length > 0) {
        try {
          results.upload = await syncService.uploadRecords(table, records);
          console.log(`[SyncController] Uploaded ${table}: ${results.upload.created} created, ${results.upload.updated} updated`);
        } catch (error) {
          console.error(`[SyncController] Upload error for ${table}:`, error);
          results.upload.errors.push(error instanceof Error ? error.message : String(error));
        }
      }

      // Step 2: Download latest data from server
      try {
        const downloadResult = await syncService.downloadRecords(table, {
          lastSyncedAt: lastSyncedAt as string,
          limit: 1000,
          offset: 0,
        });
        results.download = downloadResult;
        console.log(`[SyncController] Downloaded ${table}: ${downloadResult.records.length} records`);
      } catch (error) {
        console.error(`[SyncController] Download error for ${table}:`, error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Download failed',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      console.error('Bidirectional sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Bidirectional sync failed',
      });
    }
  }

  /**
   * Trigger manual sync
   * POST /api/sync/manual
   */
  async triggerManualSync(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (syncScheduler.isSyncRunning()) {
        res.status(409).json({
          success: false,
          error: 'Sync is already in progress',
        });
        return;
      }

      console.log('[SyncController] Manual sync triggered by user:', req.user?.username);
      
      // Trigger sync asynchronously
      syncScheduler.triggerManualSync()
        .then((result) => {
          console.log('[SyncController] Manual sync completed:', {
            success: result.success,
            tablesProcessed: result.tablesProcessed,
            recordsProcessed: result.recordsProcessed,
            duration: result.duration,
          });
        })
        .catch((error) => {
          console.error('[SyncController] Manual sync failed:', error);
        });

      // Return immediately (sync runs in background)
      res.status(202).json({
        success: true,
        message: 'Sync started in background',
        data: {
          startedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Manual sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger sync',
      });
    }
  }

  /**
   * Trigger manual integration layer sync
   * Calls platform APIs (TradeUnleashed, etc.) to fetch data
   * POST /api/sync/integration/trigger
   */
  async triggerIntegrationSync(req: AuthRequest, res: Response): Promise<void> {
    try {
      console.log('[SyncController] 🚀 Manual integration sync triggered by user:', req.user?.username);
      
      const result = await syncScheduler.triggerManualIntegrationSync();

      if (result.success) {
        try {
          await orgAccountSettingService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Org account settings synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Org account settings sync failed during manual trigger:', error);
        }

        try {
          await tradeUnleashedUserRoleService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ User roles synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] User roles sync failed during manual trigger:', error);
        }

        try {
          await tradeUnleashedFacilityRoleService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Facility roles synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Facility roles sync failed during manual trigger:', error);
        }

        try {
          await tradeUnleashedPartyRoleService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Party roles synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Party roles sync failed during manual trigger:', error);
        }

        try {
          await posSessionService.syncFromTradeUnleashed({ currentSession: true });
          console.log('[SyncController] ✓ POS sessions synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] POS sessions sync failed during manual trigger:', error);
        }

        try {
          await saleTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Sale types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Sale types sync failed during manual trigger:', error);
        }

        try {
          await orderAdjustmentTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Order adjustment types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Order adjustment types sync failed during manual trigger:', error);
        }

        try {
          await orderRoleTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Order role types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Order role types sync failed during manual trigger:', error);
        }

        try {
          await orderStatusTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Order status types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Order status types sync failed during manual trigger:', error);
        }

        try {
          await invoiceItemTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Invoice item types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Invoice item types sync failed during manual trigger:', error);
        }

        try {
          await paymentTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Payment types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Payment types sync failed during manual trigger:', error);
        }

        try {
          await tradePaymentMethodService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Payment methods synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Payment methods sync failed during manual trigger:', error);
        }

        try {
          await contactMechanismTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Contact mechanism types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Contact mechanism types sync failed during manual trigger:', error);
        }

        try {
          await partyRelationshipTypeService.syncFromTradeUnleashed();
          console.log('[SyncController] ✓ Party relationship types synced via manual integration trigger');
        } catch (error) {
          console.error('[SyncController] Party relationship types sync failed during manual trigger:', error);
        }
        res.status(202).json({
          success: true,
          message: result.message,
          data: {
            startedAt: new Date().toISOString(),
            jobs: result.jobs,
            note: 'Jobs queued successfully. Worker will process them in background.',
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
        });
      }
    } catch (error) {
      console.error('[SyncController] Integration sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger integration sync',
      });
    }
  }
}

export const syncController = new SyncController();

