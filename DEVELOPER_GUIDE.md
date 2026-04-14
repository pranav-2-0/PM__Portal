# Developer Quick Reference

## 🚀 Quick Start Commands

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev          # Start dev server
npm test            # Run tests
npm run build       # Build for production

# Frontend
cd frontend
npm install
npm run dev         # Start dev server
npm test           # Run tests
npm run build      # Build for production

# Database
psql -U postgres -d pm_alignment -f database/schema.sql
psql -U postgres -d pm_alignment -f database/mock_data.sql
```

## 📂 Project Structure Quick Map

```
backend/src/
├── config/          → database.ts (DB connection)
├── controllers/     → pmController.ts (API handlers)
├── services/        → Business logic
│   ├── matchingService.ts
│   ├── dataIngestionService.ts
│   └── statisticsService.ts
├── routes/          → pmRoutes.ts (API routes)
├── utils/           → Helper functions
│   ├── gradeUtils.ts
│   ├── excelParser.ts
│   ├── logger.ts
│   └── validation.ts
└── types/           → TypeScript interfaces

frontend/src/
├── pages/           → Main pages
│   ├── Dashboard.tsx
│   ├── DataUpload.tsx
│   ├── NewJoiners.tsx
│   └── Assignments.tsx
├── components/      → Reusable UI
│   ├── FileUpload.tsx
│   └── Table.tsx
├── services/        → pmApi.ts (RTK Query)
└── store/           → Redux store
```

## 🔌 API Endpoints Cheat Sheet

### Data Upload
```
POST /api/pm/upload/employees      - Upload employee Excel
POST /api/pm/upload/pms            - Upload PM Excel
POST /api/pm/upload/separations    - Upload separation Excel
POST /api/pm/upload/skills         - Upload skill repository Excel
```

### Operations
```
GET  /api/pm/employees/new-joiners           - Get new joiners
GET  /api/pm/employees/:id/find-pm           - Find PM matches
POST /api/pm/assignments                     - Create assignment
GET  /api/pm/assignments/pending             - Get pending assignments
```

### Statistics
```
GET  /api/pm/stats/dashboard                 - Dashboard metrics
GET  /api/pm/stats/pm-capacity               - PM capacity report
```

### Health
```
GET  /health                                 - Server health check
```

## 🛠️ Common Development Tasks

### Add New API Endpoint
1. Add function to `controllers/pmController.ts`
2. Add route to `routes/pmRoutes.ts`
3. Add to RTK Query in `frontend/src/services/pmApi.ts`
4. Use in component with `useXxxQuery()` or `useXxxMutation()`

### Add New Service
1. Create file in `backend/src/services/`
2. Export class with methods
3. Import in controller
4. Use in endpoint handlers

### Add New Page
1. Create component in `frontend/src/pages/`
2. Add route in `App.tsx`
3. Add navigation link in navbar
4. Add API calls using RTK Query hooks

### Add New Utility
1. Create file in `backend/src/utils/` or `frontend/src/utils/`
2. Export functions
3. Import where needed

## 🐛 Debugging Tips

### Backend Issues
```bash
# Check logs
npm run dev  # Watch console for logger output

# Test API directly
curl http://localhost:5000/health
curl http://localhost:5000/api/pm/stats/dashboard

# Check database
psql -U postgres -d pm_alignment
SELECT COUNT(*) FROM employees;
\q
```

### Frontend Issues
```bash
# Check browser console (F12)
# Check network tab for API calls
# Check Redux DevTools

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

### Database Issues
```sql
-- Check connections
SELECT * FROM pg_stat_activity WHERE datname = 'pm_alignment';

-- Check table counts
SELECT 
  'employees' as table, COUNT(*) FROM employees
UNION ALL
SELECT 'people_managers', COUNT(*) FROM people_managers;

-- Reset database
DROP DATABASE pm_alignment;
CREATE DATABASE pm_alignment;
\c pm_alignment
\i database/schema.sql
\i database/mock_data.sql
```

## 📝 Code Patterns

