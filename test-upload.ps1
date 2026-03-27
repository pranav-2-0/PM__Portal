Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Upload Functionality Test" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check backend
Write-Host "1. Checking backend..." -ForegroundColor Yellow
$backend = Test-NetConnection -ComputerName localhost -Port 5000 -WarningAction SilentlyContinue
if ($backend.TcpTestSucceeded) {
    Write-Host "   ✅ Backend is running on port 5000" -ForegroundColor Green
} else {
    Write-Host "   ❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host "   Run: cd backend; npm run dev" -ForegroundColor Yellow
    exit 1
}

# Check frontend
Write-Host "2. Checking frontend..." -ForegroundColor Yellow
$frontend = Test-NetConnection -ComputerName localhost -Port 3002 -WarningAction SilentlyContinue
if ($frontend.TcpTestSucceeded) {
    Write-Host "   ✅ Frontend is running on port 3002" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend is NOT running!" -ForegroundColor Red
    Write-Host "   Run: cd frontend; npm run dev" -ForegroundColor Yellow
    exit 1
}

# Test API health
Write-Host "3. Testing API health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/health" -TimeoutSec 5
    Write-Host "   ✅ API is healthy: $($health.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ API health check failed: $_" -ForegroundColor Red
    exit 1
}

# Test database
Write-Host "4. Testing database connection..." -ForegroundColor Yellow
try {
    $dbHealth = Invoke-RestMethod -Uri "http://localhost:5000/api/pm/health/db" -TimeoutSec 5
    Write-Host "   ✅ Database connected: $($dbHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Database connection failed: $_" -ForegroundColor Red
    Write-Host "   Run: node backend\test-db.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✅ All checks passed!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now upload files at: http://localhost:3002/upload" -ForegroundColor Green
Write-Host ""
Write-Host "Upload order:" -ForegroundColor Yellow
Write-Host "  1. GTD Bench Dashboard - 27-Jan-26.xlsx" -ForegroundColor White
Write-Host "  2. SeperationDetails - 2026-01-05.xlsx" -ForegroundColor White
Write-Host ""
