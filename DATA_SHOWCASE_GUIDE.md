# 📊 Data Showcase & Business Rules Report Guide

## 🎯 **What You're Currently Seeing (After Pagination Fix)**

### ✅ **FIXED ISSUES**
1. **Pagination Implemented** - All list pages now show ALL records (not just 500-1000)
2. **Bench Link Working** - Now uses paginated API with proper filtering

---

## 📁 **Where to Find Each Type of Data/Report**

### **1. 🆕 New Joiners Page** (`/new-joiners`)
**Business Rule**: Employees with `is_new_joiner = TRUE` and no PM assigned

**What You See:**
- Employees waiting for PM assignment
- **Action Available**: Click "Find PM" to see matched PMs with scores
- Shows top 3 PM recommendations based on business rules

**Report Purpose**: Identify new hires needing immediate PM assignment

---

### **2. 👥 All Employees Page** (`/employees`)
**Business Rule**: All uploaded employees from GAD report

**What You See:**
- Complete employee list (300K+ records with pagination)
- Current PM assignment status
- Filter by: Status, Practice, CU, Region, Grade, Skill
- **Statistics**: Total employees, With PM, Without PM, New Joiners

**Report Purpose**: Master employee directory with PM assignment status

---

### **3. 👔 People Managers Page** (`/pms`)
**Business Rule**: All uploaded PMs with capacity tracking

**What You See:**
- Complete PM list (300K+ records with pagination)
- **Capacity Utilization**: Shows reportee_count / max_capacity
- **Color-coded warnings**:
  - 🔴 Red (≥90%): Critical - Over capacity
  - 🟠 Orange (≥80%): Warning - High utilization
  - 🟢 Green (50-79%): Optimal range
  - 🔵 Blue (<50%): Underutilized
- Filter by: Active/Inactive, Practice, CU, Region, Grade, Skill

**Report Purpose**: PM capacity management and load balancing

**Business Rules Applied:**
- ✅ C1/C2 PMs: max_capacity = 10
- ✅ D1/D2/D3 PMs: max_capacity = 15
- ✅ Shows over-capacity PMs in red

---

### **4. 🚪 Separations Page** (`/separations`)
**Business Rule**: PMs leaving organization (from separation report upload)

**What You See:**
- PM separation records (16K+ with pagination)
- Last Working Day (LWD)
- Days until LWD
- Reportees count (need reassignment)
- **Urgency indicators**:
  - 🔴 Critical: ≤7 days until LWD
  - 🟠 Warning: ≤30 days until LWD
  - 🔵 Normal: >30 days until LWD

**Report Purpose**: Track PM departures and trigger reassignment workflow

**Business Rules Applied:**
- ✅ T-30 days: Reassignment workflow triggers automatically
- ✅ Shows PMs with reportees needing new PM
- ✅ Status tracking: Pending → Processed → Completed

---

### **5. 🏖️ Bench Resources Page** (`/bench`)
**Business Rule**: Employees WITHOUT PM assignment (GAD bench list)

**What You See:**
- All employees where `current_pm_id = NULL`
- Days on bench calculation
- **Critical alerts**: >30 days on bench highlighted in orange
- Filter by: Practice, CU, Region, Grade, Skill
- **Statistics**:
  - Total Bench
  - Critical (>30 days)
  - New Joiners on bench
  - Avg Days on Bench

**Report Purpose**: Identify unassigned employees needing PM allocation

**Business Rules Applied:**
- ✅ Shows only active employees without PM
- ✅ Highlights critical cases (>30 days)
- ✅ Separates new joiners from regular bench

---

### **6. ✅ Assignments/Approvals Page** (`/assignments`)
**Business Rule**: Pending PM assignments awaiting approval

**What You See:**
- Employee → PM assignment proposals
- Assignment type: New Joiner | Reassignment
- Match score from algorithm
- Status: Pending | Approved | Rejected
- **Actions**: Approve or Reject

**Report Purpose**: Human-in-the-loop approval queue

