# FIX YOUR 500 ERRORS - Step by Step

## What's Wrong?
The 500 errors mean the database isn't set up. Let's fix it!

## SOLUTION (Copy & Paste These Commands)

### 1️⃣ Stop Everything
Press `Ctrl+C` in both terminals (backend and frontend)

### 2️⃣ Run Complete Setup
```bash
setup-complete.bat
```

### 3️⃣ Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

**Wait for this message:**
```
[INFO] Server running on port 5000
```

### 4️⃣ Test Backend
Open browser: http://localhost:5000/api/pm/health/db

**Should see:**
```json
{"status":"ok","database":"connected"}
```

### 5️⃣ Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

### 6️⃣ Open App
http://localhost:3000

**Should see Dashboard with no errors!**

---

## Still Getting Errors?

### Check PostgreSQL
```bash
# Is it running?
psql -U postgres -c "SELECT 1"
```

If error, start PostgreSQL:
- Windows: `services.msc` → PostgreSQL → Start
- Or: `pg_ctl start`

### Check Database Exists
```bash
psql -U postgres -lqt | findstr pm_alignment
```

If not found:
```bash
psql -U postgres -c "CREATE DATABASE pm_alignment;"
psql -U postgres -d pm_alignment -f database\schema.sql
psql -U postgres -d pm_alignment -f database\mock_data.sql
```

### Check Backend .env
```bash
cd backend
type .env
```

Should have:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pm_alignment
DB_USER=postgres
DB_PASSWORD=root
```

If password is different, update it!

---

## Quick Diagnostic
```bash
diagnose.bat
```

This shows what's missing.

---

## Expected Result

✅ Backend console: `[INFO] Server running on port 5000`  
✅ http://localhost:5000/health → `{"status":"ok"}`  
✅ http://localhost:5000/api/pm/health/db → `{"status":"ok","database":"connected"}`  
✅ http://localhost:3000 → Dashboard loads  
✅ No 500 errors in browser console  

---

**Need more help?** See `FIX_500_ERRORS.md` or `TROUBLESHOOTING.md`
