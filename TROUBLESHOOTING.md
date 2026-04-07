# Troubleshooting Guide

## Common Errors & Solutions

### 1. ❌ Cannot find module 'dist/server.js'

**Error Message**:
```
Error: Cannot find module 'C:\...\backend\dist\server.js'
```

**Cause**: Running `npm start` without building TypeScript first.

**Solution**:
```bash
cd backend
npm run dev    # For development
```

**Why**: 
- `npm run dev` runs TypeScript directly with ts-node-dev
- `npm start` requires compiled JavaScript in dist/ folder
- Use `npm run build` then `npm start` only for production

---

### 2. ❌ Port Already in Use

**Error Message**:
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**:

**Windows**:
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Mac/Linux**:
```bash
lsof -i :5000
kill -9 <PID>
```

**Or change port**:
```bash
# Edit backend/.env
PORT=5001
```

---

### 3. ❌ Database Connection Failed

**Error Message**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions**:

1. **Check PostgreSQL is running**:
   ```bash
   # Windows
   services.msc → PostgreSQL → Start
   
   # Mac
   brew services start postgresql
   
   # Linux
   sudo systemctl start postgresql
   ```

2. **Verify credentials**:
   ```bash
   # Edit backend/.env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pm_alignment
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```

3. **Test connection**:
   ```bash
   psql -U postgres -d pm_alignment
   ```

---

### 4. ❌ Database Does Not Exist

**Error Message**:
```
error: database "pm_alignment" does not exist
```

**Solution**:
```bash
psql -U postgres
CREATE DATABASE pm_alignment;
\q
psql -U postgres -d pm_alignment -f database/schema.sql
```

---

### 5. ❌ Excel Upload Fails

**Error Message**:
```
Failed to parse employee Excel: ...
```

**Solutions**:

1. **Check column names** match template:
   - See `docs/EXCEL_TEMPLATES.md`
   - Column names are case-insensitive
   - Alternative names supported (e.g., "Employee ID" or "employee_id")

2. **Check file format**:
   - Must be .xlsx or .xls
   - Max size: 10MB
   - Must have data rows (not just headers)

3. **Check required fields**:
   - Employee ID, Name, Email are mandatory
   - Practice, CU, Region, Grade are mandatory

---

### 6. ❌ No PM Matches Found

**Error Message**:
```
No eligible PMs found
```

**Causes & Solutions**:

1. **No PMs uploaded**:
   ```bash
   # Check database
   psql -U postgres -d pm_alignment
   SELECT COUNT(*) FROM people_managers;
   ```
   Ensure PM data is available in the system (seeded or synced)

2. **PM filters too strict**:
   - PMs must have same Practice, CU, Region
   - PM grade must be ≥ C1
   - PM grade must be higher than employee
   - PM capacity must be < max_capacity

3. **Check PM data**:
   ```sql
   SELECT * FROM people_managers 
   WHERE practice = 'YourPractice' 
     AND cu = 'YourCU' 
     AND region = 'YourRegion'
     AND is_active = true;
   ```

---

### 7. ❌ CORS Error

**Error Message** (in browser console):
```
Access to fetch at 'http://localhost:5000' has been blocked by CORS policy
```

**Solution**:

1. **Check backend is running** on port 5000
2. **Check CORS config** in `backend/src/server.ts`:
   ```typescript
   app.use(cors());  // Should be present
   ```
3. **Restart backend** after changes

---

### 8. ❌ Module Not Found (npm install)

**Error Message**:
```
Cannot find module 'express'
```

**Solution**:
```bash
cd backend  # or frontend
rm -rf node_modules package-lock.json
npm install
```

---

### 9. ❌ TypeScript Errors

**Error Message**:
```
TS2307: Cannot find module '...'
```

**Solutions**:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Check tsconfig.json** exists

3. **Restart IDE/Editor**

---

### 10. ❌ Frontend Build Fails

**Error Message**:
```
Failed to resolve import
```

**Solutions**:

1. **Clear cache**:
   ```bash
   cd frontend
   rm -rf node_modules .vite
   npm install
   ```

2. **Check imports** use correct paths

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

---

## Debugging Steps

### Backend Debugging

1. **Check logs**:
   ```bash
   npm run dev
   # Watch console for [INFO], [ERROR], [WARN] messages
   ```

2. **Test API directly**:
   ```bash
   curl http://localhost:5000/health
   curl http://localhost:5000/api/pm/stats/dashboard
   ```

3. **Check database**:
   ```bash
   psql -U postgres -d pm_alignment
   SELECT COUNT(*) FROM employees;
   SELECT COUNT(*) FROM people_managers;
   \q
   ```

### Frontend Debugging

1. **Open browser console** (F12)
2. **Check Network tab** for API calls
3. **Check Redux DevTools** (if installed)
4. **Check console for errors**

### Database Debugging

```sql
-- Check all tables
\dt

-- Check table structure
\d employees

-- Check data
SELECT * FROM employees LIMIT 5;
SELECT * FROM people_managers LIMIT 5;

-- Check configuration
SELECT * FROM configuration;

-- Check pending assignments
SELECT * FROM pm_assignments WHERE status = 'pending';
```

---

## Reset Everything

If all else fails, reset the entire setup:

```bash
# 1. Stop all servers (Ctrl+C)

# 2. Reset database
psql -U postgres
DROP DATABASE pm_alignment;
CREATE DATABASE pm_alignment;
\q
psql -U postgres -d pm_alignment -f database/schema.sql
psql -U postgres -d pm_alignment -f database/mock_data.sql

# 3. Reset backend
cd backend
rm -rf node_modules package-lock.json dist
npm install
npm run dev

# 4. Reset frontend
cd frontend
rm -rf node_modules package-lock.json dist .vite
npm install
npm run dev
```

---

## Getting Help

### Check Documentation
1. [Quick Start Guide](docs/QUICK_START.md)
2. [API Documentation](docs/API_DOCUMENTATION.md)
3. [Developer Guide](DEVELOPER_GUIDE.md)
4. [Quick Fix Guide](QUICK_FIX.md)

### Check Logs
- Backend: Console output from `npm run dev`
- Frontend: Browser console (F12)
- Database: PostgreSQL logs

### Verify Setup
```bash
# Node.js version
node --version    # Should be 18+

# npm version
npm --version     # Should be 9+

# PostgreSQL version
psql --version    # Should be 15+

# Check services
# Backend: http://localhost:5000/health
# Frontend: http://localhost:3000
```

---

## Prevention Tips

1. **Always use `npm run dev`** for development
2. **Check .env file** exists and has correct values
3. **Ensure PostgreSQL is running** before starting backend
4. **Ensure PM data is available** for better testing
5. **Check console logs** for errors
6. **Use correct Excel templates** from docs/EXCEL_TEMPLATES.md
7. **Keep dependencies updated**: `npm update`

---

**Still having issues?** Check the error message carefully and search this guide for keywords.
