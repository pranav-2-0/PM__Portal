# 🚀 Authentication System - Quick Start Guide

## Quick Setup (5 minutes)

### Step 1: Database Setup
```bash
# Connect to your PostgreSQL database
psql -U your_user -d your_database

# Run the schema
\i database/auth-schema.sql

# Verify the tables were created
\dt
# Should show: users, departments tables
```

### Step 2: Backend Setup
```bash
cd backend_updated

# Install dependencies
npm install bcrypt jsonwebtoken cookie-parser

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/your_database
JWT_SECRET=your_secret_key_at_least_32_characters_long
JWT_EXPIRATION=24h
PORT=5000
EOF

# Start the server
npm run dev
```

The backend will be available at `http://localhost:5000`

### Step 3: Frontend Setup
```bash
cd frontend_updated

# Install dependencies (if not already done)
npm install

# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:5173` (or the port it outputs)

---

## 🧪 Testing the Authentication Flow

### **Test 1: Sign Up New User**

1. Open browser to `http://localhost:5173/signup`
2. Fill the form:
   ```
   Name: Test User
   Email: testuser@company.com
   Password: TestPass123!  (must have uppercase, lowercase, number, special char)
   Confirm Password: TestPass123!
   Department: Select "Engineering"
   ```
3. Click "Create Account"
4. ✅ Should redirect to `/dashboard` and show your profile

### **Test 2: Log In**

1. Open `http://localhost:5173/login`
2. Enter credentials:
   ```
   Email: testuser@company.com
   Password: TestPass123!
   ```
3. Click "Sign In"
4. ✅ Should redirect to `/dashboard`

### **Test 3: View Dashboard**

1. Dashboard shows:
   - Your name and email
   - Your department
   - Department-specific features
   - Profile card on the left
   - Quick stats and activity section

### **Test 4: Logout**

1. Click "Logout" button in top-right of dashboard
2. ✅ Should redirect to `/login`
3. Verify you cannot access `/dashboard` without logging in

### **Test 5: Protected Routes**

1. Logout and clear localStorage
2. Try accessing `http://localhost:5173/dashboard` directly
3. ✅ Should redirect to `/login`

---

## 📊 Demo Accounts (Already in Database)

After running `auth-schema.sql`, you have these test accounts:

```
Email: hr.user@company.com
Password: TestPass123!
Department: HR

Email: eng.user@company.com
Password: TestPass123!
Department: Engineering

Email: fin.user@company.com
Password: TestPass123!
Department: Finance
```

---

## 🔍 Verifying Everything Works

### Backend Tests

**1. Check server is running:**
```bash
curl http://localhost:5000/health
# Should return: 200 OK
```

**2. Get departments:**
```bash
curl http://localhost:5000/api/auth/departments
# Should return list of departments
```

**3. Test signup:**
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@company.com",
    "password": "SecurePass123!",
    "department_id": 1
  }'
# Should return token and user data
```

**4. Test login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@company.com",
    "password": "SecurePass123!"
  }'
# Should return token
```

### Frontend Tests

1. ✅ Navigate to `/signup` - form loads
2. ✅ Navigate to `/login` - login form loads
3. ✅ Sign up with valid data - redirects to `/dashboard`
4. ✅ See user info on dashboard
5. ✅ Click logout - redirects to `/login`
6. ✅ Try accessing `/dashboard` without token - redirects to `/login`

---

## 🐛 Troubleshooting

### **"Cannot connect to database"**
- Check your PostgreSQL is running: `psql -U postgres`
- Verify DATABASE_URL in `.env` is correct
- Check PostgreSQL credentials and database name

### **"JWT_SECRET not found"**
- Add `JWT_SECRET=your_key_here` to `.env`
- Minimum 32 characters recommended

### **"Port 5000 already in use"**
- Change PORT in `.env` to different port (5001, 5002, etc.)
- Or kill the process using port 5000

### **"Cannot find module"**
- Run `npm install` in both `backend_updated` and `frontend_updated`
- Clear node_modules and reinstall if issues persist

### **"CORS error"**
- The server is configured for `localhost:3000`, `localhost:3002`, `localhost:5173`
- If using different port, update CORS in `backend_updated/src/server.ts`

### **Login redirects to /login instead of /dashboard**
- Check browser console for errors
- Verify backend is running on correct port
- Check token is being saved in localStorage

---

## 📁 Key Files for Testing

| File | Purpose |
|------|---------|
| `frontend_updated/src/pages/Login.tsx` | Login form |
| `frontend_updated/src/pages/Signup.tsx` | Signup form |
| `frontend_updated/src/pages/AuthUserDashboard.tsx` | User dashboard |
| `backend_updated/src/controllers/authController.ts` | Auth endpoints |
| `database/auth-schema.sql` | Database setup |

---

## 🎯 What to Look For

### Success Indicators ✅
- [ ] Backend starts without errors
- [ ] Frontend loads at `localhost:5173`
- [ ] Can access `/login` page
- [ ] Can access `/signup` page
- [ ] Can sign up with valid password
- [ ] Redirects to `/dashboard` after signup
- [ ] Dashboard shows your name and email
- [ ] Can logout
- [ ] Cannot access `/dashboard` without login

### Check the Console 🔍
- Open browser DevTools (F12)
- Check **Console** tab for any JavaScript errors
- Check **Network** tab to verify API calls to `localhost:5000`

### Verify Database 🗄️
```bash
# Connect to PostgreSQL
psql -U your_user -d your_database

# Check users table
SELECT * FROM users;

# Check departments
SELECT * FROM departments;
```

---

## 📝 Password Requirements

For signup, password must have:
- ✅ At least 6 characters
- ✅ One uppercase letter (A-Z)
- ✅ One lowercase letter (a-z)
- ✅ One number (0-9)
- ✅ One special character (!@#$%^&*)

**Valid example**: `TestPass123!` or `SecureP@ssw0rd`
**Invalid examples**: 
- `test123` (no uppercase)
- `TEST123!` (no lowercase)
- `TestPass!` (no number)
- `Test123` (no special char)

---

## 🎉 When Everything Works

You should see:
1. Login page with email/password fields
2. Signup page with name/email/password/department
3. Password strength indicator on signup
4. User dashboard with profile, stats, and features
5. Department-specific content
6. Logout button that clears session

---

## 📞 If You Get Stuck

1. **Check backend logs** - Look for error messages in terminal
2. **Check browser console** - Network errors or JavaScript issues
3. **Verify environment variables** - All required `.env` values set
4. **Test API directly** - Use curl commands above to test backend
5. **Check database** - Verify tables exist and have data

---

## 🎓 Next Steps

Once everything works:
1. Test all demo accounts
2. Try creating multiple users
3. Test accessing different department dashboards
4. Try forced logout and re-login
5. Check browser's Application tab to see tokens in localStorage
6. Review the code to understand the authentication flow

Happy testing! 🚀
