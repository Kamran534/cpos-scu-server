# Quick Start - Local PostgreSQL Setup

## 🚀 Automated Setup (Recommended)

### Windows
```bash
setup-local-db.bat
```

### Linux/Mac
```bash
chmod +x setup-local-db.sh
./setup-local-db.sh
```

## 📋 Manual Setup

### Step 1: Start PostgreSQL
```bash
npm run db:start
```

### Step 2: Apply Schema & Seed Database
```bash
npm run db:setup
```

### Step 3: Start Server
```bash
npm run dev
```

## 🛠️ Useful Commands

| Command | Description |
|---------|-------------|
| `npm run db:start` | Start PostgreSQL container |
| `npm run db:stop` | Stop PostgreSQL container |
| `npm run db:reset` | Reset database (delete all data) |
| `npm run db:logs` | View PostgreSQL logs |
| `npm run db:setup` | Full setup (start + migrate + seed) |
| `npx prisma studio` | Open database GUI |
| `npx prisma migrate dev` | Create new migration |

## 🔧 Database Connection

- **URL**: `postgresql://postgres:postgres@localhost:5432/cpos`
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `cpos`
- **User**: `postgres`
- **Password**: `postgres`

## 🌐 pgAdmin (Optional)

Start pgAdmin for visual database management:

```bash
docker-compose up -d pgadmin
```

Access at: http://localhost:5050
- Email: `admin@cpos.local`
- Password: `admin`

## 🔄 Switching Databases

### Use Local PostgreSQL (Current)
In `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cpos
```

### Use Neon Cloud
In `.env`:
```env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cpos
DATABASE_URL=postgresql://neondb_owner:npg_Kbl4kZC5jivQ@ep-rapid-thunder-ahc07db9-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

## 🐛 Troubleshooting

### Port 5432 Already in Use
If you have local PostgreSQL running:

1. Stop local PostgreSQL service
2. Or use different port in `docker-compose.yml`:
   ```yaml
   ports:
     - "5433:5432"
   ```
3. Update `.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5433/cpos
   ```

### Database Connection Failed
```bash
# Check if container is running
docker ps

# Restart containers
docker-compose restart

# View logs
npm run db:logs
```

### Reset Everything
```bash
npm run db:reset
npm run db:setup
```

## 📚 Full Documentation

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed documentation.
