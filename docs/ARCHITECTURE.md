# System Architecture - PM Alignment System

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                    React + TypeScript + Vite                    │
│                         Port: 3000                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Data Upload  │  │ New Joiners  │  │ Assignments  │         │
│  │    Page      │  │    Page      │  │    Page      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                │
│                            │                                    │
│                   ┌────────▼────────┐                          │
│                   │   RTK Query     │                          │
│                   │  State Manager  │                          │
│                   └────────┬────────┘                          │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/REST
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                      BACKEND API                              │
│                 Node.js + Express + TypeScript                │
│                         Port: 5000                            │
├───────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐    │
│  │                    API Routes                         │    │
│  │  /upload/employees  /upload/pms  /assignments        │    │
│  └────────────────────┬──────────────────────────────────┘    │
│                       │                                        │
│  ┌────────────────────▼──────────────────────────────────┐    │
│  │                  Controllers                          │    │
│  │  pmController.ts - Handle HTTP requests              │    │
│  └────────────────────┬──────────────────────────────────┘    │
│                       │                                        │
│  ┌────────────────────▼──────────────────────────────────┐    │
│  │                   Services                            │    │
│  │  ┌─────────────────────┐  ┌──────────────────────┐   │    │
│  │  │ matchingService.ts  │  │ dataIngestionService │   │    │
│  │  │ - PM Matching Logic │  │ - Bulk Data Insert   │   │    │
│  │  │ - Scoring Algorithm │  │ - Excel Parsing      │   │    │
│  │  └─────────────────────┘  └──────────────────────┘   │    │
│  └────────────────────┬──────────────────────────────────┘    │
│                       │                                        │
│  ┌────────────────────▼──────────────────────────────────┐    │
│  │                    Utils                              │    │
│  │  gradeUtils.ts  |  excelParser.ts                    │    │
│  └───────────────────────────────────────────────────────┘    │
└────────────────────────────┬──────────────────────────────────┘
                             │ SQL Queries
                             │
┌────────────────────────────▼──────────────────────────────────┐
│                      DATABASE LAYER                           │
│                      PostgreSQL 15+                           │
├───────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  employees   │  │people_managers│ │pm_assignments│       │
│  │  (Master)    │  │  (Master)     │ │  (Records)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ separation_  │  │    skill_     │ │   approval_  │       │
│  │  reports     │  │  repository   │ │  workflows   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  exceptions  │  │  audit_logs   │ │configuration │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────────────────────────────────────┘
```

## Data Flow - New Joiner PM Assignment

```
┌─────────────┐
│   User      │
│  Uploads    │
│  Excel File │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Frontend: DataUpload Page              │
│  - FileUpload Component                 │
│  - RTK Query: uploadEmployees()         │
└──────┬──────────────────────────────────┘
       │ POST /api/pm/upload/employees
       ▼
┌─────────────────────────────────────────┐
│  Backend: pmController.uploadEmployees  │
│  - Validate file                        │
│  - Parse Excel (excelParser.ts)         │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Service: dataIngestionService          │
│  - Bulk insert employees                │
│  - Handle conflicts (upsert)            │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Database: employees table              │
│  - Insert/Update records                │
│  - Mark is_new_joiner = true            │
└─────────────────────────────────────────┘

       ┌─────────────┐
       │   User      │
       │  Clicks     │
       │  "Find PM"  │
       └──────┬──────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Frontend: NewJoiners Page              │
│  - Display new joiners list             │
│  - RTK Query: findPMForEmployee()       │
└──────┬──────────────────────────────────┘
       │ GET /api/pm/employees/:id/find-pm
       ▼
┌─────────────────────────────────────────┐
│  Backend: pmController.findPMForEmployee│
│  - Fetch employee details               │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Service: matchingService.findBestPM    │
│  1. Get matching weights from config    │
│  2. Query eligible PMs (filters)        │
│  3. Calculate scores for each PM        │
│  4. Sort by score (descending)          │
│  5. Return ranked list                  │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Frontend: Display PM Recommendations   │
│  - Show match scores                    │
│  - Show reasons (practice, CU, etc.)    │
│  - User clicks "Assign"                 │
└──────┬──────────────────────────────────┘
       │ POST /api/pm/assignments
       ▼
