import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { invoiceItemTypeController } from '../controllers/invoiceItemTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => invoiceItemTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => invoiceItemTypeController.sync(req, res));

export { router as invoiceItemTypeRoutes };


