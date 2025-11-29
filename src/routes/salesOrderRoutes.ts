import { Router } from 'express';
import SalesOrderController from '../controllers/SalesOrderController.js';

const router = Router();

/**
 * @route POST /api/sales-orders/bulk-save
 * @desc Bulk save sales orders from TradeUnleashed
 * @access Public (should be protected with auth middleware in production)
 */
router.post('/bulk-save', SalesOrderController.bulkSave.bind(SalesOrderController));

/**
 * @route POST /api/sales-orders
 * @desc Save a single sales order from TradeUnleashed
 * @access Public (should be protected with auth middleware in production)
 */
router.post('/', SalesOrderController.save.bind(SalesOrderController));

/**
 * @route GET /api/sales-orders/:storeId
 * @desc Get sales orders for a store
 * @access Public (should be protected with auth middleware in production)
 */
router.get('/:storeId', SalesOrderController.getOrders.bind(SalesOrderController));

/**
 * @route GET /api/sales-orders/:storeId/tu/:tuOrderId
 * @desc Get sales order by TradeUnleashed order ID
 * @access Public (should be protected with auth middleware in production)
 */
router.get('/:storeId/tu/:tuOrderId', SalesOrderController.getOrderByTuId.bind(SalesOrderController));

/**
 * @route GET /api/sales-orders/:storeId/needing-sync
 * @desc Get sales orders that need re-sync
 * @access Public (should be protected with auth middleware in production)
 */
router.get('/:storeId/needing-sync', SalesOrderController.getOrdersNeedingSync.bind(SalesOrderController));

/**
 * @route POST /api/sales-orders/create
 * @desc Create a new sales order from POS (web/desktop)
 * @access Public (should be protected with auth middleware in production)
 */
router.post('/create', SalesOrderController.createFromPOS.bind(SalesOrderController));

export default router;
