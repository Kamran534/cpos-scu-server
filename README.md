# POS Server

Point of Sale Server API built with Express, TypeScript, PostgreSQL, and RabbitMQ for real-time data synchronization.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Development](#development)
  - [Available Scripts](#available-scripts)
  - [Running the Server](#running-the-server)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
  - [RabbitMQ Integration](#rabbitmq-integration)
  - [Database Schema](#database-schema)
  - [Authentication](#authentication)
  - [Sync Services](#sync-services)
- [Testing](#testing)
- [Deployment](#deployment)
- [License](#license)

## Overview

POS Server is a comprehensive Point of Sale backend system designed for retail operations. It provides RESTful APIs for managing products, categories, customers, orders, inventory, and user authentication. The system includes real-time synchronization capabilities via RabbitMQ for multi-location deployments and HQ server integration.

## Features

- ✅ **RESTful API** - Complete CRUD operations for POS entities
- ✅ **Authentication & Authorization** - JWT-based auth with role-based permissions
- ✅ **RabbitMQ Integration** - Message queue for real-time data sync
- ✅ **User Sync Service** - Automatic user data synchronization from HQ
- ✅ **Database Management** - PostgreSQL with Prisma ORM
- ✅ **Real-time Updates** - Socket.io for live data streaming
- ✅ **API Documentation** - Swagger/OpenAPI interactive docs
- ✅ **Type Safety** - Full TypeScript with strict mode
- ✅ **Hot Reload** - Development server with auto-reload
- ✅ **Security** - Helmet, CORS, JWT authentication
- ✅ **Error Handling** - Comprehensive error middleware
- ✅ **Logging** - Colored request logging

## Project Structure

```
pos-server/
├── src/                          # Source code
│   ├── app.ts                    # Express app configuration
│   ├── server.ts                 # Server entry point & startup
│   │
│   ├── config/                   # Configuration modules
│   │   ├── index.ts              # Centralized app configuration (all env vars)
│   │   ├── rabbitmq.ts            # RabbitMQ connection & setup
│   │   ├── socket.ts              # Socket.io configuration
│   │   └── swagger.ts             # Swagger/OpenAPI configuration
│   │
│   ├── controllers/              # Request handlers
│   │   ├── authController.ts     # Authentication endpoints
│   │   ├── categoryController.ts # Category management
│   │   ├── productController.ts  # Product management
│   │   └── syncController.ts     # Sync operations
│   │
│   ├── routes/                   # API route definitions
│   │   ├── index.ts              # Main router aggregator
│   │   ├── authRoutes.ts         # Auth routes
│   │   ├── categoryRoutes.ts     # Category routes
│   │   ├── productRoutes.ts      # Product routes
│   │   └── syncRoutes.ts         # Sync routes
│   │
│   ├── services/                 # Business logic layer
│   │   ├── authService.ts        # Authentication logic
│   │   ├── categoryService.ts    # Category operations
│   │   ├── productService.ts     # Product operations
│   │   ├── syncService.ts        # Data synchronization
│   │   ├── syncScheduler.ts      # Scheduled sync tasks
│   │   └── userSyncService.ts    # User sync from RabbitMQ
│   │
│   ├── repositories/             # Data access layer
│   │   └── userRepository.ts     # User database operations
│   │
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               # JWT authentication
│   │   ├── cors.ts               # CORS configuration
│   │   ├── errorHandler.ts       # Error handling
│   │   ├── logger.ts             # Request logging
│   │   └── notFoundHandler.ts    # 404 handler
│   │
│   └── rabbit/                   # RabbitMQ integration
│       ├── consumer.ts           # Message consumer
│       └── producer.ts           # Message producer
│
├── prisma/                       # Database schema
│   └── schema.prisma             # Prisma schema definition
│
├── scripts/                      # Utility scripts
│   ├── seed-categories.js       # Seed categories
│   ├── seed-categories-hierarchical.js
│   └── seed-products.js          # Seed products
│
├── assets/                       # Static assets
│   └── images/                   # Product/category images
│       ├── brands/
│       ├── categories/
│       └── products/
│
├── demo-data/                    # Sample data files
│   ├── categories.json
│   ├── categories-hierarchical.json
│   ├── products-with-variants.json
│   └── README.md
│
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── nodemon.json                  # Nodemon configuration
├── prisma.config.ts              # Prisma configuration
└── README.md                     # This file
```

## Getting Started

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **PostgreSQL** 14+ (for database)
- **RabbitMQ** 3.12+ (for message queue)
- **npm** or **yarn**

### Installation

1. **Clone the repository** (if applicable):
```bash
git clone <repository-url>
cd pos-server
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# See .env.example for all available variables
```

4. **Set up the database**:
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Seed initial data
node scripts/seed-categories.js
node scripts/seed-products.js
```

5. **Start RabbitMQ** (if running locally):
```bash
# Using Docker
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# Or install RabbitMQ locally
# See: https://www.rabbitmq.com/download.html
```

### Environment Variables

All environment variables are centralized in `src/config/index.ts`. 

**Setup**:
1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with your configuration values. See `.env.example` for a complete list of all available variables with descriptions.

**Required Variables**:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `RABBITMQ_URL` - RabbitMQ connection URL
- `QUEUE_NAME` - RabbitMQ queue name

**Optional Variables** (with defaults):
- `PORT` - Server port (default: 4000)
- `NODE_ENV` - Environment mode (default: development)
- `BASE_URL` - Base URL for API (default: http://localhost:{PORT})
- `JWT_EXPIRES_IN` - JWT token expiration (default: 7d)
- `CORS_ORIGINS` - Allowed CORS origins (default: *)
- `QUEUE_TYPE` - RabbitMQ queue type: 'quorum' or 'classic' (optional)

**Configuration Management**:
- All environment variables are accessed through the centralized `config` object in `src/config/index.ts`
- This ensures consistent configuration management across the entire application
- No direct `process.env` access outside of the config module

**Generate JWT Secret**:
```bash
npm run generate:jwt-secret
```

## Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload (tsx watch) |
| `npm run start:dev` | Start development server with nodemon |
| `npm run build` | Build for production (TypeScript compilation) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Type check without building |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |
| `npm run prisma:push` | Push schema changes to database |

### Running the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Development mode** (with nodemon):
```bash
npm run start:dev
```

**Production mode**:
```bash
npm run build
npm start
```

The server will start on `http://localhost:4000` (or the PORT specified in your .env file).

**Startup Banner**:
```
┌─────────────────────────────────────┐
│  POS Server is running              │
│  Base URL   : http://localhost:4000 │ (cyan colored)
│  Swagger    : http://localhost:4000/api-docs │ (cyan colored)
│  RabbitMQ UI: http://localhost:15672 │ (cyan colored)
│  Database   : Connected             │
│  RabbitMQ   : Connected             │
└─────────────────────────────────────┘
```

> **Note**: URLs in the terminal banner are displayed in cyan color for better visibility.

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

Add JSDoc comments with `@swagger` tags to document your endpoints. See the Swagger UI at `/api-docs` for interactive API documentation.

### API Endpoints

#### Health Check
- `GET /` - Server status
- `GET /api/health` - API health check with detailed status

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/user/:id` - Get user by ID
- `POST /api/auth/logout` - User logout

#### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

#### Categories
- `GET /api/categories` - Get all categories
- `GET /api/categories/:id` - Get category by ID
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

#### Sync
- `POST /api/sync/trigger` - Manually trigger sync
- `GET /api/sync/status` - Get sync status

#### RabbitMQ Testing
- `POST /send` - Send test message to RabbitMQ queue

## Architecture

### RabbitMQ Integration

The system uses RabbitMQ for message queue integration, enabling real-time data synchronization with HQ servers.

**Configuration** (`src/config/rabbitmq.ts`):
- Connection management with automatic reconnection
- Queue declaration with support for quorum/classic queue types
- Channel management with singleton pattern
- Error handling and connection monitoring
- Uses centralized config from `src/config/index.ts`

**Consumer** (`src/rabbit/consumer.ts`):
- Listens for messages from the queue
- Parses JSON payloads automatically
- Routes messages to appropriate handlers based on message type
- Handles user sync messages (`user.sync`, `user`, `user.update`)
- Acknowledges messages after successful processing
- Logs connection status: `[RabbitMQ] Waiting for messages in queue: {QUEUE_NAME}`

**Producer** (`src/rabbit/producer.ts`):
- Sends messages to the queue
- Used for testing and future integrations
- Simple interface for message publishing

**User Sync Service** (`src/services/userSyncService.ts`):
- Processes user sync messages from RabbitMQ
- Creates/updates users in the database via repository layer
- Handles role resolution (by ID or name, auto-creates if missing)
- Password hashing (supports both plain password and pre-hashed passwords)
- PIN hashing support
- Date parsing and validation

**Example Message Format**:
```json
{
  "type": "user.sync",
  "data": {
    "id": "hq-user-1001",
    "username": "hq.jdoe",
    "email": "jdoe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "password": "Passw0rd!",
    "roleName": "manager",
    "isActive": true
  }
}
```

**Testing via RabbitMQ UI**:
1. Open `http://localhost:15672`
2. Navigate to Queues → `cpos_queue`
3. Click "Publish message"
4. Paste JSON payload
5. Set Content-Type: `application/json`
6. Click "Publish message"

### Database Schema

The database schema is defined in `prisma/schema.prisma` and includes:

- **Users & Permissions** - User accounts, roles, permissions
- **Products & Inventory** - Products, variants, inventory tracking
- **Categories** - Product categories with hierarchy
- **Customers** - Customer management
- **Orders** - Sales orders and transactions
- **Locations** - Store/location management
- **Stock Management** - Adjustments, transfers
- **Financial** - Payments, expenses, accounts

**View Schema**:
```bash
npm run prisma:studio
```

### Authentication

JWT-based authentication with role-based access control:

- **Token Generation** - JWT tokens with user info
- **Token Validation** - Middleware for protected routes
- **Role-Based Access** - Permission checking
- **Password Hashing** - bcrypt for secure storage

### Sync Services

**Automatic Sync** (`src/services/syncScheduler.ts`):
- Runs every hour automatically
- Syncs user data and other entities
- Configurable via cron schedule

**Manual Sync** (`src/services/syncService.ts`):
- Triggered via API endpoint
- On-demand synchronization
- Status tracking

## Testing

### Manual Testing

**Test RabbitMQ Connection**:
```bash
curl -X POST http://localhost:4000/send \
  -H 'Content-Type: application/json' \
  -d '{"message":"Hello RabbitMQ!"}'
```

**Test User Sync**:
```bash
curl -X POST http://localhost:4000/send \
  -H 'Content-Type: application/json' \
  -d '{
    "payload": {
      "type": "user.sync",
      "data": {
        "username": "test.user",
        "email": "test@example.com",
        "password": "Test123!",
        "roleName": "employee"
      }
    }
  }'
```

**Test Authentication**:
```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "test@example.com",
    "password": "Test123!"
  }'
```

## Deployment

### Production Build

1. **Build the project**:
```bash
npm run build
```

2. **Set production environment variables**:
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
JWT_SECRET=...
RABBITMQ_URL=amqp://...
```

3. **Run migrations**:
```bash
npm run prisma:migrate:deploy
```

4. **Start the server**:
```bash
npm start
```

### Docker (Optional)

Example Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Message Queue**: RabbitMQ (amqplib)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Real-time**: Socket.io
- **API Docs**: Swagger/OpenAPI
- **Validation**: Zod
- **Security**: Helmet, CORS
- **Logging**: Custom colored logger
- **Configuration**: Centralized config management

## Project Architecture Highlights

### Centralized Configuration
- All environment variables are managed through `src/config/index.ts`
- No direct `process.env` access outside the config module
- Type-safe configuration with proper defaults
- Easy to test and mock in different environments

### Repository Pattern
- Data access layer separated from business logic
- `src/repositories/userRepository.ts` for user operations
- Enables easy testing and future database migrations

### Service Layer
- Business logic separated from controllers
- Services handle complex operations
- Sync services for data synchronization
- User sync service for RabbitMQ message processing

## License

MIT
