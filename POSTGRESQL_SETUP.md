# PostgreSQL Database Setup Guide

## 📋 Overview
Complete guide to set up PostgreSQL database for the PM Alignment System.

---

## 🔧 Prerequisites

- PostgreSQL 15+ (recommended) or PostgreSQL 12+
- Windows OS (instructions provided)
- Admin access to install software

---

## 📥 Step 1: Install PostgreSQL

### **Option A: Download Installer (Recommended)**

1. **Download PostgreSQL:**
   - Visit: https://www.postgresql.org/download/windows/
   - Download: PostgreSQL 15.x Windows installer (EnterpriseDB)
   - Size: ~250 MB

2. **Run Installer:**
   ```
   - Double-click the downloaded .exe file
   - Click "Next" through welcome screen
   ```

3. **Installation Directory:**
   ```
   Default: C:\Program Files\PostgreSQL\15
   ✅ Keep default (recommended)
   ```

4. **Select Components:**
   ```
   ✅ PostgreSQL Server (required)
   ✅ pgAdmin 4 (GUI tool - highly recommended)
   ✅ Command Line Tools (required)
   ⬜ Stack Builder (optional)
   ```

5. **Data Directory:**
   ```
   Default: C:\Program Files\PostgreSQL\15\data
   ✅ Keep default
   ```

6. **Set Password:**
   ```
   ⚠️ IMPORTANT: Set password for 'postgres' superuser
   
   Recommendation for development:
   Username: postgres
   Password: postgres
   
   ⚠️ For production: Use strong password!
   
   📝 Write this down - you'll need it!
   ```

7. **Port:**
   ```
   Default: 5432
   ✅ Keep default (unless already in use)
   ```

8. **Locale:**
   ```
   Default: [Default locale]
   ✅ Keep default
   ```

9. **Complete Installation:**
   ```
   - Click "Next" → "Next" → "Finish"
   - Installer will take 3-5 minutes
   - ⬜ Uncheck "Launch Stack Builder" → Finish
   ```

### **Option B: Using Chocolatey (Alternative)**

```powershell
# Run in PowerShell as Administrator
choco install postgresql15 --params '/Password:postgres /Port:5432'
```

---

## ✅ Step 2: Verify PostgreSQL Installation

### **Method 1: Using pgAdmin 4 (GUI)**

1. **Open pgAdmin 4:**
   ```
   Start Menu → PostgreSQL 15 → pgAdmin 4
   ```

2. **Set Master Password:**
   - First launch asks for master password
   - This is for pgAdmin only (not PostgreSQL)
   - Set any password you'll remember

3. **Connect to Server:**
   ```
   Left sidebar: Servers → PostgreSQL 15
   - Right-click → Connect
   - Enter password: postgres (or your chosen password)
   ```

4. **Success Indicator:**
   ```
   ✅ If connected: You'll see database tree expand
   ❌ If error: PostgreSQL service may not be running
   ```

### **Method 2: Using Command Line**

```powershell
# Open PowerShell and test connection
psql -U postgres

# You'll be prompted for password
# If successful, you'll see:
postgres=#

# Exit with:
\q
```

### **Method 3: Check Service**

```powershell
# Check if PostgreSQL service is running
Get-Service -Name postgresql*

# Should show:
Status   Name               DisplayName
------   ----               -----------
Running  postgresql-x64-15  postgresql-x64-15 - PostgreSQL Server 15
```

---

## 🗄️ Step 3: Create Database

### **Method 1: Using pgAdmin 4 (Recommended)**

1. **Open pgAdmin 4**

2. **Connect to PostgreSQL 15 server** (enter password)

3. **Create Database:**
   ```
   Right-click on: Databases
   → Create → Database...
   
   Database: pm_alignment
   Owner: postgres
   Encoding: UTF8
   
   → Save
   ```

4. **Verify:**
   ```
   Refresh databases list
   ✅ Should see: pm_alignment
   ```

### **Method 2: Using psql Command Line**

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE pm_alignment;

# List databases to verify
\l

# Connect to the database
\c pm_alignment

