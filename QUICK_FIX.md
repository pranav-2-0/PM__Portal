# Quick Fix - Module Not Found Error

## ❌ Error
```
Error: Cannot find module 'C:\Capgemini_Work\PeM_Managment\people_manager_solution\backend\dist\server.js'
```

## ✅ Solution

You're trying to run the production build without compiling TypeScript first.

### For Development (Recommended):
```bash
cd backend
npm run dev
```

This will:
- Run TypeScript directly without compilation
- Auto-reload on file changes
- Show detailed error messages

### For Production:
```bash
cd backend
npm run build    # Compile TypeScript to JavaScript
npm start        # Run compiled code
```

## 🔍 What Happened?

- `npm start` runs `node dist/server.js` (compiled JavaScript)
- `npm run dev` runs `ts-node-dev src/server.ts` (TypeScript directly)
- The `dist/` folder doesn't exist until you run `npm run build`

## ✅ Correct Startup Sequence

```bash
# 1. Backend (Terminal 1)
cd backend
npm install          # Install dependencies (first time only)
npm run dev          # Start development server

# 2. Frontend (Terminal 2)
cd frontend
npm install          # Install dependencies (first time only)
npm run dev          # Start development server
```

## 🎯 Expected Output

When running `npm run dev` correctly, you should see:
```
[INFO] Server running on port 5000
```

## 🚨 If Still Not Working

1. **Check Node.js version**:
   ```bash
   node --version  # Should be 18+
   ```

2. **Reinstall dependencies**:
   ```bash
   cd backend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check if port is in use**:
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Mac/Linux
   lsof -i :5000
   ```

4. **Create .env file**:
   ```bash
   cd backend
   copy .env.example .env  # Windows
   cp .env.example .env    # Mac/Linux
   ```

## 📝 Quick Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npm install` | Install dependencies | First time or after pulling code |
| `npm run dev` | Start dev server | Development (auto-reload) |
| `npm run build` | Compile TypeScript | Before production deployment |
| `npm start` | Run compiled code | Production only |
| `npm test` | Run tests | Testing |

---

**TL;DR**: Use `npm run dev` for development, not `npm start`
