/**
 * Sync Routes
 * 
 * API routes for database synchronization
 */

import { Router } from 'express';
import { syncController } from '../controllers/syncController.js';
import { authenticate } from '../middleware/auth.js';

export const syncRoutes = Router();

/**
 * @swagger
 * /api/sync/{table}/upload:
 *   post:
 *     summary: Upload records from client to server
 *     description: Uploads local changes from the client database to the server database. Records are validated and inserted/updated in the server database.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *           example: Customer
 *         description: Table name to sync (e.g., Customer, Product, Order, etc.)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - records
 *             properties:
 *               records:
 *                 type: array
 *                 description: Array of records to upload
 *                 items:
 *                   type: object
 *                   description: Record object with table-specific fields
 *                   additionalProperties: true
 *                   example:
 *                     id: "123e4567-e89b-12d3-a456-426614174000"
 *                     name: "John Doe"
 *                     email: "john@example.com"
 *                     created_at: "2024-01-01T00:00:00.000Z"
 *                     updated_at: "2024-01-01T00:00:00.000Z"
 *           examples:
 *             customer:
 *               summary: Customer records example
 *               value:
 *                 records:
 *                   - id: "123e4567-e89b-12d3-a456-426614174000"
 *                     name: "John Doe"
 *                     email: "john@example.com"
 *                     phone: "+1234567890"
 *                     created_at: "2024-01-01T00:00:00.000Z"
 *                     updated_at: "2024-01-01T00:00:00.000Z"
 *             product:
 *               summary: Product records example
 *               value:
 *                 records:
 *                   - id: "223e4567-e89b-12d3-a456-426614174001"
 *                     name: "Product A"
 *                     sku: "PROD-A-001"
 *                     price: 29.99
 *                     created_at: "2024-01-01T00:00:00.000Z"
 *                     updated_at: "2024-01-01T00:00:00.000Z"
 *     responses:
 *       200:
 *         description: Upload successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     created:
 *                       type: integer
 *                       description: Number of records created (inserted)
 *                       example: 3
 *                     updated:
 *                       type: integer
 *                       description: Number of records updated
 *                       example: 2
 *                     errors:
 *                       type: array
 *                       description: Array of error messages for records that failed to upload
 *                       items:
 *                         type: string
 *                       example: []
 *       400:
 *         description: Invalid request (missing records array or invalid format)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Records array is required"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Upload failed"
 */
syncRoutes.post('/:table/upload', authenticate, (req, res) => {
  syncController.upload(req as any, res);
});

/**
 * @swagger
 * /api/sync/{table}/download:
 *   get:
 *     summary: Download records from server to client
 *     description: Downloads records from the server database to the client. Supports pagination and incremental sync using lastSyncedAt timestamp.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *           example: Customer
 *         description: Table name to sync (e.g., Customer, Product, Order, etc.)
 *       - in: query
 *         name: lastSyncedAt
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *         description: ISO 8601 timestamp of last sync. Only records modified after this time will be returned. If not provided, all records are returned.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *           example: 100
 *         description: Maximum number of records to return per request
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *           example: 0
 *         description: Number of records to skip (for pagination)
 *     responses:
 *       200:
 *         description: Download successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     records:
 *                       type: array
 *                       description: Array of records from the server
 *                       items:
 *                         type: object
 *                         additionalProperties: true
 *                         description: Record object with table-specific fields
 *                         example:
 *                           id: "123e4567-e89b-12d3-a456-426614174000"
 *                           name: "John Doe"
 *                           email: "john@example.com"
 *                           created_at: "2024-01-01T00:00:00.000Z"
 *                           updated_at: "2024-01-01T00:00:00.000Z"
 *                     hasMore:
 *                       type: boolean
 *                       description: Whether there are more records available
 *                       example: true
 *                     totalCount:
 *                       type: integer
 *                       description: Total number of records available
 *                       example: 500
 *             examples:
 *               customerRecords:
 *                 summary: Customer records response
 *                 value:
 *                   success: true
 *                   data:
 *                     records:
 *                       - id: "123e4567-e89b-12d3-a456-426614174000"
 *                         name: "John Doe"
 *                         email: "john@example.com"
 *                         phone: "+1234567890"
 *                         created_at: "2024-01-01T00:00:00.000Z"
 *                         updated_at: "2024-01-01T00:00:00.000Z"
 *                     hasMore: false
 *                     totalCount: 1
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Download failed"
 */
syncRoutes.get('/:table/download', authenticate, (req, res) => {
  syncController.download(req as any, res);
});

