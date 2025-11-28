import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { orgAccountSettingService } from '../services/orgAccountSettingService.js';

class OrgAccountSettingController {
  async syncFromTradeUnleashed(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { max, limit } = req.body || {};
      const result = await orgAccountSettingService.syncFromTradeUnleashed({
        max: typeof max === 'number' ? max : undefined,
        limit: typeof limit === 'number' ? limit : undefined,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[OrgAccountSettingController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync org account settings',
      });
    }
  }

  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const records = await orgAccountSettingService.list();
      res.status(200).json({
        success: true,
        data: records,
      });
    } catch (error) {
      console.error('[OrgAccountSettingController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load org account settings',
      });
    }
  }

  async getLatest(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const record = await orgAccountSettingService.getLatest();
      res.status(200).json({
        success: true,
        data: record,
      });
    } catch (error) {
      console.error('[OrgAccountSettingController] Latest error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load latest org account setting',
      });
    }
  }
}

export const orgAccountSettingController = new OrgAccountSettingController();


