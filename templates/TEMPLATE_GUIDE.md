# 📋 Upload Templates Guide

> **Complete reference for all 5 upload types in the People Manager system.**

---

## ⚠️ Critical: Upload Order

Before uploading any data, follow this order:

```
Step 1 ──► People Manager Feed     (PMs must exist first)
Step 2 ──► Bench Report            (links employees to PMs)
Step 3 ──► Separation Reports      (references PM GGIDs — PMs must exist)

Step 4 ──► New Joiner Feed         (independent — any time)
Step 5 ──► Skill Report            (independent — any time)
```

> **If you upload Separation Report before People Manager Feed, ALL rows will be silently skipped.**
> The system cannot find the PM referenced in `Global Id` if PMs don't exist yet.

---

## 📁 Template Files

| Template File | Upload Card | Maps To |
|---|---|---|
| `People_Manager_Feed_Template.csv` | People Manager Feed | `people_managers` table |
| `Bench_Report_Template.csv` | Bench Report (Employee) | `employees` table |
| `New_Joiner_Feed_Template.csv` | New Joiner Feed | `employees` table (flagged as new joiner) |
| `Separation_Report_Template.csv` | Separation Reports | `separation_reports` table |
| `Skill_Report_Template.csv` | Skill Report | `skill_repository` table |

---

---

## 1. 👔 People Manager Feed Template

**File:** `People_Manager_Feed_Template.csv`
**Upload Card:** "People Manager Feed" on the Data Upload page
**Purpose:** Register People Managers in the system. Must be done before any other upload.

### Columns

| Column | Required | Description | Example |
|---|---|---|---|
| `GGID` | ✅ Yes | Unique Global Grade ID of the PM | `30001` |
| `Email ID` | ✅ Yes | Corporate email address | `john.manager@capgemini.com` |
| `Emp Skills` | Optional | Primary skill(s) of the PM | `Java`, `Python`, `SAP` |
| `Unified Grade` | Optional | Grade level (uppercase) | `C2`, `D1`, `D3` |
| `PM Sub-practice` | Optional | Practice or sub-practice name | `DCX-BPM`, `Cloud & Infra` |
| `SBU Name` | Optional | Strategic Business Unit | `Cloud SBU`, `ENG SBU` |
| `PM Region` | Optional | Region/location | `IN`, `UK`, `US` |
| `Reportee Count` | Optional | Current number of reportees | `8` |
| `Is Active` | Optional | Whether PM is currently active | `Yes`, `No`, `1`, `0` |

### Accepted Column Name Aliases

The system is flexible — it accepts many column name variations:

| Canonical Name | Also Accepted As |
|---|---|
| `GGID` | `Global Id`, `GlobalId`, `Employee ID`, `Emp ID` |
| `Email ID` | `Email`, `Email Address`, `PM Email` |
| `Emp Skills` | `Skills`, `Skill`, `PM Skills`, `Primary Skill` |
| `Unified Grade` | `Grade`, `Global Grade`, `Local Grade`, `Level` |
| `PM Sub-practice` | `Practice`, `Sub BUName`, `Sub-Practice` |
| `SBU Name` | `CU`, `Business Area`, `BU Name` |
| `PM Region` | `Region`, `Location`, `Country` |

### Common Mistakes

- ❌ Uploading Bench Report **before** this — employees won't link to any PM
- ❌ Using lowercase grades (`c2`, `d1`) — system auto-uppercases, but verify
- ❌ Missing Email ID — rows without email are skipped
- ❌ Missing GGID — rows without GGID cannot be inserted

---

---

## 2. 👷 Bench Report Template (Employee Data)

**File:** `Bench_Report_Template.csv`
**Upload Card:** "Bench Report (Employee)" on the Data Upload page
**Purpose:** Upload all currently benched employees with their assigned PM. Employees are linked to PMs via `PM GGID`.

### Columns

| Column | Required | Description | Example |
|---|---|---|---|
| `GGID` | ✅ Yes | Employee's own Global Grade ID | `40001` |
| `Email ID` | ✅ Yes | Employee's corporate email | `alice.johnson@capgemini.com` |
| `Emp Skills` | Optional | Primary skill of the employee | `Java`, `React`, `Salesforce` |
| `Unified Grade` | Optional | Grade (uppercase) | `B1`, `B2`, `C1`, `C2` |
| `PM GGID` | Optional | GGID of the employee's current PM | `30001` |
| `PM Sub-practice` | Optional | Practice the employee belongs to | `DCX-BPM` |
| `SBU Name` | Optional | Strategic Business Unit | `Cloud SBU` |
| `PM Region` | Optional | Region/location | `IN` |
| `Joining Date` | Optional | Date employee joined / bench start date | `2023-05-15` |

### Accepted Column Name Aliases