### Controller Pattern
```typescript
export const myEndpoint = async (req: Request, res: Response) => {
  try {
    logger.info('Operation started', { data: req.body });
    
    // Validation
    if (!req.body.field) {
      return res.status(400).json({ error: 'Missing field' });
    }
    
    // Business logic
    const result = await service.doSomething(req.body);
    
    logger.info('Operation completed', result);
    res.json(result);
  } catch (error: any) {
    logger.error('Operation failed', error);
    res.status(500).json({ error: error.message });
  }
};
```

### Service Pattern
```typescript
export class MyService {
  async doSomething(data: any) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Database operations
      const result = await client.query('SELECT ...');
      
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
```

### RTK Query Pattern
```typescript
// In pmApi.ts
myEndpoint: builder.query<ReturnType, ParamType>({
  query: (param) => `/path/${param}`,
  providesTags: ['TagName'],
}),

// In component
const { data, isLoading, error } = useMyEndpointQuery(param);
```

### React Component Pattern
```typescript
export const MyPage: React.FC = () => {
  const { data, isLoading } = useGetDataQuery();
  
  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>No data</div>;
  
  return (
    <div className="page">
      <h1>Title</h1>
      {/* Content */}
    </div>
  );
};
```

## 🧪 Testing Patterns

### Unit Test Pattern
```typescript
describe('MyFunction', () => {
  it('should do something', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
  
  it('should handle errors', () => {
    expect(() => myFunction(badInput)).toThrow();
  });
});
```

### API Test Pattern
```typescript
describe('POST /api/pm/endpoint', () => {
  it('should return 200 on success', async () => {
    const response = await request(app)
      .post('/api/pm/endpoint')
      .send({ data: 'test' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('result');
  });
});
```

## 🔐 Environment Variables

```bash
# Backend (.env)
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pm_alignment
DB_USER=postgres
DB_PASSWORD=postgres
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

## 📊 Database Quick Queries

```sql
-- Get new joiners without PM
SELECT * FROM employees 
WHERE is_new_joiner = true AND current_pm_id IS NULL;

-- Get PM capacity
SELECT name, reportee_count, max_capacity,
  ROUND((reportee_count::decimal / max_capacity) * 100, 2) as utilization
FROM people_managers
WHERE is_active = true
ORDER BY utilization DESC;

-- Get pending assignments
SELECT pa.*, e.name as emp_name, pm.name as pm_name
FROM pm_assignments pa
JOIN employees e ON pa.employee_id = e.employee_id
JOIN people_managers pm ON pa.new_pm_id = pm.employee_id
WHERE pa.status = 'pending';

-- Update matching weights
UPDATE configuration 
SET config_value = '{"practice": 40, "cu": 25, ...}'::jsonb
WHERE config_key = 'matching_weights';
```

## 🎨 CSS Classes Reference

```css
.page              /* Main page container */
.section           /* Content section */
.data-table        /* Table styling */
.file-upload       /* File upload component */
.stats-grid        /* Dashboard stats grid */
.stat-card         /* Stat card */
.stat-card.alert   /* Alert stat card */
.nav-links         /* Navigation links */
```

## 🚨 Common Errors & Solutions

| Error | Solution |
|-------|----------|
| Port already in use | Change PORT in .env or kill process |
| Database connection failed | Check PostgreSQL running, verify credentials |
| Excel upload fails | Check column names match template |
| No PM matches found | Verify PM data uploaded, check filters |
| CORS error | Check backend CORS config |
| Module not found | Run `npm install` |

## 📚 Useful Commands

```bash
# Find process on port
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux

# Kill process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # Mac/Linux

# Check PostgreSQL status
pg_ctl status                 # Check status
pg_ctl start                  # Start
pg_ctl stop                   # Stop

# Git commands
git status
git add .
git commit -m "message"
git push
```

---

**Quick Links**:
- [Full Documentation](docs/PHASE1_GUIDE.md)
- [API Docs](docs/API_DOCUMENTATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Fixes & Enhancements](FIXES_AND_ENHANCEMENTS.md)
