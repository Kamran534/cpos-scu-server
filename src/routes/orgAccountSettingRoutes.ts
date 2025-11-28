import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { orgAccountSettingController } from '../controllers/orgAccountSettingController.js';

const router = Router();

/**
 * @swagger
 * /api/org-account-settings:
 *   get:
 *     summary: Get TradeUnleashed org account settings records
 *     tags: [OrgAccountSetting]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, (req, res) =>
  orgAccountSettingController.list(req, res)
);

/**
 * @swagger
 * /api/org-account-settings/latest:
 *   get:
 *     summary: Get latest TradeUnleashed org account setting snapshot
 *     tags: [OrgAccountSetting]
 *     security:
 *       - bearerAuth: []
 */
router.get('/latest', authenticate, (req, res) =>
  orgAccountSettingController.getLatest(req, res)
);

/**
 * @swagger
 * /api/org-account-settings/sync:
 *   post:
 *     summary: Fetch org account settings from TradeUnleashed and persist in DB
 *     tags: [OrgAccountSetting]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               max:
 *                 type: integer
 *                 example: 50
 *               limit:
 *                 type: integer
 *                 example: 50
 */
router.post('/sync', authenticate, (req, res) =>
  orgAccountSettingController.syncFromTradeUnleashed(req, res)
);

export { router as orgAccountSettingRoutes };


