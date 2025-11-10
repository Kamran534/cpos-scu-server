import { Router } from 'express';
import { categoryController } from '../controllers/categoryController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/categories:
 *   put:
 *     summary: Create or update a category
 *     description: Creates a new category or updates an existing one if id is provided
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Optional - Category ID. If provided, updates existing category; otherwise creates new one
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               name:
 *                 type: string
 *                 required: true
 *                 description: Category name
 *                 example: "Electronics"
 *               parentCategoryId:
 *                 type: string
 *                 nullable: true
 *                 description: Optional - ID of parent category for hierarchical structure
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: Optional - Category description
 *                 example: "Electronic devices and accessories"
 *               image:
 *                 type: string
 *                 nullable: true
 *                 description: Optional - Image URL or path
 *                 example: "https://example.com/images/electronics.jpg"
 *               sortOrder:
 *                 type: integer
 *                 description: "Optional - Sort order for display (default: 0)"
 *                 example: 1
 *               isActive:
 *                 type: boolean
 *                 description: "Optional - Whether category is active (default: true)"
 *                 example: true
 *           examples:
 *             create:
 *               summary: Create new category
 *               value:
 *                 name: "Electronics"
 *                 description: "Electronic devices and accessories"
 *                 sortOrder: 1
 *                 isActive: true
 *             update:
 *               summary: Update existing category
 *               value:
 *                 id: "123e4567-e89b-12d3-a456-426614174000"
 *                 name: "Electronics Updated"
 *                 description: "Updated description"
 *                 sortOrder: 2
 *     responses:
 *       200:
 *         description: Category created or updated successfully
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
 *                     id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     name:
 *                       type: string
 *                       example: "Electronics"
 *                     parentCategoryId:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     description:
 *                       type: string
 *                       nullable: true
 *                       example: "Electronic devices and accessories"
 *                     image:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     sortOrder:
 *                       type: integer
 *                       example: 1
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     parentCategory:
 *                       type: object
 *                       nullable: true
 *                     childCategories:
 *                       type: array
 *                       items:
 *                         type: object
 *                     _count:
 *                       type: object
 *                       properties:
 *                         products:
 *                           type: integer
 *       400:
 *         description: Invalid input or validation error
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
 *                   example: "Parent category not found"
 */
router.put('/', authenticate, categoryController.createOrUpdateCategory.bind(categoryController));

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get all categories
 *     description: Retrieves all categories, optionally including inactive ones
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inactive categories in results
 *     responses:
 *       200:
 *         description: List of categories retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "123e4567-e89b-12d3-a456-426614174000"
 *                       name:
 *                         type: string
 *                         example: "Electronics"
 *                       parentCategoryId:
 *                         type: string
 *                         nullable: true
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       image:
 *                         type: string
 *                         nullable: true
 *                       sortOrder:
 *                         type: integer
 *                         example: 1
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       parentCategory:
 *                         type: object
 *                         nullable: true
 *                       childCategories:
 *                         type: array
 *                         items:
 *                           type: object
 *                       _count:
 *                         type: object
 *                         properties:
 *                           products:
 *                             type: integer
 *                 count:
 *                   type: integer
 *                   example: 10
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, categoryController.getAllCategories.bind(categoryController));

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     description: Retrieves a single category by its ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Category retrieved successfully
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
 *                     id:
 *                       type: string
 *                       example: "123e4567-e89b-12d3-a456-426614174000"
 *                     name:
 *                       type: string
 *                       example: "Electronics"
 *                     parentCategoryId:
 *                       type: string
 *                       nullable: true
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     image:
 *                       type: string
 *                       nullable: true
 *                     sortOrder:
 *                       type: integer
 *                       example: 1
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     parentCategory:
 *                       type: object
 *                       nullable: true
 *                     childCategories:
 *                       type: array
 *                       items:
 *                         type: object
 *                     _count:
 *                       type: object
 *                       properties:
 *                         products:
 *                           type: integer
 *       404:
 *         description: Category not found
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
 *                   example: "Category not found"
 *       500:
 *         description: Server error
 */
router.get('/:id', authenticate, categoryController.getCategoryById.bind(categoryController));

export { router as categoryRoutes };

