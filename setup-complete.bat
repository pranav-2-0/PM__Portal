@echo off
echo ========================================
echo PM Alignment System - Complete Setup
echo ========================================
echo.

echo [1/5] Checking PostgreSQL...
psql -U postgres -c "SELECT version();" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PostgreSQL is not running or not installed!
    echo Please start PostgreSQL service and try again.
    pause
    exit /b 1
)
echo PostgreSQL is running!

echo.
echo [2/5] Setting up database...
psql -U postgres -lqt | findstr pm_alignment >nul
if %errorlevel% equ 0 (
    echo Database pm_alignment already exists
) else (
    echo Creating database...
    psql -U postgres -c "CREATE DATABASE pm_alignment;"
)

echo Loading schema...
psql -U postgres -d pm_alignment -f database\schema.sql >nul 2>&1
echo Loading mock data...
psql -U postgres -d pm_alignment -f database\mock_data.sql >nul 2>&1
echo Database ready!

echo.
echo [3/5] Setting up backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed
)

if not exist .env (
    echo Creating .env file...
    copy .env.example .env >nul
)
cd ..

echo.
echo [4/5] Setting up frontend...
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed
)
cd ..

echo.
echo [5/5] Setup Complete!
echo ========================================
echo.
echo To start the application:
echo.
echo   Terminal 1: cd backend  ^&^& npm run dev
echo   Terminal 2: cd frontend ^&^& npm run dev
echo.
echo Then open: http://localhost:3000
echo.
echo Health checks:
echo   Backend:  http://localhost:5000/health
echo   Database: http://localhost:5000/api/pm/health/db
echo.
pause
