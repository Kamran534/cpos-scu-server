import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { userRoleController } from '../controllers/userRoleController.js';

const router = Router();

router.get('/', authenticate, (req, res) => userRoleController.list(req, res));
router.post('/sync', authenticate, (req, res) => userRoleController.sync(req, res));

export { router as userRoleRoutes };


