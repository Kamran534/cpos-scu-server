# POS Server

Point of Sale Server API built with Express, TypeScript, and PostgreSQL.

## Project Structure

```
pos-server/
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/         # Data models/types
│   ├── routes/         # API route definitions
│   ├── middleware/     # Express middleware
│   ├── services/       # Business logic
│   ├── sync/           # Sync functionality
│   ├── config/         # Configuration
│   ├── lib/            # Library utilities (socket, swagger)
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── scripts/            # Utility scripts
├── docs/               # Documentation
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (optional, for database features)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the development server:
```bash
npm run dev
# or
npm run start:dev
```

The server will start on `http://localhost:4000` (or the PORT specified in your .env file).

You'll see a terminal interface showing:
- Server status and URLs
- Swagger documentation URL

## Available Scripts

- `npm run dev` - Start development server with hot reload (tsx watch)
- `npm run start:dev` - Start development server with nodemon
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Type check without building
- `npm run generate:jwt-secret` - Generate a secure random JWT secret string

## API Documentation

### Swagger UI

Interactive API documentation is available at:

```
http://localhost:4000/api-docs
```

The Swagger UI provides:
- Complete API endpoint documentation
- Try-it-out functionality to test endpoints
- Request/response schemas
- Authentication support

### Documenting Your Endpoints

Add JSDoc comments with `@swagger` tags above your route handlers:

```typescript
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
router.get('/products', handler);
```

See [docs/SWAGGER_SETUP.md](./docs/SWAGGER_SETUP.md) for detailed documentation guide.

## API Endpoints

### Health Check
- `GET /` - Server status
- `GET /health` - Server health status
- `GET /api/health` - API health check with detailed status
- `GET /api` - API information

## Environment Variables

See `.env.example` for all available environment variables.

### Generating JWT Secret

Generate a secure random JWT secret:

```bash
npm run generate:jwt-secret
```

Or with custom length:

```bash
node scripts/generate-jwt-secret.js 128
```

This will output a secure random string that you can use as your `JWT_SECRET` in the `.env` file.

## Development

The project uses:
- **Express** - Web framework
- **TypeScript** - Type safety
- **PostgreSQL** - Database (via `pg` library, optional)
- **Socket.io** - WebSocket support
- **Swagger/OpenAPI** - API documentation
- **Zod** - Schema validation
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing

## Project Features

- ✅ ES Modules support (`"type": "module"`)
- ✅ TypeScript with strict mode
- ✅ Hot reload development (tsx/nodemon)
- ✅ Swagger/OpenAPI documentation
- ✅ Socket.io for real-time features
- ✅ CORS middleware with origin management
- ✅ Error handling middleware
- ✅ Colored request logging
- ✅ JWT secret generator utility

## License

MIT
