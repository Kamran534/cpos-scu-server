import { Router } from 'express';
import { authRoutes } from './authRoutes.js';
import { syncRoutes } from './syncRoutes.js';
import syncQueueRoutes from './syncQueueRoutes.js';
import { categoryRoutes } from './categoryRoutes.js';
import { productRoutes, variantRouter, inventoryRouter } from './productRoutes.js';
import { customerRoutes } from './customerRoutes.js';
import { salesOrderRoutes } from './salesOrderRoutes.js';
import { promotionRoutes } from './promotionRoutes.js';
import { config } from '../config/index.js';

export const apiRouter = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2024-01-01T00:00:00.000Z
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 environment:
 *                   type: string
 *                   example: development
 */
apiRouter.get('/health', (_, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information
 *     description: Returns basic API information and version
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: pos-server
 *                 version:
 *                   type: string
 *                   example: 1.0.0
 *                 endpoints:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: string
 *                       example: /api/health
 *                     docs:
 *                       type: string
 *                       example: /api-docs
 */
apiRouter.get('/', (_, res) => {
  res.json({
    name: 'pos-server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      docs: '/api-docs',
    },
  });
});

// API Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/sync', syncRoutes);
apiRouter.use('/sync/queue', syncQueueRoutes); // Queue-based async sync
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/variants', variantRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/orders', salesOrderRoutes);
apiRouter.use('/promotions', promotionRoutes);
