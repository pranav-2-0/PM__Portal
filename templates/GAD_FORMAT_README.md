# 📋 GAD Format Templates - Ready to Upload

These templates match the **exact format you receive from GAD (Global Access Database)**, making it super easy to upload your real data without any conversion!

---

## 📁 Files in this Folder

### 1. **GAD_People_Managers_Template.csv** (Optional/Legacy)
- **Format**: Matches "People Manager Report 25th Nov'25.xlsx"
- **10 sample PMs** ready to upload (only if PM data is loaded separately)
- **GAD Columns**: GGID, Email ID, Emp Skills, Unified Grade, PM Sub-practice, PM Region

### 2. **GAD_Employees_Template.csv**
- **Format**: Matches "GTD Bench Dashboard - 27-Jan-26.xlsx"
- **25 sample employees** (4 new joiners without PM)
- **GAD Columns**: GGID, Email ID, Emp Skills, Unified Grade, PM GGID, PM Sub-practice

### 3. **GAD_Separations_Template.csv**
- **Format**: Matches "SeperationDetails - 2026-01-05.xlsx"
- **4 separation records** with LWD dates
- **GAD Columns**: Employee ID, Global Id, Employee Name, Updated Last Working Date, Separation Type

---

## 🎯 Why These Templates?

✅ **No conversion needed** - Use your GAD exports directly  
✅ **All GAD column names supported** - GGID, Email ID, PM GGID, etc.  
✅ **Handles date formats** - Excel serial numbers automatically converted  
✅ **Works with real data** - Upload your actual GAD reports as-is  
✅ **Backward compatible** - Old format templates still work too  

---

## 🚀 Quick Start

### **Option 1: Use Your Real GAD Files**

1. **Download from GAD**:
   - GTD Bench Dashboard
   - Separation Details

2. **Upload directly** (no changes needed!):
   - First: GTD Bench Dashboard → Upload as Bench Report
   - Second: Separation Details → Upload as Separations

3. **System auto-maps** GAD columns to internal format

---

### **Option 2: Use Sample Templates**

1. Open any GAD template (CSV or XLSX)
2. Replace with your data (keep column headers)
3. Upload in order: Bench Report → Separations

---

## 📊 GAD Column Mapping

### **People Managers (from GAD PM Report)**

| GAD Column | System Field | Required? | Notes |
|------------|--------------|-----------|-------|
| GGID | Employee ID | ✅ YES | Unique identifier |
| Email ID | Email | ✅ YES | Work email |
| Emp Skills | Skill | Optional | Primary skill |
| Unified Grade | Grade | ✅ YES | C1, C2, D1, D2, D3 |
| PM Sub-practice | Practice | ✅ YES | DCX-BPM, Cloud & Infrastructure, etc. |
| PM Region | Region | ✅ YES | IN, US, UK, etc. |
| PM Skills | Skill | Optional | Alternative skill field |
| PM Grade | Grade | Optional | Alternative grade field |

**Auto-calculated:**
- Max Capacity: 10 for C-grade, 15 for D-grade
- Reportee Count: From "Total" column or defaults to 0
- Is Active: Defaults to true

---

### **Employees (from GAD Bench Dashboard)**

| GAD Column | System Field | Required? | Notes |
|------------|--------------|-----------|-------|
| GGID | Employee ID | ✅ YES | Unique identifier |
| Email ID | Email | ✅ YES | Work email |
| Emp Skills | Skill | Optional | Primary skill |
| Unified Grade | Grade | ✅ YES | B1, B2, C1, etc. |
| PM GGID | Current PM ID | Optional | **Empty = New Joiner** |
| PM Email ID | (Reference) | Optional | For validation only |
| PM Sub-practice | Practice | ✅ YES | Employee's practice |
| PM Region | Region | ✅ YES | IN, US, UK, etc. |

**New Joiner Detection:**
- If `PM GGID` is **empty** → Flagged as new joiner
- Automatically appears in "New Joiners" page
- Ready for PM auto-assignment workflow

---

### **Separations (from GAD Separation Details)**

| GAD Column | System Field | Required? | Notes |
|------------|--------------|-----------|-------|
| Employee ID | Employee ID | ✅ YES | PM's Employee ID |
| Global Id | Employee ID | ✅ YES | Alternative ID field |
| Employee Name | (Reference) | Optional | For display/validation |
| Updated Last Working Date | LWD | ✅ YES | Excel date or ISO format |
| Separation Type | Reason | Optional | Resignation, Retirement, etc. |
| Reason As By Employee | Reason | Optional | Alternative reason field |
| Global Grade | (Reference) | Optional | For validation |
| Location | (Reference) | Optional | For reporting |

**Date Handling:**
- Excel serial numbers (e.g., 46022) → Auto-converted to dates
- ISO strings (2024-04-30) → Parsed correctly
- Invalid dates → Filtered out automatically

---

## 🔄 Upload Order (Important!)

### **1️⃣ FIRST: Upload Bench Report**
```
GAD_Employees_Template.csv
or
Your real: "GTD Bench Dashboard - 27-Jan-26.xlsx"
```
✅ Employees with PM GGID → Assigned to existing PMs  
✅ Employees without PM GGID → Flagged as new joiners  
✅ If PM data is preloaded, assignments resolve automatically

---

