import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { orderRoleTypeController } from '../controllers/orderRoleTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => orderRoleTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => orderRoleTypeController.sync(req, res));

export { router as orderRoleTypeRoutes };


