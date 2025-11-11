import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index.js';

const baseUrl = config.baseUrl;

/**
 * Swagger/OpenAPI Configuration
 * 
 * This configuration generates API documentation from JSDoc comments
 * in your route files and controllers.
 * 
 * To add documentation to your endpoints:
 * 1. Add JSDoc comments above your route handlers
 * 2. Use @swagger tags to document the endpoint
 * 3. See examples in routes/ directory
 */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.1',
    info: {
      title: 'POS Server API',
      version: '1.0.0',
      description: 'POS Server API - Complete API documentation for the Point of Sale Server.',
      contact: {
        name: 'API Support',
        email: 'support@pos-server.com',
        url: 'https://github.com/your-org/pos-server',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      termsOfService: `${baseUrl}/terms`,
    },
    servers: [
      {
        url: baseUrl,
        description: 'Development Server',
      },
      {
        url: 'https://api.pos-server.com',
        description: 'Production Server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'Health check and server status endpoints',
      },
      {
        name: 'Categories',
        description: 'Category management endpoints',
      },
      {
        name: 'Products',
        description: 'Product management endpoints',
      },
      {
        name: 'Variants',
        description: 'Product variant endpoints',
      },
      {
        name: 'Inventory',
        description: 'Inventory management endpoints',
      },
      {
        name: 'Sync',
        description: 'Database synchronization endpoints',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT authentication token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Error description',
                },
                code: {
                  type: 'string',
                  example: 'ERROR_CODE',
                },
                details: {
                  type: 'object',
                  description: 'Additional error details',
                },
              },
            },
          },
        },
        Success: {
          type: 'object',
          required: ['success'],
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            data: {
              type: 'object',
              description: 'Response data',
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              example: 1,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              example: 20,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              example: 5,
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or invalid token',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  message: 'Unauthorized',
                  code: 'UNAUTHORIZED',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  message: 'Resource not found',
                  code: 'NOT_FOUND',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  message: 'Validation failed',
                  code: 'VALIDATION_ERROR',
                  details: {
                    field: 'email',
                    message: 'Invalid email format',
                  },
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  message: 'Internal server error',
                  code: 'SERVER_ERROR',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/**/*.ts',
    './src/controllers/**/*.ts',
    './src/app.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);

/**
 * Swagger UI options
 */
export const swaggerUiOptions = {
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 50px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
  `,
  customSiteTitle: 'POS Server API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 2,
    defaultModelExpandDepth: 2,
    tryItOutEnabled: true,
  },
};

export { swaggerUi };

