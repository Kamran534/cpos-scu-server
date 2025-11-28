import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { tradePaymentMethodController } from '../controllers/tradePaymentMethodController.js';

const router = Router();

router.get('/', authenticate, (req, res) => tradePaymentMethodController.list(req, res));
router.post('/sync', authenticate, (req, res) => tradePaymentMethodController.sync(req, res));

export { router as tradePaymentMethodRoutes };


