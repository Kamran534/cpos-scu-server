import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { paymentTypeController } from '../controllers/paymentTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => paymentTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => paymentTypeController.sync(req, res));

export { router as paymentTypeRoutes };