# Exit
\q
```

### **Method 3: Using PowerShell Script**

```powershell
# Run this command (replace password if different)
$env:PGPASSWORD='postgres'; psql -U postgres -c "CREATE DATABASE pm_alignment;"
```

---

## 📊 Step 4: Run Database Schema

### **Method 1: Using pgAdmin 4**

1. **Open pgAdmin 4**

2. **Connect to pm_alignment database:**
   ```
   Servers → PostgreSQL 15 → Databases → pm_alignment
   Right-click → Query Tool
   ```

3. **Open schema file:**
   ```
   Query Tool window:
   File → Open
   Navigate to: C:\Capgemini_Work\PeM_Managment\people_manager_solution\database\schema.sql
   → Open
   ```

4. **Execute:**
   ```
   Click: Execute/Refresh button (or press F5)
   
   ✅ Success message should appear in Messages tab
   ```

5. **Verify tables created:**
   ```
   Left sidebar: pm_alignment → Schemas → public → Tables
   Right-click → Refresh
   
   ✅ Should see 10 tables:
   - employees
   - people_managers
   - pm_assignments
   - approval_workflows
   - exceptions
   - separation_reports
   - skill_repository
   - audit_logs
   - audit_trail
   - configuration
   ```

### **Method 2: Using psql Command Line**

```powershell
# Navigate to database folder
cd C:\Capgemini_Work\PeM_Managment\people_manager_solution\database

# Run schema script
psql -U postgres -d pm_alignment -f schema.sql

# If successful, you'll see:
DROP TABLE
CREATE TABLE
CREATE TABLE
... (multiple CREATE statements)
CREATE INDEX
INSERT 0 4
```

### **Method 3: Using PowerShell Script**

```powershell
# Run setup script (provided below)
cd C:\Capgemini_Work\PeM_Managment\people_manager_solution
.\setup-db.bat
```

---

## 🔌 Step 5: Configure Application Connection

### **Create .env file**

1. **Navigate to backend folder:**
   ```powershell
   cd C:\Capgemini_Work\PeM_Managment\people_manager_solution\backend
   ```

2. **Copy .env.example to .env:**
   ```powershell
   Copy-Item .env.example .env
   ```

3. **Edit .env file:**
   ```dotenv
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=pm_alignment
   DB_USER=postgres
   DB_PASSWORD=postgres

   # File Upload
   MAX_FILE_SIZE=10485760
   UPLOAD_DIR=./uploads
   ```

4. **Update values if needed:**
   - If you set a different password during installation, update `DB_PASSWORD`
   - If PostgreSQL is on a different port, update `DB_PORT`
   - If using a remote database, update `DB_HOST`

---

## 🧪 Step 6: Test Database Connection

### **Method 1: Using Node.js Test Script**

1. **Create test file** (temporary):
   ```powershell
   cd C:\Capgemini_Work\PeM_Managment\people_manager_solution\backend
   ```

2. **Create test-db.js:**
   ```javascript
   const { Pool } = require('pg');
   require('dotenv').config();

   const pool = new Pool({
     host: process.env.DB_HOST || 'localhost',
     port: parseInt(process.env.DB_PORT || '5432'),
     database: process.env.DB_NAME || 'pm_alignment',
     user: process.env.DB_USER || 'postgres',
     password: process.env.DB_PASSWORD || 'postgres',
   });

   async function testConnection() {
     try {
       const client = await pool.connect();
       console.log('✅ Database connection successful!');
       
       const result = await client.query('SELECT NOW()');
       console.log('✅ Current database time:', result.rows[0].now);
       
       const tables = await client.query(`
         SELECT table_name 
         FROM information_schema.tables 
         WHERE table_schema = 'public'
         ORDER BY table_name
       `);
       console.log('✅ Tables found:', tables.rows.length);
       console.log('Tables:', tables.rows.map(r => r.table_name).join(', '));
       
       client.release();
       await pool.end();
       console.log('\n✅ All tests passed! Database is ready.');
     } catch (err) {
       console.error('❌ Database connection error:', err.message);
       console.error('\nTroubleshooting:');
       console.error('1. Check if PostgreSQL service is running');
       console.error('2. Verify credentials in .env file');
       console.error('3. Ensure database "pm_alignment" exists');
       process.exit(1);
     }
   }

   testConnection();
   ```

3. **Run test:**
   ```powershell
   node test-db.js
   ```

4. **Expected output:**
   ```
   ✅ Database connection successful!
   ✅ Current database time: 2026-03-02T10:30:45.123Z
   ✅ Tables found: 10
   Tables: audit_logs, audit_trail, approval_workflows, configuration, employees, exceptions, people_managers, pm_assignments, separation_reports, skill_repository

   ✅ All tests passed! Database is ready.
   ```

### **Method 2: Start Backend Server**

```powershell
cd C:\Capgemini_Work\PeM_Managment\people_manager_solution\backend
npm run dev
```

**Expected output:**
```
[INFO] Database pool initialized
[INFO] Server running on port 5000
[INFO] Environment: development
```

**If you see errors:**
```
❌ Error: password authentication failed for user "postgres"
→ Check DB_PASSWORD in .env file

