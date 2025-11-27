# Quick Migration Fix - Copy & Paste Commands

## Run these commands one by one in PowerShell:

```powershell
cd C:\Users\kamra\Desktop\monorepo\pos-server

# 1. Backup existing migrations (optional)
if (Test-Path "prisma\migrations") { Move-Item "prisma\migrations" "prisma\migrations_backup" }

# 2. Stop and reset database
docker-compose down -v

# 3. Start fresh database
docker-compose up -d postgres

# 4. Wait for database to be ready (15 seconds)
Start-Sleep -Seconds 15

# 5. Create fresh migration
npx prisma migrate dev --name init

# 6. Seed database
npm run prisma:seed

# 7. Start server
npm run dev
```

## Alternative: Use db push (Faster, No Migration Files)

```powershell
cd C:\Users\kamra\Desktop\monorepo\pos-server

# 1. Make sure database is running
docker-compose up -d postgres

# 2. Wait 10 seconds
Start-Sleep -Seconds 10

# 3. Push schema directly
npx prisma db push --accept-data-loss

# 4. Seed database
npm run prisma:seed

# 5. Start server
npm run dev
```

## Verify Everything Works

```powershell
# Check tables exist
docker exec -it cpos-postgres psql -U postgres -d cpos -c "\dt"

# Open Prisma Studio to view data
npx prisma studio
```
