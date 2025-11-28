import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { orderAdjustmentTypeService } from '../services/orderAdjustmentTypeService.js';

class OrderAdjustmentTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await orderAdjustmentTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[OrderAdjustmentTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load order adjustment types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? orderAdjustmentTypeService.syncFromTradeUnleashed(params)
        : orderAdjustmentTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[OrderAdjustmentTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync order adjustment types',
      });
    }
  }
}

export const orderAdjustmentTypeController = new OrderAdjustmentTypeController();


