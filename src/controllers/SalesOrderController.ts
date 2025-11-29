import { Request, Response } from 'express';
import { OrderStatus } from '@prisma/client';
import TradeUnleashedSalesOrderService from '../services/tradeUnleashed/TradeUnleashedSalesOrderService.js';
import { SalesOrderPayload } from '../types/tradeUnleashed/salesOrder.js';
import { SalesOrderService, CreateSalesOrderDTO } from '../services/salesOrderService.js';

export class SalesOrderController {
  /**
   * @swagger
   * /api/sales-orders/bulk-save:
   *   post:
   *     summary: Bulk save sales orders from TradeUnleashed
   *     description: Creates or updates multiple sales orders with product mapping from TradeUnleashed to HQ system
   *     tags: [Sales Orders]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - storeId
   *               - orders
   *             properties:
   *               storeId:
   *                 type: number
   *                 description: The store ID in HQ system
   *                 example: 1
   *               orders:
   *                 type: array
   *                 description: Array of sales orders from TradeUnleashed
   *                 items:
   *                   type: object
   *                   required:
   *                     - id
   *                     - orderNumber
   *                     - customerId
   *                     - lines
   *                   properties:
   *                     id:
   *                       type: number
   *                       description: TradeUnleashed sales order ID
   *                       example: 12345
   *                     orderNumber:
   *                       type: string
   *                       description: Sales order number
   *                       example: "SO-2024-001"
   *                     customerId:
   *                       type: number
   *                       description: TradeUnleashed customer ID
   *                       example: 67890
   *                     orderDate:
   *                       type: string
   *                       format: date-time
   *                       description: Order date
   *                       example: "2024-01-15T10:30:00Z"
   *                     status:
   *                       type: string
   *                       description: Order status
   *                       example: "confirmed"
   *                     totalAmount:
   *                       type: number
   *                       description: Total order amount
   *                       example: 299.99
   *                     lastModifiedOn:
   *                       type: string
   *                       format: date-time
   *                       description: Last modification date in TradeUnleashed
   *                     lines:
   *                       type: array
   *                       description: Order line items
   *                       items:
   *                         type: object
   *                         required:
   *                           - id
   *                           - productId
   *                           - quantity
   *                         properties:
   *                           id:
   *                             type: number
   *                             description: TradeUnleashed line ID
   *                             example: 54321
   *                           productId:
   *                             type: number
   *                             description: TradeUnleashed product ID (will be mapped to HQ product)
   *                             example: 182783
   *                           quantity:
   *                             type: number
   *                             description: Quantity ordered
   *                             example: 5
   *                           unitPrice:
   *                             type: number
   *                             description: Unit price
   *                             example: 49.99
   *                           discount:
   *                             type: number
   *                             description: Discount amount
   *                             example: 10.00
   *                           taxAmount:
   *                             type: number
   *                             description: Tax amount
   *                             example: 8.50
   *                           lineTotal:
   *                             type: number
   *                             description: Line total amount
   *                             example: 258.45
   *     responses:
   *       200:
   *         description: Bulk save completed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: number
   *                   description: Number of successfully saved orders
   *                   example: 8
   *                 failed:
   *                   type: number
   *                   description: Number of failed orders
   *                   example: 2
   *                 created:
   *                   type: number
   *                   description: Number of newly created orders
   *                   example: 5
   *                 updated:
   *                   type: number
   *                   description: Number of updated orders
   *                   example: 3
   *                 errors:
   *                   type: array
   *                   description: List of errors for failed orders
   *                   items:
   *                     type: object
   *                     properties:
   *                       orderNumber:
   *                         type: string
   *                         example: "SO-2024-002"
   *                       error:
   *                         type: string
   *                         example: "Product with TradeUnleashed ID 182783 not found"
   *       400:
   *         description: Invalid request
   *       500:
   *         description: Server error
   */
  async bulkSave(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, orders, locationId, cashierId, customerIdMap } = req.body;

