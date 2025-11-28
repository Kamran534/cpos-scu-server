import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { contactMechanismTypeController } from '../controllers/contactMechanismTypeController.js';

const router = Router();

router.get('/', authenticate, (req, res) => contactMechanismTypeController.list(req, res));
router.post('/sync', authenticate, (req, res) => contactMechanismTypeController.sync(req, res));

export { router as contactMechanismTypeRoutes };


