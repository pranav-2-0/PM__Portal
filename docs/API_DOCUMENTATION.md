# API Documentation - PM Alignment System

Base URL: `http://localhost:5000/api/pm`

---

## Health Check

### GET /health
Check if server is running.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Data Upload Endpoints

### POST /upload/employees
Upload employee data from Excel file.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` (Excel file)

**Response**:
```json
{
  "message": "Employees uploaded successfully",
  "success": true,
  "count": 150
}
```

**Error Response**:
```json
{
  "error": "No file uploaded"
}
```

---

### POST /upload/pms
Upload People Manager data from Excel file.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` (Excel file)

**Response**:
```json
{
  "message": "People Managers uploaded successfully",
  "success": true,
  "count": 25
}
```

---

### POST /upload/separations
Upload separation reports from Excel file.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` (Excel file)

**Response**:
```json
{
  "message": "Separation reports uploaded successfully",
  "success": true,
  "count": 5
}
```

---

### POST /upload/skills
Upload skill repository report from Excel file.

**Request**:
- Content-Type: `multipart/form-data`
- Body: `file` (Excel file)

**Response**:
```json
{
  "message": "Skill report uploaded successfully",
  "success": true,
  "count": 120
}
```

---

## Employee Endpoints

### GET /employees/new-joiners
Get list of new joiners without assigned PM.

**Response**:
```json
[
  {
    "id": 1,
    "employee_id": "EMP001",
    "name": "Alice Developer",
    "email": "alice.d@example.com",
    "practice": "Digital Engineering",
    "cu": "CU-Tech",
    "region": "India",
    "account": "Client-A",
    "skill": "Java",
    "grade": "B2",
    "current_pm_id": null,
    "joining_date": "2024-01-10",
    "is_new_joiner": true,
    "status": "active"
  }
]
```

---

### GET /employees/:employeeId/find-pm
Find best PM matches for an employee.

**Parameters**:
- `employeeId` (path): Employee ID

**Response**:
```json
{
  "employee": {
    "employee_id": "EMP001",
    "name": "Alice Developer",
    "practice": "Digital Engineering",
    "cu": "CU-Tech",
    "region": "India",
    "grade": "B2",
    "skill": "Java"
  },
  "matches": [
    {
      "pm": {
        "employee_id": "PM001",
        "name": "John Manager",
        "email": "john.m@example.com",
        "practice": "Digital Engineering",
        "cu": "CU-Tech",
        "region": "India",
        "account": "Client-A",
        "skill": "Java",
        "grade": "C2",
        "reportee_count": 5,
        "max_capacity": 10,
        "is_active": true
      },
      "score": 95.5,
      "reasons": [
        "Same practice",
        "Same CU",
        "Same region",
        "Same account",
        "Similar skill",
        "Grade: C2",
        "Capacity: 5/10"
      ]
    },
    {
      "pm": {
        "employee_id": "PM002",
        "name": "Sarah Lead",
        "grade": "D1",
        "reportee_count": 3,
        "max_capacity": 10
      },
      "score": 88.2,
      "reasons": [
        "Same practice",
        "Same CU",
        "Same region",
        "Grade: D1",
        "Capacity: 3/10"
      ]
    }
  ]
}
```

**Error Response**:
```json
{
  "error": "Employee not found"
}
```

---

## Assignment Endpoints

### POST /assignments
Create a new PM assignment.

**Request Body**:
```json
{
  "employeeId": "EMP001",
  "pmId": "PM001",
  "assignmentType": "new_joiner",
  "score": 95.5
}
```

**Fields**:
- `employeeId` (required): Employee ID
- `pmId` (required): PM's employee ID
- `assignmentType` (required): "new_joiner" or "reassignment"
- `score` (optional): Match score

**Response**:
```json
{
  "message": "PM assignment created",
  "assignmentId": 42
}
```

**Error Response**:
```json
{
  "error": "Employee not found"
}
```

---

### GET /assignments/pending
Get all pending PM assignments.

**Response**:
```json
[
  {
    "id": 42,
    "employee_id": "EMP001",
    "employee_name": "Alice Developer",
    "old_pm_id": null,
    "new_pm_id": "PM001",
    "pm_name": "John Manager",
    "match_score": 95.5,
    "assignment_type": "new_joiner",
    "status": "pending",
    "effective_date": null,
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T10:30:00.000Z"
  }
]
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 400 | Bad Request (missing file, invalid data) |
| 404 | Not Found (employee/PM not found) |
| 500 | Internal Server Error |

---

## Data Models

### Employee
```typescript
{
  id?: number;
  employee_id: string;
  name: string;
  email: string;
  practice: string;
  cu: string;
  region: string;
  account?: string;
  skill?: string;
  grade: string;
  current_pm_id?: string;
  joining_date?: Date;
  is_new_joiner?: boolean;
  status?: string;
}
```

### PeopleManager
```typescript
{
  id?: number;
  employee_id: string;
  name: string;
  email: string;
  practice: string;
  cu: string;
  region: string;
  account?: string;
  skill?: string;
  grade: string;
  reportee_count?: number;
  max_capacity?: number;
  is_active?: boolean;
}
```

### PMAssignment
```typescript
{
  id?: number;
  employee_id: string;
  old_pm_id?: string;
  new_pm_id: string;
  match_score?: number;
  assignment_type: 'new_joiner' | 'reassignment';
  status?: 'pending' | 'approved' | 'rejected' | 'completed';
  effective_date?: Date;
}
```

---

## Testing with cURL

### Upload Employees
```bash
curl -X POST http://localhost:5000/api/pm/upload/employees \
  -F "file=@employees.xlsx"
```

### Get New Joiners
```bash
curl http://localhost:5000/api/pm/employees/new-joiners
```

### Find PM for Employee
```bash
curl http://localhost:5000/api/pm/employees/EMP001/find-pm
```

### Create Assignment
```bash
curl -X POST http://localhost:5000/api/pm/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP001",
    "pmId": "PM001",
    "assignmentType": "new_joiner",
    "score": 95.5
  }'
```

### Get Pending Assignments
```bash
curl http://localhost:5000/api/pm/assignments/pending
```

---

## Rate Limiting
Currently no rate limiting implemented. Will be added in Phase 2.

## Authentication
Currently no authentication required. Will be added in Phase 2 with JWT tokens.

## CORS
CORS is enabled for all origins in development. Will be restricted in production.

---

## Future Endpoints (Phase 2+)

### Approval Workflow
- `POST /assignments/:id/approve` - Approve assignment
- `POST /assignments/:id/reject` - Reject assignment
- `GET /assignments/:id/workflow` - Get approval workflow status

### Notifications
- `POST /notifications/send` - Send notification
- `GET /notifications/history` - Get notification history

### Configuration
- `GET /config/weights` - Get matching weights
- `PUT /config/weights` - Update matching weights
- `GET /config/sla` - Get SLA timings

### Analytics
- `GET /analytics/dashboard` - Dashboard metrics
- `GET /analytics/pm-capacity` - PM capacity report
- `GET /analytics/assignment-trends` - Assignment trends

### Exceptions
- `GET /exceptions` - Get exception queue
- `POST /exceptions/:id/resolve` - Resolve exception
- `POST /exceptions/:id/escalate` - Escalate exception
