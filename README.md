# People Manager Alignment & Reassignment System

## 🎯 Overview
Automated PM assignment system reducing cycle time from **7-14 days to <24 hours**.

Eliminates manual effort in assigning People Managers to new joiners and reassigning when PMs resign/move, using intelligent matching algorithms with configurable business rules.

## ✨ Key Features (Phase 1)

✅ **Excel Data Ingestion** - Upload Bench Report and Separation reports  
✅ **Intelligent PM Matching** - Weighted scoring algorithm with 7 criteria  
✅ **New Joiner Assignment** - Find and assign best PM in seconds  
✅ **Assignment Tracking** - Monitor pending assignments  
✅ **Configurable Rules** - Adjust matching weights via database  
✅ **Audit Trail** - Complete history of all changes  

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 15+

### Setup Steps

```bash
# 1. Database Setup
psql -U postgres
CREATE DATABASE pm_alignment;
\q
psql -U postgres -d pm_alignment -f database/schema.sql
psql -U postgres -d pm_alignment -f database/mock_data.sql

# 2. Backend Setup
cd backend
npm install
cp .env.example .env
# Edit .env if needed (default values work for local setup)
npm run dev          # ⚠️ Use 'npm run dev' NOT 'npm start'

# 3. Frontend Setup (in new terminal)
cd frontend
npm install
npm run dev
```

### Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### ⚠️ Important
- Use `npm run dev` for development (auto-reload)
- Use `npm start` only after `npm run build` for production

## 📊 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite |
| State Management | Redux Toolkit + RTK Query |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL 15+ |
| Testing | Jest + React Testing Library |

## 📁 Project Structure

```
people_manager_solution/
├── backend/              # Node.js REST API
│   ├── src/
│   │   ├── services/    # Business logic (matching, ingestion)
│   │   ├── controllers/ # API handlers
│   │   ├── routes/      # API routes
│   │   ├── utils/       # Helper functions
│   │   └── config/      # Database config
│   └── tests/           # Unit tests
├── frontend/             # React application
│   ├── src/
│   │   ├── pages/       # Main pages (Upload, NewJoiners, Assignments)
│   │   ├── components/  # Reusable UI components
│   │   ├── services/    # RTK Query API
│   │   └── store/       # Redux store
│   └── tests/           # Component tests
├── database/             # PostgreSQL
│   ├── schema.sql       # Database schema (9 tables)
│   └── mock_data.sql    # Test data
└── docs/                 # Documentation
    ├── QUICK_START.md
    ├── PHASE1_GUIDE.md
    ├── API_DOCUMENTATION.md
    └── EXCEL_TEMPLATES.md
```

## 🎓 How It Works

### 1. Data Upload
Upload Excel files containing:
- **Bench Report** (GAD feed) - Employee master data
- **Separations** - PM resignations with LWD

### 2. PM Matching Algorithm
**Mandatory Filters**:
- Same Practice, CU, Region
- PM grade ≥ C1 and higher than employee
- PM capacity < max_capacity

**Weighted Scoring** (configurable):
- Practice: 40% | CU: 25% | Region: 15%
- Account: 10% | Skill: 5% | Grade: 3% | Capacity: 2%

### 3. Assignment
- View new joiners without PM
- Click "Find PM" to get ranked recommendations
- Review match scores and reasons
- Assign best PM with one click

## 📋 Phase Roadmap

### ✅ Phase 1 (COMPLETED)
- Database schema with 9 tables
- Excel data ingestion
- PM matching algorithm
- Basic assignment workflow
- Unit tests

### 📅 Phase 2 (Next - 3-4 weeks)
- Multi-level approval workflow
- Email/Teams notifications
- Automatic reassignment triggers
- LWD-based proactive planning (T-60, T-30, T-7)
- Manual override with justification
- Exception queue management

### 📅 Phase 3 (Future)
- Real-time monitoring dashboard
- PM capacity analytics
- Monthly engagement nudges
- Advanced reporting

### 📅 Phase 4 (Future)
- ML-based recommendations
- Advanced skill clustering
- HR system integration
- Mobile app for approvals

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [QUICK_START.md](docs/QUICK_START.md) | 15-minute setup guide |
| [PHASE1_GUIDE.md](docs/PHASE1_GUIDE.md) | Detailed implementation guide |
| [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) | Complete API reference |
| [EXCEL_TEMPLATES.md](docs/EXCEL_TEMPLATES.md) | File format specifications |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Comprehensive project overview |

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📈 Expected Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cycle Time | 7-14 days | <24 hours | 86-98% ↓ |
| Manual Touchpoints | 15-20 | 2-3 | 85% ↓ |
| Assignment Accuracy | Random | Rule-based | ~100% |

## 🔧 Configuration

Matching weights are configurable via database:

```sql
UPDATE configuration 
SET config_value = '{
  "practice": 40,
  "cu": 25,
  "region": 15,
  "account": 10,
  "skill": 5,
  "grade": 3,
  "capacity": 2
}'::jsonb
WHERE config_key = 'matching_weights';
```

## 🛠️ Development

```bash
# Backend dev server with hot reload
cd backend && npm run dev

# Frontend dev server with hot reload
cd frontend && npm run dev

# Build for production
cd backend && npm run build
cd frontend && npm run build
```

## 📞 Support

For issues or questions:
1. Check [QUICK_START.md](docs/QUICK_START.md) troubleshooting section
2. Review [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
3. See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for detailed context

## 📄 License

Internal Capgemini Project

---

**Status**: Phase 1 Complete ✅  
**Next Milestone**: Phase 2 - Approval Workflows  
**Last Updated**: January 2024
