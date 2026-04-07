# Visual Startup Guide

```
┌─────────────────────────────────────────────────────────────────┐
│                  PM ALIGNMENT SYSTEM STARTUP                    │
│                         Quick Guide                             │
└─────────────────────────────────────────────────────────────────┘

STEP 1: DATABASE SETUP
═══════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────┐
│ $ psql -U postgres                                              │
│ postgres=# CREATE DATABASE pm_alignment;                        │
│ postgres=# \q                                                   │
│                                                                 │
│ $ psql -U postgres -d pm_alignment -f database/schema.sql      │
│ $ psql -U postgres -d pm_alignment -f database/mock_data.sql   │
└─────────────────────────────────────────────────────────────────┘
✅ Database ready!


STEP 2: BACKEND SETUP (Terminal 1)
═══════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────┐
│ $ cd backend                                                    │
│ $ npm install                                                   │
│ $ cp .env.example .env                                          │
│ $ npm run dev          ⚠️ NOT 'npm start'                       │
│                                                                 │
│ Expected Output:                                                │
│ [INFO] 2024-01-15T10:00:00.000Z - Server running on port 5000  │
└─────────────────────────────────────────────────────────────────┘
✅ Backend running on http://localhost:5000


STEP 3: FRONTEND SETUP (Terminal 2 - NEW TERMINAL)
═══════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────┐
│ $ cd frontend                                                   │
│ $ npm install                                                   │
│ $ npm run dev                                                   │
│                                                                 │
│ Expected Output:                                                │
│ VITE v5.0.8  ready in 1234 ms                                   │
│ ➜  Local:   http://localhost:3000/                             │
└─────────────────────────────────────────────────────────────────┘
✅ Frontend running on http://localhost:3000


STEP 4: VERIFY SETUP
═══════════════════════════════════════════════════════════════════
┌─────────────────────────────────────────────────────────────────┐
│ 1. Open browser: http://localhost:3000                          │
│    ✅ Should see Dashboard with statistics                      │
│                                                                 │
│ 2. Check backend: http://localhost:5000/health                  │
│    ✅ Should return: {"status":"ok","timestamp":"..."}          │
│                                                                 │
│ 3. Check database:                                              │
│    $ psql -U postgres -d pm_alignment                           │
│    pm_alignment=# SELECT COUNT(*) FROM employees;               │
│    ✅ Should return: count > 0                                  │
└─────────────────────────────────────────────────────────────────┘


SYSTEM ARCHITECTURE
═══════════════════════════════════════════════════════════════════

    ┌──────────────────────────────────────────────────┐
    │         BROWSER (http://localhost:3000)          │
    │                                                  │
    │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
    │  │Dashboard │  │  Upload  │  │New Joiners│      │
    │  └──────────┘  └──────────┘  └──────────┘      │
    └────────────────────┬─────────────────────────────┘
                         │ HTTP/REST
                         ▼
    ┌──────────────────────────────────────────────────┐
    │      BACKEND API (http://localhost:5000)         │
    │                                                  │
    │  ┌──────────────┐  ┌──────────────┐            │
    │  │  Controllers │  │   Services   │            │
    │  └──────────────┘  └──────────────┘            │
    └────────────────────┬─────────────────────────────┘
                         │ SQL
                         ▼
    ┌──────────────────────────────────────────────────┐
    │      DATABASE (PostgreSQL:5432)                  │
    │                                                  │
    │  employees | people_managers | pm_assignments   │
    └──────────────────────────────────────────────────┘


NAVIGATION MAP
═══════════════════════════════════════════════════════════════════

    http://localhost:3000/
    │
    ├─ / ──────────────────────► Dashboard
    │                             • Statistics cards
    │                             • PM capacity report
    │
    ├─ /upload ────────────────► Data Upload
    │                             • Upload Bench Report
    │                             • Upload Separations
    │
    ├─ /new-joiners ───────────► New Joiners
    │                             • List new joiners
    │                             • Find PM matches
    │                             • Assign PM
    │
    └─ /assignments ───────────► Assignments
                                  • View pending assignments
                                  • Track status


TESTING WORKFLOW
═══════════════════════════════════════════════════════════════════

    1. Upload Data
       ┌─────────────────────────────────────────┐
       │ Go to: /upload                          │
      │ Upload: Bench Report → Separations      │
       └─────────────────────────────────────────┘
                         │
                         ▼
    2. View Dashboard
       ┌─────────────────────────────────────────┐
       │ Go to: /                                │
       │ Check: Statistics updated               │
       └─────────────────────────────────────────┘
                         │
                         ▼
    3. Assign PM
       ┌─────────────────────────────────────────┐
       │ Go to: /new-joiners                     │
       │ Click: "Find PM" for an employee        │
       │ Review: Match scores and reasons        │
       │ Click: "Assign" on best match           │
       └─────────────────────────────────────────┘
                         │
                         ▼
    4. Verify Assignment
       ┌─────────────────────────────────────────┐
       │ Go to: /assignments                     │
       │ Check: New assignment appears           │
       └─────────────────────────────────────────┘


TROUBLESHOOTING QUICK REFERENCE
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│ ERROR: Cannot find module 'dist/server.js'                      │
│ FIX:   Use 'npm run dev' NOT 'npm start'                        │
│ FILE:  QUICK_FIX.md                                             │
├─────────────────────────────────────────────────────────────────┤
│ ERROR: Port already in use                                      │
│ FIX:   Kill process or change PORT in .env                      │
│ FILE:  TROUBLESHOOTING.md                                       │
├─────────────────────────────────────────────────────────────────┤
│ ERROR: Database connection failed                               │
│ FIX:   Start PostgreSQL, check .env credentials                 │
│ FILE:  TROUBLESHOOTING.md                                       │
├─────────────────────────────────────────────────────────────────┤
│ ERROR: No PM matches found                                      │
│ FIX:   Upload PM data, verify filters                           │
│ FILE:  TROUBLESHOOTING.md                                       │
└─────────────────────────────────────────────────────────────────┘


COMMAND REFERENCE
═══════════════════════════════════════════════════════════════════

Development:
  npm run dev          Start dev server (auto-reload)
  npm test            Run tests
  npm run build       Build for production

Production:
  npm run build       Compile TypeScript
  npm start           Run compiled code

Database:
  psql -U postgres -d pm_alignment    Connect to database
  \dt                                 List tables
  \q                                  Quit


FILE STRUCTURE
═══════════════════════════════════════════════════════════════════

people_manager_solution/
├── backend/
│   ├── src/
│   │   ├── controllers/    ← API handlers
│   │   ├── services/       ← Business logic
│   │   ├── routes/         ← API routes
│   │   ├── utils/          ← Helper functions
│   │   └── server.ts       ← Entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/          ← Main pages
│   │   ├── components/     ← Reusable UI
│   │   ├── services/       ← API calls
│   │   └── App.tsx         ← Main app
│   └── package.json
│
├── database/
│   ├── schema.sql          ← Database schema
│   └── mock_data.sql       ← Test data
│
└── docs/                   ← Documentation


DOCUMENTATION INDEX
═══════════════════════════════════════════════════════════════════

📖 README.md                  Project overview
🚀 STATUS.md                  Current status & next steps
🔧 QUICK_FIX.md               Fix "module not found" error
🐛 TROUBLESHOOTING.md         Common errors & solutions
👨‍💻 DEVELOPER_GUIDE.md         Quick reference for developers
✨ FIXES_AND_ENHANCEMENTS.md  What was fixed/added
📚 docs/QUICK_START.md        Detailed setup guide
🔌 docs/API_DOCUMENTATION.md  API endpoints reference
📊 docs/EXCEL_TEMPLATES.md    Excel file formats
🏗️  docs/ARCHITECTURE.md       System architecture


SUCCESS INDICATORS
═══════════════════════════════════════════════════════════════════

✅ Backend console shows: [INFO] Server running on port 5000
✅ Frontend shows: VITE ready in XXX ms
✅ Browser opens: http://localhost:3000
✅ Dashboard displays statistics
✅ Health check returns: {"status":"ok"}
✅ No errors in console


NEXT STEPS
═══════════════════════════════════════════════════════════════════

1. ✅ Complete startup steps above
2. ✅ Verify all services running
3. ✅ Test basic workflow
4. ✅ Upload sample data
5. ✅ Assign PM to new joiner
6. ✅ Check dashboard metrics
7. 📋 Review Phase 2 requirements
8. 🚀 Start Phase 2 development


═══════════════════════════════════════════════════════════════════
                    READY TO START! 🎉
═══════════════════════════════════════════════════════════════════
```
