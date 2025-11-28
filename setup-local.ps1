# POS Server - Local Development Environment Setup Script
# This script will set up both PostgreSQL and RabbitMQ using Docker

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "POS Server - Local Environment Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create a .env file based on .env.example"
    Write-Host "You can copy it with: Copy-Item .env.example .env"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Environment file found" -ForegroundColor Green

# Check if docker-compose.yml exists
if (-not (Test-Path "docker-compose.yml")) {
    Write-Host "[ERROR] docker-compose.yml file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please make sure you are running this script from the project root directory."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[OK] Docker Compose file found" -ForegroundColor Green
Write-Host ""

# Check if Docker is running
try {
    docker info | Out-Null
    Write-Host "[OK] Docker is running" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "[ERROR] Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop, wait until it is fully started,"
    Write-Host "and then run this script again."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Start PostgreSQL container
Write-Host "[INFO] Starting PostgreSQL container..." -ForegroundColor Yellow
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
Write-Host "[INFO] Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
    $result = docker exec cpos-postgres pg_isready -U postgres 2>&1
    if ($LASTEXITCODE -eq 0) {
        break
    }
    Write-Host "[INFO] Waiting for PostgreSQL to accept connections..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    $attempt++
}

if ($attempt -eq $maxAttempts) {
    Write-Host "[ERROR] PostgreSQL failed to start within the expected time!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] PostgreSQL is ready!" -ForegroundColor Green
Write-Host ""

# Start RabbitMQ container
Write-Host "[INFO] Starting RabbitMQ container..." -ForegroundColor Yellow
docker-compose up -d rabbitmq

# Wait for RabbitMQ to be ready
Write-Host "[INFO] Waiting for RabbitMQ to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$attempt = 0
while ($attempt -lt $maxAttempts) {
    $result = docker exec cpos-rabbitmq rabbitmq-diagnostics ping 2>&1
    if ($LASTEXITCODE -eq 0) {
        break
    }
    Write-Host "[INFO] Waiting for RabbitMQ to accept connections..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    $attempt++
}

if ($attempt -eq $maxAttempts) {
    Write-Host "[ERROR] RabbitMQ failed to start within the expected time!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] RabbitMQ is ready!" -ForegroundColor Green
Write-Host ""

# Apply Prisma migrations
Write-Host "[INFO] Applying database schema (Prisma migrations)..." -ForegroundColor Yellow
npx prisma migrate deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[WARNING] Migrate deploy failed!" -ForegroundColor Yellow
    Write-Host "[INFO] This usually happens when setting up for the first time." -ForegroundColor Yellow
    Write-Host "[INFO] Trying to apply migrations using migrate dev..." -ForegroundColor Yellow
    Write-Host ""

    npx prisma migrate dev

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Failed to apply database schema!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Possible solutions:"
        Write-Host "  1. Reset the database and migrations:"
        Write-Host "     - Stop containers: docker-compose down -v"
        Write-Host "     - Delete migrations: Remove-Item -Recurse -Force prisma/migrations"
        Write-Host "     - Restart this script"
        Write-Host ""
        Write-Host "  2. Or manually reset migrations:"
        Write-Host "     - npx prisma migrate reset"
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "[OK] Schema applied successfully!" -ForegroundColor Green
Write-Host ""

# Show connection info
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "[OK] Setup Complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "PostgreSQL Connection Details:" -ForegroundColor White
Write-Host "  Host:     localhost"
Write-Host "  Port:     5432"
Write-Host "  Database: cpos"
Write-Host "  Username: postgres"
Write-Host "  Password: postgres"
Write-Host ""
Write-Host "Connection String:" -ForegroundColor White
Write-Host "  postgresql://postgres:postgres@localhost:5432/cpos" -ForegroundColor Cyan
Write-Host ""
Write-Host "RabbitMQ Connection Details:" -ForegroundColor White
Write-Host "  Host:     localhost"
Write-Host "  AMQP Port: 5672"
Write-Host "  Management UI Port: 15672"
Write-Host "  Username: guest"
Write-Host "  Password: guest"
Write-Host "  VHost:    /"
Write-Host ""
Write-Host "Connection String:" -ForegroundColor White
Write-Host "  amqp://guest:guest@localhost:5672/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Management UI:" -ForegroundColor White
Write-Host "  Access at: http://localhost:15672" -ForegroundColor Cyan
Write-Host "  Username: guest"
Write-Host "  Password: guest"
Write-Host ""
Write-Host "Optional: Start pgAdmin for database management:" -ForegroundColor White
Write-Host "  docker-compose up -d pgadmin"
Write-Host "  Access at: http://localhost:5050" -ForegroundColor Cyan
Write-Host "  Email: admin@cpos.local"
Write-Host "  Password: admin"
Write-Host ""
Write-Host "Start the server with:" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to continue"
