import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { facilityRoleController } from '../controllers/facilityRoleController.js';

const router = Router();

router.get('/', authenticate, (req, res) => facilityRoleController.list(req, res));
router.post('/sync', authenticate, (req, res) => facilityRoleController.sync(req, res));

export { router as facilityRoleRoutes };


