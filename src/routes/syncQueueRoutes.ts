/**
 * Sync Queue Routes
 * 
 * API routes for queueing sync jobs
 */

import { Router } from 'express';
import {
  queueProductSync,
  queueOrderSync,
  queueCustomerSync,
  getQueueStats,
} from '../controllers/syncQueueController';

const router = Router();

/**
 * @swagger
 * /api/sync/queue/products:
 *   post:
 *     summary: Queue a product sync job (returns immediately)
 *     tags: [Sync Queue]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               integration:
 *                 type: string
 *                 default: tradeunleashed
 *               fullSync:
 *                 type: boolean
 *               facilityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               fromDate:
 *                 type: string
 *                 format: date-time
 *               batchSize:
 *                 type: number
 *                 default: 50
 *     responses:
 *       202:
 *         description: Sync job queued successfully
 */
router.post('/products', queueProductSync);

/**
 * @swagger
 * /api/sync/queue/orders:
 *   post:
 *     summary: Queue an order sync job (returns immediately)
 *     tags: [Sync Queue]
 */
router.post('/orders', queueOrderSync);

/**
 * @swagger
 * /api/sync/queue/customers:
 *   post:
 *     summary: Queue a customer sync job (returns immediately)
 *     tags: [Sync Queue]
 */
router.post('/customers', queueCustomerSync);

/**
 * @swagger
 * /api/sync/queue/stats:
 *   get:
 *     summary: Get queue statistics
 *     tags: [Sync Queue]
 */
router.get('/stats', getQueueStats);

export default router;

