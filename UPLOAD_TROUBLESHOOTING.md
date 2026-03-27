# Upload Troubleshooting & Testing Guide

## 🔧 **Fixed Upload Issues**

### **Changes Made:**
1. ✅ Added visible file name display when file is selected
2. ✅ Separated "Choose File" and "Upload File" buttons
3. ✅ Show file size and ability to remove selected file
4. ✅ Better error messages with console logging
5. ✅ Check if backend is running before upload

### **New Upload Flow:**
1. Click **"Choose File"** button → Select Excel file
2. See file name and size displayed
3. Click **"Upload File"** button → Upload to server
4. See success/error message
5. Data appears in respective pages

---

## ✅ **Pre-Upload Checklist**

### **1. Check Backend is Running**

```powershell
# Check if backend is running on port 5000
Test-NetConnection -ComputerName localhost -Port 5000
```

**Expected:** `TcpTestSucceeded : True`

**If False:** Start backend:
```powershell
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
Database pool initialized
Starting workflow automation scheduler...
```

---

### **2. Check Frontend is Running**

```powershell
# Check if frontend is running on port 3000
Test-NetConnection -ComputerName localhost -Port 3000
```

**If False:** Start frontend:
```powershell
cd frontend
npm run dev
```

You should see:
```
  VITE v7.3.1  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

### **3. Check Database Connection**

```powershell
cd backend
node test-db.js
```

**Expected:**
```
✅ Database connection successful!
✅ Tables found: 10
✅ Configuration records: 4
```

**If Failed:** 
- Check PostgreSQL service is running
- Verify .env file has correct credentials
- See [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md)

---

## 📤 **Step-by-Step Upload Test**

### **Test 1: Upload Bench Report**

1. **In "Bench Report (GTD)" card:**
   - Click **"Choose File"** button
   - Select: `docs/GTD Bench Dashboard - 27-Jan-26.xlsx`
   - See file name appear
   - Click **"Upload File"** button

2. **Expected Result:**
   ```
   ✅ Success message: "Employees uploaded successfully (X records)"
   ✅ Total Active Employees count increases
   ```

3. **Verify in Database:**
   ```sql
   SELECT COUNT(*) FROM employees;
   SELECT COUNT(*) FROM employees WHERE is_new_joiner = true;
   ```

4. **Verify in UI:**
   - **All Employees:** Data Management → All Employees
   - **New Joiners:** Data Management → New Joiners
   - **Bench Resources:** Data Management → Bench Resources

---

### **Test 2: Upload Separations**

1. **In "Separation Reports" card:**
   - Click **"Choose File"** button
   - Select: `docs/SeperationDetails - 2026-01-05.xlsx`
   - See file name appear
   - Click **"Upload File"** button

2. **Expected Result:**
   ```
   ✅ Success message: "Separation reports uploaded successfully (X records)"
   ✅ Pending Separations count increases
   ```

3. **Verify in Database:**
   ```sql
   SELECT * FROM separation_reports;
   ```

4. **Verify in UI:**
   - Navigate to: Data Management → **Separations**
   - Should see separation records with LWD dates

---

## 🚨 **Common Errors & Solutions**

### **Error 1: "Upload failed. Check if backend is running."**

**Cause:** Backend server not running or not accessible

**Solution:**
```powershell
# Terminal 1: Start backend
cd backend
npm run dev

# Wait for: "Server running on port 5000"
```

---

### **Error 2: "Network Error" or "Failed to fetch"**

**Cause:** Vite proxy not working or CORS issue

**Solution 1 - Check Vite config:**
```typescript
// frontend/vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
    },
  },
}
```

**Solution 2 - Restart frontend:**
```powershell
cd frontend
# Stop the dev server (Ctrl+C)
npm run dev
```

---

### **Error 3: "No file uploaded"**

**Cause:** File not properly selected or FormData issue

**Solution:**
- Make sure you click "Choose File" first
- See the file name appear
- Then click "Upload File"
- Check browser console (F12) for errors

---

### **Error 4: "Failed to parse Excel"**

**Cause:** Excel file format or column names don't match

**Solution:**
- Ensure file has .xlsx or .xls extension
- Check first row has column headers
- Verify column names match expected format

**Expected columns for Bench Report:**
```
employee_id | name | email | practice | cu | region | account | skill | grade | joining_date | is_new_joiner
```

**Expected columns for New Joiner Feed:**
```
employee_id | name | email | practice | cu | region | account | skill | grade | joining_date
```

**Expected columns for Separations:**
```
employee_id | lwd | reason
```

---

### **Error 5: Data uploaded but not showing in UI**

**Cause:** Frontend cache or query not refreshing

**Solution:**
```powershell
# Refresh browser (Ctrl+R or F5)
# Or clear cache: Ctrl+Shift+R
# Or check browser console for errors (F12)
```

**Check in Database:**
```sql
-- Verify data exists
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM separation_reports;
```

---

### **Error 7: "Connection refused" or "ECONNREFUSED"**

**Cause:** PostgreSQL database not running

**Solution:**
```powershell
# Check PostgreSQL service
Get-Service postgresql*

