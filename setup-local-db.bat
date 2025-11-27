@echo off
REM POS Server - Local PostgreSQL Database Setup Script
REM This script will set up a local PostgreSQL database using Docker

echo =========================================
echo POS Server - Local Database Setup
echo =========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
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

REM Apply Prisma migrations
echo [INFO] Applying database schema (Prisma migrations)...
call npx prisma migrate deploy

if errorlevel 1 (
    echo [ERROR] Failed to apply migrations!
    exit /b 1
)

echo [OK] Schema applied successfully!
echo.

REM Seed the database
echo [INFO] Seeding database with initial data...
call npx prisma db seed

if errorlevel 1 (
    echo [ERROR] Failed to seed database!
    exit /b 1
)

echo [OK] Database seeded successfully!
echo.

REM Show connection info
echo =========================================
echo [OK] Setup Complete!
echo =========================================
echo.
echo Database Connection Details:
echo   Host:     localhost
echo   Port:     5432
echo   Database: cpos
echo   Username: postgres
echo   Password: postgres
echo.
echo Connection String:
echo   postgresql://postgres:postgres@localhost:5432/cpos
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
