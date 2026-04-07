# 📊 Excel Template Files with Sample Data

## 📁 Files in this Folder

### 1. **Sample_People_Managers.csv** (10 PMs)
- 10 sample People Managers
- Mix of grades: C1, C2, D1, D2, D3
- Different practices: Digital Engineering, Cloud & Infrastructure, Data & AI
- Various regions: India, USA, UK
- Shows realistic reportee counts and capacity limits

### 2. **Sample_Employees.csv** (25 Employees)
- 25 sample employees
- Mix of assigned and unassigned PMs
- 4 new joiners (no PM assigned)
- Different skills: Java, Python, AWS, React, etc.
- Grades: B1, B2, C1
- Various joining dates

### 3. **Sample_Separations.csv** (4 Separations)
- 4 PMs with Last Working Days
- Different separation reasons
- Future LWD dates for testing notifications

### 4. **Skill_Repository_Template.csv** (Skills)
- Practice-wise skill repository
- Optional skill clusters for similarity matching
- Used to improve skill matching accuracy

---

## 🚀 How to Use These Templates

### **Option 1: Open in Excel**
1. Open any `.csv` file in Excel
2. Data will automatically populate in columns
3. Save as `.xlsx` format: File → Save As → Excel Workbook (.xlsx)
4. Upload to the application

### **Option 2: Use as Reference**
1. Create new Excel file
2. Copy column headers from CSV
3. Add your own data following the format
4. Save as `.xlsx`
5. Upload

### **Option 3: Direct Upload**
1. Rename `.csv` to `.xlsx` (Excel will handle it)
2. Or open in Excel and save as `.xlsx`
3. Upload directly

---

## 📋 Column Details

### **People Managers Template**

| Column | Required? | Description | Example Values |
|--------|-----------|-------------|----------------|
| Employee ID | ✅ YES | Unique identifier | PM001, PM002 |
| Name | ✅ YES | Full name | John Manager |
| Email | ✅ YES | Work email | john.manager@capgemini.com |
| Practice | ✅ YES | Practice area | Digital Engineering, Cloud & Infrastructure |
| CU | ✅ YES | Customer Unit | CU-Technology, CU-Cloud |
| Region | ✅ YES | Geographic region | India, USA, UK |
| Account | Optional | Client account | Client-TechCorp |
| Skill | Optional | Primary skill | Java, Python, AWS |
| Grade | ✅ YES | Manager grade | C1, C2, D1, D2, D3 |
| Reportee Count | Optional | Current reportees | 0-15 |
| Max Capacity | Optional | Maximum capacity | 10 (C1/C2), 15 (D1-D3) |
| Is Active | Optional | Active status | Yes, No |

**Capacity Rules:**
- C1/C2 PMs: Max 10 reportees
- D1/D2/D3 PMs: Max 15 reportees
- Warning at 80% capacity

---

### **Employees Template**

| Column | Required? | Description | Example Values |
|--------|-----------|-------------|----------------|
| Employee ID | ✅ YES | Unique identifier | EMP001, EMP002 |
| Name | ✅ YES | Full name | Alice Johnson |
| Email | ✅ YES | Work email | alice@capgemini.com |
| Practice | ✅ YES | Practice area | Digital Engineering |
| CU | ✅ YES | Customer Unit | CU-Technology |
| Region | ✅ YES | Geographic region | India, USA, UK |
| Account | Optional | Client account | Client-TechCorp |
| Skill | Optional | Primary skill | Java, Python, React |
| Grade | ✅ YES | Employee grade | B1, B2, C1 |
| Current PM ID | Optional | Assigned PM | PM001 (leave empty for new joiners) |
| Joining Date | Optional | Date joined | 2024-01-15 |
| Is New Joiner | Optional | New joiner flag | Yes, No |

**New Joiner Rules:**
- If "Current PM ID" is empty → Considered for auto-assignment
- If "Is New Joiner" = Yes → Appears in New Joiners page
- System auto-assigns PM at 9 AM daily

---

### **Separations Template**

| Column | Required? | Description | Example Values |
|--------|-----------|-------------|----------------|
| Employee ID | ✅ YES | PM's Employee ID | PM001, PM003 |
| LWD | ✅ YES | Last Working Day | 2024-04-30 |
| Reason | Optional | Separation reason | Resignation, Retirement |

**Notification Schedule:**
- T-60 days: First notification
- T-30 days: Second notification
- T-7 days: Final notification
- Daily 10 AM: System checks LWDs

---

### **Skill Repository Template**

| Column | Required? | Description | Example Values |
|--------|-----------|-------------|----------------|
| Practice | ✅ YES | Practice area | Digital Engineering, Data & AI |
| Skill | ✅ YES | Skill name | Java, Python, AWS |
| Skill Cluster | Optional | Cluster/group | Backend Development, Cloud Platform |

**Notes:**
- `Skill Cluster` improves matching similarity when exact skill names differ

---

## 📊 Sample Data Overview

### **People Managers (10 records)**

#### By Grade:
- C1: 2 PMs
- C2: 3 PMs
- D1: 3 PMs
- D2: 1 PM
- D3: 1 PM

#### By Practice:
- Digital Engineering: 4 PMs
- Cloud & Infrastructure: 3 PMs
- Data & AI: 3 PMs

#### By Region:
- India: 6 PMs
- USA: 2 PMs
- UK: 2 PMs

#### Capacity Status:
- PM007: High utilization (12/15 = 80%)
- PM002, PM003, PM009: Moderate (7-10 reportees)
- PM004, PM008: Low utilization (2-3 reportees)

