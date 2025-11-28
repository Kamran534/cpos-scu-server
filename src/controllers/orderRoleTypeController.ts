import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { orderRoleTypeService } from '../services/orderRoleTypeService.js';

class OrderRoleTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await orderRoleTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[OrderRoleTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load order role types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? orderRoleTypeService.syncFromTradeUnleashed(params)
        : orderRoleTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[OrderRoleTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync order role types',
      });
    }
  }
}

export const orderRoleTypeController = new OrderRoleTypeController();


