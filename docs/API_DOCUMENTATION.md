# API Documentation Guide

This document provides detailed information about documenting your API endpoints using Swagger/OpenAPI.

## Quick Start

1. Add JSDoc comments above your route handlers
2. Use the `@swagger` tag to define the endpoint
3. Access documentation at `http://localhost:4000/api-docs`

## Common Patterns

### Response Schemas

#### Success Response

```typescript
/**
 * @swagger
 * responses:
 *   200:
 *     description: Success
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *               example: true
 *             data:
 *               type: object
 *             message:
 *               type: string
 */
```

#### Error Response

```typescript
/**
 * @swagger
 * responses:
 *   400:
 *     $ref: '#/components/responses/ValidationError'
 *   401:
 *     $ref: '#/components/responses/UnauthorizedError'
 *   404:
 *     $ref: '#/components/responses/NotFoundError'
 *   500:
 *     $ref: '#/components/responses/ServerError'
 */
```

### Pagination

```typescript
/**
 * @swagger
 * responses:
 *   200:
 *     description: Paginated response
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             success:
 *               type: boolean
 *             data:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *             pagination:
 *               $ref: '#/components/schemas/Pagination'
 */
```

### File Upload

```typescript
/**
 * @swagger
 * /api/products/upload:
 *   post:
 *     summary: Upload product image
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 */
```

### Enum Values

```typescript
/**
 * @swagger
 * parameters:
 *   - in: query
 *     name: status
 *     schema:
 *       type: string
 *       enum: [active, inactive, pending]
 *       default: active
 */
```

### Date/Time Formats

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       properties:
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *         date:
 *           type: string
 *           format: date
 *           example: "2024-01-01"
 */
```

## Complete Example: Product CRUD

```typescript
import { Router } from 'express';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           readOnly: true
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         price:
 *           type: number
 *           format: float
 *           minimum: 0
 *         description:
 *           type: string
 *         category:
 *           type: string
 *         stock:
 *           type: integer
 *           minimum: 0
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List all products
 *     description: Retrieve a paginated list of products with optional filtering
 *     tags: [Products]
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
 *           default: 20
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products
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
 *                     $ref: '#/components/schemas/Product'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 */
router.get('/', getProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve a single product by its unique identifier
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', getProductById);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create new product
 *     description: Create a new product in the system
 *     tags: [Products]
 *     security:
 *       - TradeUnleashed: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *           example:
 *             name: "New Product"
 *             price: 29.99
 *             description: "Product description"
 *             category: "Electronics"
 *             stock: 100
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/', createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product
 *     description: Update an existing product
 *     tags: [Products]
 *     security:
 *       - TradeUnleashed: []
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
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete product
 *     description: Delete a product by ID
 *     tags: [Products]
 *     security:
 *       - TradeUnleashed: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', deleteProduct);

export default router;
```

## Tips

1. **Be Descriptive**: Write clear summaries and descriptions
2. **Use Examples**: Provide example values for better understanding
3. **Document Errors**: Include all possible error responses
4. **Group by Tags**: Use tags to organize related endpoints
5. **Reference Schemas**: Reuse common schemas instead of duplicating
6. **Test in Swagger UI**: Use the "Try it out" feature to test endpoints

## See Also

- [SWAGGER_SETUP.md](./SWAGGER_SETUP.md) - Detailed setup guide
- [Swagger UI](http://localhost:4000/api-docs) - Interactive documentation

