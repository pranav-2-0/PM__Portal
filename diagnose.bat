@echo off
echo ========================================
echo System Diagnostics
echo ========================================
echo.

echo [1] Checking PostgreSQL...
psql -U postgres -c "SELECT version();" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] PostgreSQL is running
) else (
    echo [ERROR] PostgreSQL is NOT running!
)

echo.
echo [2] Checking database...
psql -U postgres -lqt | findstr pm_alignment >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Database pm_alignment exists
    psql -U postgres -d pm_alignment -c "SELECT COUNT(*) as employees FROM employees;" 2>nul
    psql -U postgres -d pm_alignment -c "SELECT COUNT(*) as people_managers FROM people_managers;" 2>nul
) else (
    echo [ERROR] Database pm_alignment does NOT exist!
)

echo.
echo [3] Checking backend...
if exist backend\.env (
    echo [OK] Backend .env file exists
) else (
    echo [ERROR] Backend .env file missing!
)

if exist backend\node_modules (
    echo [OK] Backend dependencies installed
) else (
    echo [ERROR] Backend dependencies NOT installed!
)

echo.
echo [4] Checking frontend...
if exist frontend\node_modules (
    echo [OK] Frontend dependencies installed
) else (
    echo [ERROR] Frontend dependencies NOT installed!
)

echo.
echo [5] Checking ports...
netstat -ano | findstr :5000 >nul
if %errorlevel% equ 0 (
    echo [INFO] Port 5000 is in use (backend might be running)
) else (
    echo [INFO] Port 5000 is free
)

netstat -ano | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [INFO] Port 3000 is in use (frontend might be running)
) else (
    echo [INFO] Port 3000 is free
)

echo.
echo ========================================
echo Diagnostic complete!
echo ========================================
pause