# If stopped, start it
Start-Service postgresql-x64-15

# Test connection
cd backend
node test-db.js
```

---

## 🔍 **Debugging Steps**

### **1. Check Browser Console**

Open Developer Tools (F12) → Console tab

Look for errors like:
- Network errors (red)
- CORS errors
- 404 Not Found
- 500 Internal Server Error

---

### **2. Check Backend Logs**

In the terminal where backend is running, look for:
```
[INFO] Uploading employees { filename: 'GTD Bench Dashboard - 27-Jan-26.xlsx' }
[INFO] Employees uploaded successfully { count: 50, inserted: 50 }
```

Or errors:
```
[ERROR] Error uploading employees ...
```

---

### **3. Check Network Tab**

F12 → Network tab → XHR

When you click "Upload File":
1. Should see POST request to `/api/pm/upload/employees`
2. Status should be **200 OK** (green)
3. Response should show: `{ message: "...", count: X }`

If Status is **500**: Backend error  
If Status is **404**: Route not found  
If Status is **0** or **ERR_CONNECTION_REFUSED**: Backend not running

---

### **4. Test API Directly**

Use PowerShell to test upload endpoint:

```powershell
# Test employees upload
$file = Get-Item "docs\GTD Bench Dashboard - 27-Jan-26.xlsx"
$form = @{
    file = $file
}
Invoke-RestMethod -Uri "http://localhost:5000/api/pm/upload/employees" -Method POST -Form $form
```

**Expected:**
```json
{
  "message": "Employees uploaded successfully",
  "count": 50,
  "inserted": 50
}
```

---

## 📊 **Verify Data is Loaded**

### **Check Database:**

```sql
-- Connect to database
psql -U postgres -d pm_alignment

-- Check counts
SELECT 'employees' as table, COUNT(*) as count FROM employees
UNION ALL
SELECT 'separation_reports', COUNT(*) FROM separation_reports;

-- Check sample data
SELECT * FROM employees LIMIT 5;
SELECT * FROM separation_reports LIMIT 5;
```

---

### **Check UI Pages:**

✅ **Dashboard:** http://localhost:3000/  
- Should show updated statistics
- Charts should have data

✅ **All Employees:** http://localhost:3000/employees  
- Grid should show employee records
- Filters should work (skill, grade, region)

✅ **Separations:** http://localhost:3000/separations  
- Grid should show LWD dates
- Days until LWD calculated

✅ **New Joiners:** http://localhost:3000/new-joiners  
- Should show only employees with is_new_joiner = Yes
- "Find PM" button should be available

✅ **Bench Resources:** http://localhost:3000/bench  
- Should show employees without current_pm_id

---

## 🎯 **Success Indicators**

### **After Upload Completes:**

1. ✅ Green success message appears
2. ✅ Statistics update (Total Employees, Active PMs counts)
3. ✅ Selected file name clears
4. ✅ Data visible in respective pages
5. ✅ Database queries return records
6. ✅ No errors in browser console
7. ✅ No errors in backend logs

---

## 📝 **Quick Test Script**

Save this as `test-upload.ps1`:

```powershell
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
$frontend = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if ($frontend.TcpTestSucceeded) {
    Write-Host "   ✅ Frontend is running on port 3000" -ForegroundColor Green
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
Write-Host "You can now upload files at: http://localhost:3000/upload" -ForegroundColor Green
Write-Host ""
Write-Host "Upload order:" -ForegroundColor Yellow
Write-Host "  1. GTD Bench Dashboard - 27-Jan-26.xlsx" -ForegroundColor White
Write-Host "  2. New_Joiners.xlsx (optional)" -ForegroundColor White
Write-Host "  3. SeperationDetails - 2026-01-05.xlsx" -ForegroundColor White
```

**Run it:**
```powershell
.\test-upload.ps1
```

---

## 🎉 **Ready to Upload!**

If all checks pass:
1. Go to http://localhost:3000/upload
2. You'll see improved UI with:
   - **Choose File** button (gray) - Click first
   - File name display when selected
   - File size shown
   - **Upload File** button (blue) - Click second
   - Clear progress indicators
3. Upload files in order (Bench Report → New Joiner Feed → Separations)
4. Watch for success messages
5. View data in respective pages

**Happy uploading! 🚀**
