/**
 * Parked Order Routes
 *
 * Endpoints for managing parked orders
 */

import { Router, Request, Response } from 'express';
import ParkedOrderService from '../services/parkedOrderService.js';

export const parkedOrderRoutes = Router();

/**
 * @swagger
 * /api/parked-orders:
 *   post:
 *     summary: Park an order
 *     description: Park an existing order for later completion
 *     tags: [Parked Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - parkedBy
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: ID of the order to park
 *               parkedBy:
 *                 type: string
 *                 description: ID of the user parking the order
 *               customerId:
 *                 type: string
 *                 description: Optional customer ID
 *               notes:
 *                 type: string
 *                 description: Optional notes about why order is parked
 *               expiryDate:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiry date for the parked order
 *     responses:
 *       201:
 *         description: Order parked successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Order not found
 */
parkedOrderRoutes.post('/', async (req: Request, res: Response) => {
  try {
    console.log('[POST /api/parked-orders] Parking order:', {
      orderId: req.body.orderId,
      parkedBy: req.body.parkedBy,
    });

    const parkedOrder = await ParkedOrderService.parkOrder(req.body);
    res.status(201).json({ success: true, parkedOrder });
  } catch (error: any) {
    console.error('Error parking order:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/parked-orders:
 *   get:
 *     summary: Search parked orders
 *     description: Search and retrieve parked orders with filters
 *     tags: [Parked Orders]
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: Search by park number, customer name, or order number
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: parkedBy
 *         schema:
 *           type: string
 *         description: Filter by user who parked the order
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of parked orders
 */
parkedOrderRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { searchTerm, customerId, parkedBy, page, limit } = req.query;

    const result = await ParkedOrderService.searchParkedOrders({
      searchTerm: searchTerm as string,
      customerId: customerId as string,
      parkedBy: parkedBy as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error searching parked orders:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/parked-orders/{id}/load:
 *   get:
 *     summary: Load a parked order
 *     description: Retrieve full details of a parked order for resuming
 *     tags: [Parked Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parked order ID
 *     responses:
 *       200:
 *         description: Parked order details
 *       404:
 *         description: Parked order not found
 */
parkedOrderRoutes.get('/:id/load', async (req: Request, res: Response) => {
  try {
    const parkedOrder = await ParkedOrderService.loadParkedOrder(req.params.id);
    res.json({ success: true, parkedOrder });
  } catch (error: any) {
    console.error('Error loading parked order:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/parked-orders/{id}:
 *   get:
 *     summary: Get parked order by ID
 *     description: Retrieve a specific parked order
 *     tags: [Parked Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parked order ID
 *     responses:
 *       200:
 *         description: Parked order details
 *       404:
 *         description: Parked order not found
 */
parkedOrderRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const parkedOrder = await ParkedOrderService.loadParkedOrder(req.params.id);
    res.json({ success: true, parkedOrder });
  } catch (error: any) {
    console.error('Error fetching parked order:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/parked-orders/{id}/complete:
 *   post:
 *     summary: Complete a parked order
 *     description: Complete a parked order and return it to active state
 *     tags: [Parked Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parked order ID
 *     responses:
 *       200:
 *         description: Parked order completed successfully
 *       404:
 *         description: Parked order not found
 */
parkedOrderRoutes.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const result = await ParkedOrderService.completeParkedOrder(req.params.id);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error completing parked order:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/parked-orders/{id}:
 *   delete:
 *     summary: Delete a parked order
 *     description: Delete/cancel a parked order and void the associated sale order
 *     tags: [Parked Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Parked order ID
 *     responses:
 *       200:
 *         description: Parked order deleted successfully
 *       404:
 *         description: Parked order not found
 */
parkedOrderRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await ParkedOrderService.deleteParkedOrder(req.params.id);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error deleting parked order:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/parked-orders/expired:
 *   get:
 *     summary: Get expired parked orders
 *     description: Retrieve all parked orders that have passed their expiry date
 *     tags: [Parked Orders]
 *     responses:
 *       200:
 *         description: List of expired parked orders
 */
parkedOrderRoutes.get('/expired', async (req: Request, res: Response) => {
  try {
    const expiredOrders = await ParkedOrderService.getExpiredParkedOrders();
    res.json({ success: true, expiredOrders });
  } catch (error: any) {
    console.error('Error fetching expired parked orders:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

export default parkedOrderRoutes;
