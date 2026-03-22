# Quick Start Guide - PM Alignment System

## Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+
- Git

## Installation Steps

### 1. Database Setup (5 minutes)

```bash
# Start PostgreSQL service
# Windows: Services → PostgreSQL → Start
# Linux: sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE pm_alignment;
\q

# Run schema
cd database
psql -U postgres -d pm_alignment -f schema.sql

# Load test data (optional)
psql -U postgres -d pm_alignment -f mock_data.sql
```

### 2. Backend Setup (3 minutes)

```bash
cd backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env
# Edit .env and update database credentials if needed

# Start backend server
npm run dev
```

✅ Backend running at: http://localhost:5000
✅ Health check: http://localhost:5000/health

### 3. Frontend Setup (3 minutes)

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

✅ Frontend running at: http://localhost:3000

## Testing Phase 1 (10 minutes)

### Step 1: Upload Data
1. Open http://localhost:3000
2. You'll see "Data Upload" page
3. Upload Excel files (use templates from docs/EXCEL_TEMPLATES.md)
  - Upload Bench Report
  - Optionally upload Separation reports

### Step 2: Assign PM to New Joiner
1. Click "New Joiners" in navigation
2. You'll see list of employees without PM
3. Click "Find PM" for any employee
4. System shows recommended PMs with match scores
5. Click "Assign" on the best match
6. Success message appears

### Step 3: View Assignments
1. Click "Assignments" in navigation
2. See all pending PM assignments
3. View match scores and assignment details

## Verify Everything Works

### Backend Health Check
```bash
curl http://localhost:5000/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Database Check
```bash
psql -U postgres -d pm_alignment
SELECT COUNT(*) FROM employees;
\q
```

### Run Tests
```bash
cd backend
npm test
# All tests should pass
```

## Common Issues & Solutions

### Issue: Database connection failed
**Solution**: 
- Check PostgreSQL is running
- Verify credentials in backend/.env
- Ensure database 'pm_alignment' exists

### Issue: Port already in use
**Solution**:
- Backend: Change PORT in backend/.env
- Frontend: Change port in frontend/vite.config.ts

### Issue: Excel upload fails
**Solution**:
- Check column names match template
- Verify file is .xlsx or .xls format
- Ensure file size < 10MB

### Issue: No PM matches found
**Solution**:
- Verify PM data uploaded with correct practice/CU/region
- Check PM grades are C1 or above
- Ensure PM capacity < max_capacity

## Next Steps

### Create Your Own Test Data
1. Download Excel templates from docs/EXCEL_TEMPLATES.md
2. Fill with your organization's data
3. Upload via Data Upload page

### Customize Matching Weights
```sql
-- Update weights in database
UPDATE configuration 
SET config_value = '{
  "practice": 45,
  "cu": 25,
  "region": 15,
  "account": 8,
  "skill": 4,
  "grade": 2,
  "capacity": 1
}'::jsonb
WHERE config_key = 'matching_weights';
```

### Phase 2 Development
- Implement approval workflows
- Add email notifications
- Create monitoring dashboard
- See docs/PHASE1_GUIDE.md for details

## Project Structure Overview
```
people_manager_solution/
├── backend/           # Node.js API (Port 5000)
│   ├── src/
│   │   ├── services/  # Business logic
│   │   ├── controllers/ # API handlers
│   │   └── utils/     # Helper functions
│   └── tests/         # Unit tests
├── frontend/          # React App (Port 3000)
│   └── src/
│       ├── pages/     # Main pages
│       ├── components/ # Reusable UI
│       └── services/  # API calls (RTK Query)
└── database/          # PostgreSQL
    ├── schema.sql     # Tables & indexes
    └── mock_data.sql  # Test data
```

## Support & Documentation
- Full guide: docs/PHASE1_GUIDE.md
- Excel templates: docs/EXCEL_TEMPLATES.md
- Memory bank: .amazonq/rules/memory-bank/project-context.md

## Development Commands

### Backend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm test         # Run tests
npm start        # Start production server
```

### Frontend
```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
npm test         # Run tests
```

---

**Estimated Setup Time**: 15-20 minutes
**Phase 1 Status**: ✅ Complete and Ready for Testing