❌ Error: database "pm_alignment" does not exist
→ Run Step 3 again to create database

❌ Error: connect ECONNREFUSED 127.0.0.1:5432
→ PostgreSQL service not running, start it:
   Get-Service postgresql* | Start-Service
```

---

## 📊 Step 7: Load Sample Data (Optional)

### **Using mock_data.sql:**

```powershell
cd C:\Capgemini_Work\PeM_Managment\people_manager_solution\database

# Load sample data
psql -U postgres -d pm_alignment -f mock_data.sql
```

---

## 🔧 Troubleshooting

### **Issue #1: PostgreSQL service not running**

**Error:**
```
psql: error: connection to server at "localhost" (::1), port 5432 failed
```

**Solution:**
```powershell
# Check service status
Get-Service postgresql*

# If stopped, start it:
Start-Service postgresql-x64-15

# Set to auto-start on boot:
Set-Service postgresql-x64-15 -StartupType Automatic
```

### **Issue #2: Password authentication failed**

**Error:**
```
psql: error: password authentication failed for user "postgres"
```

**Solution:**
```powershell
# Reset password using Windows authentication
# 1. Stop PostgreSQL service
Stop-Service postgresql-x64-15

# 2. Edit pg_hba.conf to allow trust authentication temporarily
# File location: C:\Program Files\PostgreSQL\15\data\pg_hba.conf
# Change "md5" to "trust" for local connections

# 3. Start PostgreSQL service
Start-Service postgresql-x64-15

# 4. Connect without password
psql -U postgres

# 5. Change password
ALTER USER postgres PASSWORD 'postgres';

# 6. Exit and revert pg_hba.conf changes back to "md5"
# 7. Restart service
```

### **Issue #3: Port 5432 already in use**

**Error:**
```
port 5432 is already in use
```

**Solution:**
```powershell
# Find what's using port 5432
netstat -ano | findstr :5432

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Or change PostgreSQL port in postgresql.conf
# C:\Program Files\PostgreSQL\15\data\postgresql.conf
# Change: port = 5433
```

### **Issue #4: Database already exists**

**Error:**
```
ERROR: database "pm_alignment" already exists
```

**Solution:**
```sql
-- Drop and recreate (⚠️ This deletes all data!)
DROP DATABASE pm_alignment;
CREATE DATABASE pm_alignment;
```

### **Issue #5: Permission denied**

**Error:**
```
ERROR: permission denied to create database
```

**Solution:**
```sql
-- Grant privileges to user
ALTER USER postgres CREATEDB;
```

---

## 🔒 Security Best Practices

### **For Development:**
✅ Default password "postgres" is acceptable  
✅ Running on localhost only  
✅ No external connections  

### **For Production:**
⚠️ **MUST CHANGE:**
1. Strong password (16+ characters, mixed case, numbers, symbols)
2. Limited database user (not postgres superuser)
3. SSL/TLS encryption enabled
4. Firewall rules restricting connections
5. Regular backups configured

---

## 📚 Useful PostgreSQL Commands

### **Connection:**
```powershell
# Connect to database
psql -U postgres -d pm_alignment

# Connect with password inline (not recommended)
$env:PGPASSWORD='postgres'; psql -U postgres -d pm_alignment
```

### **Database Management:**
```sql
-- List all databases
\l

-- Connect to database
\c pm_alignment

-- List tables
\dt

-- Describe table structure
\d employees

-- Show table with details
\d+ employees

-- List indexes
\di

-- Show current user
SELECT current_user;

-- Show current database
SELECT current_database();
```

### **Data Inspection:**
```sql
-- Count records
SELECT COUNT(*) FROM employees;

-- View configuration
SELECT * FROM configuration;

-- Check PM capacity
SELECT 
  employee_id, 
  name, 
  reportee_count, 
  max_capacity,
  ROUND((reportee_count::decimal / max_capacity * 100), 0) as utilization_pct
FROM people_managers
ORDER BY utilization_pct DESC;

