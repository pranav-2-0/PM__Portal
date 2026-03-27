# IMMEDIATE FIX - 500 Errors

## Problem
Getting 500 errors on all API endpoints means the database is not set up.

## Quick Fix (3 Steps)

### Step 1: Run Complete Setup
```bash
setup-complete.bat
```

This will:
- Check PostgreSQL
- Create database
- Load schema and data
- Install dependencies
- Create .env file

### Step 2: Start Backend
```bash
cd backend
npm run dev
```

Wait for: `[INFO] Server running on port 5000`

### Step 3: Check Health
Open in browser:
- http://localhost:5000/health
- http://localhost:5000/api/pm/health/db

Should see: `{"status":"ok"}`

## If Still Not Working

### Check PostgreSQL is Running
```bash
# Windows Services
services.msc → PostgreSQL → Start

# Or command line
pg_ctl status
```

### Run Diagnostics
```bash
diagnose.bat
```

This will show what's missing.

### Manual Database Setup
```bash
psql -U postgres
CREATE DATABASE pm_alignment;
\q

psql -U postgres -d pm_alignment -f database\schema.sql
psql -U postgres -d pm_alignment -f database\mock_data.sql
```

### Check Backend Logs
Look at the terminal where `npm run dev` is running.
You should see database connection errors if there's an issue.

## Common Issues

### "password authentication failed"
Edit `backend\.env`:
```
DB_PASSWORD=your_actual_password
```

### "database does not exist"
Run:
```bash
psql -U postgres -c "CREATE DATABASE pm_alignment;"
```

### "relation does not exist"
Run:
```bash
psql -U postgres -d pm_alignment -f database\schema.sql
```

## Verify Everything Works

1. Backend health: http://localhost:5000/health
2. Database health: http://localhost:5000/api/pm/health/db
3. Dashboard: http://localhost:3000

All should return success!
