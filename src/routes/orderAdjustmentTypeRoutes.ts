import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { orderAdjustmentTypeController } from '../controllers/orderAdjustmentTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => orderAdjustmentTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => orderAdjustmentTypeController.sync(req, res));

export { router as orderAdjustmentTypeRoutes };


