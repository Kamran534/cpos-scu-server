/**
 * Sync Queue Controller
 * 
 * API endpoints for queueing sync jobs
 * Returns immediately while processing happens in background
 */

import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { SyncQueueService } from '../services/SyncQueueService.js';

const syncQueue = new SyncQueueService();

/**
 * Queue product sync job
 * POST /api/sync/queue/products
 */
export const queueProductSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      integration = 'tradeunleashed',
      facilityIds,
      fromDate,
      batchSize = 50,
      fullSync = false,
    } = req.body;

    const userId = req.user?.id; // From auth middleware

    const result = await syncQueue.queueProductSync(
      integration,
      {
        facilityIds,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        batchSize,
        fullSync,
      },
      userId
    );

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.status(202).json({
      ...result,
      _links: {
        status: `/api/sync/jobs/${result.jobId}`,
        results: `/api/sync/results/${result.jobId}`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Queue order sync job
 * POST /api/sync/queue/orders
 */
export const queueOrderSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      integration = 'tradeunleashed',
      fromDate,
      toDate,
      batchSize = 50,
      fullSync = false,
    } = req.body;

    const userId = req.user?.id;

    const result = await syncQueue.queueOrderSync(
      integration,
      {
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        batchSize,
        fullSync,
      },
      userId
    );

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.status(202).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Queue customer sync job
 * POST /api/sync/queue/customers
 */
export const queueCustomerSync = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      integration = 'tradeunleashed',
      batchSize = 50,
      fullSync = false,
    } = req.body;

    const userId = req.user?.id;

    const result = await syncQueue.queueCustomerSync(
      integration,
      {
        batchSize,
        fullSync,
      },
      userId
    );

    if (!result.success) {
      res.status(500).json(result);
      return;
    }

    res.status(202).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get queue stats
 * GET /api/sync/queue/stats
 */
export const getQueueStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await syncQueue.getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

