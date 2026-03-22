# View Lists Guide

## Overview
After uploading employee, PM, and separation reports, you can view the complete lists through the **Data Management** section in the sidebar navigation.

## Available List Views

### 1. **All Employees (Bench/GAD List)** 📊
**Path:** `/employees`  
**Icon:** Database icon in sidebar

**What it shows:**
- Complete list of all uploaded employees from GAD reports
- Employee ID, Name, Email
- Practice, CU, Region, Grade
- Current PM assignment status (assigned or unassigned)
- Employee status (active/inactive)

**Features:**
- **Filters:** Status, Practice, CU, Region
- **Statistics Cards:**
  - Total Employees
  - With PM Assigned (green)
  - Without PM (orange)
  - New Joiners (blue)
- **Export:** Download CSV with all employee data
- **Real-time Status:** Shows which employees have PMs and which are awaiting assignment

**Use Cases:**
- View complete bench/GAD roster
- Identify employees without PM assignments
- Filter employees by practice, CU, or region
- Export employee lists for reporting
- Monitor new joiner status

---

### 2. **People Managers List** 👥
**Path:** `/pms`  
**Icon:** UserCog icon in sidebar

**What it shows:**
- Complete list of all uploaded People Managers
- PM ID, Name, Email
- Practice, CU, Region, Grade
- **Capacity Metrics:**
  - Current reportee count
  - Maximum capacity (grade-aware: C1/C2=10, D1/D2/D3=15)
  - Utilization percentage
  - Visual indicators for high utilization (>=80%)

**Features:**
- **Filters:** Active/Inactive status, Practice, CU, Region
- **Statistics Cards:**
  - Total PMs
  - Active PMs (green)
  - Over Capacity (red) - PMs at/exceeding max capacity
  - Average Utilization (blue)
- **Visual Indicators:**
  - Color-coded utilization badges:
    - **Red (>=90%):** Critical - Over capacity
    - **Orange (>=80%):** Warning - High utilization
    - **Green (>=50%):** Normal - Healthy utilization
    - **Blue (<50%):** Low - Capacity available
  - Trending icons (up/down arrows) for capacity status
- **Export:** Download CSV with all PM capacity data

**Use Cases:**
- Monitor PM capacity and utilization
- Identify overloaded PMs (red indicators)
- Find PMs with available capacity for new assignments
- Track active vs. inactive PMs
- Export PM lists for capacity planning
- Proactive capacity management (system warns at 80% threshold)

---

### 3. **Separation Reports** 🚪
**Path:** `/separations`  
**Icon:** UserX icon in sidebar

**What it shows:**
- List of PMs leaving the organization
- PM ID, Name, Email
- Practice, CU, Region
- Current reportee count
- **Last Working Day (LWD)**
- Days remaining until LWD
- Reason for separation
- Processing status (pending/processed/completed)

**Features:**
- **Filters:** Status (pending/processed/completed)
- **Statistics Cards:**
  - Total Separations
  - Within 30 Days (orange) - Urgent separations
  - With Reportees (red) - PMs requiring reassignment
  - Processed (green) - Completed reassignments
- **Urgency Indicators:**
  - **Red badge + alert icon:** ≤7 days until LWD (critical)
  - **Orange badge:** 8-30 days until LWD (urgent)
  - **Blue badge:** >30 days until LWD (planned)
  - **Gray badge:** Past LWD
- **Critical Alert Banner:** Displays when separations are within 30 days
- **Ordered by LWD:** Sorted with most urgent separations first
- **Export:** Download CSV with all separation details

**Use Cases:**
- Monitor upcoming PM departures
- Identify urgent reassignments (within 7-30 days)
- Track PMs with reportees requiring new PM assignments
- Monitor reassignment workflow status
- Export separation reports for HR coordination
- **Automated Processing:** System automatically triggers reassignment workflow at 10 AM daily for separations with T-30 days to LWD

---

## Navigation

### Sidebar Menu Structure:
```
📊 Main Menu
  🏠 Dashboard
  📤 Data Upload
  👥 New Joiners
  ✅ Approvals
  ⚠️ Exceptions
  📈 Analytics

📁 Data Management
  💾 All Employees
  👤 People Managers
  🚪 Separations
```

### Access:
1. After uploading data via the **Data Upload** page
2. Navigate to the **Data Management** section in the left sidebar
3. Click on the desired list view:
   - **All Employees** - Complete employee/bench roster
   - **People Managers** - PM capacity and utilization
   - **Separations** - Upcoming PM departures

---

## Backend API Endpoints

### Get Employees List
```http
GET /api/pm/employees/list?status=active&practice=Microsoft&cu=Apps%20%26%20Value&region=India&limit=1000
```

