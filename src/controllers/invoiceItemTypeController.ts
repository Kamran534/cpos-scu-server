import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { invoiceItemTypeService } from '../services/invoiceItemTypeService.js';

class InvoiceItemTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await invoiceItemTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[InvoiceItemTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load invoice item types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? invoiceItemTypeService.syncFromTradeUnleashed(params)
        : invoiceItemTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[InvoiceItemTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync invoice item types',
      });
    }
  }
}

export const invoiceItemTypeController = new InvoiceItemTypeController();


