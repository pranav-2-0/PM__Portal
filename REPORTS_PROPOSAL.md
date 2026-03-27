# 📊 Practice-Wise Reports Feature Proposal

## 🎯 Objective
Create a dedicated **Reports** section where managers can generate practice-specific, rule-based reports for PM capacity management and employee allocation.

---

## 🆕 New Feature: `/reports` Page

### **Page Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Generate Reports                                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Select Report Type:                                         │
│  [ Practice-Wise PM Capacity Report        ▼ ]              │
│                                                              │
│  Filters:                                                    │
│  Practice:  [ All / Microsoft / SAP / Oracle  ▼ ]           │
│  CU:        [ All / CU1 / CU2 / CU3         ▼ ]           │
│  Region:    [ All / India / US / UK         ▼ ]           │
│  Date Range: [From: _____ To: _____]                       │
│                                                              │
│  [Generate Report]  [Schedule Email]  [Export Excel]        │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Report Preview:                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Practice: Microsoft                                         │
│  Total PMs: 1,234                                            │
│  Over Capacity (≥90%): 45 (3.6%)                            │
│  High Utilization (80-89%): 123 (9.9%)                      │
│  Optimal (50-79%): 789 (63.9%)                              │
│  Under Utilized (<50%): 277 (22.4%)                         │
│                                                              │
│  [Chart: Capacity Distribution]                             │
│  [Table: Top 10 Over-Capacity PMs]                          │
│  [Table: Bench Resources Waiting Assignment]                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Available Report Types

### **1. Practice-Wise PM Capacity Report**
**Business Rules Applied:**
- ✅ C1/C2: Max 10 reportees
- ✅ D1+: Max 15 reportees
- ✅ Utilization = (reportee_count / max_capacity) × 100

**Output Sections:**
- Capacity distribution chart
- Over-capacity PMs table (≥90%)
- Underutilized PMs table (<50%)
- Practice comparison (if "All" selected)

---

### **2. Practice-Wise Bench Aging Report**
**Business Rules Applied:**
- ✅ Days on Bench = Today - Upload Date (or Joining Date)
- ✅ Critical: >30 days on bench
- ✅ New Joiners: is_new_joiner = true

**Output Sections:**
- Bench aging histogram
- Critical cases table (>30 days)
- New joiners table
- Average days on bench by practice

---

### **3. Practice-Wise Separation Impact Report**
**Business Rules Applied:**
- ✅ Days until LWD = LWD - Today
- ✅ Critical: ≤7 days
- ✅ Warning: ≤30 days
- ✅ Reportees needing reassignment

**Output Sections:**
- Separations by urgency (Critical/Warning/Normal)
- PMs leaving with reportees count
- Affected employees list
- Reassignment status tracking

---

### **4. Practice-Wise New Joiner Pipeline**
**Business Rules Applied:**
- ✅ is_new_joiner = true
- ✅ current_pm_id = NULL (awaiting assignment)
- ✅ Assignment status (Pending/Approved/Completed)

**Output Sections:**
- New joiners awaiting PM
- Assignment pipeline status
- Average time to assignment
- Success rate by practice

---

### **5. Cross-Practice Comparison Report**
**Business Rules Applied:**
- ✅ All capacity rules
- ✅ All bench rules
- ✅ All separation rules

**Output Sections:**
- Practice-by-practice comparison table
- Heat map of capacity utilization
- Bench distribution across practices
- Best/worst performing practices

---

### **6. PM Performance Scorecard**
**Business Rules Applied:**
- ✅ Capacity utilization (optimal = 50-79%)
- ✅ Assignment success rate
- ✅ Reportee stability (separations)

**Output Sections:**
- Top 10 optimal PMs (50-79% capacity)
- PMs needing support (>90% capacity)
- PMs with capacity to take more (< 50%)

---

### **7. Exception Analysis Report**
**Business Rules Applied:**
- ✅ No PM match (mandatory criteria failed)
- ✅ Skill mismatch (<70% similarity)
- ✅ Capacity exceeded (all PMs full)

**Output Sections:**
- Exception types breakdown
- Employees stuck in exceptions
- Root cause analysis
- Resolution recommendations

---

## 🎨 Report Features

### **Interactive Elements:**
- 📊 **Charts**: Bar, pie, line charts for visualizations
- 📈 **Trends**: Week-over-week, month-over-month comparisons
- 🔍 **Drill-Down**: Click practice → See detailed breakdown
- 📤 **Export**: Excel, PDF, CSV formats
- 📧 **Schedule**: Daily/Weekly/Monthly email delivery
- 🎯 **Filters**: Practice, CU, Region, Date Range

### **Business Rule Application:**
Each report automatically applies relevant business rules:
- Capacity calculations based on grade
- Days calculations based on dates
- Color-coding (Red/Orange/Green) based on thresholds
- Matching score calculations
- Exception categorization

---

## 💡 Alternative: Enhanced Current Pages

Instead of a new `/reports` page, we can **enhance existing pages**:

