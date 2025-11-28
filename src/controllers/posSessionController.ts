import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { posSessionService } from '../services/posSessionService.js';

class PosSessionController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const sessions = await posSessionService.list();
      res.status(200).json({ success: true, data: sessions });
    } catch (error) {
      console.error('[PosSessionController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load POS sessions',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, userId, currentSession } = req.body || {};
      const result = await (force
        ? posSessionService.syncFromTradeUnleashed({ userId, currentSession })
        : posSessionService.syncIfNewIds({ userId, currentSession }));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[PosSessionController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync POS sessions',
      });
    }
  }
}

export const posSessionController = new PosSessionController();


