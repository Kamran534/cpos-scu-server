import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { partyRelationshipTypeService } from '../services/partyRelationshipTypeService.js';

class PartyRelationshipTypeController {
  async list(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const types = await partyRelationshipTypeService.list();
      res.status(200).json({ success: true, data: types });
    } catch (error) {
      console.error('[PartyRelationshipTypeController] List error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load party relationship types',
      });
    }
  }

  async sync(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { force, max, limit } = req.body || {};
      const params = { max, limit };
      const result = await (force
        ? partyRelationshipTypeService.syncFromTradeUnleashed(params)
        : partyRelationshipTypeService.syncIfNewIds(params));

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[PartyRelationshipTypeController] Sync error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync party relationship types',
      });
    }
  }
}

export const partyRelationshipTypeController = new PartyRelationshipTypeController();


