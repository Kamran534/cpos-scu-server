import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { posSessionController } from '../controllers/posSessionController.js';

const router = Router();

router.get('/', authenticate, (req, res) => posSessionController.list(req, res));
router.post('/sync', authenticate, (req, res) => posSessionController.sync(req, res));

export { router as posSessionRoutes };


