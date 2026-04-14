# 🔍 Empty Grid Troubleshooting Guide

## Issue: Separation Grid (or any list) is Empty

### ✅ **Step 1: Check Browser Console**

1. Open your browser (press `F12`)
2. Go to **Console** tab
3. Navigate to the Separations page (`/separations`)
4. Look for these debug logs:

```javascript
Separations API Response: { data: [...], pagination: {...} }
Separations Data: [...]
Pagination: { page: 1, pageSize: 50, totalRecords: 0, totalPages: 0 }
```

**What to look for:**
- ✅ `totalRecords: 0` → **No data uploaded yet**
- ✅ `totalRecords: 100+` but `data: []` → **Filter issue**
- ❌ `Error` → **API or database problem**

---

### ✅ **Step 2: Check Database Connection**

Open PowerShell and run:

```powershell
# Test backend is running
curl http://localhost:3000/api/pm/health/db
```

**Expected response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-04T..."
}
```

---

### ✅ **Step 3: Check If Data Was Uploaded**

**Option A: Check via API**

```powershell
# Check employees count
curl http://localhost:3000/api/pm/employees/list?page=1&pageSize=1

# Check PMs count
curl http://localhost:3000/api/pm/pms/list?page=1&pageSize=1

# Check separations count
curl http://localhost:3000/api/pm/separations/list?page=1&pageSize=1
```

**Look for:**
```json
{
  "data": [...],
  "pagination": {
    "totalRecords": 1234  ← This should be > 0
  }
}
```

**Option B: Check in UI**

Go to each page and look at the statistics cards:
- `/employees` → "Total Employees (Filtered): X"
- `/pms` → "Total PMs (Filtered): X"
- `/separations` → "Total Separations (Filtered): X"

If all show **0**, no data has been uploaded.

---

### ✅ **Step 4: Upload Data**

If no data exists, go to **Data Upload** page and upload:

1. **Employees Excel** (GAD format)
   - Must have columns: Employee ID, Name, Email, Practice, CU, Region, Grade
   
2. **People Managers Excel**
   - Must have columns: Employee ID, Name, Email, Practice, CU, Region, Grade
   
3. **Separations Excel**
   - Must have columns: Employee ID, LWD (Last Working Day)

**After upload, you should see:**
```
✅ Successfully uploaded 1,234 records
```

---

### ✅ **Step 5: Check Filters**

If data exists but grid is empty:

**For Separations:**
- Default filter: Status = "All" (changed from "pending")
- Try changing status dropdown to see if data appears
- Check console: `Separations Data: []` vs `Total Records: 100`

**For Employees/PMs:**
- Try clearing all filters
- Check if Practice/CU/Region filters are too restrictive

---

### ✅ **Step 6: Common Issues & Solutions**

#### **Issue 1: "Total Records: 0" on all pages**
**Cause**: No data uploaded
**Solution**: Upload Excel files from Data Upload page

#### **Issue 2: "Total Records: 1234" but grid empty**
**Cause**: Client-side filter issue (grade/skill)
**Solution**: 
1. Clear grade and skill filters
2. Check console for filtered data count
3. Try removing one filter at a time

#### **Issue 3: Separations always empty**
**Cause**: Status filter set to "pending" but all separations have different status
**Solution**: 
- Status filter now defaults to "All" (empty string)
- If still empty, check console logs
- Verify separation data was uploaded

#### **Issue 4: API returns 500 error**
**Cause**: Database connection or query error
**Solution**:
1. Check backend terminal for error logs
2. Restart backend: `cd backend && npm run dev`
3. Check database is running

---

### ✅ **Step 7: Verify Backend Logs**

Check your **node** terminal (backend) for errors:

**Good logs:**
```
[INFO] GET /api/pm/separations/list - 200 OK
[INFO] Query executed successfully: 123 rows
```

**Bad logs:**
```
[ERROR] Error fetching separations: ...
[ERROR] Database connection failed
```

---

### ✅ **Step 8: Test with Browser Network Tab**

1. Open browser DevTools (`F12`)
2. Go to **Network** tab
3. Refresh the Separations page
4. Look for request: `separations/list?page=1&pageSize=50&status=`
5. Click on it and check **Response** tab

**Expected response:**
```json
{
  "data": [
    {
      "id": 1,
      "employee_id": "E12345",
      "pm_name": "John Doe",
      "lwd": "2026-04-15",
      "status": "pending",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "totalRecords": 1,
    "totalPages": 1
  }
}
```

**If you see:**
```json
{
  "data": [],
  "pagination": {
    "totalRecords": 0
  }
}
```
→ **No data in database for that filter**

---

## 🎯 **Quick Debug Checklist**

Run through this checklist:

- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] Frontend is running (`npm run dev` in frontend folder)
- [ ] Browser console shows no errors
- [ ] API health check returns OK
- [ ] Data has been uploaded (check upload stats)
- [ ] Filters are not too restrictive
- [ ] Console logs show: `Total Records: X` where X > 0

---

## 🚀 **Quick Fix Actions**

### **If Separations Grid is Empty:**

```bash
# 1. Check browser console (F12)
# Look for: "Separations API Response"

# 2. If totalRecords = 0, upload separation data
# Go to: http://localhost:5173/upload
# Upload: Separation Excel file

# 3. If still empty, check status filter
# Set Status dropdown to "All"

# 4. Check backend terminal for errors
# Look for: [ERROR] or [WARN] messages
```

### **If All Grids are Empty:**

```bash
# 1. Restart both servers
cd backend
npm run dev

# In another terminal
cd frontend  
npm run dev

# 2. Upload all data files
# Go to: http://localhost:5173/upload
# Upload: Employees, PMs, Separations

# 3. Verify uploads worked
# Check statistics on each page:
# - /employees → Total Employees
# - /pms → Total PMs
# - /separations → Total Separations
```

---

## 📊 **Expected Data Flow**

```
Upload Excel → Backend Parses → Insert into Database → API Returns Data → Frontend Displays

If any step fails:
1. Upload: Check file format matches template
2. Parse: Check backend logs for parsing errors
3. Database: Check connection and table exists
4. API: Check Network tab in browser
5. Frontend: Check Console tab for errors
```

---

## 🔧 **Advanced Debugging**

### **Check Database Directly (if you have psql):**

```bash
# Connect to database
psql -U postgres -d pm_alignment

# Check record counts
SELECT COUNT(*) FROM employees;
SELECT COUNT(*) FROM people_managers;
SELECT COUNT(*) FROM separation_reports;

# Check separation statuses
SELECT status, COUNT(*) FROM separation_reports GROUP BY status;

# Exit
\q
```

---

## ✅ **Resolution Confirmation**

Once fixed, you should see:

1. **Console logs** showing data:
   ```
   Separations API Response: { data: Array(50), pagination: {...} }
   Total Records: 1234
   ```

2. **Grid displays** records with proper formatting

3. **Statistics cards** show correct counts

4. **Pagination controls** appear at bottom

5. **Export to CSV** button works

---

**Still having issues?** Check backend terminal for specific error messages!