┌─────────────────────────────────────────┐
│  Backend: pmController.assignPMToEmployee│
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Service: matchingService.assignPM      │
│  - Create assignment record             │
│  - Set status = 'pending'               │
│  - Store match score                    │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Database: pm_assignments table         │
│  - Insert assignment record             │
└─────────────────────────────────────────┘
```

## Matching Algorithm Flow

```
┌─────────────────────────────────────────┐
│  Input: Employee Details                │
│  - Practice, CU, Region, Account        │
│  - Skill, Grade                         │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Step 1: Fetch Eligible PMs             │
│  Mandatory Filters:                     │
│  ✓ Same Practice                        │
│  ✓ Same CU                              │
│  ✓ Same Region                          │
│  ✓ is_active = true                     │
│  ✓ reportee_count < max_capacity        │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Step 2: Grade Validation               │
│  For each PM:                           │
│  ✓ PM grade >= C1                       │
│  ✓ PM grade > Employee grade            │
│  ✓ Grade gap <= 3 levels                │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Step 3: Calculate Scores               │
│  For each eligible PM:                  │
│                                          │
│  score = 0                              │
│  + (Practice match × 40)                │
│  + (CU match × 25)                      │
│  + (Region match × 15)                  │
│  + (Account match × 10)                 │
│  + (Skill similarity × 5)               │
│  + (Grade proximity × 3)                │
│  + (Capacity score × 2)                 │
│                                          │
│  Max Score: 100                         │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Step 4: Sort & Rank                    │
│  - Sort by score (descending)           │
│  - Tie-breaker: lowest reportee_count   │
│  - Return top matches                   │
└──────┬──────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Output: Ranked PM List                 │
│  [                                       │
│    { pm: {...}, score: 95.5, reasons }  │
│    { pm: {...}, score: 88.2, reasons }  │
│    { pm: {...}, score: 82.0, reasons }  │
│  ]                                       │
└─────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌──────────────────────┐
│    employees         │
│──────────────────────│
│ id (PK)              │
│ employee_id (UNIQUE) │◄────┐
│ name                 │     │
│ practice             │     │
│ cu                   │     │
│ current_pm_id (FK)   │─────┼────┐
│ is_new_joiner        │     │    │
└──────────────────────┘     │    │
                             │    │
┌──────────────────────┐     │    │
│  people_managers     │     │    │
│──────────────────────│     │    │
│ id (PK)              │     │    │
│ employee_id (UNIQUE) │◄────┘    │
│ name                 │          │
│ practice             │          │
│ reportee_count       │          │
│ max_capacity         │          │
└──────────────────────┘          │
         ▲                        │
         │                        │
         │                        │
┌────────┴─────────────┐          │
│  pm_assignments      │          │
│──────────────────────│          │
│ id (PK)              │          │
│ employee_id (FK)     │──────────┘
│ old_pm_id (FK)       │
│ new_pm_id (FK)       │
│ match_score          │
│ assignment_type      │
│ status               │
└──────────────────────┘
         │
         │
         ▼
┌──────────────────────┐
│ approval_workflows   │
│──────────────────────│
│ id (PK)              │
│ assignment_id (FK)   │
│ approver_role        │
│ status               │
└──────────────────────┘
```

## Component Hierarchy - Frontend

```
App.tsx
│
├── BrowserRouter
│   │
│   ├── Navbar
│   │   ├── Link: Data Upload
│   │   ├── Link: New Joiners
│   │   └── Link: Assignments
│   │
│   └── Routes
│       │
│       ├── Route: / → DataUpload.tsx
│       │   └── FileUpload × 3
│       │       ├── Employees
│       │       ├── PMs
│       │       └── Separations
│       │
│       ├── Route: /new-joiners → NewJoiners.tsx
│       │   ├── Table (New Joiners List)
│       │   │   └── Button: Find PM
│       │   └── Table (PM Recommendations)
│       │       └── Button: Assign
│       │
│       └── Route: /assignments → Assignments.tsx
│           └── Table (Pending Assignments)
```

## Technology Stack Details

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND STACK                       │
├─────────────────────────────────────────────────────────┤
│  React 18          │ UI Library                         │
│  TypeScript 5.3    │ Type Safety                        │
│  Vite 5            │ Build Tool & Dev Server            │
│  React Router 6    │ Client-side Routing                │
│  Redux Toolkit     │ State Management                   │
│  RTK Query         │ API State & Caching                │
│  Jest              │ Unit Testing                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    BACKEND STACK                        │
├─────────────────────────────────────────────────────────┤
│  Node.js 18+       │ Runtime                            │
│  Express 4         │ Web Framework                      │
│  TypeScript 5.3    │ Type Safety                        │
│  pg (node-postgres)│ PostgreSQL Client                  │
│  Multer            │ File Upload Handling               │
│  XLSX              │ Excel File Parsing                 │
│  Jest              │ Unit Testing                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   DATABASE STACK                        │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL 15+    │ Relational Database                │
│  JSONB             │ Flexible Configuration Storage     │
│  Indexes           │ Query Performance Optimization     │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture (Future)

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION SETUP                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐         ┌──────────────┐             │
│  │   Nginx      │────────▶│   Frontend   │             │
│  │ Load Balancer│         │  (React SPA) │             │
│  │              │         │   Port 3000  │             │
│  └──────┬───────┘         └──────────────┘             │
│         │                                               │
│         │                 ┌──────────────┐             │
│         └────────────────▶│   Backend    │             │
│                           │  (Node.js)   │             │
│                           │   Port 5000  │             │
│                           └──────┬───────┘             │
│                                  │                      │
│                           ┌──────▼───────┐             │
│                           │  PostgreSQL  │             │
│                           │   Port 5432  │             │
│                           └──────────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

**Note**: This is Phase 1 architecture. Phase 2+ will add:
- Email/Teams notification service
- Background job scheduler
- WebSocket for real-time updates
- Caching layer (Redis)
- API Gateway
