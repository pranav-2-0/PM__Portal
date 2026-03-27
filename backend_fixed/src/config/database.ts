import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pm_alignment',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  max: 50,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // No statement_timeout at pool level — long-running exports need unlimited time.
  // Bulk insert services apply their own per-client timeout where needed.
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Create performance indexes for misalignment export on startup (idempotent)
export async function ensureExportIndexes(): Promise<void> {
  try {
    // ── Permanent grade_levels lookup table ──────────────────────────────────
    // Replaces repeated inline VALUES('A1',1),... CTEs in every alignment query.
    // Being a real table, Postgres can hash-join or index-scan it instead of
    // evaluating an anonymous VALUES block for every row.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS grade_levels (
        grade TEXT PRIMARY KEY,
        lvl   INT  NOT NULL
      );
      INSERT INTO grade_levels (grade, lvl) VALUES
        ('A1',1),('A2',2),('A3',3),('A4',4),
        ('B1',5),('B2',6),('C1',7),('C2',8),
        ('D1',9),('D2',10),('E1',11),('E2',12)
      ON CONFLICT (grade) DO NOTHING;
    `);

    // ── Core alignment indexes ───────────────────────────────────────────────
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_employees_status_pm
        ON employees(status, current_pm_id)
        WHERE status = 'active';

      CREATE INDEX IF NOT EXISTS idx_employees_practice_active
        ON employees(practice, employee_id)
        WHERE status = 'active';

      CREATE INDEX IF NOT EXISTS idx_pm_practice_active_capacity
        ON people_managers(practice, is_active, reportee_count, max_capacity)
        WHERE is_active = true;

      CREATE INDEX IF NOT EXISTS idx_pm_employee_id_active
        ON people_managers(employee_id)
        WHERE is_active = true;

      -- Critical for the hasSuggestedPM correlated sub-select
      CREATE INDEX IF NOT EXISTS idx_pm_practice_grade_capacity
        ON people_managers(practice, is_active, reportee_count)
        WHERE is_active = true;

      -- Critical for PM_SEPARATED / PM_ON_LEAVE lookups
      CREATE INDEX IF NOT EXISTS idx_sep_employee_lwd
        ON separation_reports(employee_id, lwd);

      -- Speeds up current_pm_id → people_managers join
      CREATE INDEX IF NOT EXISTS idx_employees_current_pm
        ON employees(current_pm_id)
        WHERE status = 'active';

      -- Speeds up exceptions lookups per employee
      CREATE INDEX IF NOT EXISTS idx_exceptions_emp_status_type
        ON exceptions(employee_id, status, exception_type);
    `);

    // ── Materialized view: eligible PM existence per practice ────────────────
    // Pre-computes "does practice X have at least one eligible PM?" so that
    // the hasSuggestedPM EXISTS subquery (which fired once per employee row)
    // becomes a single indexed lookup instead of a full people_managers scan.
    await pool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_practice_has_eligible_pm AS
      SELECT DISTINCT pm.practice
      FROM people_managers pm
      JOIN grade_levels gl ON gl.grade = UPPER(TRIM(pm.grade))
      WHERE pm.is_active       = true
        AND pm.reportee_count <= 10
        AND gl.lvl             >= 7
        AND NOT (
              pm.leave_start_date IS NOT NULL
          AND pm.leave_end_date   IS NOT NULL
          AND (pm.leave_end_date - pm.leave_start_date) > 30
          AND CURRENT_DATE BETWEEN pm.leave_start_date AND pm.leave_end_date
        );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_practice_eligible
        ON mv_practice_has_eligible_pm(practice);
    `);

    console.log('✅ Export performance indexes and grade_levels table verified');
  } catch (err: any) {
    // Non-fatal — indexes are optional performance hints
    console.warn('⚠️  Could not create export indexes:', err.message);
  }
}

// Refresh the materialized view after any data upload (call non-blocking)
export async function refreshAlignmentCache(): Promise<void> {
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_practice_has_eligible_pm');
  } catch {
    // Non-fatal; view may not support CONCURRENTLY on first run, fall back
    try {
      await pool.query('REFRESH MATERIALIZED VIEW mv_practice_has_eligible_pm');
    } catch { /* ignore */ }
  }
}

export default pool;
