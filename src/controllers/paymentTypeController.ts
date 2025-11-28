import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { paymentTypeService } from '../services/paymentTypeService.js';

class PaymentTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await paymentTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[PaymentTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load payment types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? paymentTypeService.syncFromTradeUnleashed(params)
        : paymentTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[PaymentTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync payment types',
      });
    }
  }
}

export const paymentTypeController = new PaymentTypeController();


