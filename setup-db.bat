@echo off
setlocal enabledelayedexpansion

echo ========================================
echo PM Alignment System - Database Setup
echo ========================================
echo.
echo This script will:
echo 1. Create PostgreSQL database
echo 2. Load database schema
echo 3. Insert default configuration
echo.

REM Check if psql is available
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: PostgreSQL psql command not found!
    echo.
    echo Please ensure PostgreSQL is installed and added to PATH.
    echo Installation location typically: C:\Program Files\PostgreSQL\15\bin
    echo.
    echo Add to PATH by running:
    echo setx PATH "%%PATH%%;C:\Program Files\PostgreSQL\15\bin"
    echo.
    pause
    exit /b 1
)

REM Set PostgreSQL password for this session
set /p DB_PASSWORD="Enter PostgreSQL password for user 'postgres' [root]: "
if "%DB_PASSWORD%"==\"\" set DB_PASSWORD=root

set PGPASSWORD=%DB_PASSWORD%

echo.
echo Testing connection to PostgreSQL...
psql -U postgres -c "SELECT version();" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Cannot connect to PostgreSQL!
    echo.
    echo Please check:
    echo 1. PostgreSQL service is running
    echo 2. Password is correct
    echo 3. PostgreSQL is accepting connections on port 5432
    echo.
    echo To check service status:
    echo Get-Service postgresql*
    echo.
    pause
    exit /b 1
)
echo ✅ Connected to PostgreSQL successfully
echo.

REM Step 1: Create database
echo Step 1: Creating database 'pm_alignment'...
psql -U postgres -c "DROP DATABASE IF EXISTS pm_alignment;" 2>nul
psql -U postgres -c "CREATE DATABASE pm_alignment;"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Failed to create database!
    pause
    exit /b 1
)
echo ✅ Database 'pm_alignment' created
echo.

REM Step 2: Load schema
echo Step 2: Loading database schema...
if not exist "database\schema.sql" (
    echo ❌ ERROR: schema.sql file not found!
    echo Expected location: database\schema.sql
    pause
    exit /b 1
)

psql -U postgres -d pm_alignment -f database\schema.sql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Failed to load schema!
    pause
    exit /b 1
)
echo ✅ Database schema loaded successfully
echo.

REM Step 3: Verify tables created
echo Step 3: Verifying tables...
psql -U postgres -d pm_alignment -c "\dt" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: Failed to verify tables!
    pause
    exit /b 1
)
echo ✅ All tables created successfully
echo.

REM Optional: Load sample data
set /p LOAD_SAMPLE="Do you want to load sample/mock data? (y/n) [n]: "
if /i "%LOAD_SAMPLE%"=="y" (
    if exist "database\mock_data.sql" (
        echo Loading sample data...
        psql -U postgres -d pm_alignment -f database\mock_data.sql >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo ✅ Sample data loaded
        ) else (
            echo ⚠️ Warning: Failed to load sample data
        )
    ) else (
        echo ⚠️ Sample data file not found: database\mock_data.sql
    )
)
echo.

REM Step 4: Create .env file if it doesn't exist
echo Step 4: Setting up backend configuration...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        echo Creating backend\.env from .env.example...
        copy backend\.env.example backend\.env >nul
        echo ✅ .env file created
        echo.
        echo ⚠️ IMPORTANT: Update backend\.env file with your database password if different from 'postgres'
    ) else (
        echo ⚠️ Warning: .env.example not found in backend folder
    )
) else (
    echo ✅ .env file already exists
)
echo.

REM Summary
echo ========================================
echo ✅ Database Setup Complete!
echo ========================================
echo.
echo Database Details:
echo   Name: pm_alignment
echo   Host: localhost
echo   Port: 5432
echo   User: postgres
echo.
echo Tables Created:
echo   - employees
echo   - people_managers
echo   - pm_assignments
echo   - approval_workflows
echo   - exceptions
echo   - separation_reports
echo   - skill_repository
echo   - audit_logs
echo   - audit_trail
echo   - configuration
echo.
echo Configuration Loaded:
echo   - Matching weights (Practice: 35%%, CU: 25%%, Skill: 20%%)
echo   - Reportee limits (C1/C2: 10, D1-D3: 15)
echo   - SLA timings
echo   - Notification triggers
echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo 1. Backend Setup:
echo    cd backend
echo    npm install
echo    npm run dev
echo.
echo 2. Frontend Setup (in new terminal):
echo    cd frontend
echo    npm install
echo    npm run dev
echo.
echo 3. Access Application:
echo    Backend API: http://localhost:5000
echo    Frontend UI: http://localhost:3002
echo.
echo 4. Verify Database:
echo    - Open pgAdmin 4
echo    - Connect to PostgreSQL 15
echo    - Check pm_alignment database
echo.
pause
