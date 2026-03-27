# Data Flow & Automation Guide

## 📊 Overview: Where Your Uploaded Data Goes

When you upload Excel files (Employees, PMs, Separations), here's the complete journey:

```
Excel Upload → Database Storage → Display in UI → Automated Processing
```

---

## 1️⃣ **UPLOAD PROCESS** (Data Upload Page)

### Location: `http://localhost:3002/upload`

**What Happens:**
1. You upload 3 types of Excel files:
   - **Employee Data (GAD)** - All employees including new joiners
   - **People Managers** - Available PMs with capacity
   - **Separation Reports** - Employees who are leaving (LWD)

2. **Backend Processing:**
   ```
   Upload → Parse Excel → Validate Data → Insert into Database
   ```

3. **Database Tables:**
   - Employees → `employees` table
   - PMs → `people_managers` table
   - Separations → `separation_reports` table

---

## 2️⃣ **WHERE TO VIEW UPLOADED RECORDS**

### 📌 **New Joiners** (`/new-joiners`)
**Shows:** All employees where `is_new_joiner = true` AND `current_pm_id = NULL`

**What You See:**
- Employee ID, Name, Grade, Practice, CU
- "Find PM" button for each employee
- **This is automatically populated from your Employee Excel upload**

**Query:**
```sql
SELECT * FROM employees 
WHERE is_new_joiner = true 
  AND current_pm_id IS NULL
```

---

### 📌 **Pending Assignments** (`/assignments`)
**Shows:** All PM assignments awaiting approval

**What You See:**
- Employee → New PM mapping
- Assignment Type (new_joiner/reassignment)
- Match Score (matching algorithm confidence)
- Status (pending/approved/rejected)
- Creation date

**Query:**
```sql
SELECT * FROM pm_assignments 
WHERE status = 'pending'
```

---

### 📌 **Approvals** (`/approvals`)
**Shows:** Approval workflow requests

**What You See:**
- Pending approvals for PM assignments
- Approval chain (L+2, HR approvals)
- Comments and history
- Approve/Reject actions

---

### 📌 **Exceptions** (`/exceptions`)
**Shows:** Issues that need manual intervention

**What You See:**
- No PM found for employee
- Capacity exceeded alerts
- Data quality issues
- Separation conflicts

**Query:**
```sql
SELECT * FROM exceptions 
WHERE status = 'open'
```

---

### 📌 **Dashboard** (`/dashboard`)
**Shows:** Summary metrics from all uploaded data

**Key Metrics:**
- Total Employees: Count from `employees` table
- Active PMs: Count from `people_managers` where `is_active = true`
- Pending Assignments: Count from `pm_assignments` where `status = 'pending'`
- PM Capacity: Reportee count vs max capacity
- Practice-wise distribution
- Grade distribution charts

---

## 3️⃣ **AUTOMATION WORKFLOWS** (Phase 3)

### 🤖 **Automatic Triggers**

#### **A) Daily New Joiner Processing** ⏰ 9:00 AM
```
Trigger: Scheduled daily at 9:00 AM
Source: Employee Excel upload (is_new_joiner = true)

Flow:
1. Fetch all new joiners without PM
2. For each employee:
   - Run matching algorithm
   - Find top 3 PM matches
   - Calculate match scores (Practice, CU, Region, Grade, Capacity)
3. Auto-create PM assignment for best match
4. Send notification to PM
5. Initiate approval workflow
6. If no match found → Create exception
```

**Code Location:** `workflowAutomationService.ts → processNewJoiners()`

**Where to See Results:**
- New assignments appear in `/assignments`
- Exceptions appear in `/exceptions`

---

#### **B) Daily Separation Processing** ⏰ 10:00 AM
```
Trigger: Scheduled daily at 10:00 AM
Source: Separation Reports Excel upload

Flow:
1. Fetch all separation reports where LWD <= 30 days
2. For each PM who is leaving:
   - Find all their reportees
   - For each reportee:
     - Run matching algorithm for new PM
     - Create reassignment assignments
3. Send notifications to:
   - Outgoing PM
   - New PM
   - HR
   - Reportees
4. Auto-create exception if no suitable PM found
```

**Code Location:** `workflowAutomationService.ts → processReassignments()`

**Where to See Results:**
- Reassignment assignments in `/assignments` (type = 'reassignment')
- Affected employees flagged for reassignment

---

#### **C) Monthly PM Engagement Review** ⏰ 1st of Month @ 8:00 AM
```
Trigger: Scheduled on 1st of every month
Source: All current PM assignments

Flow:
1. Generate PM capacity report
2. Identify:
   - Over-capacity PMs (reportees > max_capacity)
   - Under-utilized PMs (reportees < 70% capacity)
3. Send engagement review notifications
4. Create optimization recommendations
```

**Code Location:** `workflowAutomationService.ts → processMonthlyEngagement()`

---

#### **D) Approval Reminders** ⏰ Every 6 Hours
```
Trigger: Runs every 6 hours
Source: Pending approvals

Flow:
1. Find all pending approvals > 24 hours old
2. Send reminder emails/notifications
3. Escalate if pending > 3 days
```

---

## 4️⃣ **MATCHING ALGORITHM** (How PMs are Selected)

### Scoring System (0-100):

```javascript
Total Score = Practice Match (30%) 
            + CU Match (20%) 
            + Region Match (15%) 
            + Grade Compatibility (15%) 
            + Capacity Availability (20%)
```

