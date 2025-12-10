@echo off
echo Checking PostgreSQL connection...
echo.

REM Test connection
psql -U postgres -c "SELECT version();" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Cannot connect to PostgreSQL.
    echo.
    echo Please check:
    echo 1. PostgreSQL is installed and running
    echo 2. Password in .env matches your PostgreSQL password
    echo 3. PostgreSQL is listening on port 5432
    echo.
    echo To start PostgreSQL service:
    echo    net start postgresql-x64-XX
    echo    (Replace XX with your PostgreSQL version)
    echo.
    pause
    exit /b 1
)

echo ✓ PostgreSQL is running!
echo.

echo Creating database 'anonymous_chat' if it doesn't exist...
psql -U postgres -c "CREATE DATABASE anonymous_chat;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Database created successfully!
) else (
    echo Database may already exist (this is fine^)
)

echo.
echo Setup complete! Now run: pnpm db:migrate
pause
