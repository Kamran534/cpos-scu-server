@echo off
REM Fix PostgreSQL Migration Script
REM This script will reset migrations and create a fresh baseline

echo =========================================
echo POS Server - Migration Fix
echo =========================================
echo.

REM Check if we're in the right directory
if not exist "prisma\schema.prisma" (
    echo [ERROR] Please run this script from the pos-server directory
    exit /b 1
)

echo This will:
echo   1. Delete existing migration files
echo   2. Reset the database
echo   3. Create a fresh baseline migration
echo   4. Seed the database
echo.
set /p confirm="Continue? (y/n): "

if /i not "%confirm%"=="y" (
    echo Aborted.
    exit /b 0
)

echo.
echo [Step 1/5] Backing up existing migrations...
if exist "prisma\migrations" (
    for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
    set backupName=migrations_backup_%mydate%_%mytime%
    move "prisma\migrations" "prisma\%backupName%"
    echo   Backed up to: prisma\%backupName%
) else (
    echo   No existing migrations to backup
)

echo.
echo [Step 2/5] Stopping and resetting database...
docker-compose down -v
if errorlevel 1 (
    echo [ERROR] Failed to stop database
    exit /b 1
)

echo.
echo [Step 3/5] Starting fresh database...
docker-compose up -d postgres
if errorlevel 1 (
    echo [ERROR] Failed to start database
    exit /b 1
)

echo   Waiting for PostgreSQL to be ready...
timeout /t 5 /nobreak >nul

:wait_db
docker exec cpos-postgres pg_isready -U postgres >nul 2>&1
if errorlevel 1 (
    echo   Waiting for database...
    timeout /t 2 /nobreak >nul
    goto wait_db
)

echo   Database is ready!

echo.
echo [Step 4/5] Creating baseline migration...
call npx prisma migrate dev --name init --skip-seed
if errorlevel 1 (
    echo [WARNING] Migration dev failed, trying db push...
    call npx prisma db push --accept-data-loss
    if errorlevel 1 (
        echo [ERROR] Failed to push schema
        exit /b 1
    )
)

echo.
echo [Step 5/5] Seeding database...
call npm run prisma:seed
if errorlevel 1 (
    echo [WARNING] Seeding failed, but database schema is ready
)

echo.
echo =========================================
echo Migration Fix Complete!
echo =========================================
echo.
echo Next steps:
echo   1. Start the server: npm run dev
echo   2. View database: npx prisma studio
echo.
pause
