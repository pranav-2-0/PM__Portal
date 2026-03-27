# 📌 QUICK REFERENCE CARD - Authentication System

## 🚀 30-Second Setup

```bash
# Terminal 1 - Backend
cd backend_updated
npm install bcrypt jsonwebtoken cookie-parser
echo "DATABASE_URL=postgresql://user:pass@localhost/db" > .env
echo "JWT_SECRET=your_secret_here_min_32_chars" >> .env
npm run dev  # Runs on http://localhost:5000

# Terminal 2 - Frontend
cd frontend_updated
npm run dev  # Runs on http://localhost:5173
```

## 🔑 Demo Accounts

| Email | Password | Department |
|-------|----------|-----------|
| hr.user@company.com | TestPass123! | HR |
| eng.user@company.com | TestPass123! | Engineering |
| fin.user@company.com | TestPass123! | Finance |

## 🌐 URLs to Visit

```
Frontend:  http://localhost:5173
  /login   - Login page
  /signup  - Sign up page
  /dashboard - User dashboard (protected)

Backend:   http://localhost:5000/api
  POST /auth/signup       - Register
  POST /auth/login        - Authenticate
  GET  /auth/me           - Get user (protected)
  GET  /auth/departments  - List departments
  POST /auth/logout       - Logout
```

## 📝 Test Flow

```
1. Open /signup
   Fill form with:
   - Name: Test User
   - Email: test@company.com
   - Password: TestPass123! (strong!)
   - Department: Engineering
   Click "Create Account" → /dashboard

2. OR open /login
   Email: hr.user@company.com
   Password: TestPass123!
   Click "Sign In" → /dashboard

3. On dashboard:
   - See your profile card (left side)
   - See department features (center/right)
   - Click "Logout" to test logout
```

## 🔐 Password Rules

Must have **ALL** of these:
- ✅ 6+ characters
- ✅ Uppercase letter (A-Z)
- ✅ Lowercase letter (a-z)
- ✅ Number (0-9)
- ✅ Special char (!@#$%^&*)

**Examples:**
- ✅ TestPass123!
- ✅ SecureP@ssw0rd
- ❌ test123 (no uppercase)
- ❌ TEST123! (no lowercase)

## 📊 Files Created

```
Database:    database/auth-schema.sql
Backend:     7 files (middleware, utils, controller, routes, server)
Frontend:    6 files (service, component, 3 pages, app)
Docs:        3 guides (complete, quick-start, summary)
```

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to DB | Check DATABASE_URL in .env |
| JWT_SECRET error | Add JWT_SECRET to .env |
| Port 5000 in use | Change PORT in .env |
| CORS error | Update CORS in src/server.ts |
| Can't login | Check browser console for errors |
| Page won't load | Verify backend is running |

## 🔄 API Examples (curl)

```bash
# Sign up
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@company.com",
    "password": "SecurePass123!",
    "department_id": 1
  }'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@company.com",
    "password": "SecurePass123!"
  }'

# Get departments (no auth needed)
curl http://localhost:5000/api/auth/departments

# Get user (replace TOKEN with JWT from login)
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/auth/me
```

## 📍 Key Folders

```
frontend_updated/
├── src/
│   ├── services/authService.ts     (HTTP client)
│   ├── components/ProtectedRoute.tsx (route guard)
│   └── pages/
│       ├── Login.tsx               (login form)
│       ├── Signup.tsx              (signup form)
│       └── AuthUserDashboard.tsx   (dashboard)

backend_updated/
├── src/
│   ├── middleware/authMiddleware.ts (token verify)
│   ├── controllers/authController.ts (endpoints)
│   ├── routes/authRoutes.ts         (routes)
│   ├── utils/
│   │   ├── jwtUtils.ts             (token)
│   │   └── passwordUtils.ts        (bcrypt)
│   └── server.ts                   (app setup)

database/
└── auth-schema.sql                 (PostgreSQL)
```

## ✅ Verification Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads on localhost:5173
- [ ] Can visit /login page
- [ ] Can visit /signup page
- [ ] Can signup with strong password
- [ ] Redirected to /dashboard after signup
- [ ] Can see user profile on dashboard
- [ ] Department-specific features show
- [ ] Logout button works
- [ ] Cannot access /dashboard without login

## 🔗 Environment Variables (.env)

**backend_updated/.env:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/pm_system
JWT_SECRET=minimum32charactersecretkey12345
JWT_EXPIRATION=24h
PORT=5000
```

**frontend_updated/.env (optional):**
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## 📚 Documentation Files

1. **QUICK_START_AUTH.md** - Setup & testing (START HERE)
2. **AUTHENTICATION_SYSTEM_COMPLETE.md** - Full details
3. **COMPLETION_REPORT.md** - Status & next steps
4. **This file** - Quick reference

## 🎯 Success Criteria

When you see this, everything works:
```
✅ Login page loads
✅ Can fill signup form
✅ Password strength shows
✅ Redirects to /dashboard
✅ Dashboard shows user info
✅ Logout works
✅ Cannot access /dashboard without login
```

## 💾 Token Storage

Tokens stored in:
- **localStorage** - Readable by JavaScript
- **HTTP-only cookie** - Sent with requests

Used for automatic Authorization header in API calls

## 🎨 Frontend Tech Stack

```
React 18
TypeScript  
Tailwind CSS
Lucide React (icons)
Axios (HTTP)
React Router (navigation)
```

## 🔧 Backend Tech Stack

```
Express.js
Node.js
PostgreSQL
JWT (tokens)
Bcrypt (passwords)
TypeScript
```

## 📞 Getting Help

**Check these files in order:**
1. QUICK_START_AUTH.md (setup issues)
2. AUTHENTICATION_SYSTEM_COMPLETE.md (feature docs)
3. Source code comments (implementation)
4. Browser DevTools Console (client errors)
5. Backend logs (server errors)

## 🚀 Next Steps

1. ✅ Run setup commands
2. ✅ Test demo accounts
3. ✅ Create new account
4. ✅ Review code
5. ✅ Integrate with PM system

---

**Status: Production Ready ✅**
**Version: 1.0.0**
**Last Updated: 2024**

Keep this card handy while testing!
