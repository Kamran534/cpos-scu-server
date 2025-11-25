/**
 * Promotion/Coupon Routes
 *
 * Endpoints for managing promotions and coupons
 */

import { Router, Request, Response } from 'express';
import PromotionService from '../services/promotionService.js';

export const promotionRoutes = Router();

/**
 * @swagger
 * /api/promotions:
 *   post:
 *     summary: Create a new promotion/coupon
 *     description: Create a new promotion or coupon code
 *     tags: [Promotions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - name
 *               - type
 *               - value
 *               - applicableTo
 *               - startDate
 *               - endDate
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Percentage, FixedAmount, BuyXGetY, FreeShipping]
 *               value:
 *                 type: number
 *               applicableTo:
 *                 type: string
 *                 enum: [EntireOrder, Category, Product, Customer]
 *               minPurchaseAmount:
 *                 type: number
 *               maxDiscountAmount:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               usageLimit:
 *                 type: number
 *               usageLimitPerCustomer:
 *                 type: number
 *               isSingleUse:
 *                 type: boolean
 *               requiresCouponCode:
 *                 type: boolean
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Promotion created successfully
 */
promotionRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const promotion = await PromotionService.createPromotion({
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    });
    res.status(201).json({ success: true, promotion });
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions:
 *   get:
 *     summary: Get all promotions
 *     description: Retrieve promotions with pagination and filters
 *     tags: [Promotions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of promotions
 */
promotionRoutes.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, isActive, type, includeExpired } = req.query;

    const result = await PromotionService.getPromotions({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      type: type as any,
      includeExpired: includeExpired === 'true',
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/active:
 *   get:
 *     summary: Get active promotions
 *     description: Retrieve all currently active promotions
 *     tags: [Promotions]
 *     responses:
 *       200:
 *         description: List of active promotions
 */
promotionRoutes.get('/active', async (_req: Request, res: Response) => {
  try {
    const promotions = await PromotionService.getActivePromotions();
    res.json({ success: true, promotions });
  } catch (error: any) {
    console.error('Error fetching active promotions:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/{id}:
 *   get:
 *     summary: Get promotion by ID
 *     description: Retrieve a specific promotion with details
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion details
 *       404:
 *         description: Promotion not found
 */
promotionRoutes.get('/:id', async (req: Request, res: Response) => {
  try {
    const promotion = await PromotionService.getPromotionById(req.params.id);

    if (!promotion) {
      return res.status(404).json({ success: false, error: 'Promotion not found' });
    }

    return res.json({ success: true, promotion });
  } catch (error: any) {
    console.error('Error fetching promotion:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/code/{code}:
 *   get:
 *     summary: Get promotion by code
 *     description: Retrieve a promotion by its code
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion details
 *       404:
 *         description: Promotion not found
 */
promotionRoutes.get('/code/:code', async (req: Request, res: Response) => {
  try {
    const promotion = await PromotionService.getPromotionByCode(req.params.code);

    if (!promotion) {
      return res.status(404).json({ success: false, error: 'Promotion not found' });
    }

    return res.json({ success: true, promotion });
  } catch (error: any) {
    console.error('Error fetching promotion:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/{id}:
 *   patch:
 *     summary: Update promotion
 *     description: Update an existing promotion
 *     tags: [Promotions]
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
 *     responses:
 *       200:
 *         description: Promotion updated successfully
 */
promotionRoutes.patch('/:id', async (req: Request, res: Response) => {
  try {
    const updateData = { ...req.body };
    if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
    if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);

    const promotion = await PromotionService.updatePromotion(req.params.id, updateData);
    res.json({ success: true, promotion });
  } catch (error: any) {
    console.error('Error updating promotion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/{id}:
 *   delete:
 *     summary: Delete promotion
 *     description: Delete or deactivate a promotion
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion deleted successfully
 */
promotionRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    await PromotionService.deletePromotion(req.params.id);
    res.json({ success: true, message: 'Promotion deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting promotion:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/{id}/stats:
 *   get:
 *     summary: Get promotion statistics
 *     description: Get usage statistics for a promotion
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Promotion statistics
 */
promotionRoutes.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const stats = await PromotionService.getPromotionStats(req.params.id);
    res.json({ success: true, stats });
  } catch (error: any) {
    console.error('Error fetching promotion stats:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/{id}/customer-usage/{customerId}:
 *   get:
 *     summary: Get customer promotion usage
 *     description: Check how many times a customer has used a promotion
 *     tags: [Promotions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Customer usage details
 */
promotionRoutes.get('/:id/customer-usage/:customerId', async (req: Request, res: Response) => {
  try {
    const usage = await PromotionService.getCustomerPromotionUsage(
      req.params.customerId,
      req.params.id
    );
    res.json({ success: true, usage });
  } catch (error: any) {
    console.error('Error fetching customer promotion usage:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/generate-code:
 *   post:
 *     summary: Generate a unique coupon code
 *     description: Generate a unique coupon code with optional prefix
 *     tags: [Promotions]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prefix:
 *                 type: string
 *                 default: COUPON
 *     responses:
 *       200:
 *         description: Generated coupon code
 */
promotionRoutes.post('/generate-code', async (req: Request, res: Response) => {
  try {
    const { prefix } = req.body;
    const code = await PromotionService.generateUniqueCouponCode(prefix);
    res.json({ success: true, code });
  } catch (error: any) {
    console.error('Error generating coupon code:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * @swagger
 * /api/promotions/bulk-create:
 *   post:
 *     summary: Bulk create coupons
 *     description: Create multiple coupons for campaigns
 *     tags: [Promotions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - baseName
 *               - type
 *               - value
 *               - count
 *               - startDate
 *               - endDate
 *               - isSingleUse
 *             properties:
 *               baseName:
 *                 type: string
 *               type:
 *                 type: string
 *               value:
 *                 type: number
 *               count:
 *                 type: number
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               isSingleUse:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Coupons created successfully
 */
promotionRoutes.post('/bulk-create', async (req: Request, res: Response) => {
  try {
    const coupons = await PromotionService.bulkCreateCoupons({
      ...req.body,
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
    });
    res.status(201).json({ success: true, count: coupons.length, coupons });
  } catch (error: any) {
    console.error('Error bulk creating coupons:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

export default promotionRoutes;