**Business Rules Applied:**
- ✅ All assignments start as 'pending'
- ✅ Requires manager approval before activation
- ✅ Shows match score and reasoning

---

### **7. ⚠️ Exceptions Page** (`/exceptions`)
**Business Rule**: Cases where algorithm couldn't find suitable PM

**What You See:**
- Employees with no matching PM
- Exception reasons:
  - No PM in same Practice/CU/Region
  - All PMs at full capacity
  - No skill match found
  - PM grade not higher than employee
- **Actions**: Manual resolution required

**Report Purpose**: Edge cases needing manual intervention

**Business Rules Applied:**
- ✅ Creates exception if no PM matches mandatory criteria
- ✅ Creates exception if skill similarity <70%
- ✅ Creates exception if all PMs at capacity

---

### **8. 📈 Dashboard** (`/dashboard`)
**Business Rule**: Real-time analytics based on all business rules

**What You See:**
- **PM Capacity Distribution** (by utilization %)
- **Practice Distribution** (employees per practice)
- **Grade Distribution** (C1, C2, D1, D2, D3 counts)
- **Regional Statistics** (employees per region)
- **New Joiners** (awaiting assignment)
- **Pending Assignments** (awaiting approval)
- **Recent Upload Statistics**

**Report Purpose**: Executive overview of system health

**Business Rules Applied:**
- ✅ Capacity calculated as (reportee_count / max_capacity) × 100
- ✅ Shows distribution across mandatory criteria (Practice, CU, Region)
- ✅ Real-time counts based on database

---

## 🔍 **Business Rule Application Summary**

### **When PM Matching Happens (Find PM button or automated workflow):**

#### **Mandatory Criteria (Hard Filters)**:
1. ✅ **Practice Match** - PM must be in same practice as employee
2. ✅ **CU Match** - PM must be in same CU as employee
3. ✅ **Region Match** - PM must be in same region as employee
4. ✅ **Grade Eligibility** - PM must be ≥ C1 AND > employee grade
5. ✅ **Capacity Available** - PM's reportee_count < max_capacity
6. ✅ **Active Status** - PM must be is_active = true

**If any mandatory criteria fails → Exception created (no assignment)**

#### **Scoring Criteria (Weighted)**:
- **Practice**: 35% weight (already filtered)
- **CU**: 25% weight (already filtered)
- **Skill**: 20% weight ⚠️ Exception if <70% match
- **Region**: 10% weight (already filtered)
- **Account**: 5% weight (soft match)
- **Grade**: 3% weight (proximity bonus)
- **Capacity**: 2% weight (favor lower utilization)

**Total Score: 100%** - Higher score = Better match

---

## 📊 **Key Reports Based on Business Rules**

### **Report 1: PM Capacity Analysis**
**Page**: `/pms`
**Business Rule**: Grade-based capacity limits

**Filters:**
- All PMs where utilization ≥90% → Over capacity (RED)
- All PMs where utilization ≥80% → Warning (ORANGE)
- C1/C2 PMs with reportee_count >10 → Violated
- D1+ PMs with reportee_count >15 → Violated

**Export**: Click "Export to CSV" for full capacity report

---

### **Report 2: Bench Aging Report**
**Page**: `/bench`
**Business Rule**: Employees without PM for >30 days

**Filters:**
- Days on Bench >30 → Critical priority
- New Joiners on bench → Immediate action
- Filter by Practice/CU/Region for focused allocation

**Export**: "Export to CSV" for management review

---

### **Report 3: Separation Impact Analysis**
**Page**: `/separations`
**Business Rule**: PMs leaving within 30 days

**Filters:**
- LWD ≤30 days → Reassignment required
- Reportees >0 → Impact on team
- Status = Pending → Not yet processed

**Export**: "Export to CSV" for transition planning

---

### **Report 4: Unassigned Employees**
**Page**: `/employees`
**Filters**: Set "Current PM" filter or check "Without PM" stat

**Business Rule**: Employees needing PM assignment

**What to Look For:**
- Total "Without PM" count in statistics
- Cross-reference with Bench and New Joiners pages