| Canonical Name | Also Accepted As |
|---|---|
| `GGID` | `Global Id`, `GlobalId`, `Employee ID`, `Emp ID` |
| `PM GGID` | `PM Global Id`, `Manager ID`, `Manager GGID` |
| `Email ID` | `Email`, `Email Address` |
| `Emp Skills` | `Skills`, `Skill`, `Primary Skill` |
| `Unified Grade` | `Grade`, `Global Grade`, `Local Grade`, `Level` |
| `PM Sub-practice` | `Practice`, `Sub BUName`, `Sub-Practice` |
| `SBU Name` | `CU`, `Business Area`, `BU Name` |
| `PM Region` | `Region`, `Location` |
| `Joining Date` | `Date of Joining`, `DOJ`, `Start Date` |

### PM Linking Logic

- If `PM GGID` is present and matches an existing PM → employee is assigned to that PM
- If `PM GGID` is blank or not found → employee is uploaded with no current PM (appears as unassigned)
- **The PM must already exist** in `people_managers` table (upload PM Feed first!)

### Common Mistakes

- ❌ Using the PM's **email** in `PM GGID` column — must be numeric GGID
- ❌ PM GGID that doesn't match any PM in system → silent unlink (employee saved but unassigned)
- ❌ Date format issues — use `YYYY-MM-DD` for best results

---

---

## 3. 🆕 New Joiner Feed Template

**File:** `New_Joiner_Feed_Template.csv`
**Upload Card:** "New Joiner Feed" on the Data Upload page
**Purpose:** Upload newly joined employees who don't have a PM yet. These employees are automatically flagged as `is_new_joiner = true` and appear in the PM assignment queue.

### Columns

| Column | Required | Description | Example |
|---|---|---|---|
| `GGID` | ✅ Yes | New joiner's Global Grade ID | `40201` |
| `Email ID` | ✅ Yes | Corporate email | `newjoin.dev@capgemini.com` |
| `Emp Skills` | Optional | Primary skill | `Java`, `Salesforce` |
| `Unified Grade` | Optional | Grade | `B1`, `B2` |
| `PM Sub-practice` | Optional | Practice they are hired for | `DCX-BPM` |
| `SBU Name` | Optional | Business unit | `Cloud SBU` |
| `PM Region` | Optional | Region | `IN` |
| `Joining Date` | Optional | Date they joined | `2026-03-01` |

> ⚠️ **Do NOT include a `PM GGID` column** in this template.
> The absence of `PM GGID` tells the system to auto-flag these employees as new joiners needing assignment.

### Difference from Bench Report

| Feature | Bench Report | New Joiner Feed |
|---|---|---|
| Has `PM GGID` column | ✅ Yes | ❌ No |
| `is_new_joiner` flag | Set to `false` | Set to `true` automatically |
| Appears in | Bench list | PM assignment queue |
| PM already assigned | Usually yes | Not yet |

### Common Mistakes

- ❌ Adding `PM GGID` column (even empty) — use Bench Report for that; New Joiner Feed expects this column to be absent
- ❌ Uploading existing bench employees as new joiners — they'll be double-counted

---

---

## 4. 🚪 Separation Report Template

**File:** `Separation_Report_Template.csv`
**Upload Card:** "Separation Reports" on the Data Upload page
**Purpose:** Record when a People Manager is leaving the organisation. The system will flag all their reportees as needing reassignment.

### ⚠️ CRITICAL: Global Id = PM's GGID

> The `Global Id` column must contain the **People Manager's own GGID**, NOT any employee's GGID.
> This records that the **PM is separating**, triggering reassignment of their team.

### Columns

| Column | Required | Description | Example |
|---|---|---|---|
| `Global Id` | ✅ Yes | **PM's own GGID** (from `people_managers` table) | `30001` |
| `Updated Last Working Date` | ✅ Yes | PM's last day at the company | `2026-04-30` |
| `Separation Type` | Optional | Type of separation | `Resignation`, `Retirement`, `Transfer` |
| `Reason As By Employee` | Optional | Reason given by the PM | `Better opportunity` |

### Accepted Column Name Aliases

| Canonical Name | Also Accepted As |
|---|---|
| `Global Id` | `GGID`, `GlobalId`, `Global ID`, `Employee ID` |
| `Updated Last Working Date` | `LWD`, `Last Working Date`, `Separation Date` |
| `Separation Type` | `Reason`, `Type`, `Exit Type` |
| `Reason As By Employee` | `Notes`, `Comments`, `Reason for Leaving` |

### What Happens After Upload

1. A row is inserted into `separation_reports` for the PM
2. The system calculates **days remaining** until the `Updated Last Working Date`
3. All employees linked to that PM (`current_pm_id = PM's GGID`) appear as "needs reassignment"
4. The PM's separation status is visible in the PM Detail Report
5. A warning banner appears in the PM's report card showing days remaining and affected reportees

### Common Mistakes

- ❌ Using an **employee's GGID** instead of the **PM's GGID** — will either fail or record wrong separation
- ❌ Uploading before PMs exist — ALL rows silently skipped (PM lookup fails)
- ❌ Date format issues — use `YYYY-MM-DD` e.g. `2026-04-30`
- ❌ Uploading the same PM twice — second row will create a duplicate separation record