      // Validate request
      if (!storeId) {
        res.status(400).json({
          error: 'storeId is required'
        });
        return;
      }

      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        res.status(400).json({
          error: 'orders array is required and must not be empty'
        });
        return;
      }

      // Build customer ID map if provided
      let customerMap: Map<number, string> | undefined;
      if (customerIdMap && typeof customerIdMap === 'object') {
        customerMap = new Map(Object.entries(customerIdMap).map(([k, v]) => [Number(k), v as string]));
      }

      // Process bulk save
      const result = await TradeUnleashedSalesOrderService.bulkSaveSalesOrders(
        orders as SalesOrderPayload[],
        {
          locationId: locationId as string | undefined,
          cashierId: cashierId as string | undefined,
          customerIdMap: customerMap
        }
      );

      res.status(200).json({
        success: result.success,
        failed: result.failed,
        created: result.createdOrders.length,
        updated: result.updatedOrders.length,
        errors: result.errors
      });
    } catch (error) {
      console.error('Error in bulkSave:', error);
      res.status(500).json({
        error: 'Failed to bulk save sales orders',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * @swagger
   * /api/sales-orders:
   *   post:
   *     summary: Save a single sales order from TradeUnleashed
   *     tags: [Sales Orders]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - storeId
   *               - order
   *             properties:
   *               storeId:
   *                 type: number
   *               order:
   *                 type: object
   *     responses:
   *       200:
   *         description: Sales order saved successfully
   *       400:
   *         description: Invalid request
   *       500:
   *         description: Server error
   */
  async save(req: Request, res: Response): Promise<void> {
    try {
      const { storeId, order } = req.body;

      if (!storeId) {
        res.status(400).json({ error: 'storeId is required' });
        return;
      }

      if (!order) {
        res.status(400).json({ error: 'order is required' });
        return;
      }

      const result = await TradeUnleashedSalesOrderService.saveSalesOrder(
        order as SalesOrderPayload,
        {
          // Add locationId, cashierId, customerId if available in request
        }
      );

      res.status(200).json({
        message: result.created ? 'Sales order created' : 'Sales order updated',
        order: result.order,
        created: result.created
      });
    } catch (error) {
      console.error('Error in save:', error);
      res.status(500).json({
        error: 'Failed to save sales order',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * @swagger
   * /api/sales-orders/{storeId}:
   *   get:
   *     summary: Get sales orders for a store
   *     tags: [Sales Orders]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: number
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *       - in: query
   *         name: fromDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: toDate
   *         schema:
   *           type: string
   *           format: date
   *       - in: query
   *         name: limit
   *         schema:
   *           type: number
   *           default: 100
   *       - in: query
   *         name: offset
   *         schema:
   *           type: number
   *           default: 0
   *     responses:
   *       200:
   *         description: List of sales orders
   *       400:
   *         description: Invalid request
   *       500:
   *         description: Server error
   */
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const storeId = parseInt(req.params.storeId);
      const { status, fromDate, toDate, limit, offset } = req.query;

      if (isNaN(storeId)) {
        res.status(400).json({ error: 'Invalid storeId' });
        return;
      }

      const options: {
        status?: OrderStatus;
        fromDate?: Date;
        toDate?: Date;
        limit?: number;
        offset?: number;
        locationId?: string;
      } = {};
      
      if (status) options.status = status as OrderStatus;
      if (fromDate) options.fromDate = new Date(fromDate as string);
      if (toDate) options.toDate = new Date(toDate as string);
      if (limit) options.limit = parseInt(limit as string);
      if (offset) options.offset = parseInt(offset as string);

      const result = await TradeUnleashedSalesOrderService.getSalesOrders(
        {
          ...options,
          // locationId can be added if storeId maps to a location
        }
      );

      res.status(200).json(result);
    } catch (error) {
      console.error('Error in getOrders:', error);
      res.status(500).json({
        error: 'Failed to fetch sales orders',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * @swagger
   * /api/sales-orders/{storeId}/tu/{tuOrderId}:
   *   get:
   *     summary: Get sales order by TradeUnleashed order ID
   *     tags: [Sales Orders]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: number
   *       - in: path
   *         name: tuOrderId
   *         required: true
   *         schema:
   *           type: number
   *     responses:
   *       200:
   *         description: Sales order details
   *       404:
   *         description: Sales order not found
   *       500:
   *         description: Server error
   */
  async getOrderByTuId(req: Request, res: Response): Promise<void> {
    try {
      const storeId = parseInt(req.params.storeId);
      const tuOrderId = parseInt(req.params.tuOrderId);

      if (isNaN(storeId) || isNaN(tuOrderId)) {
        res.status(400).json({ error: 'Invalid storeId or tuOrderId' });
        return;
      }

      const order = await TradeUnleashedSalesOrderService.getSalesOrderByTuId(
        tuOrderId
      );

      if (!order) {
        res.status(404).json({ error: 'Sales order not found' });
        return;
      }

      res.status(200).json(order);
    } catch (error) {
      console.error('Error in getOrderByTuId:', error);
      res.status(500).json({
        error: 'Failed to fetch sales order',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * @swagger
   * /api/sales-orders/{storeId}/needing-sync:
   *   get:
   *     summary: Get sales orders that need re-sync
   *     tags: [Sales Orders]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: number
   *     responses:
   *       200:
   *         description: List of orders needing sync
   *       500:
   *         description: Server error
   */
  async getOrdersNeedingSync(req: Request, res: Response): Promise<void> {
    try {
      const storeId = parseInt(req.params.storeId);

      if (isNaN(storeId)) {
        res.status(400).json({ error: 'Invalid storeId' });
        return;
      }

      const orders = await TradeUnleashedSalesOrderService.getOrdersNeedingSync(
        // locationId can be added if storeId maps to a location
      );

      res.status(200).json(orders);
    } catch (error) {
      console.error('Error in getOrdersNeedingSync:', error);
      res.status(500).json({
        error: 'Failed to fetch orders needing sync',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * @swagger
   * /api/sales-orders/create:
   *   post:
   *     summary: Create a new sales order from POS
   *     description: Creates a sales order in the database with status "Open" (pending). Will be synced to TradeUnleashed later.
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
   *                 description: Location UUID
   *               cashierId:
   *                 type: string
   *                 description: Cashier/User UUID
   *               customerId:
   *                 type: string
   *                 description: Customer UUID (optional)
   *               lineItems:
   *                 type: array
   *                 description: Order line items
   *                 items:
   *                   type: object
   *                   required:
   *                     - variantId
   *                     - quantity
   *                     - unitPrice
   *                   properties:
   *                     variantId:
   *                       type: string
   *                     quantity:
   *                       type: number
   *                     unitPrice:
   *                       type: number
   *               payments:
   *                 type: array
   *                 description: Payment information
   *               notes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Order created successfully
   *       400:
   *         description: Invalid request
   *       500:
   *         description: Server error
   */
  async createFromPOS(req: Request, res: Response): Promise<void> {
    try {
      const orderData = req.body as CreateSalesOrderDTO;

      // Validate required fields
      if (!orderData.locationId) {
        res.status(400).json({ error: 'locationId is required' });
        return;
      }

      if (!orderData.cashierId) {
        res.status(400).json({ error: 'cashierId is required' });
        return;
      }

      if (!orderData.lineItems || orderData.lineItems.length === 0) {
        res.status(400).json({ error: 'At least one line item is required' });
        return;
      }

      // Create the order (will be saved with status "Open" and syncStatus null)
      const order = await SalesOrderService.createSalesOrder(orderData);

      if (!order) {
        res.status(500).json({
          error: 'Failed to create order',
          message: 'Order creation returned null',
        });
        return;
      }

      res.status(201).json({
        message: 'Order created successfully. Will be synced to TradeUnleashed.',
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          syncStatus: (order as any).syncStatus,
          totalAmount: order.totalAmount.toString(),
        },
      });
    } catch (error) {
      console.error('Error creating order from POS:', error);
      res.status(500).json({
        error: 'Failed to create order',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default new SalesOrderController();