-- Find new joiners
SELECT * FROM employees WHERE is_new_joiner = true;
```

### **Backup & Restore:**
```powershell
# Backup database
pg_dump -U postgres -d pm_alignment -f backup.sql

# Restore database
psql -U postgres -d pm_alignment -f backup.sql

# Backup specific table
pg_dump -U postgres -d pm_alignment -t employees -f employees_backup.sql
```

---

## 📱 GUI Tools for PostgreSQL

### **1. pgAdmin 4** (Included with PostgreSQL)
- **Pros:** Official tool, feature-rich, free
- **Cons:** Can be slow for large datasets
- **Best for:** Schema design, queries, administration

### **2. DBeaver** (Alternative)
- **Download:** https://dbeaver.io/download/
- **Pros:** Fast, supports multiple databases, excellent query editor
- **Cons:** Requires separate download
- **Best for:** Data exploration, queries

### **3. Azure Data Studio** (Microsoft)
- **Download:** https://docs.microsoft.com/azure-data-studio
- **Pros:** Modern UI, excellent for queries, free
- **Cons:** Requires PostgreSQL extension
- **Best for:** Data analysis, visualizations

---

## 🚀 Quick Start Script

Save this as `setup-db.bat`:

```batch
@echo off
echo ========================================
echo PM Alignment System - Database Setup
echo ========================================
echo.

echo Step 1: Creating database...
psql -U postgres -c "DROP DATABASE IF EXISTS pm_alignment;"
psql -U postgres -c "CREATE DATABASE pm_alignment;"
echo ✅ Database created

echo.
echo Step 2: Running schema...
cd database
psql -U postgres -d pm_alignment -f schema.sql
echo ✅ Schema loaded

echo.
echo Step 3: Loading sample data (optional)...
set /p LOAD_SAMPLE="Load sample data? (y/n): "
if /i "%LOAD_SAMPLE%"=="y" (
    psql -U postgres -d pm_alignment -f mock_data.sql
    echo ✅ Sample data loaded
)

echo.
echo ========================================
echo ✅ Database setup complete!
echo ========================================
echo.
echo Database: pm_alignment
echo Host: localhost
echo Port: 5432
echo User: postgres
echo.
echo Next steps:
echo 1. Update backend/.env file with database credentials
echo 2. Run: cd backend
echo 3. Run: npm install
echo 4. Run: npm run dev
echo.
pause
```

**Run it:**
```powershell
cd C:\Capgemini_Work\PeM_Managment\people_manager_solution
.\setup-db.bat
```

---

## ✅ Verification Checklist

Before starting the application, verify:

- [x] PostgreSQL 15+ installed
- [x] PostgreSQL service running
- [x] Database "pm_alignment" created
- [x] All 10 tables created (run schema.sql)
- [x] Configuration data inserted (4 rows)
- [x] Backend .env file created with correct credentials
- [x] Connection test successful (test-db.js)
- [x] No errors in PostgreSQL logs

---

## 📞 Support & Resources

### **Official PostgreSQL Documentation:**
- Main docs: https://www.postgresql.org/docs/
- Windows install: https://www.postgresql.org/docs/current/install-windows.html
- psql commands: https://www.postgresql.org/docs/current/app-psql.html

### **Common Paths:**
- PostgreSQL install: `C:\Program Files\PostgreSQL\15\`
- Data directory: `C:\Program Files\PostgreSQL\15\data\`
- Config file: `C:\Program Files\PostgreSQL\15\data\postgresql.conf`
- Auth config: `C:\Program Files\PostgreSQL\15\data\pg_hba.conf`
- Logs: `C:\Program Files\PostgreSQL\15\data\log\`

### **Service Management:**
```powershell
# Start
Start-Service postgresql-x64-15

# Stop
Stop-Service postgresql-x64-15

# Restart
Restart-Service postgresql-x64-15

# Check status
Get-Service postgresql-x64-15
```

---

## 🎯 Summary

**Installation:** 5-10 minutes  
**Database Setup:** 2-3 minutes  
**Testing:** 1-2 minutes  
**Total Time:** ~15 minutes  

**You're ready to go when you see:**
✅ PostgreSQL service running  
✅ Database "pm_alignment" exists with 10 tables  
✅ Backend server starts without errors  
✅ Frontend connects to backend API  

**Now you can:**
- Upload Excel files
- See data in Data Management pages
- Watch automation run at 9 AM and 10 AM daily
- Use all features of the PM Alignment System!
