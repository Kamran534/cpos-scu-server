import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { contactMechanismTypeService } from '../services/contactMechanismTypeService.js';

class ContactMechanismTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await contactMechanismTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[ContactMechanismTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load contact mechanism types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? contactMechanismTypeService.syncFromTradeUnleashed(params)
        : contactMechanismTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[ContactMechanismTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync contact mechanism types',
      });
    }
  }
}

export const contactMechanismTypeController = new ContactMechanismTypeController();