/**
 * @swagger
 * /api/sync/status:
 *   get:
 *     summary: Get sync status
 *     description: Returns the list of tables available for synchronization, current sync scheduler status, and recent sync history.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     tables:
 *                       type: array
 *                       description: List of table names available for sync
 *                       items:
 *                         type: string
 *                       example:
 *                         - Customer
 *                         - Product
 *                         - Order
 *                         - User
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       description: Current server timestamp
 *                       example: "2024-01-01T12:00:00.000Z"
 *                     scheduler:
 *                       type: object
 *                       description: Sync scheduler status information
 *                       properties:
 *                         isRunning:
 *                           type: boolean
 *                           description: Whether a sync operation is currently running
 *                           example: false
 *                         lastSyncTime:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Timestamp of the last completed sync
 *                           example: "2024-01-01T11:00:00.000Z"
 *                         isAutomaticSyncActive:
 *                           type: boolean
 *                           description: Whether automatic hourly sync is enabled
 *                           example: true
 *                         recentSyncs:
 *                           type: array
 *                           description: History of recent sync operations
 *                           items:
 *                             type: object
 *                             properties:
 *                               startedAt:
 *                                 type: string
 *                                 format: date-time
 *                               completedAt:
 *                                 type: string
 *                                 format: date-time
 *                               success:
 *                                 type: boolean
 *                               tablesProcessed:
 *                                 type: integer
 *                               recordsProcessed:
 *                                 type: integer
 *                               duration:
 *                                 type: integer
 *                                 description: Duration in milliseconds
 *             example:
 *               success: true
 *               data:
 *                 tables:
 *                   - CustomerGroup
 *                   - Location
 *                   - Category
 *                   - Brand
 *                   - Customer
 *                   - Product
 *                   - User
 *                 timestamp: "2024-01-01T12:00:00.000Z"
 *                 scheduler:
 *                   isRunning: false
 *                   lastSyncTime: "2024-01-01T11:00:00.000Z"
 *                   isAutomaticSyncActive: true
 *                   recentSyncs:
 *                     - startedAt: "2024-01-01T11:00:00.000Z"
 *                       completedAt: "2024-01-01T11:05:00.000Z"
 *                       success: true
 *                       tablesProcessed: 50
 *                       recordsProcessed: 1250
 *                       duration: 300000
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to get status"
 */
syncRoutes.get('/status', authenticate, (req, res) => {
  syncController.getStatus(req as any, res);
});

/**
 * @swagger
 * /api/sync/manual:
 *   post:
 *     summary: Trigger manual sync
 *     description: Manually triggers a full synchronization of all tables. The sync operation runs asynchronously in the background. Use the status endpoint to check sync progress.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Sync started in background
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Sync started in background"
 *                 data:
 *                   type: object
 *                   properties:
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp when sync was initiated
 *                       example: "2024-01-01T12:00:00.000Z"
 *             example:
 *               success: true
 *               message: "Sync started in background"
 *               data:
 *                 startedAt: "2024-01-01T12:00:00.000Z"
 *       409:
 *         description: Sync already in progress - A sync operation is currently running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Sync is already in progress"
 *             example:
 *               success: false
 *               error: "Sync is already in progress"
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Unauthorized"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Failed to trigger sync"
 */
/**
 * @swagger
 * /api/sync/{table}/bidirectional:
 *   post:
 *     summary: Bidirectional sync for a table
 *     description: Performs both upload (client to server) and download (server to client) in one request. First uploads local changes, then downloads latest data from server.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *           example: Category
 *         description: Table name to sync
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               records:
 *                 type: array
 *                 description: Array of local records to upload to server
 *                 items:
 *                   type: object
 *               lastSyncedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp of last sync for incremental download
 *           example:
 *             records:
 *               - id: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Updated Category"
 *                 updated_at: "2024-01-01T12:00:00.000Z"
 *             lastSyncedAt: "2024-01-01T11:00:00.000Z"
 *     responses:
 *       200:
 *         description: Bidirectional sync completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     upload:
 *                       type: object
 *                       properties:
 *                         created:
 *                           type: integer
 *                         updated:
 *                           type: integer
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                     download:
 *                       type: object
 *                       properties:
 *                         records:
 *                           type: array
 *                           items:
 *                             type: object
 *                         hasMore:
 *                           type: boolean
 *                         totalCount:
 *                           type: integer
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
syncRoutes.post('/:table/bidirectional', authenticate, (req, res) => {
  syncController.bidirectionalSync(req as any, res);
});

syncRoutes.post('/manual', authenticate, (req, res) => {
  syncController.triggerManualSync(req as any, res);
});

/**
 * @swagger
 * /api/sync/integration/trigger:
 *   post:
 *     summary: Trigger integration layer sync
 *     description: Manually triggers sync with external platform APIs (TradeUnleashed, etc.). Queues jobs to fetch products, orders, and customers from the platform and save to database.
 *     tags: [Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Integration sync jobs queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Integration sync jobs queued successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     startedAt:
 *                       type: string
 *                       format: date-time
 *                     jobs:
 *                       type: object
 *                       properties:
 *                         productJob:
 *                           type: string
 *                         orderJob:
 *                           type: string
 *                         customerJob:
 *                           type: string
 *                     note:
 *                       type: string
 *       400:
 *         description: Sync already in progress
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
syncRoutes.post('/integration/trigger', authenticate, (req, res) => {
  syncController.triggerIntegrationSync(req as any, res);
});

