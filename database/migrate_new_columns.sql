-- Migration: Add new columns for Phase 2 implementation
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS sub_practice     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS hire_reason      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS bench_status     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS upload_source    VARCHAR(20)  DEFAULT 'bench',
  ADD COLUMN IF NOT EXISTS leave_type       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS leave_start_date DATE,
  ADD COLUMN IF NOT EXISTS leave_end_date   DATE;

ALTER TABLE people_managers
  ADD COLUMN IF NOT EXISTS sub_practice     VARCHAR(100),
  ADD COLUMN IF NOT EXISTS location         VARCHAR(100),
  ADD COLUMN IF NOT EXISTS upload_source    VARCHAR(20)  DEFAULT 'gad',
  ADD COLUMN IF NOT EXISTS leave_type       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS leave_start_date DATE,
  ADD COLUMN IF NOT EXISTS leave_end_date   DATE;

ALTER TABLE separation_reports
  ADD COLUMN IF NOT EXISTS separation_type  VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_emp_sub_practice  ON employees(sub_practice);
CREATE INDEX IF NOT EXISTS idx_emp_leave         ON employees(leave_type, leave_start_date, leave_end_date);
CREATE INDEX IF NOT EXISTS idx_emp_upload_source ON employees(upload_source);
CREATE INDEX IF NOT EXISTS idx_pm_sub_practice   ON people_managers(sub_practice);
CREATE INDEX IF NOT EXISTS idx_pm_leave          ON people_managers(leave_type, leave_start_date, leave_end_date);
CREATE INDEX IF NOT EXISTS idx_sep_type          ON separation_reports(separation_type);

UPDATE configuration
SET config_value = '{"practice":35,"sub_practice":25,"region":15,"grade":10,"location":8,"skill":5,"account":2,"capacity":0}'::jsonb
WHERE config_key = 'matching_weights';

-- Verify
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'employees' AND column_name IN ('sub_practice','location','hire_reason','bench_status','upload_source','leave_type','leave_start_date','leave_end_date')
ORDER BY column_name;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'people_managers' AND column_name IN ('sub_practice','location','upload_source','leave_type','leave_start_date','leave_end_date')
ORDER BY column_name;

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'separation_reports' AND column_name = 'separation_type';