### **Option A: Add "View Practice Summary" Button**
On `/pms`, `/employees`, `/bench`, `/separations`:
- Click "View Practice Summary"
- Opens modal with practice breakdown
- Shows key metrics and charts
- Export to Excel

### **Option B: Add "Reports" Tab to Dashboard**
Extend `/dashboard` with new tab:
- Tab 1: Real-time Dashboard (current)
- **Tab 2: Practice Reports** (new)
- **Tab 3: Scheduled Reports** (new)

### **Option C: Add Export Menu with Report Options**
Replace simple "Export to CSV" with:
- Export Current View
- **Export Practice Summary Report**
- **Export Management Report**
- **Export Detailed Analysis**

---

## 🚀 Implementation Priority

### **Phase 1: Quick Win (Already Available!)**
✅ Use existing filters + "Export to CSV"
✅ Filter by Practice → Export → You have practice report
✅ No coding needed

### **Phase 2: Enhanced Export (Easy - 2 hours)**
✅ Add "Export Practice Summary" button to each page
✅ Generates Excel with multiple sheets:
   - Sheet 1: Summary statistics
   - Sheet 2: Detailed data
   - Sheet 3: Charts (if possible in backend)

### **Phase 3: Dedicated Reports Page (Medium - 1 day)**
✅ New `/reports` route
✅ Report type selector
✅ Practice/CU/Region filters
✅ Preview before export
✅ Multiple export formats

### **Phase 4: Scheduled Reports (Advanced - 2 days)**
✅ Email delivery setup
✅ Cron jobs for scheduling
✅ Report templates
✅ Recipient management

---

## 🎯 Recommended Approach

**For Immediate Need:**
1. ✅ Use existing pages with Practice filter
2. ✅ Click "Export to CSV"
3. ✅ Open in Excel, apply formatting
4. ✅ You have your practice-wise report!

**For Better UX:**
- Let me build **Phase 2: Enhanced Export** (2 hours)
- Adds "Export Practice Summary" button
- Generates Excel with multiple sheets + statistics
- Applies all business rules automatically

**For Full Solution:**
- Build **Phase 3: Dedicated Reports Page**
- Professional report generation
- Multiple report types
- Scheduled delivery

---

## 📊 Sample Practice Report Output

```
═══════════════════════════════════════════════════════════════
  MICROSOFT PRACTICE - PM CAPACITY REPORT
  Generated: March 4, 2026 | Report Period: Q1 2026
═══════════════════════════════════════════════════════════════

📈 KEY METRICS
───────────────────────────────────────────────────────────────
Total PMs:                    1,234
Over Capacity (≥90%):            45  (3.6%) 🔴
High Utilization (80-89%):      123  (9.9%) 🟠
Optimal (50-79%):               789 (63.9%) 🟢
Under Utilized (<50%):          277 (22.4%) 🔵

Total Employees:             15,432
With PM:                     14,567 (94.4%)
Without PM (Bench):             865  (5.6%)
New Joiners Pending:            156

📊 CAPACITY DISTRIBUTION
───────────────────────────────────────────────────────────────
  0-25%:   ████████████               156 PMs (12.6%)
 25-50%:   ████████                   121 PMs  (9.8%)
 50-75%:   ████████████████████████   456 PMs (36.9%)
 75-90%:   ████████████████           333 PMs (26.9%)
90-100%:   ███████                    123 PMs (10.0%)
  >100%:   ██                          45 PMs  (3.6%)

🔴 CRITICAL: TOP 10 OVER-CAPACITY PMs
───────────────────────────────────────────────────────────────
Rank  PM Name          Grade  Reportees  Max  Utilization
────────────────────────────────────────────────────────────────
  1   John Doe         C1        15      10      150% 🔴
  2   Jane Smith       C2        14      10      140% 🔴
  3   Bob Johnson      D1        22      15      147% 🔴
  ...

🏖️ BENCH RESOURCES WAITING ASSIGNMENT
───────────────────────────────────────────────────────────────
Total on Bench:     865
Critical (>30d):     89  (10.3%)
New Joiners:        156  (18.0%)
Avg Days on Bench:   12 days

🚪 SEPARATIONS (Next 30 Days)
───────────────────────────────────────────────────────────────
Total Separating:    23 PMs
With Reportees:      18 PMs (234 employees affected)
Critical (≤7d):       3 PMs
Reassignment Status: 89% Complete

═══════════════════════════════════════════════════════════════
  Business Rules Applied:
  ✅ C1/C2 Max Capacity: 10 reportees
  ✅ D1+ Max Capacity: 15 reportees
  ✅ Capacity Threshold: >90% = Over Capacity
  ✅ Bench Critical: >30 days without PM
  ✅ Separation Warning: ≤30 days until LWD
═══════════════════════════════════════════════════════════════
```

---

## ❓ What Would You Like?

**Choose your preference:**

1. **Option A**: Use existing filters + Export (works NOW, 0 hours)
2. **Option B**: Build "Enhanced Export" with practice summary (2 hours)
3. **Option C**: Build dedicated `/reports` page with full features (1 day)
4. **Option D**: Something else? Tell me your specific needs!

Let me know and I'll implement it! 🚀
