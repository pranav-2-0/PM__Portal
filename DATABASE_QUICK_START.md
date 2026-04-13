# 🚀 PostgreSQL Quick Start Guide

## ⚡ 5-Minute Setup

### **What You Need**
✅ **PostgreSQL is already implemented** in your application  
✅ Complete database schema exists  
✅ All connectivity code is ready  

**You just need to:**
1. Install PostgreSQL
2. Create the database
3. Run the setup script

---

## 📥 Installation (5 minutes)

### **Windows - Download Installer**
1. Visit: https://www.postgresql.org/download/windows/
2. Download PostgreSQL 15.x
3. Run installer → Select all components
4. **Set password:** `root` (for development)
5. **Port:** `5432` (default)
6. Finish installation

✅ **Done!** PostgreSQL is installed.

---

## 🔧 Setup (2 minutes)

### **Option 1: Automated Setup (Recommended)**

```powershell
# Navigate to project
cd C:\Capgemini_Work\PeM_Managment\people_manager_solution

# Run setup script
.\setup-db.bat
```

**The script will:**
- Create database `pm_alignment`
- Load schema (10 tables)
- Insert configuration data
- Create `.env` file

### **Option 2: Manual Setup**

```powershell
# Create database
psql -U postgres -c "CREATE DATABASE pm_alignment;"

# Load schema
cd database
psql -U postgres -d pm_alignment -f schema.sql

# Copy environment file
cd ..\backend
copy .env.example .env
```

---

## ✅ Verify Setup (1 minute)

```powershell
# Test database connection
cd backend
node test-db.js
```

**Expected output:**
```
✅ Database connection successful!
✅ PostgreSQL Version
✅ Tables found: 10
✅ Configuration records: 4
✅ All Connection Tests Passed!
```

---

## 🚀 Start Application

```powershell
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:3002
- Backend API: http://localhost:5000

---

## 🗃️ Database Structure

### **Tables Created:**
1. **employees** - Employee master data
2. **people_managers** - PM master with capacity limits
3. **pm_assignments** - Assignment history with match scores
4. **separation_reports** - PM separations tracking
5. **approval_workflows** - Approval process
6. **exceptions** - Exception handling
7. **skill_repository** - Skill mappings
8. **audit_logs** - System audit trail
9. **audit_trail** - Detailed change tracking
10. **configuration** - System settings

### **Default Configuration:**
- **Matching Weights:** Practice (35%), CU (25%), Skill (20%), Region (10%), Account (5%), Grade (3%), Capacity (2%)
- **Reportee Limits:** C1/C2 (10), D1-D3 (15)
- **Capacity Warning:** 80% threshold
- **SLA:** 30 days, check every 7 days
- **Notifications:** T-60, T-30, T-7 days before LWD

---

## 🔍 Useful Commands

### **Check PostgreSQL Service:**
```powershell
Get-Service postgresql*
```

### **Connect to Database:**
```powershell
psql -U postgres -d pm_alignment
```

### **List Tables:**
```sql
\dt
```

### **Count Records:**
```sql
SELECT 'employees' as table, COUNT(*) FROM employees
UNION ALL
SELECT 'people_managers', COUNT(*) FROM people_managers
UNION ALL
SELECT 'pm_assignments', COUNT(*) FROM pm_assignments;
```

### **View Configuration:**
```sql
SELECT config_key, config_value 
FROM configuration 
ORDER BY config_key;
```

---

## 🎯 What's Already Implemented

✅ **Database Configuration** - `backend/src/config/database.ts`  
✅ **Complete Schema** - `database/schema.sql`  
✅ **Connection Pool** - Max 20 connections, auto-reconnect  
✅ **All Services** - Already using database queries  
✅ **Error Handling** - Comprehensive error management  
✅ **Environment Variables** - `.env.example` template  

**You don't need to write any code!** Everything is ready.

---

## 📚 Full Documentation

For detailed instructions, see:
- **[POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md)** - Complete setup guide
- **Troubleshooting** - Common issues and solutions
- **Security** - Production best practices

---

## 🆘 Quick Troubleshooting

### **Error: Connection refused**
```powershell
# Start PostgreSQL service
Start-Service postgresql-x64-15
```

### **Error: Password authentication failed**
```
→ Check backend/.env file
→ Verify DB_PASSWORD matches PostgreSQL password
```

### **Error: Database does not exist**
```powershell
# Run setup script again
.\setup-db.bat
```

### **Error: psql not found**
```powershell
# Add PostgreSQL to PATH
setx PATH "%PATH%;C:\Program Files\PostgreSQL\15\bin"
# Restart terminal
```

---

## ✨ Next Steps

1. ✅ Setup database (you just did this!)
2. 🚀 Start application
3. 📤 Upload Excel files (Data Management → Upload Data)
4. 👀 View data in pages:
   - All Employees
   - Bench Resources
   - People Managers
   - Separations
5. ⚙️ Watch automation run (9 AM, 10 AM daily)
6. 📊 Check analytics and reports

---

## 🎉 You're Ready!

The PM Alignment System is fully configured and ready to use. All database connectivity is already implemented in the code - you just needed to initialize it!

**Time to complete:** ~10 minutes  
**Status:** ✅ Production-ready database setup