**Query Parameters:**
- `status` (optional): Filter by employee status (`active`, `inactive`)
- `practice` (optional): Filter by practice name
- `cu` (optional): Filter by CU name
- `region` (optional): Filter by region
- `limit` (optional): Maximum records to return (default: 1000)

**Response:** Array of employees with PM assignment details

---

### Get PMs List
```http
GET /api/pm/pms/list?is_active=true&practice=Microsoft&cu=Apps%20%26%20Value&region=India&limit=500
```

**Query Parameters:**
- `is_active` (optional): Filter by PM status (`true`, `false`)
- `practice` (optional): Filter by practice name
- `cu` (optional): Filter by CU name
- `region` (optional): Filter by region
- `limit` (optional): Maximum records to return (default: 500)

**Response:** Array of PMs with capacity and reportee count

---

### Get Separations List
```http
GET /api/pm/separations/list?status=pending&limit=500
```

**Query Parameters:**
- `status` (optional): Filter by separation status (`pending`, `processed`, `completed`)
- `limit` (optional): Maximum records to return (default: 500)

**Response:** Array of separation reports with PM details and LWD dates, ordered by LWD ascending

---

## Data Flow

### 1. Upload → View Cycle:
```
Excel Upload (Data Upload page)
    ↓
Data Ingestion Service processes upload
    ↓
Records stored in database (employees, people_managers, separation_reports tables)
    ↓
Available in list views immediately
    ↓
Users can view/filter/export from Data Management pages
```

### 2. Automated Processing:
```
Separation Report uploaded with LWD
    ↓
System monitors daily at 10 AM (T-30 days check)
    ↓
Reassignment workflow triggered automatically
    ↓
New PMs matched for affected employees
    ↓
Status updated to "processed"
    ↓
Visible in Separations list with updated status
```

---

## Best Practices

### For Employees List:
- **Daily Checks:** Monitor "Without PM" count after new uploads
- **New Joiners:** Check after 9 AM automated workflow for PM assignments
- **Filters:** Use practice/CU filters for team-specific views
- **Export:** Download before monthly reviews for offline analysis

### For PMs List:
- **Weekly Reviews:** Monitor utilization percentages
- **Capacity Alerts:** Address red indicators (>=80%) proactively
- **Balancing:** Identify PMs with low utilization for new assignments
- **Active Status:** Keep PM status updated for accurate matching

### For Separations List:
- **Daily Monitoring:** Check "Within 30 Days" count
- **Critical Priority:** Address red badges (≤7 days) immediately
- **Reportees:** Focus on separations with reportee_count > 0
- **Status Tracking:** Monitor "processed" vs "pending" for workflow progress

---

## Integration with Other Features

### Data Upload Page:
- Upload Bench Report → View in **All Employees** and **Bench Resources**
- Upload separations → View in **Separations**

### New Joiners Page:
- Shows employees awaiting PM assignment
- After assignment → Status updated in **All Employees** list

### Dashboard:
- Statistics derived from these lists
- Click "View Details" → Redirects to respective list pages

### Assignments Page:
- Shows PM-employee pairings
- Source data from **All Employees** and **People Managers** lists

---

## Troubleshooting

### "No employees found" message:
- **Cause:** No data uploaded yet
- **Solution:** Go to Data Upload page → Upload employee GAD report

### "No People Managers found" message:
- **Cause:** No PM data uploaded
- **Solution:** Go to Data Upload page → Upload PM list Excel

### "No separation reports found" message:
- **Cause:** No separation data uploaded
- **Solution:** Go to Data Upload page → Upload separation report Excel

### Filters not working:
- **Check:** Ensure backend server is running (port 5000)
- **Check:** Database connection is active
- **Try:** Clear filters and click "Apply Filters" again

### Export not downloading:
- **Check:** Browser pop-up blocker settings
- **Check:** Download folder permissions
- **Try:** Refresh page and try export again

---

## Related Documentation
- [UPLOAD_VIEWING_GUIDE.md](./UPLOAD_VIEWING_GUIDE.md) - Data upload process
- [DATA_FLOW_GUIDE.md](./DATA_FLOW_GUIDE.md) - Complete data flow explanation
- [BUSINESS_ALIGNMENT_ANALYSIS.md](./BUSINESS_ALIGNMENT_ANALYSIS.md) - Business requirements alignment
- [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - Complete API reference

---

## Summary

**Quick Answer to "Where can I view the lists?"**

✅ **All Employees (Bench List)** → `/employees` (Database icon in Data Management section)  
✅ **People Managers List** → `/pms` (UserCog icon in Data Management section)  
✅ **Separation Reports** → `/separations` (UserX icon in Data Management section)

All three pages include:
- Comprehensive filtering capabilities
- Real-time statistics cards
- CSV export functionality
- Visual indicators for status and urgency
- Responsive table design with full data visibility
