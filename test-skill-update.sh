#!/bin/bash
# Test script for skill update endpoint

# Get first employee ID from database
EMPLOYEE_ID=$(PGPASSWORD=postgres psql -h localhost -U postgres -d pm_alignment -t -c "SELECT employee_id FROM employees LIMIT 1;" 2>/dev/null | xargs)

echo "Testing skill update for employee: $EMPLOYEE_ID"

if [ -z "$EMPLOYEE_ID" ]; then
    echo "❌ No employees found in database"
    exit 1
fi

# Test the skill update endpoint
curl -X PATCH http://localhost:5000/employees/$EMPLOYEE_ID/skill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"skill": "Test Skill"}' \
  2>/dev/null | jq .

echo ""
echo "✅ Test complete. Check the response above."
