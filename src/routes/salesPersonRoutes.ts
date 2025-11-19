/**
 * SalesPerson Routes
 *
 * API routes for sales person operations
 */

import { Router } from 'express';
import { salesPersonController } from '../controllers/salesPersonController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SalesPerson:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier
 *         code:
 *           type: string
 *           description: Unique sales person code
 *         name:
 *           type: string
 *           description: Full name of the sales person
 *         email:
 *           type: string
 *           format: email
 *           description: Email address
 *         phone:
 *           type: string
 *           description: Phone number
 *         commission:
 *           type: number
 *           format: decimal
 *           description: Commission percentage (0-100)
 *         isActive:
 *           type: boolean
 *           description: Whether the sales person is active
 *         notes:
 *           type: string
 *           description: Additional notes
 *         hireDate:
 *           type: string
 *           format: date-time
 *           description: Date of hire
 *         terminationDate:
 *           type: string
 *           format: date-time
 *           description: Date of termination
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - code
 *         - name
 *     CreateSalesPersonRequest:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code (auto-generated if not provided)
 *         name:
 *           type: string
 *           description: Full name of the sales person
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         commission:
 *           type: number
 *           description: Commission percentage (0-100)
 *         notes:
 *           type: string
 *         hireDate:
 *           type: string
 *           format: date-time
 *       required:
 *         - name
 *     UpdateSalesPersonRequest:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         commission:
 *           type: number
 *         isActive:
 *           type: boolean
 *         notes:
 *           type: string
 *         hireDate:
 *           type: string
 *           format: date-time
 *         terminationDate:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/sales-persons:
 *   post:
 *     summary: Create a new sales person
 *     description: Creates a new sales person with the provided details
 *     tags: [Sales Persons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSalesPersonRequest'
 *     responses:
 *       201:
 *         description: Sales person created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SalesPerson'
 *       400:
 *         description: Invalid input or code already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', authenticate, salesPersonController.createSalesPerson.bind(salesPersonController));

/**
 * @swagger
 * /api/sales-persons:
 *   get:
 *     summary: Get all sales persons
 *     description: Retrieves a list of all sales persons with optional filtering
 *     tags: [Sales Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, code, or email
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of results
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: List of sales persons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SalesPerson'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', authenticate, salesPersonController.getAllSalesPersons.bind(salesPersonController));

/**
 * @swagger
 * /api/sales-persons/{id}:
 *   get:
 *     summary: Get a sales person by ID
 *     description: Retrieves a single sales person by their unique ID
 *     tags: [Sales Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sales person ID
 *     responses:
 *       200:
 *         description: Sales person details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/SalesPerson'
 *                     - type: object
 *                       properties:
 *                         _count:
 *                           type: object
 *                           properties:
 *                             orders:
 *                               type: integer
 *                             lineItems:
 *                               type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sales person not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', authenticate, salesPersonController.getSalesPersonById.bind(salesPersonController));

/**
 * @swagger
 * /api/sales-persons/{id}:
 *   put:
 *     summary: Update a sales person
 *     description: Updates an existing sales person with the provided details
 *     tags: [Sales Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sales person ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSalesPersonRequest'
 *     responses:
 *       200:
 *         description: Sales person updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SalesPerson'
 *       400:
 *         description: Invalid input or code already exists
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sales person not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authenticate, salesPersonController.updateSalesPerson.bind(salesPersonController));

/**
 * @swagger
 * /api/sales-persons/{id}:
 *   delete:
 *     summary: Delete a sales person
 *     description: Deletes a sales person. If the sales person has orders, they will be soft-deleted (marked as inactive). Otherwise, they will be permanently deleted.
 *     tags: [Sales Persons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sales person ID
 *     responses:
 *       200:
 *         description: Sales person deleted successfully
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
 *                   example: Sales person deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sales person not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', authenticate, salesPersonController.deleteSalesPerson.bind(salesPersonController));

export default router;
