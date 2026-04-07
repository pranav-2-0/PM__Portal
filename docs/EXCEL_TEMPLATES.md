# Excel File Templates

## Employee Data Template (GAD Feed)

### Required Columns:
- **Employee ID**: Unique identifier (e.g., EMP001)
- **Name**: Full name
- **Email**: Work email
- **Practice**: Practice name (e.g., Digital Engineering)
- **CU**: Customer Unit (e.g., CU-Tech)
- **Region**: Geographic region (e.g., India, USA)
- **Account**: Client account (optional)
- **Skill**: Primary skill (e.g., Java, Python)
- **Grade**: Employee grade (A1, A2, B1, B2, C1, C2, D1, D2, D3)
- **Current PM ID**: Current PM's employee ID (optional)
- **Joining Date**: Date in format YYYY-MM-DD
- **Is New Joiner**: Yes/No

### Example:
```
Employee ID | Name           | Email              | Practice            | CU      | Region | Account  | Skill      | Grade | Current PM ID | Joining Date | Is New Joiner
EMP001      | Alice Dev      | alice@example.com  | Digital Engineering | CU-Tech | India  | Client-A | Java       | B2    |               | 2024-01-15   | Yes
EMP002      | Bob Engineer   | bob@example.com    | Digital Engineering | CU-Tech | India  | Client-A | JavaScript | B1    | PM001         | 2023-06-10   | No
```

---

## People Managers Template

### Required Columns:
- **Employee ID**: Unique identifier (e.g., PM001)
- **Name**: Full name
- **Email**: Work email
- **Practice**: Practice name
- **CU**: Customer Unit
- **Region**: Geographic region
- **Account**: Client account (optional)
- **Skill**: Primary skill
- **Grade**: PM grade (must be C1 or above)
- **Reportee Count**: Current number of reportees
- **Max Capacity**: Maximum reportees allowed (default: 10)
- **Is Active**: Yes/No

### Example:
```
Employee ID | Name          | Email             | Practice            | CU      | Region | Account  | Skill | Grade | Reportee Count | Max Capacity | Is Active
PM001       | John Manager  | john@example.com  | Digital Engineering | CU-Tech | India  | Client-A | Java  | C2    | 5              | 10           | Yes
PM002       | Sarah Lead    | sarah@example.com | Digital Engineering | CU-Tech | India  | Client-A | JS    | D1    | 3              | 10           | Yes
```

---

## Separation Reports Template

### Required Columns:
- **Employee ID**: PM's employee ID
- **LWD**: Last Working Day (format: YYYY-MM-DD)
- **Reason**: Reason for separation (optional)

### Example:
```
Employee ID | LWD        | Reason
PM001       | 2024-03-15 | Resignation
PM003       | 2024-04-30 | Moving to different practice
```

---

## Notes:
1. Column names are case-insensitive
2. Alternative column names supported (e.g., "employee_id" or "Employee ID")
3. Dates should be in YYYY-MM-DD format
4. Boolean fields accept: Yes/No, True/False, or 1/0
5. File format: .xlsx or .xls
6. Maximum file size: 10MB
