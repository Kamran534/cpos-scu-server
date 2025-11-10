# Swagger/OpenAPI Documentation Setup Guide

This guide explains how to set up and use Swagger documentation in the POS Server API.

## Table of Contents

- [Overview](#overview)
- [Accessing the Documentation](#accessing-the-documentation)
- [Documenting Endpoints](#documenting-endpoints)
- [Examples](#examples)
- [Best Practices](#best-practices)
- [Advanced Configuration](#advanced-configuration)

## Overview

The POS Server uses **Swagger UI** and **swagger-jsdoc** to automatically generate interactive API documentation from JSDoc comments in your code.

### Features

- ✅ Interactive API documentation
- ✅ Try-it-out functionality
- ✅ Request/response examples
- ✅ Authentication support
- ✅ Schema validation
- ✅ Auto-generated from code comments

## Accessing the Documentation

Once the server is running, access the Swagger UI at:

```
http://localhost:4000/api-docs
```

The documentation is automatically generated from JSDoc comments in your route files and controllers.

## Documenting Endpoints

### Basic Endpoint Documentation

Add JSDoc comments above your route handlers using the `@swagger` tag:

```typescript
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     description: Retrieve a list of all products
 *     tags: [Products]
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
 */
router.get('/products', async (req, res) => {
  // Your route handler
});
```

### POST Endpoint with Request Body

```typescript
/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     description: Create a new product in the system
 *     tags: [Products]
 *     security:
 *       - TradeUnleashed: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Product Name"
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 29.99
 *               description:
 *                 type: string
 *                 example: "Product description"
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/products', async (req, res) => {
  // Your route handler
});
```

### GET Endpoint with Query Parameters

```typescript
/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get products with pagination
 *     description: Retrieve products with pagination and filtering
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: Paginated list of products
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
router.get('/products', async (req, res) => {
  // Your route handler
});
```

### GET Endpoint with Path Parameters

```typescript
/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     description: Retrieve a specific product by its ID
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
router.get('/products/:id', async (req, res) => {
  // Your route handler
});
```

### PUT/PATCH Endpoint

```typescript
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
 *         description: Product ID
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
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/products/:id', async (req, res) => {
  // Your route handler
});
```

### DELETE Endpoint

```typescript
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
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/products/:id', async (req, res) => {
  // Your route handler
});
```

## Examples

### Complete Route File Example

```typescript
import { Router } from 'express';
import { ProductController } from '../controllers/ProductController.js';

const router = Router();
const controller = new ProductController();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - price
 *       properties:
 *         id:
 *           type: string
 *           example: "prod_123"
 *         name:
 *           type: string
 *           example: "Product Name"
 *         price:
 *           type: number
 *           format: float
 *           example: 29.99
 *         description:
 *           type: string
 *           example: "Product description"
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
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', controller.getAll);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', controller.getById);

export default router;
```

## Best Practices

### 1. Use Tags for Organization

Group related endpoints using tags:

```typescript
/**
 * @swagger
 * tags:
 *   - name: Products
 *     description: Product management
 *   - name: Orders
 *     description: Order processing
 */
```

### 2. Reference Common Schemas

Define reusable schemas in your Swagger config and reference them:

```typescript
/**
 * @swagger
 * responses:
 *   200:
 *     description: Success
 *     content:
 *       application/json:
 *         schema:
 *           $ref: '#/components/schemas/Success'
 */
```

### 3. Document All Parameters

Always document path parameters, query parameters, and request bodies:

```typescript
/**
 * @swagger
 * parameters:
 *   - in: query
 *     name: page
 *     schema:
 *       type: integer
 *     description: Page number
 */
```

### 4. Include Examples

Provide examples for request bodies and responses:

```typescript
/**
 * @swagger
 * requestBody:
 *   content:
 *     application/json:
 *       schema:
 *         type: object
 *         example:
 *           name: "Product Name"
 *           price: 29.99
 */
```

### 5. Document Security Requirements

Specify which endpoints require authentication:

```typescript
/**
 * @swagger
 * security:
 *   - TradeUnleashed: []
 */
```

## Advanced Configuration

### Custom Swagger UI Styling

Edit `src/lib/swagger.ts` to customize the Swagger UI appearance:

```typescript
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
  `,
  // ... other options
};
```

### Adding More Tags

Add tags in `src/lib/swagger.ts`:

```typescript
tags: [
  {
    name: 'YourTag',
    description: 'Description of your tag',
  },
],
```

### Custom Schemas

Define reusable schemas in `src/lib/swagger.ts`:

```typescript
components: {
  schemas: {
    YourSchema: {
      type: 'object',
      properties: {
        // ... properties
      },
    },
  },
},
```

## Testing with Swagger UI

1. Start your server: `npm run dev`
2. Open `http://localhost:4000/api-docs`
3. Click "Authorize" to add your JWT token (if needed)
4. Click "Try it out" on any endpoint
5. Fill in parameters and click "Execute"
6. View the response

## Troubleshooting

### Documentation Not Appearing

- Ensure JSDoc comments use the `@swagger` tag
- Check that file paths in `swaggerOptions.apis` are correct
- Verify the server is reading the correct files

### Schema Not Found

- Ensure schemas are defined in `components.schemas`
- Use `$ref: '#/components/schemas/YourSchema'` to reference them

### Authentication Not Working

- Ensure security schemes are defined in `components.securitySchemes`
- Add `security: [{ TradeUnleashed: [] }]` to protected endpoints

## Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [swagger-jsdoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Documentation](https://swagger.io/tools/swagger-ui/)