**Example:**
```
Employee: Grade C1, Practice: Microsoft, CU: Apps & Value, Region: India
PM: Grade C2, Practice: Microsoft, CU: Apps & Value, Region: India, Capacity: 8/15

Scores:
- Practice Match: 30/30 ✅ (Exact match)
- CU Match: 20/20 ✅ (Exact match)
- Region Match: 15/15 ✅ (Exact match)
- Grade Compatibility: 15/15 ✅ (C1 can report to C2)
- Capacity: 20/20 ✅ (8/15 = 53% utilized)

Total Score: 100/100 🎯
```

---

## 5️⃣ **MANUAL vs AUTOMATIC PROCESSING**

### 🔧 **Manual Actions** (User-Driven)

1. **Upload Data** → `/upload` page
   - Upload Excel files anytime
   - Data immediately available in database

2. **Find PM Manually** → `/new-joiners` page
   - Click "Find PM" for any employee
   - View top 3 matches
   - Manually assign PM

3. **Approve/Reject** → `/approvals` page
   - Review pending assignments
   - Add comments
   - Approve or reject

4. **Resolve Exceptions** → `/exceptions` page
   - View problematic cases
   - Manually assign PM
   - Mark as resolved

---

### ⚡ **Automatic Actions** (System-Driven)

1. **Daily New Joiner Batch** (9:00 AM)
   - Processes ALL new joiners automatically
   - Creates assignments
   - Sends notifications

2. **Daily Separation Check** (10:00 AM)
   - Finds PMs leaving within 30 days
   - Auto-reassigns their reportees

3. **Periodic Reminders** (Every 6 hours)
   - Sends approval reminders
   - Escalates overdue approvals

4. **Monthly Capacity Review** (1st @ 8:00 AM)
   - Analyzes PM workload
   - Suggests optimizations

---

## 6️⃣ **API ENDPOINTS FOR WORKFLOWS**

### Manual Trigger APIs (For Testing/Admin):

```bash
# Trigger new joiner workflow manually
POST /api/pm/workflows/new-joiner

# Trigger reassignment workflow manually
POST /api/pm/workflows/reassignment

# Trigger monthly engagement manually
POST /api/pm/workflows/monthly-engagement
```

---

## 7️⃣ **NOTIFICATIONS** (Phase 4)

### Microsoft Teams Adaptive Cards:

**When PM Assignment Created:**
```
📧 To: Recommended PM
📋 Card contains:
   - Employee details
   - Match score
   - Current capacity
   - Quick "Accept" button
```

**When Approval Needed:**
```
📧 To: L+2 Manager / HR
📋 Card contains:
   - Assignment details
   - Matching criteria
   - Quick "Approve/Reject" buttons
```

**When Exception Created:**
```
📧 To: HR Team
📋 Card contains:
   - Employee details
   - Issue description
   - Resolution action needed
```

---

## 8️⃣ **AUDIT TRAIL** (Phase 5)

### Every Action is Logged:

```sql
SELECT * FROM audit_trail 
WHERE entity_type = 'assignment'
ORDER BY created_at DESC;
```

**Captures:**
- Who performed action
- What was changed
- When it happened
- Before/after values
- IP address

**View Audit Trail:** `/analytics` page → Audit section

---

## 9️⃣ **QUICK REFERENCE: Data Journey**

### **Scenario 1: New Employee Joins**

```
Day 0: HR uploads Employee Excel with is_new_joiner = true
       ↓
Day 1 @ 9 AM: Automated workflow runs
       ↓
       - System finds employee in database
       - Runs matching algorithm
       - Creates assignment (best PM)
       - Sends notification to PM
       ↓
       PM receives Teams card → Accepts
       ↓
       L+2 approval workflow triggered
       ↓
       L+2 approves
       ↓
       employee.current_pm_id = updated
       ↓
       Employee removed from "New Joiners" list
       ↓
       Assignment visible in "Assignments" page (status = approved)
```

---

### **Scenario 2: PM is Separating**

```
Day 0: HR uploads Separation Excel (PM's LWD = 30 days from now)
       ↓
Day 1 @ 10 AM: Automated workflow runs
       ↓
       - System finds PM in separation_reports
       - Fetches all their reportees (8 employees)
       - For each reportee:
         • Runs matching algorithm
         • Creates reassignment assignment
         • Sends notifications
       ↓
       8 pending assignments created
       ↓
       Visible in /assignments (type = reassignment)
       ↓
       Approvals processed
       ↓
       Reportees reassigned before PM's LWD
```

---

## 🔟 **EXCEL TEMPLATE FORMAT**

### **Employee Data (GAD):**
```
employee_id | name | email | practice | cu | region | account | skill | grade | joining_date | is_new_joiner
```

### **People Managers:**
```
employee_id | name | email | practice | cu | region | account | skill | grade | max_capacity | is_active
```

### **Separation Reports:**
```
employee_id | lwd | reason
```

---

## 🎯 **SUMMARY**

| What You Upload | Where It's Stored | Where You See It | Automation Trigger |
|-----------------|-------------------|------------------|-------------------|
| Employee Excel | `employees` table | `/new-joiners` | Daily @ 9 AM |
| PM Excel | `people_managers` table | Dashboard capacity | Matching algorithm |
| Separation Excel | `separation_reports` table | `/exceptions` | Daily @ 10 AM |

**Key Point:** Once you upload the Excel files, the system automatically processes them based on scheduled workflows. You can also manually trigger actions from the UI.
