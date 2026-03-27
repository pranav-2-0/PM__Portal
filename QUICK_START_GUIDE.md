# 🚀 QUICK START GUIDE - Detailed Popup Implementation

## What Was Implemented

✅ **New React Component**: `DetailedPopup.tsx` - Beautiful popup UI with all employee/PM info  
✅ **Enhanced Monitoring.tsx**: Added API-driven data fetching  
✅ **Backend API Examples**: Complete working code examples  
✅ **Database Reference**: Schema and query examples  

---

## 📋 Implementation Checklist

### Frontend (DONE ✅)
- [x] Created `DetailedPopup.tsx` component
- [x] Updated `Monitoring.tsx` with API calls
- [x] Added loading states
- [x] Added error handling
- [x] Connected all table buttons (Employee, Current PM, Suggested PM)

### Backend (TODO - Follow these steps)

#### Step 1: Install Dependencies
```bash
cd backend_updated
npm install pg cors
```

#### Step 2: Create API Endpoints
Open your `server.ts` and add these two endpoints:

**Endpoint 1: Get Employee Details**
```typescript
app.get('/api/get-employee-details/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const result = await pool.query(
      `SELECT employee_id, name, email, practice, sub_practice, cu, region, account, skill, grade
       FROM employees WHERE employee_id = $1`,
      [employeeId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch employee details' });
  }
});
```

**Endpoint 2: Get PM Details**
```typescript
app.get('/api/get-pm-details/:pmId', async (req, res) => {
  try {
    const { pmId } = req.params;
    const result = await pool.query(
      `SELECT p.employee_id, p.name, p.email, p.practice, p.sub_practice, p.cu, p.region, 
              p.account, p.skill, p.grade,
              COALESCE(COUNT(e.employee_id), 0)::integer as reportee_count,
              COALESCE(pc.max_capacity, 10)::integer as max_capacity
       FROM pms p
       LEFT JOIN employees e ON e.reporting_manager_id = p.employee_id
       LEFT JOIN pm_capacity pc ON pc.pm_id = p.employee_id
       WHERE p.employee_id = $1
       GROUP BY p.employee_id, pc.max_capacity, p.name, p.email, p.practice, 
                p.sub_practice, p.cu, p.region, p.account, p.skill, p.grade`,
      [pmId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'PM not found' });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch PM details' });
  }
});
```

#### Step 3: Verify Database Tables
Ensure your database has these tables:

```sql
-- Check employees table
SELECT * FROM employees LIMIT 1;

-- Check pms table  
SELECT * FROM pms LIMIT 1;

-- Check pm_capacity table
SELECT * FROM pm_capacity LIMIT 1;
```

#### Step 4: Test with Curl
```bash
# Test employee endpoint
curl -X GET http://localhost:8000/api/get-employee-details/EMP001

# Test PM endpoint
curl -X GET http://localhost:8000/api/get-pm-details/PM001
```

---

## 🧪 Testing in Browser

1. **Start Frontend**
   ```bash
   cd frontend_updated
   npm run dev
   ```

2. **Start Backend**
   ```bash
   cd backend_updated
   npm start
   ```

3. **Open Dashboard**
   - Go to Monitoring page
   - Look at the misalignments table

4. **Test Clicks**
   - Click any **Employee Name** → Should show employee details popup
   - Click any **Current PM Name** → Should show PM details popup
   - Click any **Suggested PM Name** → Should show PM details popup

5. **View Loading State**
   - Watch loading spinner briefly
   - Data loads from API (check DevTools Network tab)

6. **Test Error Handling**
   - Try an invalid ID in URL (e.g., `/api/get-employee-details/INVALID`)
   - Should show friendly error message

---

## 📁 File Structure

```
Frontend:
frontend_updated/src/
├── components/
│   ├── DetailedPopup.tsx (NEW)
│   ├── PMDetailCard.tsx
│   └── EmployeeDetailCard.tsx
└── pages/
    └── Monitoring.tsx (UPDATED)

Backend:
backend_updated/
├── src/
│   └── server.ts (ADD ENDPOINTS HERE)
└── BACKEND_IMPLEMENTATION_EXAMPLES.ts (REFERENCE)

Documentation:
├── DETAILED_POPUP_IMPLEMENTATION.md
├── BACKEND_API_REFERENCE.ts
└── QUICK_START_GUIDE.md (THIS FILE)
```

---

## 🎨 UI Preview

### Employee Popup Shows:
```
┌─────────────────────────────────────┐
│ Employee Details            [X]     │ ← Header with close button
├─────────────────────────────────────┤
│ [Avatar] John Doe                   │ ← Name with initial avatar
│ ID: EMP001                          │
├─────────────────────────────────────┤
│ 📧 Contact Information              │
│ Email: john@company.com             │
├─────────────────────────────────────┤
│ 💼 Organization Information        │
│ Practice: Digital Services          │
│ Sub-Practice: Cloud Engineering     │
│ CU: Technology | Region: APAC       │
│ Account: Acme Corp | Grade: Senior  │
├─────────────────────────────────────┤
│ 🏆 Skills & Competencies           │
│ Skill: AWS Solutions Architect      │
├─────────────────────────────────────┤
│ Last updated: Mar 25, 2026 10:30 AM │
├─────────────────────────────────────┤
│                          [Close]    │ ← Footer button
└─────────────────────────────────────┘
```

