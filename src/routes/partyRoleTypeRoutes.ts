import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { partyRoleTypeController } from '../controllers/partyRoleTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => partyRoleTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => partyRoleTypeController.sync(req, res));

export { router as partyRoleTypeRoutes };


