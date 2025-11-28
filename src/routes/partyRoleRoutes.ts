import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { partyRoleController } from '../controllers/partyRoleController.js';

const router = Router();

router.get('/', authenticate, (req, res) => partyRoleController.list(req, res));
router.post('/sync', authenticate, (req, res) => partyRoleController.sync(req, res));

export { router as partyRoleRoutes };