---

### **Employees (25 records)**

#### By Status:
- Assigned to PM: 21 employees
- New Joiners (no PM): 4 employees (EMP002, EMP008, EMP012, EMP021)

#### By Grade:
- B1: 12 employees
- B2: 11 employees
- C1: 2 employees

#### By Practice:
- Digital Engineering: 9 employees
- Cloud & Infrastructure: 8 employees
- Data & AI: 8 employees

---

### **Separations (4 records)**

| PM ID | LWD | Days Until | Notification Stage |
|-------|-----|------------|-------------------|
| PM001 | 2024-04-30 | 58 days | T-60 triggered |
| PM009 | 2024-04-20 | 48 days | T-60 triggered |
| PM003 | 2024-05-15 | 73 days | None yet |
| PM007 | 2024-06-01 | 90 days | None yet |

**Impact:**
- PM001 has 2 reportees to reassign
- PM003 has 3 reportees to reassign
- PM007 has 1 reportee to reassign
- PM009 has 2 reportees to reassign

---

## 🎯 Testing Scenarios

### **Scenario 1: Test Upload Process**
1. Upload `Sample_Employees.csv` (Bench Report) → Should insert 25 employees
2. Upload `Sample_Separations.csv` → Should insert 4 separations

**Expected Result:**
- Dashboard shows: 25 employees, separations count updated (PMs if available)
- New Joiners page shows: 4 employees
- Bench Resources page shows: 4 employees (same as new joiners)

---

### **Scenario 2: Test Matching Algorithm**
1. Ensure PM data is available in the system
2. Upload Bench Report (Employees)
3. Go to "New Joiners" page
4. Click "Find PM" for EMP002 (B1, Digital Engineering, India, Python)

**Expected Match:**
- Best match: PM001 or PM002 (same practice, CU, region, low capacity)
- Match score should consider: Practice (35%), CU (25%), Skill (20%)

---

### **Scenario 3: Test Capacity Limits**
1. Check PM007 (12/15 reportees = 80%)
2. Should show **yellow warning** in PM list
3. Try to assign new employee to PM007
4. Match score should be lower due to high capacity

---

### **Scenario 4: Test Separation Workflow**
1. Upload separations
2. Wait for 10 AM (or manually trigger)
3. System should:
   - Identify 8 affected employees (reportees of separating PMs)
   - Create reassignment tasks
   - Send notifications
   - Show in Exceptions page if no suitable PM found

---

### **Scenario 5: Test Search & Filters**
1. Go to "All Employees" page
2. Filter by:
   - Skill = "Java" → Should show EMP001, EMP011
   - Grade = "B1" → Should show 12 employees
   - Region = "India" → Should show majority
   - Practice = "Cloud & Infrastructure" → Should show 8 employees

---

## 📝 Customizing the Data

### **Replace with Your Data:**

1. **Keep the same column headers** (first row)
2. **Replace data starting from row 2**
3. **Maintain data types:**
   - Employee ID: Text/String
   - Email: Valid email format
   - Grade: C1, C2, D1, D2, D3 for PMs; B1, B2, C1 for employees
   - Is Active: Yes/No
   - Is New Joiner: Yes/No
   - Dates: YYYY-MM-DD format

### **Add More Records:**
Simply add more rows following the same format.

### **Reduce Records:**
Delete rows you don't need (keep header row).

---

## 🔄 Converting CSV to XLSX

### **Method 1: Excel**
```
1. Open .csv file in Excel
2. File → Save As
3. Select "Excel Workbook (*.xlsx)"
4. Save
```

### **Method 2: Google Sheets**
```
1. Import .csv to Google Sheets
2. File → Download → Microsoft Excel (.xlsx)
```

### **Method 3: Upload CSV Directly**
Most systems accept .csv files directly if renamed to .xlsx

---

## ✅ Validation Checklist

Before uploading, verify:

- [x] All required columns present
- [x] No empty cells in required columns
- [x] Employee IDs are unique
- [x] Email addresses are valid
- [x] Grades are valid (C1, C2, D1, etc.)
- [x] Dates are in YYYY-MM-DD format
- [x] Boolean fields are Yes/No
- [x] File is saved as .xlsx format

---

## 🆘 Troubleshooting

### **"No valid PM records found"**
→ Check that Employee ID, Name, Email, Practice, CU, Region, Grade have values in every row

### **"File too large"**
→ Maximum size is 100MB. Split into multiple files if needed.

### **"Failed to parse Excel"**
→ Save as .xlsx format (not .csv or .xls)

### **Upload succeeds but count is 0**
→ Check that first row has column headers, data starts from row 2

---

## 🎓 Learning Resources

- [EXCEL_UPLOAD_REQUIREMENTS.md](../EXCEL_UPLOAD_REQUIREMENTS.md) - Detailed column requirements
- [UPLOAD_TROUBLESHOOTING.md](../UPLOAD_TROUBLESHOOTING.md) - Upload issues and solutions
- [UPLOAD_VALIDATION_GUIDE.md](../UPLOAD_VALIDATION_GUIDE.md) - Testing and validation

---

## 📞 Need Help?

1. Check backend console for detailed error messages
2. Check browser console (F12) for frontend errors
3. Refer to [EXCEL_UPLOAD_REQUIREMENTS.md](../EXCEL_UPLOAD_REQUIREMENTS.md)
4. Use `test-upload.html` to test API directly

---

**Happy Uploading! 🚀**

These templates are production-ready and can be uploaded immediately to test your system.
