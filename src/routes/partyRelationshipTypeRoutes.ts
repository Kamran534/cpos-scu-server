import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { partyRelationshipTypeController } from '../controllers/partyRelationshipTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => partyRelationshipTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => partyRelationshipTypeController.sync(req, res));

export { router as partyRelationshipTypeRoutes };


