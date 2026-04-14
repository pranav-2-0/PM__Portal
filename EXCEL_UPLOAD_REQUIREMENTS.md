# Excel Column Requirements - Upload Guide

## 🚨 Common Upload Error: "No valid records found in file"

This error means your Excel file is missing **required columns** or has **empty values** in mandatory fields.

---

## 📊 **Bench Report File Requirements**

### **REQUIRED Columns (Must have values):**

| Column Name | Alternative Name | Required | Example | Notes |
|-------------|------------------|----------|---------|-------|
| **Employee ID** | employee_id | ✅ YES | EMP001 | Must not be empty |
| **Name** | name | ✅ YES | Alice Developer | Must not be empty |
| **Email** | email | ✅ YES | alice@company.com | Must not be empty |
| **Practice** | practice | ✅ YES | Digital Engineering | Must not be empty |
| **CU** | cu | ✅ YES | CU-Tech | Must not be empty |
| **Region** | region | ✅ YES | India | Must not be empty |
| **Grade** | grade | ✅ YES | B2, C1, D1 | Must not be empty |

### **Optional Columns:**

| Column Name | Alternative Name | Default | Example |
|-------------|------------------|---------|---------|
| Account | account | - | Client-A |
| Skill | skill | - | Java |
| Current PM ID | current_pm_id | NULL | PM001 |
| Joining Date | joining_date | NULL | 2024-01-15 |
| Is New Joiner | is_new_joiner | No | Yes/No |

---

## 📝 **Separations File Requirements**

### **REQUIRED Columns:**

| Column Name | Alternative Name | Required | Example | Notes |
|-------------|------------------|----------|---------|-------|
| **Employee ID** | employee_id | ✅ YES | PM001 | Must not be empty |
| **LWD** | lwd | ✅ YES | 2024-03-15 | Last Working Day, must be valid date |

### **Optional Columns:**

| Column Name | Alternative Name | Default | Example |
|-------------|------------------|---------|---------|
| Reason | reason | - | Resignation |

---

## 🆕 **New Joiner Feed File Requirements**

Same structure as Bench Report, but all uploaded rows will be marked as `is_new_joiner = true` and `current_pm_id = NULL`.

### **REQUIRED Columns (Must have values):**

| Column Name | Alternative Name | Required | Example | Notes |
|-------------|------------------|----------|---------|-------|
| **Employee ID** | employee_id | ✅ YES | EMP001 | Must not be empty |
| **Name** | name | ✅ YES | Alice Developer | Must not be empty |
| **Email** | email | ✅ YES | alice@company.com | Must not be empty |
| **Practice** | practice | ✅ YES | Digital Engineering | Must not be empty |
| **CU** | cu | ✅ YES | CU-Tech | Must not be empty |
| **Region** | region | ✅ YES | India | Must not be empty |
| **Grade** | grade | ✅ YES | B2, C1, D1 | Must not be empty |

### **Optional Columns:**

| Column Name | Alternative Name | Default | Example |
|-------------|------------------|---------|---------|
| Account | account | - | Client-A |
| Skill | skill | - | Java |
| Joining Date | joining_date | NULL | 2024-01-15 |

---

## ✅ **Excel File Format Guidelines**

### **1. First Row = Column Headers**
```
Row 1: Employee ID | Name | Email | Practice | CU | Region | Grade
Row 2: PM001       | John | john@  | Digital  | CU1 | India  | C2
```

### **2. Column Names (Case-Insensitive)**
Both work:
- ✅ `Employee ID` 
- ✅ `employee_id`
- ✅ `EMPLOYEE_ID`

### **3. No Empty Required Fields**
❌ **WRONG:**
```
Employee ID | Name | Email
PM001       | John |       <- Empty email = Row IGNORED
PM002       |      | jane@ <- Empty name = Row IGNORED
            | Bob  | bob@  <- Empty ID = Row IGNORED
```

✅ **CORRECT:**
```
Employee ID | Name | Email
PM001       | John | john@company.com
PM002       | Jane | jane@company.com
PM003       | Bob  | bob@company.com
```

### **4. Grade Format**
Accepted formats (case-insensitive):
- ✅ C1, C2
- ✅ D1, D2, D3
- ✅ B1, B2
- ✅ A1, A2

### **5. Boolean Fields (Is New Joiner)**
Accepted values:
- Yes/No
- True/False
- 1/0

### **6. Date Format**
Accepted formats:
- ✅ 2024-03-15
- ✅ 03/15/2024
- ✅ 15-Mar-2024
- ✅ Excel date format

---

## 🔍 **How to Debug Upload Issues**

### **Step 1: Check Required Columns Exist**
Open Excel file and verify first row has these column names:
- For Bench Report: `Employee ID`, `Name`, `Email`, `Practice`, `CU`, `Region`, `Grade`
- For Separations: `Employee ID`, `LWD`

### **Step 2: Check for Empty Cells**
1. Open Excel
2. Select all data (Ctrl+A)
3. Go to Home → Find & Select → Go To Special → Blanks
4. If cells highlight in required columns → **FIX THEM**

