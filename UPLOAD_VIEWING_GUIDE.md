# Quick Reference: Data Upload & Viewing

## 📤 **How to Upload Data**

### Step 1: Navigate to Upload Page
Go to **Data Upload** page (http://localhost:3002/upload)

### Step 2: Upload Your Excel Files
You can upload 4 types of Excel files:

1. **Employee Data (GAD)** 
   - Contains all employees including new joiners
   - Columns: employee_id, name, email, practice, cu, region, account, skill, grade, joining_date, is_new_joiner

2. **People Managers**
   - Available PMs with their capacity information
   - Columns: employee_id, name, email, practice, cu, region, account, skill, grade, max_capacity, is_active

3. **Separation Reports**
   - Employees who are leaving with their Last Working Day
   - Columns: employee_id, lwd, reason

4. **Skill Report**
   - Practice-wise skill repository for clustering
   - Columns: practice, skill, skill_cluster (optional)

### Step 3: View Statistics Dashboard
After uploading, the Data Upload page shows:
- Total Active Employees (with new joiners count)
- Active People Managers
- Pending Separations (with pending assignments count)

---

## 👀 **Where to View Uploaded Records**

### 1. **New Joiners Page** (`/new-joiners`)
**Shows:** Employees who need PM assignment
- Lists all employees where `is_new_joiner = true` and no PM assigned
- You can click "Find PM" to manually trigger matching algorithm
- Shows top 3 PM matches with scores
- Allows immediate assignment

**When populated:** Immediately after uploading Employee Excel with `is_new_joiner = true`

---

### 2. **Assignments Page** (`/assignments`)
**Shows:** All PM assignment requests pending approval
- Employee → PM mapping
- Assignment type (new_joiner vs reassignment)
- Match score from algorithm
- Current status (pending/approved/rejected)
- Creation date

**When populated:** 
- After you manually assign a PM from New Joiners page
- Automatically at 9 AM daily when workflow runs
- When separation workflow creates reassignments (10 AM daily)

---

### 3. **Dashboard** (`/dashboard`)
**Shows:** Overall statistics and visualizations
- Total employees count
- Active PMs count
- Pending assignments
- PM Capacity charts (Bar chart showing reportee count vs max capacity)
- Utilization pie chart
- Practice/Grade/Region distributions

**When populated:** Real-time aggregation from all uploaded data

---

### 4. **Approvals Page** (`/approvals`)
**Shows:** Assignments awaiting approval
- Approval workflow chain (L+2, HR)
- Comments and history
- Approve/Reject actions

**When populated:** After assignment is created and approval workflow initiated

---

### 5. **Exceptions Page** (`/exceptions`)
**Shows:** Issues requiring manual intervention
- Employees with no suitable PM found
- PM capacity exceeded alerts
- Data quality issues
- Separation conflicts

**When populated:**
- When matching algorithm can't find suitable PM
- When automated workflows encounter issues
- When business rules are violated

---

## ⚙️ **How Automation Works**

### Automatic Processing Schedule:

#### 🕘 **Daily @ 9:00 AM - New Joiner Workflow**
```
What happens:
1. System fetches all employees where is_new_joiner = true and current_pm_id = NULL
2. For each employee:
   - Runs matching algorithm (scores based on Practice, CU, Region, Grade, Capacity)
   - Finds top 3 PM matches
   - Auto-creates assignment with best match
   - Sends notification to PM via Teams Adaptive Card
   - Initiates approval workflow (L+2 → HR)
3. If no match found → Creates exception entry

Where to see results:
- New assignments in /assignments page
- Exceptions in /exceptions page
- Notifications in Teams
```

---

#### 🕙 **Daily @ 10:00 AM - Separation & Reassignment**
```
What happens:
1. System fetches all separation_reports where LWD <= 30 days
2. For each separating PM:
   - Finds all their current reportees
   - For each reportee:
     • Runs matching algorithm to find new PM
     • Creates reassignment assignment
     • Sends notifications to all parties
3. If no suitable PM found → Creates exception

Where to see results:
- Reassignment assignments in /assignments (type = 'reassignment')
- Affected employees flagged
- Notifications sent to outgoing PM, new PM, HR, and reportees
```

---

#### ⏰ **Every 6 Hours - Approval Reminders**
```
What happens:
1. Finds all pending approvals > 24 hours old
2. Sends reminder notifications via Teams
3. Escalates if pending > 3 days

Where to see results:
- Teams notifications
- Approval page updated with reminder timestamps
```

---

#### 📅 **Monthly (1st @ 8:00 AM) - PM Engagement Review**
```
What happens:
1. Generates PM capacity report
2. Identifies:
   - Over-capacity PMs (reportees > max_capacity)
   - Under-utilized PMs (reportees < 70% capacity)
3. Sends engagement review notifications
4. Creates optimization recommendations

Where to see results:
- Dashboard analytics
- PM capacity heatmap
- Recommendations in exceptions/notifications
```

---

## 🎯 **Complete Data Journey Example**

### Scenario: New Employee Joins Capgemini

```
Day 0 (Today): 
HR uploads Employee Excel with:
- employee_id: 12345
- name: John Doe
- is_new_joiner: true
- practice: Microsoft
- cu: Apps & Value
- region: India
- grade: C1

✅ Data stored in 'employees' table
✅ Immediately visible in /new-joiners page
✅ Statistics on /upload page updated (shows +1 new joiner)

---

Option A: MANUAL Assignment (Immediate)
HR goes to /new-joiners page → Clicks "Find PM" for John Doe
- System shows top 3 PM matches with scores
- HR clicks "Assign" for best match (Jane Smith, Score: 95%)
- Assignment created in 'pm_assignments' table (status = pending)
- Notification sent to Jane Smith (Teams Adaptive Card)
- Approval workflow initiated
- Visible in /assignments page

---

Option B: AUTOMATIC Assignment (Next Day @ 9 AM)
Next day at 9:00 AM:
- Automated workflow runs
- System finds John Doe (is_new_joiner = true, no PM)
- Matching algorithm calculates scores:
  • Jane Smith (Practice: ✅, CU: ✅, Region: ✅, Capacity: ✅) = 95%
  • Mike Johnson (Practice: ✅, CU: ❌, Region: ✅, Capacity: ✅) = 75%
  • Sarah Lee (Practice: ✅, CU: ✅, Region: ❌, Capacity: ❌) = 60%
- Auto-creates assignment: John Doe → Jane Smith
- Sends Teams notification to Jane Smith
- Creates approval workflow entry
- Visible in /assignments page (status = pending)

---

Within 24 hours:
Jane Smith receives Teams card → Clicks "Accept"
L+2 Manager receives approval request → Approves
HR receives final approval request → Approves

Final state:
✅ Assignment status = approved
✅ employee.current_pm_id updated to Jane Smith
✅ people_manager.reportee_count incremented
✅ John Doe removed from /new-joiners list
✅ Audit trail created in 'audit_trail' table
✅ Assignment visible in /assignments (status = approved)
```

---

## 🔍 **Data Flow Summary**

```
Excel Upload (via /upload page)
    ↓
Database Tables (employees, people_managers, separation_reports)
    ↓
Frontend Display Pages (real-time query)
    ├── /new-joiners - Unassigned employees
    ├── /assignments - Pending/approved assignments
    ├── /dashboard - Aggregated statistics
    ├── /approvals - Workflow approvals
    └── /exceptions - Issues requiring attention
    ↓
Automated Workflows (scheduled jobs)
    ├── 9 AM: New joiner matching
    ├── 10 AM: Separation reassignment
    ├── 6 hours: Approval reminders
    └── Monthly: Capacity review
    ↓
Notifications (Teams Adaptive Cards)
    ├── PM assignment recommendations
    ├── Approval requests
    ├── Exception alerts
    └── Reminder notifications
    ↓
Audit Trail (complete history in 'audit_trail' table)
```

---

## 💡 **Key Takeaways**

1. **Upload Once, View Everywhere**: Data uploaded in /upload page is immediately available across all pages

2. **Two Ways to Assign**:
   - Manual: Go to /new-joiners, click "Find PM", assign immediately
   - Automatic: Daily at 9 AM, system processes all new joiners automatically

3. **Real-time Updates**: All pages query database in real-time, no refresh needed

4. **Complete Visibility**: Every action is logged in audit_trail table for compliance

5. **Smart Automation**: Workflows run on schedule but you can also trigger manually

6. **Exception Handling**: If automation can't process something, it creates an exception for manual review

---

## 📖 **For More Details**

See the comprehensive [DATA_FLOW_GUIDE.md](DATA_FLOW_GUIDE.md) for:
- Detailed matching algorithm explanation
- Complete API endpoint reference
- Database schema details
- Notification template examples
- Troubleshooting guide
