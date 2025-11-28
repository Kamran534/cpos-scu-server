import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { orderStatusTypeController } from '../controllers/orderStatusTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => orderStatusTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => orderStatusTypeController.sync(req, res));

export { router as orderStatusTypeRoutes };


