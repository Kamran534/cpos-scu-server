import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { orderStatusTypeService } from '../services/orderStatusTypeService.js';

class OrderStatusTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await orderStatusTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[OrderStatusTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load order status types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? orderStatusTypeService.syncFromTradeUnleashed(params)
        : orderStatusTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[OrderStatusTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync order status types',
      });
    }
  }
}

export const orderStatusTypeController = new OrderStatusTypeController();


