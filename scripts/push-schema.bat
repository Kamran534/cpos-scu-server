@echo off
REM Script to push Prisma schema to PostgreSQL database

echo Pushing Prisma schema to PostgreSQL database...
call npx prisma db push

if %ERRORLEVEL% EQU 0 (
    echo Schema pushed successfully!
    echo Generating Prisma client...
    call npx prisma generate
    echo Done!
) else (
    echo Failed to push schema. Check database connection.
    exit /b 1
)

