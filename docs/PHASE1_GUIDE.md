# Phase 1 Implementation Guide

## Overview
Phase 1 focuses on data ingestion, database setup, and PM matching algorithm.

## Completed Features
✅ Database schema with all required tables
✅ Excel file upload for Employees, PMs, and Separation reports
✅ PM matching algorithm with weighted scoring
✅ REST API endpoints for data operations
✅ React frontend with RTK Query state management
✅ Reusable components (FileUpload, Table)
✅ Unit tests for grade utilities

## Setup Instructions

### 1. Database Setup
```bash
# Create database
psql -U postgres
CREATE DATABASE pm_alignment;
\q

# Run schema
psql -U postgres -d pm_alignment -f database/schema.sql

# Load mock data (optional)
psql -U postgres -d pm_alignment -f database/mock_data.sql
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm run dev
```

Backend runs on: http://localhost:5000

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:3000

## API Endpoints

### Data Upload
- `POST /api/pm/upload/employees` - Upload employee Excel
- `POST /api/pm/upload/separations` - Upload separation Excel

### PM Operations
- `GET /api/pm/employees/new-joiners` - Get new joiners without PM
- `GET /api/pm/employees/:employeeId/find-pm` - Find best PM matches
- `POST /api/pm/assignments` - Create PM assignment
- `GET /api/pm/assignments/pending` - Get pending assignments

## Excel File Format

### Bench Report File
| Employee ID | Name | Email | Practice | CU | Region | Account | Skill | Grade | Current PM ID | Joining Date | Is New Joiner |
|------------|------|-------|----------|-------|--------|---------|-------|-------|---------------|--------------|---------------|

### Separation Reports File
| Employee ID | LWD | Reason |
|------------|-----|--------|

## Matching Algorithm

### Weights (Configurable)
- Practice: 40%
- CU: 25%
- Region: 15%
- Account: 10%
- Skill: 5%
- Grade: 3%
- Capacity: 2%

### Mandatory Filters
1. Same Practice
2. Same CU
3. Same Region
4. PM grade ≥ C1 and higher than employee
5. PM capacity < max_capacity

### Scoring Logic
```
Total Score = (Practice Match × 40) + (CU Match × 25) + (Region Match × 15) 
            + (Account Match × 10) + (Skill Similarity × 5) 
            + (Grade Proximity × 3) + (Capacity Score × 2)
```

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Manual Testing Flow
1. Upload PM data via Data Upload page
2. Upload Employee data (mark some as new joiners)
3. Go to New Joiners page
4. Click "Find PM" for an employee
5. Review recommended PMs with scores
6. Click "Assign" to create assignment
7. View pending assignments in Assignments page

## Database Tables

### Core Tables
- `employees` - Employee master data
- `people_managers` - PM master data
- `pm_assignments` - Assignment records
- `skill_repository` - Skill mappings
- `separation_reports` - PM resignations/movements

### Supporting Tables
- `approval_workflows` - Approval chain (Phase 2)
- `exceptions` - Exception handling (Phase 2)
- `audit_logs` - Audit trail
- `configuration` - System configuration

## Next Steps (Phase 2)

### Planned Features
- Approval workflow automation
- Email notifications
- Automatic reassignment triggers
- LWD-based proactive planning (T-60, T-30, T-7)
- Manual override with justification
- Exception queue management

### Technical Enhancements
- WebSocket for real-time updates
- Background jobs for daily data sync
- Advanced skill clustering
- Dashboard with analytics

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check .env credentials
- Ensure database exists

### File Upload Errors
- Verify Excel column names match expected format
- Check file size (max 10MB)
- Ensure data types are correct

### PM Matching Returns Empty
- Verify mandatory filters (practice, CU, region)
- Check PM capacity limits
- Ensure PM grades are C1+

## Project Structure
```
people_manager_solution/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── controllers/    # API controllers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Helper functions
│   │   ├── types/          # TypeScript types
│   │   └── server.ts       # Entry point
│   └── tests/              # Unit tests
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # RTK Query API
│   │   ├── store/          # Redux store
│   │   ├── types/          # TypeScript types
│   │   └── main.tsx        # Entry point
└── database/
    ├── schema.sql          # Database schema
    └── mock_data.sql       # Test data
```
