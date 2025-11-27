# Fix PostgreSQL Migration Script
# This script will reset migrations and create a fresh baseline

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "POS Server - Migration Fix" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "prisma\schema.prisma")) {
    Write-Host "[ERROR] Please run this script from the pos-server directory" -ForegroundColor Red
    exit 1
}

# Ask user for confirmation
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Delete existing migration files" -ForegroundColor Yellow
Write-Host "  2. Reset the database" -ForegroundColor Yellow
Write-Host "  3. Create a fresh baseline migration" -ForegroundColor Yellow
Write-Host "  4. Seed the database" -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue? (y/n)"

if ($confirm -ne "y") {
    Write-Host "Aborted." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "[Step 1/5] Backing up existing migrations..." -ForegroundColor Green
if (Test-Path "prisma\migrations") {
    $backupName = "migrations_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Move-Item -Path "prisma\migrations" -Destination "prisma\$backupName"
    Write-Host "  Backed up to: prisma\$backupName" -ForegroundColor Gray
} else {
    Write-Host "  No existing migrations to backup" -ForegroundColor Gray
}

Write-Host ""
Write-Host "[Step 2/5] Stopping and resetting database..." -ForegroundColor Green
docker-compose down -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to stop database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[Step 3/5] Starting fresh database..." -ForegroundColor Green
docker-compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start database" -ForegroundColor Red
    exit 1
}

Write-Host "  Waiting for PostgreSQL to be ready..."
Start-Sleep -Seconds 5

$maxAttempts = 30
$attempt = 0
$ready = $false

while (-not $ready -and $attempt -lt $maxAttempts) {
    $attempt++
    try {
        docker exec cpos-postgres pg_isready -U postgres 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
        } else {
            Write-Host "  Waiting... ($attempt/$maxAttempts)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "  Waiting... ($attempt/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $ready) {
    Write-Host "[ERROR] Database failed to become ready" -ForegroundColor Red
    exit 1
}

Write-Host "  Database is ready!" -ForegroundColor Green

Write-Host ""
Write-Host "[Step 4/5] Creating baseline migration..." -ForegroundColor Green
npx prisma migrate dev --name init --skip-seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to create migration" -ForegroundColor Red
    Write-Host ""
    Write-Host "Trying alternative method (db push)..." -ForegroundColor Yellow
    npx prisma db push --accept-data-loss
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to push schema" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[Step 5/5] Seeding database..." -ForegroundColor Green
npm run prisma:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Seeding failed, but database schema is ready" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Migration Fix Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start the server: npm run dev" -ForegroundColor White
Write-Host "  2. View database: npx prisma studio" -ForegroundColor White
Write-Host "  3. Check tables: docker exec -it cpos-postgres psql -U postgres -d cpos -c '\dt'" -ForegroundColor White
Write-Host ""