### **2️⃣ SECOND: Upload Separations**
```
GAD_Separations_Template.csv
or
Your real: "SeperationDetails - 2026-01-05.xlsx"
```
✅ References Employee IDs from steps 1-2  
✅ Triggers notification workflows  
✅ Creates reassignment tasks

---

## 💡 Real-World Examples

### **Example 1: Upload Your GAD Exports**

```bash
1. Download "GTD Bench Dashboard - 27-Jan-26.xlsx" from GAD
2. Go to Data Upload page → Bench Report section
3. Click "Choose File" → Select the GAD file
4. Click "Upload File"
5. ✅ Success! 9 employees uploaded (some flagged as new joiners)

6. Download "SeperationDetails - 2026-01-05.xlsx" from GAD
7. Go to Data Upload page → Separations section
8. Upload the file
9. ✅ Success! 16,591 separations uploaded
```

---

### **Example 2: Mix Sample + Real Data**

```bash
1. Upload GAD_People_Managers_Template.csv (10 sample PMs)
2. Upload your real GTD Bench Dashboard (real employees)
3. Upload your real Separation Details (real LWDs)

Result: Sample PMs + Real employees + Real separations
Perfect for testing the system with production data!
```

---

## 🔍 What Happens After Upload

### **People Managers**
- ✅ Inserted into `people_managers` table
- ✅ Max capacity auto-set (10 for C, 15 for D)
- ✅ Available for employee assignment
- ✅ Visible in "People Managers" page

### **Employees**
- ✅ Inserted into `employees` table
- ✅ New joiners (no PM GGID) → Appear in "New Joiners" page
- ✅ Assigned employees → Linked to PMs
- ✅ Ready for matching algorithm

### **Separations**
- ✅ Inserted into `separation_reports` table
- ✅ Notification workflow triggered
- ✅ T-60/T-30/T-7 day alerts scheduled
- ✅ Reassignment tasks created for affected reportees

---

## 📋 Sample Data Details

### **PMs (GGID 30001-30010)**
- **Grades**: C1 (2), C2 (4), D1 (2), D2 (1), D3 (1)
- **Practices**: DCX-BPM (3), Cloud & Infrastructure (3), Data & AI (2), Digital Engineering (2)
- **Regions**: IN (6), US (2), UK (2)
- **Max Capacity**: C-grade = 10, D-grade = 15

### **Employees (GGID 40001-40025)**
- **Total**: 25 employees
- **Assigned**: 21 employees (have PM GGID)
- **New Joiners**: 4 employees (40002, 40008, 40012, 40021)
- **Grades**: B1 (12), B2 (11), C1 (2)

### **Separations**
- **Count**: 4 PMs with upcoming LWD
- **Types**: Retirement, Resignation, Transfer
- **LWD Dates**: April-June 2024 (future dates)
- **Affected**: 8 reportees needing reassignment

---

## ✅ Pre-Upload Checklist

Before uploading your GAD files:

- [ ] **PMs uploaded first** (or will get foreign key errors)
- [ ] **File is .xlsx or .csv format**
- [ ] **No empty rows** between data
- [ ] **Column headers in first row**
- [ ] **GGID/Employee ID not empty**
- [ ] **Email ID not empty**
- [ ] **Grades are valid** (C1, C2, D1, etc.)
- [ ] **File size < 100MB**

---

## 🆘 Troubleshooting

### **Error: "No valid PM records found"**
→ Check that GGID, Email ID, PM Sub-practice, PM Region, Unified Grade are not empty

### **Error: "Foreign key constraint violation"**
→ Upload Bench Report first, then separations

### **Error: "Failed to parse Excel"**
→ Ensure file is .xlsx or .csv format (not .xls or corrupted)

### **Upload succeeds but count is 0**
→ Check that first row has column headers, data starts from row 2

### **Dates showing as numbers (46022)**
→ System auto-converts Excel date serial numbers, no action needed

---

## 🎓 Column Name Flexibility

The system supports **multiple column name variations**:

| You can use | Or | Or | Or |
|-------------|----|----|-----|
| GGID | Global Id | Employee ID | employee_id |
| Email ID | Email | email | - |
| Unified Grade | Global Grade | Local Grade | Grade |
| PM GGID | PM Global Id | Current PM ID | - |
| Updated Last Working Date | LWD | lwd | - |
| PM Sub-practice | Sub BUName | Practice | practice |
| PM Region | Region | Location | region |
| Emp Skills | PM Skills | Skill | skill |

**Case-insensitive**: "Email ID" = "email id" = "EMAIL ID"

---

## 📞 Need Help?

1. **Check backend console** for detailed parsing logs
2. **Check browser console** (F12) for upload errors
3. **Use test files** first before uploading large GAD exports
4. **Refer to EXCEL_UPLOAD_REQUIREMENTS.md** for detailed validation rules

---

## 🎯 Next Steps

1. ✅ **Test with samples**: Upload the 3 GAD template files
2. ✅ **Verify in UI**: Check dashboard, new joiners, separations pages
3. ✅ **Upload real data**: Use your actual GAD exports
4. ✅ **Monitor workflows**: Watch auto-assignments happen at 9 AM

---

**Your GAD data is now ready to upload with ZERO conversion! 🚀**

Just export from GAD → Upload directly → System handles everything!
