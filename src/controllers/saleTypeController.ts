import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { saleTypeService } from '../services/saleTypeService.js';

class SaleTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const saleTypes = await saleTypeService.list();
      res.status(200).json({ success: true, data: saleTypes });
    } catch (error) {
      console.error('[SaleTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load sale types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? saleTypeService.syncFromTradeUnleashed(params)
        : saleTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[SaleTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync sale types',
      });
    }
  }
}

export const saleTypeController = new SaleTypeController();