---

### **Report 5: Exception Queue**
**Page**: `/exceptions`
**Business Rule**: Failed matching scenarios

**Categories:**
- `no_pm_found`: No PM in Practice/CU/Region
- `capacity_exceeded`: All PMs at full capacity
- `skill_mismatch`: No skill similarity ≥70%
- `grade_ineligible`: No PM with higher grade

**Action Required**: Manual PM assignment or rule adjustment

---

## 🎯 **How to Get Specific Business Reports**

### **Example 1: "Show me all PMs over capacity"**
1. Go to `/pms`
2. No filter needed (automatically color-coded)
3. Look for RED rows (≥90% utilization)
4. Click "Export to CSV" for full report

### **Example 2: "Show me Microsoft practice employees without PM"**
1. Go to `/employees`
2. Set Practice filter: "Microsoft"
3. Check "Without PM" count in statistics
4. Click "Export to CSV" for filtered list

### **Example 3: "Show me PMs leaving in next 30 days"**
1. Go to `/separations`
2. Default filter already shows this (status=pending)
3. Look at "Within 30 Days" statistic
4. Orange-highlighted rows = Critical

### **Example 4: "Show me bench resources by region"**
1. Go to `/bench`
2. Select Region from dropdown
3. View filtered results
4. Export to CSV for region-specific report

---

## ⚡ **Automated Workflow Triggers (Background)**

### **Daily @ 9:00 AM**:
- ✅ Scans for new employees (is_new_joiner = true)
- ✅ Runs PM matching algorithm
- ✅ Creates pending assignments
- ✅ Sends notifications to managers

### **Daily @ 10:00 AM**:
- ✅ Checks separation_reports for LWD ≤30 days
- ✅ Initiates reassignment for affected employees
- ✅ Creates pending assignments
- ✅ Sends transition notifications

### **Monthly @ 1st Business Day**:
- ✅ Sends PM capacity reports to all managers
- ✅ Highlights over-utilized PMs
- ✅ Provides team snapshot

---

## 📝 **Current Data Validation**

### **To Check If Your Upload Worked:**

1. **Employees Upload**:
   - Go to `/employees`
   - Check "Total Employees" statistic matches your Excel count
   - Use pagination to browse all records

2. **PMs Upload**:
   - Go to `/pms`
   - Check "Total PMs" matches your Excel count
   - Verify capacity calculations are correct

3. **Separations Upload**:
   - Go to `/separations`
   - Check "Total Separations" matches your Excel count
   - Verify LWD dates are correct

---

## 🎯 **Summary**

### **What System Currently Shows:**

| Page | Records Shown | Business Rule Applied |
|------|--------------|----------------------|
| **All Employees** | 300K+ (paginated) | GAD master list |
| **People Managers** | 300K+ (paginated) | Capacity tracking with grade-aware limits |
| **Separations** | 16K+ (paginated) | LWD tracking, reassignment triggers |
| **Bench** | Filtered subset | current_pm_id = NULL, days on bench |
| **New Joiners** | Filtered subset | is_new_joiner = TRUE, no PM |
| **Assignments** | Pending queue | Awaiting approval |
| **Exceptions** | Failed matches | Manual resolution needed |
| **Dashboard** | Analytics | Real-time aggregations |

### **Where Business Rules Execute:**

1. **During Upload** → Data validation, capacity calculation
2. **During Matching** → 7-criteria weighted algorithm
3. **Daily Workflows** → Automated assignment, reassignment
4. **On Approval** → PM assignment activation
5. **Capacity Checks** → Over-limit detection, warnings

---

## 🚀 **Next Steps**

1. **Verify Data Loaded**: Check each page's total count
2. **Test Matching**: Go to `/new-joiners`, click "Find PM"
3. **Review Exceptions**: Check `/exceptions` for any issues
4. **Monitor Capacity**: Review `/pms` for over-utilized PMs
5. **Approve Assignments**: Process pending items in `/assignments`

---

**Need specific report?** Use the filters and "Export to CSV" buttons on each page!
