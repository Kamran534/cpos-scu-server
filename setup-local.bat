@echo off
REM POS Server - Local Development Environment Setup Script
REM This script will set up both PostgreSQL and RabbitMQ using Docker

echo =========================================
echo POS Server - Local Environment Setup
echo =========================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo.
    echo Please create a .env file based on .env.example
    echo You can copy it with: copy .env.example .env
    echo.
    pause
    exit /b 1
)

echo [OK] Environment file found

REM Check if docker-compose.yml exists
if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml file not found!
    echo.
    echo Please make sure you are running this script from the project root directory.
    echo.
    pause
    exit /b 1
)

echo [OK] Docker Compose file found
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop, wait until it is fully started,
    echo and then run this script again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Start PostgreSQL container
echo [INFO] Starting PostgreSQL container...
docker-compose up -d postgres

REM Wait for PostgreSQL to be ready
echo [INFO] Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

:wait_postgres
docker exec cpos-postgres pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    echo [INFO] Waiting for PostgreSQL to accept connections...
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)

echo [OK] PostgreSQL is ready!
echo.

REM Start RabbitMQ container
echo [INFO] Starting RabbitMQ container...
docker-compose up -d rabbitmq

REM Wait for RabbitMQ to be ready
echo [INFO] Waiting for RabbitMQ to be ready...
timeout /t 5 /nobreak >nul

:wait_rabbitmq
docker exec cpos-rabbitmq rabbitmq-diagnostics ping >nul 2>&1
if errorlevel 1 (
    echo [INFO] Waiting for RabbitMQ to accept connections...
    timeout /t 2 /nobreak >nul
    goto wait_rabbitmq
)

echo [OK] RabbitMQ is ready!
echo.

REM Apply Prisma migrations
echo [INFO] Applying database schema (Prisma migrations)...
call npx prisma migrate deploy

if errorlevel 1 (
    echo.
    echo [WARNING] Migrate deploy failed!
    echo [INFO] This usually happens when setting up for the first time.
    echo [INFO] Trying to apply migrations using migrate dev...
    echo.
    call npx prisma migrate dev
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to apply database schema!
        echo.
        echo Possible solutions:
        echo   1. Reset the database and migrations:
        echo      - Stop containers: docker-compose down -v
        echo      - Delete migrations: rm -rf prisma/migrations
        echo      - Restart this script
        echo.
        echo   2. Or manually reset migrations:
        echo      - npx prisma migrate reset
        echo.
        pause
        exit /b 1
    )
)

echo [OK] Schema applied successfully!
echo.

REM Show connection info
echo =========================================
echo [OK] Setup Complete!
echo =========================================
echo.
echo PostgreSQL Connection Details:
echo   Host:     localhost
echo   Port:     5432
echo   Database: cpos
echo   Username: postgres
echo   Password: postgres
echo.
echo Connection String:
echo   postgresql://postgres:postgres@localhost:5432/cpos
echo.
echo RabbitMQ Connection Details:
echo   Host:     localhost
echo   AMQP Port: 5672
echo   Management UI Port: 15672
echo   Username: guest
echo   Password: guest
echo   VHost:    /
echo.
echo Connection String:
echo   amqp://guest:guest@localhost:5672/
echo.
echo Management UI:
echo   Access at: http://localhost:15672
echo   Username: guest
echo   Password: guest
echo.
echo Optional: Start pgAdmin for database management:
echo   docker-compose up -d pgadmin
echo   Access at: http://localhost:5050
echo   Email: admin@cpos.local
echo   Password: admin
echo.
echo Start the server with:
echo   npm run dev
echo.
echo =========================================
pause

