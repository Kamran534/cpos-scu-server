import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieves all products with optional filters and includes
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *         description: Filter by brand ID
 *       - in: query
 *         name: supplierId
 *         schema:
 *           type: string
 *         description: Filter by supplier ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: includeVariants
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include product variants in response
 *       - in: query
 *         name: includeInventory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inventory information (requires includeVariants=true)
 *     responses:
 *       200:
 *         description: List of products retrieved successfully
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
 *                 count:
 *                   type: integer
 *       500:
 *         description: Server error
 */
router.get('/', authenticate, productController.getAllProducts.bind(productController));

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieves a single product by its ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: includeVariants
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include product variants
 *       - in: query
 *         name: includeInventory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inventory information
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/:id', authenticate, productController.getProductById.bind(productController));

/**
 * @swagger
 * /api/products/code/{productCode}:
 *   get:
 *     summary: Get product by product code
 *     description: Retrieves a product by its product code
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Product code
 *       - in: query
 *         name: includeVariants
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include product variants
 *       - in: query
 *         name: includeInventory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inventory information
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *       404:
 *         description: Product not found
 */
router.get('/code/:productCode', authenticate, productController.getProductByCode.bind(productController));

/**
 * @swagger
 * /api/products/{id}/variants:
 *   get:
 *     summary: Get all variants for a product
 *     description: Retrieves all variants for a specific product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: query
 *         name: includeInventory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inventory information for each variant
 *     responses:
 *       200:
 *         description: Variants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 */
router.get('/:id/variants', authenticate, productController.getProductVariants.bind(productController));

// Create separate routers for variants and inventory
const variantRouter = Router();
const inventoryRouter = Router();

/**
 * @swagger
 * /api/variants/{id}:
 *   get:
 *     summary: Get variant by ID
 *     description: Retrieves a single product variant by its ID
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *       - in: query
 *         name: includeInventory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inventory information
 *     responses:
 *       200:
 *         description: Variant retrieved successfully
 *       404:
 *         description: Variant not found
 */
variantRouter.get('/:id', authenticate, productController.getVariantById.bind(productController));

/**
 * @swagger
 * /api/variants/sku/{sku}:
 *   get:
 *     summary: Get variant by SKU
 *     description: Retrieves a product variant by its SKU
 *     tags: [Variants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sku
 *         required: true
 *         schema:
 *           type: string
 *         description: Product variant SKU
 *       - in: query
 *         name: includeInventory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inventory information
 *     responses:
 *       200:
 *         description: Variant retrieved successfully
 *       404:
 *         description: Variant not found
 */
variantRouter.get('/sku/:sku', authenticate, productController.getVariantBySku.bind(productController));

/**
 * @swagger
 * /api/variants/{id}/inventory:
 *   get:
 *     summary: Get inventory for a variant
 *     description: Retrieves all inventory items for a specific variant across all locations
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Variant ID
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       variantId:
 *                         type: string
 *                       locationId:
 *                         type: string
 *                       quantityOnHand:
 *                         type: integer
 *                       quantityAvailable:
 *                         type: integer
 *                       quantityCommitted:
 *                         type: integer
 *                       location:
 *                         type: object
 *                 count:
 *                   type: integer
 */
variantRouter.get('/:id/inventory', authenticate, productController.getVariantInventory.bind(productController));

/**
 * @swagger
 * /api/inventory/location/{locationId}:
 *   get:
 *     summary: Get inventory by location
 *     description: Retrieves all inventory items for a specific location
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: locationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Location ID
 *       - in: query
 *         name: variantId
 *         schema:
 *           type: string
 *         description: Optional filter by variant ID
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 */
inventoryRouter.get('/location/:locationId', authenticate, productController.getInventoryByLocation.bind(productController));

export { router as productRoutes, variantRouter, inventoryRouter };

