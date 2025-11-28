import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { partyRoleTypeService } from '../services/partyRoleTypeService.js';

class PartyRoleTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await partyRoleTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[PartyRoleTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load party role types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? partyRoleTypeService.syncFromTradeUnleashed(params)
        : partyRoleTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[PartyRoleTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync party role types',
      });
    }
  }
}

export const partyRoleTypeController = new PartyRoleTypeController();


