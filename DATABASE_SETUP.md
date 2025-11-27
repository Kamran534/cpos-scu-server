# Local PostgreSQL & RabbitMQ Setup

This guide will help you set up local PostgreSQL database and RabbitMQ message broker for the POS Server using Docker.

## Prerequisites

- Docker Desktop installed and running
- Node.js and npm installed

## Quick Start

### 1. Start the PostgreSQL Database

Run the following command in the `pos-server` directory:

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** on port `5432` (database name: `cpos`)
- **RabbitMQ** on port `5672` (AMQP) and `15672` (Management UI)
- **pgAdmin** on port `5050` (optional database management UI)

### 2. Verify Database is Running

Check if the containers are running:

```bash
docker-compose ps
```

You should see `cpos-postgres`, `cpos-rabbitmq`, and `cpos-pgadmin` containers running.

### 3. Push Schema to Database

Run Prisma migrations to create all tables:

```bash
npx prisma migrate deploy
```

Or reset the database and apply all migrations:

```bash
npx prisma migrate reset
```

### 4. Seed the Database (Optional)

Populate the database with initial data:

```bash
npx prisma db seed
```

### 5. Start the Server

```bash
npm run dev
```

## Database Connection Details

- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `cpos`
- **Username**: `postgres`
- **Password**: `postgres`
- **Connection String**: `postgresql://postgres:postgres@localhost:5432/cpos`

## RabbitMQ Management UI

Access the RabbitMQ Management UI at: http://localhost:15672

- **Username**: `guest`
- **Password**: `guest`

### RabbitMQ Connection Details:
- **AMQP Port**: `5672`
- **Management Port**: `15672`
- **Connection URL**: `amqp://guest:guest@localhost:5672`
- **Default VHost**: `/`

### Using RabbitMQ:
- View queues, exchanges, and connections
- Monitor message rates
- Manage users and permissions
- Publish test messages

## pgAdmin Access (Optional)

Access the pgAdmin web interface at: http://localhost:5050

- **Email**: `admin@cpos.local`
- **Password**: `admin`

### Adding Server in pgAdmin:

1. Right-click "Servers" → "Register" → "Server"
2. General tab:
   - Name: `CPOS Local`
3. Connection tab:
   - Host: `postgres` (container name) or `host.docker.internal`
   - Port: `5432`
   - Database: `cpos`
   - Username: `postgres`
   - Password: `postgres`

## Useful Commands

### Start Database
```bash
docker-compose up -d
```

### Stop Database
```bash
docker-compose down
```

### Stop and Remove All Data
```bash
docker-compose down -v
```

### View Database Logs
```bash
docker-compose logs -f postgres
```

### Access PostgreSQL CLI
```bash
docker exec -it cpos-postgres psql -U postgres -d cpos
```

### Create New Migration
```bash
npx prisma migrate dev --name your_migration_name
```

### Apply Migrations
```bash
npx prisma migrate deploy
```

### Generate Prisma Client
```bash
npx prisma generate
```

### View Database in Prisma Studio
```bash
npx prisma studio
```

## Switching Between Local and Cloud Database

To switch back to Neon cloud database:

1. Open `.env` file
2. Comment out the local DATABASE_URL
3. Uncomment the Neon DATABASE_URL
4. Restart the server

```env
# Local PostgreSQL (Docker) - commented out
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cpos

# Neon Cloud Database
DATABASE_URL=postgresql://neondb_owner:npg_Kbl4kZC5jivQ@ep-rapid-thunder-ahc07db9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## Troubleshooting

### Port 5432 Already in Use

If you have PostgreSQL installed locally:

1. Stop the local PostgreSQL service
2. Or change the port in `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"  # Use port 5433 instead
   ```
3. Update DATABASE_URL in `.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cpos
   ```

### Connection Refused

Make sure Docker is running:
```bash
docker ps
```

Restart the containers:
```bash
docker-compose restart
```

### Reset Everything

```bash
# Stop containers and remove volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Apply migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed
```
