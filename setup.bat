@echo off
echo ========================================
echo PM Alignment System - Setup Script
echo ========================================
echo.

echo [1/4] Setting up Backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    call npm install
) else (
    echo Backend dependencies already installed.
)

if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo Please update .env with your database credentials!
) else (
    echo .env file already exists.
)
cd ..

echo.
echo [2/4] Setting up Frontend...
cd frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
) else (
    echo Frontend dependencies already installed.
)
cd ..

echo.
echo [3/4] Database Setup Instructions
echo ========================================
echo Please run these commands manually:
echo.
echo   psql -U postgres
echo   CREATE DATABASE pm_alignment;
echo   \q
echo   psql -U postgres -d pm_alignment -f database\schema.sql
echo   psql -U postgres -d pm_alignment -f database\mock_data.sql
echo.

echo [4/4] Setup Complete!
echo ========================================
echo.
echo To start the application:
echo   1. Backend:  cd backend  ^&^& npm run dev
echo   2. Frontend: cd frontend ^&^& npm run dev
echo.
echo Access the app at: http://localhost:3000
echo API available at:  http://localhost:5000
echo.
echo See docs\QUICK_START.md for detailed instructions.
echo.
pause