### **Step 3: Check Data Starts at Row 2**
```
✅ CORRECT:
Row 1: Headers
Row 2: Data starts here

❌ WRONG:
Row 1: Title or empty
Row 2: Headers
Row 3: Data
```

### **Step 4: Check File Has Data**
- Open Excel file
- Count rows (excluding header)
- Should have at least 1 data row

---

## 🎯 **Sample Excel Files**

### **Bench Report Sample:**

| Employee ID | Name | Email | Practice | CU | Region | Grade | Skill | Current PM ID | Is New Joiner |
|-------------|------|-------|----------|----|----|-------|-------|---------------|---------------|
| EMP001 | Alice Dev | alice@company.com | Digital Engineering | CU-Tech | India | B2 | Java | PM001 | No |
| EMP002 | Bob Engineer | bob@company.com | Digital Engineering | CU-Tech | India | B1 | Python |  | Yes |
| EMP003 | Carol Analyst | carol@company.com | Cloud & Infra | CU-Cloud | USA | C1 | AWS | PM003 | No |

**Save as:** `Bench_Report.xlsx`

---

### **Separations Sample:**

| Employee ID | LWD | Reason |
|-------------|-----|--------|
| PM001 | 2024-03-30 | Resignation |
| PM005 | 2024-04-15 | Retirement |
| PM008 | 2024-05-01 | Transfer to different unit |

**Save as:** `Separations.xlsx`

---

## 🐛 **Common Mistakes & Fixes**

### **Mistake #1: Missing Required Columns**
❌ Error: "No valid bench records found in file"
```
File has: ID | Full Name | Email Address
Missing: Employee ID, Name
```
✅ Fix: Rename columns to match required names

---

### **Mistake #2: Empty Required Fields**
❌ Your file:
```
Employee ID | Name  | Email
PM001       | John  | john@company.com  <- ✅ Valid
PM002       |       | jane@company.com  <- ❌ Ignored (no name)
PM003       | Bob   |                   <- ❌ Ignored (no email)
```
✅ Result: Only 1 record uploaded (PM001)

**Fix:** Fill all required fields

---

### **Mistake #3: Headers in Wrong Row**
❌ Your file:
```
Row 1: Bench Report - March 2024
Row 2: Employee ID | Name | Email
Row 3: PM001 | John | john@company.com
```
✅ Fix: Delete Row 1, headers should be in Row 1

---

### **Mistake #4: Multiple Sheets**
System reads **only first sheet**

✅ Fix: Put your data in the first sheet

---

### **Mistake #5: Merged Cells**
❌ Merged cells in header row confuse the parser

✅ Fix: Unmerge all cells (Home → Merge & Center → Unmerge)

---

### **Mistake #6: Special Characters in Column Names**
❌ `Employee_ID*`, `Name#`, `Email@Address`

✅ Fix: Use simple names: `Employee ID`, `Name`, `Email`

---

## 🧪 **Test Your Excel File**

### **Quick Validation Checklist:**

Before uploading, verify:

- [ ] First row has column headers (not title)
- [ ] Required columns present (Employee ID, Name, Email, etc.)
- [ ] No empty cells in required columns
- [ ] At least 1 data row (besides header)
- [ ] File size < 100MB
- [ ] File format is .xlsx or .xls
- [ ] No merged cells
- [ ] No special formatting (keep it simple)
- [ ] Data is in first sheet

---

## 📞 **Still Having Issues?**

### **Enable Debug Mode:**

1. Open browser console (F12)
2. Upload file
3. Look for logs:
   ```
   Parsed X employees from Excel
   ```
   or
   ```
   No valid records found in file
   ```

### **Backend Logs:**

Check terminal where backend is running for:
```
Upload employees request received
File: Bench Report.xlsx
Parsed 0 employees from Excel  <- If 0, check required fields
```

### **Get Column Names from Your File:**

Open backend terminal, upload file, and check what columns it sees.

---

## 💡 **Pro Tips**

1. **Start Small:** Test with 5-10 rows first
2. **Use Templates:** Copy sample structure above
3. **Check Column Names:** Match exactly (case doesn't matter)
4. **No Formulas:** Use plain values, not Excel formulas
5. **Save As:** Always save as .xlsx (not .csv)

---

## 📥 **Ready-to-Use Template**

Create a new Excel file with these exact columns:

### **For Bench Report:**
```
Employee ID | Name | Email | Practice | CU | Region | Grade | Skill | Current PM ID | Joining Date | Is New Joiner
```

### **For Separations:**
```
Employee ID | LWD | Reason
```

### **For Skill Report:**
```
Practice | Skill | Skill Cluster
```

**Notes:**
- `Skill Cluster` is optional (used for clustering and similarity)
- Column names are case-insensitive
- Accepted ID aliases:
   - Employee data: Employee ID, GGID, Global Id
   - Separation data: Global Id, GGID, Employee ID
   - Skill report: CGID (used as Skill Cluster when Skill Cluster is missing)

Fill in your data starting from Row 2 and upload! 🚀
