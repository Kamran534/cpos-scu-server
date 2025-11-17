/**
 * Sales Order Routes
 *
 * Endpoints for managing sales orders with full discount and coupon support
 */

import { Router, Request, Response } from 'express';
import SalesOrderService from '../services/salesOrderService.js';

export const salesOrderRoutes = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new sales order
 *     description: Create a sales order with customer, line items, discounts, adjustments, and coupon codes
 *     tags: [Sales Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - locationId
 *               - cashierId
 *               - lineItems
 *             properties:
 *               locationId:
 *                 type: string
 *               cashierId:
 *                 type: string
 *               customerId:
 *                 type: string
 *               lineItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - variantId
 *                     - quantity
 *                     - unitPrice
 *                   properties:
 *                     variantId:
 *                       type: string
 *                     salesPersonId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     unitPrice:
 *                       type: number
 *                     saleDiscount:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         percent:
 *                           type: number
 *                     customDiscount:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                         percent:
 *                           type: number
 *               orderLevelDiscount:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   percent:
 *                     type: number
 *               adjustment:
 *                 type: object
 *                 properties:
 *                   amount:
 *                     type: number
 *                   reason:
 *                     type: string
 *               couponCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request data
 */
salesOrderRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const order = await SalesOrderService.createSalesOrder(req.body);
    res.status(201).json({ success: true, order });
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all sales orders
 *     description: Retrieve sales orders with pagination and filters
 *     tags: [Sales Orders]
 *     parameters:
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
 *       - in: query
 *         name: customerId
 *         schema:
 *           type: string
 *       - in: query
 *         name: locationId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of orders
 */
salesOrderRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, customerId, locationId, status, startDate, endDate } = req.query;

    const result = await SalesOrderService.getOrders({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      customerId: customerId as string,
      locationId: locationId as string,
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Retrieve a specific order with all details
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
salesOrderRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await SalesOrderService.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Update the status of an order
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Open, Completed, Voided, Parked, OnHold]
 *     responses:
 *       200:
 *         description: Order status updated
 */
salesOrderRoutes.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    if (!['Open', 'Completed', 'Voided', 'Parked', 'OnHold'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const order = await SalesOrderService.updateOrderStatus(req.params.id, status);
    res.json({ success: true, order });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/{id}/payment:
 *   post:
 *     summary: Add payment to order
 *     description: Add a payment to an existing order
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentMethodId
 *               - amount
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Payment added successfully
 */
salesOrderRoutes.post('/:id/payment', async (req: Request, res: Response) => {
  try {
    const { paymentMethodId, amount } = req.body;

    if (!paymentMethodId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment method ID and positive amount are required',
      });
    }

    const payment = await SalesOrderService.addPayment(
      req.params.id,
      paymentMethodId,
      amount
    );

    res.status(201).json({ success: true, payment });
  } catch (error: any) {
    console.error('Error adding payment:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/validate-coupon:
 *   post:
 *     summary: Validate a coupon code
 *     description: Check if a coupon code is valid for use
 *     tags: [Sales Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - couponCode
 *             properties:
 *               couponCode:
 *                 type: string
 *               customerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon validation result
 */
salesOrderRoutes.post('/validate-coupon', async (req: Request, res: Response) => {
  try {
    const { couponCode, customerId } = req.body;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        error: 'Coupon code is required',
      });
    }

    const result = await SalesOrderService.validateCoupon(couponCode, customerId);
    res.json({ success: true, validation: result });
  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/orders/sales-person/{salesPersonId}/stats:
 *   get:
 *     summary: Get sales person statistics
 *     description: Get sales statistics for a specific sales person
 *     tags: [Sales Orders]
 *     parameters:
 *       - in: path
 *         name: salesPersonId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Sales person statistics
 */
salesOrderRoutes.get('/sales-person/:salesPersonId/stats', async (req: Request, res: Response) => {
  try {
    const { salesPersonId } = req.params;
    const { startDate, endDate } = req.query;

    const stats = await SalesOrderService.getSalesPersonStats(
      salesPersonId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error fetching sales person stats:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

export default salesOrderRoutes;
