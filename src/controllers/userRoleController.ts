import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { tradeUnleashedUserRoleService } from '../services/tradeUnleashedUserRoleService.js';

class UserRoleController {
  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { max, limit, force } = req.body || {};
      const serviceCall =
        force === true
          ? tradeUnleashedUserRoleService.syncFromTradeUnleashed({
              max,
              limit,
            })
          : tradeUnleashedUserRoleService.syncIfNewIds({
              max,
              limit,
            });

      const result = await serviceCall;

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[UserRoleController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync user roles',
      });
    }
  }

  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const roles = await tradeUnleashedUserRoleService.list();
      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      console.error('[UserRoleController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load user roles',
      });
    }
  }
}

export const userRoleController = new UserRoleController();


