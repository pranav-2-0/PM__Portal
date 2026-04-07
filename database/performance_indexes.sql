-- Performance Optimization Indexes for Large Datasets
-- Run this after schema.sql to optimize queries for 300K+ PMs and 16K+ separations

-- ==================================================
-- CRITICAL INDEXES FOR MATCHING ALGORITHM
-- ==================================================

-- PM Matching Query Index (Practice + CU + Region) - Most Critical
-- Used in: matchingService.findBestPM()
CREATE INDEX IF NOT EXISTS idx_pm_matching 
ON people_managers(practice, cu, region, is_active, reportee_count, max_capacity);

-- Employee PM Assignment Index
CREATE INDEX IF NOT EXISTS idx_employee_pm 
ON employees(current_pm_id, status);

-- Employees without PM (New Joiners Query)
CREATE INDEX IF NOT EXISTS idx_new_joiners 
ON employees(is_new_joiner, current_pm_id, status);

-- ==================================================
-- SEPARATION REPORTS OPTIMIZATION
-- ==================================================

-- Separation by PM and Status
CREATE INDEX IF NOT EXISTS idx_separation_pm 
ON separation_reports(employee_id, status, lwd);

-- Separation LWD Range Query (for T-30 checks)
CREATE INDEX IF NOT EXISTS idx_separation_lwd 
ON separation_reports(lwd, status) 
WHERE status = 'pending';

-- ==================================================
-- EMAIL LOOKUPS (for notifications)
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_pm_email 
ON people_managers(email) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_employee_email 
ON employees(email) WHERE status = 'active';

-- ==================================================
-- PRACTICE/CU/REGION FILTERING (for reports)
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_pm_practice 
ON people_managers(practice, is_active);

CREATE INDEX IF NOT EXISTS idx_pm_region 
ON people_managers(region, is_active);

CREATE INDEX IF NOT EXISTS idx_employee_practice 
ON employees(practice, status);

CREATE INDEX IF NOT EXISTS idx_employee_region 
ON employees(region, status);

-- ==================================================
-- ASSIGNMENT WORKFLOW INDEXES
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_assignment_status 
ON pm_assignments(status, created_at);

CREATE INDEX IF NOT EXISTS idx_assignment_employee 
ON pm_assignments(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_assignment_pm 
ON pm_assignments(new_pm_id, status);

-- ==================================================
-- APPROVAL WORKFLOW INDEXES
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_approval_assignment 
ON approval_workflows(assignment_id, status);

CREATE INDEX IF NOT EXISTS idx_approval_pending 
ON approval_workflows(status, created_at) 
WHERE status = 'pending';

-- ==================================================
-- EXCEPTION TRACKING INDEXES
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_exception_status 
ON exceptions(status, created_at);

CREATE INDEX IF NOT EXISTS idx_exception_employee 
ON exceptions(employee_id, status);

CREATE INDEX IF NOT EXISTS idx_exception_type 
ON exceptions(exception_type, status);

-- ==================================================
-- AUDIT TRAIL INDEXES
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity 
ON audit_logs(entity_type, entity_id);

-- ==================================================
-- CAPACITY MONITORING INDEXES
-- ==================================================

-- PM Capacity Utilization (for dashboard)
CREATE INDEX IF NOT EXISTS idx_pm_capacity 
ON people_managers(reportee_count, max_capacity, is_active);

-- Overloaded PMs (reportee_count >= max_capacity)
CREATE INDEX IF NOT EXISTS idx_pm_overload 
ON people_managers(reportee_count, max_capacity) 
WHERE is_active = true AND reportee_count >= max_capacity;

-- ==================================================
-- GRADE-BASED QUERIES
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_pm_grade 
ON people_managers(grade, is_active);

CREATE INDEX IF NOT EXISTS idx_employee_grade 
ON employees(grade, status);

-- ==================================================
-- ANALYTICS & REPORTING INDEXES
-- ==================================================

-- Time-based trending
CREATE INDEX IF NOT EXISTS idx_assignment_date 
ON pm_assignments(created_at DESC, assignment_type);

-- Practice distribution
CREATE INDEX IF NOT EXISTS idx_employee_practice_dist 
ON employees(practice, current_pm_id) WHERE status = 'active';

-- ==================================================
-- VERIFY INDEX CREATION
-- ==================================================

-- Run this query to verify all indexes were created:
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;

-- ==================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ==================================================

ANALYZE people_managers;
ANALYZE employees;
ANALYZE separation_reports;
ANALYZE pm_assignments;
ANALYZE approval_workflows;
ANALYZE exceptions;
ANALYZE audit_logs;

-- ==================================================
-- VACUUM FOR LARGE INSERTS
-- ==================================================

VACUUM ANALYZE people_managers;
VACUUM ANALYZE employees;
VACUUM ANALYZE separation_reports;
