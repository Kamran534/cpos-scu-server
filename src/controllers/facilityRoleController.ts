import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { tradeUnleashedFacilityRoleService } from '../services/tradeUnleashedFacilityRoleService.js';

class FacilityRoleController {
  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, partyId } = req.body || {};
      const result = await (force
        ? tradeUnleashedFacilityRoleService.syncFromTradeUnleashed(partyId)
        : tradeUnleashedFacilityRoleService.syncIfNewIds(partyId));

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[FacilityRoleController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync facility roles',
      });
    }
  }

  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const roles = await tradeUnleashedFacilityRoleService.list();
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error('[FacilityRoleController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load facility roles',
      });
    }
  }
}

export const facilityRoleController = new FacilityRoleController();


