-- Migration: Add primary_skill column for skill management
-- This column preserves the original uploaded skill while allowing updates

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS primary_skill VARCHAR(500);

ALTER TABLE people_managers
  ADD COLUMN IF NOT EXISTS primary_skill VARCHAR(500);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_emp_primary_skill ON employees(primary_skill);
CREATE INDEX IF NOT EXISTS idx_pm_primary_skill ON people_managers(primary_skill);

-- Backfill primary_skill from existing skill values for employees where primary_skill is NULL
UPDATE employees
SET primary_skill = skill
WHERE primary_skill IS NULL 
  AND skill IS NOT NULL 
  AND TRIM(skill) != '';

-- Backfill primary_skill from existing skill values for PMs where primary_skill is NULL
UPDATE people_managers
SET primary_skill = skill
WHERE primary_skill IS NULL 
  AND skill IS NOT NULL 
  AND TRIM(skill) != '';

-- Verify migration
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name IN ('employees', 'people_managers') 
  AND column_name = 'primary_skill'
ORDER BY table_name;
