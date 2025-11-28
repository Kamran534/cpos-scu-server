import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { tradeUnleashedPartyRoleService } from '../services/tradeUnleashedPartyRoleService.js';

class PartyRoleController {
  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, partyId } = req.body || {};

      const result = await (force
        ? tradeUnleashedPartyRoleService.syncFromTradeUnleashed(partyId)
        : tradeUnleashedPartyRoleService.syncIfNewIds(partyId));

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[PartyRoleController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync party roles',
      });
    }
  }

  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const roles = await tradeUnleashedPartyRoleService.list();
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error('[PartyRoleController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load party roles',
      });
    }
  }
}

export const partyRoleController = new PartyRoleController();


