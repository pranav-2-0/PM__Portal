-- ============================================================================
-- People Manager Alignment System — CLEAN UPDATED SCHEMA (2026 Edition)
-- Bug fixes applied:
--   1. separation_reports has NO pm_id column (was causing errorMissingColumn)
--      getUploadStats now joins via employees table to filter by practice
--   2. employees table has UNIQUE constraint on employee_id (correct for upsert)
-- ============================================================================

-- ================================
-- Drop Tables in Correct Order
-- ================================
DROP TABLE IF EXISTS audit_trail CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS approval_workflows CASCADE;
DROP TABLE IF EXISTS pm_assignments CASCADE;
DROP TABLE IF EXISTS exceptions CASCADE;
DROP TABLE IF EXISTS separation_reports CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS people_managers CASCADE;
DROP TABLE IF EXISTS skill_repository CASCADE;
DROP TABLE IF EXISTS configuration CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- ============================================================
-- Departments
-- ============================================================
CREATE TABLE departments (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- ============================================================
-- Users
-- ============================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    department_id   INTEGER REFERENCES departments(id),
    department_name VARCHAR(255),
    role            VARCHAR(50) DEFAULT 'user',
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Skill Repository
-- ============================================================
CREATE TABLE skill_repository (
    id            SERIAL PRIMARY KEY,
    practice      VARCHAR(500) NOT NULL,
    skill_name    VARCHAR(500) NOT NULL,
    skill_cluster VARCHAR(500),
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_skill_repo_unique
    ON skill_repository(practice, skill_name);

-- ============================================================
-- People Managers
-- ============================================================
CREATE TABLE people_managers (
    id               SERIAL PRIMARY KEY,
    employee_id      VARCHAR(50) UNIQUE NOT NULL,
    name             VARCHAR(200) NOT NULL,
    email            VARCHAR(200) NOT NULL,
    practice         VARCHAR(100) NOT NULL,
    cu               VARCHAR(100) NOT NULL,
    region           VARCHAR(100) NOT NULL,
    account          VARCHAR(500),
    skill            VARCHAR(500),
    grade            VARCHAR(10) NOT NULL,
    reportee_count   INTEGER DEFAULT 0,
    max_capacity     INTEGER DEFAULT 10,
    is_active        BOOLEAN DEFAULT TRUE,

    sub_practice     VARCHAR(200),
    location         VARCHAR(200),
    upload_source    VARCHAR(100),
    leave_type       VARCHAR(200),
    leave_start_date DATE,
    leave_end_date   DATE,

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pm_practice_cu
    ON people_managers(practice, cu, region);

-- ============================================================
-- Employees
-- ============================================================
CREATE TABLE employees (
    id               SERIAL PRIMARY KEY,
    employee_id      VARCHAR(50) UNIQUE NOT NULL,   -- UNIQUE required for ON CONFLICT upsert
    name             VARCHAR(200) NOT NULL,
    email            VARCHAR(200) NOT NULL,
    practice         VARCHAR(500) NOT NULL,
    cu               VARCHAR(100) NOT NULL,
    region           VARCHAR(100) NOT NULL,
    account          VARCHAR(500),
    skill            VARCHAR(500),
    grade            VARCHAR(10) NOT NULL,
    primary_skill    VARCHAR(500),                  -- preserved original before bulk update

    current_pm_id    VARCHAR(50),

    joining_date     DATE,
    is_new_joiner    BOOLEAN DEFAULT FALSE,
    is_frozen        BOOLEAN DEFAULT FALSE,
    status           VARCHAR(50) DEFAULT 'active',

    sub_practice     VARCHAR(200),
    location         VARCHAR(200),
    upload_source    VARCHAR(100),
    bench_status     VARCHAR(100),
    hire_reason      VARCHAR(200),
    leave_type       VARCHAR(200),
    leave_start_date DATE,
    leave_end_date   DATE,

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (current_pm_id) REFERENCES people_managers(employee_id)
);

CREATE INDEX idx_employees_pm     ON employees(current_pm_id);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_practice ON employees(practice);

-- ============================================================
-- Separation Reports
-- NOTE: NO pm_id column — join to practice via employees table
--       getUploadStats uses: JOIN employees e ON sr.employee_id = e.employee_id
-- ============================================================
CREATE TABLE separation_reports (
    id              SERIAL PRIMARY KEY,
    employee_id     VARCHAR(50) NOT NULL UNIQUE,
    lwd             DATE NOT NULL,
    reason          VARCHAR(200),
    separation_type VARCHAR(100),
    status          VARCHAR(50) DEFAULT 'pending',
    person_name     VARCHAR(200),
    grade           VARCHAR(20),
    designation     VARCHAR(200),
    person_type     VARCHAR(20) DEFAULT 'unknown',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_separation_lwd ON separation_reports(lwd);

-- ============================================================
-- PM Assignments
-- ============================================================
CREATE TABLE pm_assignments (
    id               SERIAL PRIMARY KEY,
    employee_id      VARCHAR(50) NOT NULL,
    old_pm_id        VARCHAR(50),
    new_pm_id        VARCHAR(50) NOT NULL,
    match_score      DECIMAL(5,2),
    assignment_type  VARCHAR(50) NOT NULL,
    status           VARCHAR(50) DEFAULT 'pending',
    effective_date   DATE,

    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees(employee_id),
    FOREIGN KEY (old_pm_id)   REFERENCES people_managers(employee_id),
    FOREIGN KEY (new_pm_id)   REFERENCES people_managers(employee_id)
);

CREATE INDEX idx_assignments_status ON pm_assignments(status);

-- ============================================================
-- Approval Workflows
-- ============================================================
CREATE TABLE approval_workflows (
    id             SERIAL PRIMARY KEY,
    assignment_id  INTEGER NOT NULL,
    approver_role  VARCHAR(50) NOT NULL,
    approver_email VARCHAR(200),
    status         VARCHAR(50) DEFAULT 'pending',
    comments       TEXT,
    approved_at    TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (assignment_id) REFERENCES pm_assignments(id)
);

-- ============================================================
-- Exceptions
-- ============================================================
CREATE TABLE exceptions (
    id             SERIAL PRIMARY KEY,
    employee_id    VARCHAR(50) NOT NULL,
    exception_type VARCHAR(100) NOT NULL,
    description    TEXT,
    status         VARCHAR(50) DEFAULT 'open',
    assigned_to    VARCHAR(200),
    resolved_at    TIMESTAMP,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

CREATE UNIQUE INDEX idx_exceptions_open_unique
    ON exceptions(employee_id, exception_type) WHERE status = 'open';

-- ============================================================
-- Audit Logs
-- ============================================================
CREATE TABLE audit_logs (
    id            SERIAL PRIMARY KEY,
    entity_type   VARCHAR(50) NOT NULL,
    entity_id     VARCHAR(50) NOT NULL,
    action        VARCHAR(50) NOT NULL,
    changed_by    VARCHAR(200),
    old_value     JSONB,
    new_value     JSONB,
    justification TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity
    ON audit_logs(entity_type, entity_id);

-- ============================================================
-- Audit Trail
-- ============================================================
CREATE TABLE audit_trail (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(200),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   VARCHAR(50) NOT NULL,
    old_value   JSONB,
    new_value   JSONB,
    metadata    JSONB,
    timestamp   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_trail_entity    ON audit_trail(entity_type, entity_id);
CREATE INDEX idx_audit_trail_user      ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);

-- ============================================================
-- Configuration
-- ============================================================
CREATE TABLE configuration (
    id           SERIAL PRIMARY KEY,
    config_key   VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description  TEXT,
    updated_by   VARCHAR(200),
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Default Configuration Seeds
-- ============================================================
INSERT INTO configuration (config_key, config_value, description) VALUES
(
    'matching_weights',
    '{"practice":35,"cu":25,"skill":20,"region":10,"account":5,"grade":3,"capacity":2}'::jsonb,
    'Weights for PM matching algorithm'
),
(
    'reportee_limits',
    '{"c1_c2":10,"d1_d2_d3":15,"capacity_warning_threshold":80}'::jsonb,
    'Grade-based reportee limits'
),
(
    'sla_hours',
    '{"new_joiner_assignment":24,"reassignment":48,"approval_reminder":24,"approval_escalation":48}'::jsonb,
    'SLA timings in hours'
),
(
    'notification_triggers',
    '{"lwd_t60":60,"lwd_t30":30,"lwd_t7":7}'::jsonb,
    'Days before LWD for notifications'
);

-- ============================================================
-- Seed Departments
-- ============================================================
INSERT INTO departments (id, name) VALUES
(1,  'CCA-FS'),
(2,  'Cloud & Infrastructure'),
(3,  'Data & AI'),
(4,  'DCX-DE'),
(5,  'DCX-FS'),
(6,  'Digital Engineering'),
(7,  'Enterprise Architecture'),
(8,  'Insights & Data'),
(9,  'SAP')
ON CONFLICT (id) DO NOTHING;