### Example — Correct vs Wrong

```
✅ CORRECT:
Global Id = 30001   ← This is the PM's own GGID
(John Manager, the PM, is leaving on 2026-04-30)

❌ WRONG:
Global Id = 40001   ← This is an employee's GGID, NOT a PM
(This row will be skipped — 40001 is not in people_managers table)
```

---

---

## 5. 🛠️ Skill Report Template

**File:** `Skill_Report_Template.csv`
**Upload Card:** "Skill Report" on the Data Upload page
**Purpose:** Build the Skill Repository — the master list of all skills organised by Practice and Cluster. Used by the matching engine to suggest optimal PM assignments.

### Columns

| Column | Required | Description | Example |
|---|---|---|---|
| `Practice` | Optional | Practice area the skill belongs to | `DCX-BPM`, `Cloud & Infrastructure` |
| `Primary Skill` | ✅ Yes | The skill name | `Java`, `Salesforce`, `Kubernetes` |
| `Skill Cluster` | Optional | Broader grouping of the skill | `Java & JVM`, `CRM`, `Container Platforms` |

### Accepted Column Name Aliases

| Canonical Name | Also Accepted As |
|---|---|
| `Primary Skill` | `Skill`, `Skill Name`, `Final Updated Primary Skills`, `R2D2 - Primary Skill` |
| `Skill Cluster` | `Cluster`, `Skill Group`, `SCU for Primary Skill Badge Box` |
| `Practice` | `PM Sub-practice`, `Sub BUName` |

### Multi-Sheet Excel Support

> If you upload a multi-sheet Excel file (e.g. one sheet is a summary/pivot and another has the skill data),
> the parser **automatically scans all sheets** and uses the first one that contains a `Primary Skill` column.
> You don't need to rename or reorder your sheets.

### Common Mistakes

- ❌ Missing `Primary Skill` column — the parser won't recognise the sheet
- ❌ Blank skill rows — rows with empty `Primary Skill` are automatically skipped
- ❌ Duplicate skills — currently no deduplication; uploading twice will double the repository

---

---

## 📅 Date Format Reference

All date columns in all templates accept the following formats:

| Format | Example | Notes |
|---|---|---|
| `YYYY-MM-DD` | `2026-04-30` | ✅ Recommended |
| `DD/MM/YYYY` | `30/04/2026` | ✅ Accepted |
| `MM/DD/YYYY` | `04/30/2026` | ✅ Accepted |
| `DD-Mon-YYYY` | `30-Apr-2026` | ✅ Accepted |
| Excel Serial | `46002` | ✅ Accepted (auto-converted) |

---

## 🔡 Grade Format Reference

All grade columns accept these values (case-insensitive — system auto-uppercases):

| Grade | Band | Level |
|---|---|---|
| `B1` | Analyst | Junior |
| `B2` | Analyst | Senior |
| `C1` | Consultant | Junior |
| `C2` | Consultant | Senior |
| `D1` | Manager | Junior |
| `D2` | Manager | Senior |
| `D3` | Senior Manager | |
| `E1` | Principal | |
| `E2` | Director | |

---

## ❓ Troubleshooting Common Upload Errors

| Symptom | Cause | Fix |
|---|---|---|
| Rows uploaded but PM list empty | Uploaded employees before PMs | Upload `People_Manager_Feed_Template.csv` first |
| Separation rows uploaded, nothing appears | PMs don't exist | Upload PM Feed first, then Separations |
| Employee shows as "unassigned" | PM GGID in bench file doesn't match any PM | Verify PM GGID exists in PM Feed |
| 0 rows imported from skill file | `Primary Skill` column missing or named differently | Rename column to exactly `Primary Skill` |
| New joiner flagged as bench employee | PM GGID column present but empty | Remove the column entirely for new joiners |
| Date shows as wrong year | Excel serial number misread | Use `YYYY-MM-DD` text format instead |
| 400 error on upload | Missing required column (`GGID` or `Email ID`) | Ensure both are present in the file |

---

## 📂 All Template Files at a Glance

```
templates/
├── People_Manager_Feed_Template.csv   ← Upload FIRST
├── Bench_Report_Template.csv          ← Upload SECOND (references PM GGIDs)
├── Separation_Report_Template.csv     ← Upload THIRD (references PM GGIDs)
├── New_Joiner_Feed_Template.csv       ← Upload any time (independent)
├── Skill_Report_Template.csv          ← Upload any time (independent)
├── TEMPLATE_GUIDE.md                  ← This file
│
│   [Legacy GAD format templates — kept for reference]
├── GAD_Employees_Template.csv
├── GAD_People_Managers_Template.csv
├── GAD_Separations_Template.csv
├── GAD_FORMAT_README.md
└── Sample_Employees.csv
```

---

*Last Updated: June 2025 | People Manager Solution v2*
