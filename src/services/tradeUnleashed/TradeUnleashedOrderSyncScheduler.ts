/**
 * TradeUnleashed Order Sync Scheduler
 * 
 * Runs periodic sync of pending orders to TradeUnleashed
 */

import { TradeUnleashedOrderSyncService } from './TradeUnleashedOrderSyncService.js';
import { TradeUnleashedConfig } from '../../integrations/tradeunleashed/types.js';

export class TradeUnleashedOrderSyncScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private syncService: TradeUnleashedOrderSyncService;
  private config: TradeUnleashedConfig;
  private intervalMs: number;

  constructor(config: TradeUnleashedConfig, intervalMinutes: number = 5) {
    this.config = config;
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.syncService = new TradeUnleashedOrderSyncService();
  }

  /**
   * Start the sync scheduler
   */
  async start(): Promise<void> {
    if (this.intervalId) {
      console.log('[TradeUnleashedOrderSyncScheduler] Scheduler already running');
      return;
    }

    // Initialize the sync service
    await this.syncService.initializeClient(this.config);

    // Run sync immediately
    await this.runSync();

    // Schedule periodic sync
    this.intervalId = setInterval(async () => {
      await this.runSync();
    }, this.intervalMs);

    console.log(
      `[TradeUnleashedOrderSyncScheduler] Started. Syncing every ${this.intervalMs / 1000 / 60} minutes`
    );
  }

  /**
   * Stop the sync scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TradeUnleashedOrderSyncScheduler] Stopped');
    }
  }

  /**
   * Run sync once
   */
  private async runSync(): Promise<void> {
    try {
      console.log('[TradeUnleashedOrderSyncScheduler] Running sync...');
      const result = await this.syncService.syncPendingOrders();

      console.log(
        `[TradeUnleashedOrderSyncScheduler] Sync completed: ${result.success} succeeded, ${result.failed} failed`
      );

      if (result.errors.length > 0) {
        console.error('[TradeUnleashedOrderSyncScheduler] Errors:', result.errors);
      }
    } catch (error) {
      console.error('[TradeUnleashedOrderSyncScheduler] Sync error:', error);
    }
  }

  /**
   * Get sync statistics
   */
  async getStats() {
    return await this.syncService.getSyncStats();
  }
}

