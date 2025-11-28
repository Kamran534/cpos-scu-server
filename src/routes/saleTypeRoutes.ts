import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { saleTypeController } from '../controllers/saleTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => saleTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => saleTypeController.sync(req, res));

export { router as saleTypeRoutes };