### PM Popup Shows (+ Capacity):
```
... all employee info above, PLUS:

👥 PM Capacity
Current Reportees: 7
Max Capacity: 10
Utilization: 70%
[████████░░░░░░] (green bar)
```

---

## 🔧 Customization

### Change Popup Colors
Edit `DetailedPopup.tsx`:
```tsx
// Header background
className="bg-gradient-to-r from-blue-600 to-blue-700"
// Change to your colors:
className="bg-gradient-to-r from-purple-600 to-indigo-700"
```

### Add More Fields
Edit both endpoint AND `DetailedPopup.tsx`:

**Backend (add to SELECT):**
```typescript
SELECT employee_id, name, ..., phone, department
FROM employees
```

**Frontend (add to DetailedPopup.tsx):**
```tsx
<DetailsRow label="Phone" value={data.phone} />
<DetailsRow label="Department" value={data.department} />
```

### Change Max Capacity Default
Edit `Monitoring.tsx`:
```typescript
const fetchPMDetails = async (pmId: string) => {
  ...
  // Change this default if needed
  max_capacity: data.max_capacity || 15  // was 10
```

---

## 🐛 Troubleshooting

### Problem: "Failed to load employee details"
**Solution**: 
- Check backend is running (`npm start` in backend folder)
- Check endpoint URL in Monitoring.tsx
- Check browser console for full error

### Problem: Loading spinner stuck
**Solution**:
- Open DevTools → Network tab
- Trigger click to open popup
- Check if API request shows in Network
- If yes → server taking too long, check database
- If no → check URL in fetch() function

### Problem: Data shows from table, not database
**Solution**: This shouldn't happen with current code
- New DetailedPopup fetches fresh data via API
- Check that DetailedPopup component is rendering
- Don't use old PMDetailCard/EmployeeDetailCard

### Problem: PM reportee count shows 0
**Solution**:
- Check database `reporting_manager_id` column is populated
- Verify employees are linked to PMs
- Check SQL query joins are correct

---

## 📊 Data Flow Diagram

```
User clicks PM name
       ↓
[Monitoring.tsx]
  onClick → fetchPMDetails(id)
       ↓
  State: { type: 'pm', loading: true }
       ↓
  API: GET /api/get-pm-details/PM001
       ↓
[Backend Server]
  Query database
  SELECT * FROM pms WHERE id = PM001
  SELECT COUNT(*) FROM employees WHERE reporting_manager_id = PM001
       ↓
  Response: { name, email, practice, ..., reportee_count, max_capacity }
       ↓
[Frontend]
  State: { type: 'pm', data: {...}, loading: false }
       ↓
[DetailedPopup.tsx]
  Renders all fields
  Shows capacity bar
  PM profile complete ✅
```

---

## ✅ Success Checklist

- [ ] Backend endpoints implemented and tested
- [ ] Popup shows when clicking employee name
- [ ] Popup shows when clicking PM name
- [ ] Loading spinner appears briefly
- [ ] All fields display correctly
- [ ] Error message shows for invalid IDs
- [ ] PM capacity bar shows correctly
- [ ] Reportee count updates accurately
- [ ] Close button works
- [ ] No errors in browser console

---

## 📞 Support References

- **API Examples**: See `BACKEND_IMPLEMENTATION_EXAMPLES.ts`
- **Schema Details**: See `BACKEND_API_REFERENCE.ts`
- **UI Implementation**: See `DetailedPopup.tsx`
- **Integration Logic**: See `Monitoring.tsx` (fetchEmployeeDetails, fetchPMDetails functions)

---

## 🎯 Next Phase Ideas

1. **Add Edit Mode** - Allow admins to edit employee/PM details
2. **Add History** - Show change audit trail
3. **Export to PDF** - Print detailed profiles
4. **Compare Multiple** - Side-by-side comparison
5. **Email Contact** - Send email to employee/PM directly
6. **Download vCard** - Export contact information

---

## 📝 Quick Reference

**Frontend Files Modified:**
- `frontend_updated/src/pages/Monitoring.tsx`
- `frontend_updated/src/components/DetailedPopup.tsx` (NEW)

**Backend Files to Update:**
- `backend_updated/src/server.ts` (ADD 2 ENDPOINTS)

**Documentation:**
- `DETAILED_POPUP_IMPLEMENTATION.md`
- `BACKEND_IMPLEMENTATION_EXAMPLES.ts`
- `BACKEND_API_REFERENCE.ts`

---

**Status**: Ready for backend implementation! 🎉
