import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { tradePaymentMethodService } from '../services/tradePaymentMethodService.js';

class TradePaymentMethodController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const methods = await tradePaymentMethodService.list();
      res.status(200).json({ success: true, data: methods });
    } catch (error) {
      console.error('[TradePaymentMethodController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load payment methods',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? tradePaymentMethodService.syncFromTradeUnleashed(params)
        : tradePaymentMethodService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[TradePaymentMethodController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync payment methods',
      });
    }
  }
}

export const tradePaymentMethodController = new TradePaymentMethodController();


