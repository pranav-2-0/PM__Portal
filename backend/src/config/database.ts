import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'pm_alignment',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
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

    // ── Materialized view: misaligned employees with no suggested PM ──────────
    // Pre-computes which misaligned employees end up with suggested_pm_id = NULL
    // after running the FULL scoring LATERAL (identical to getMisalignments and
    // exportMisalignmentsCSV: eligible → grade_filtered → scored → filtered_scored
    // → strict_best → relaxed_best).
    //
    // WHY: previously getNoSuggestedPMEmployees ran a simplified LATERAL (just
    // LIMIT 1 on eligible) which: (a) used a different definition of "has a
    // suggestion" than All Issues, causing the No PM Found set to be nearly empty,
    // and (b) ran over ALL misaligned employees on every request making it slow.
    //
    // NOW: this MV runs the expensive computation ONCE at refresh time.  Paginated
    // reads and CSV exports become O(1) indexed scans — same speed as All Issues.
    // Refreshed immediately after mv_practice_has_eligible_pm (dependency order).
    await pool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS mv_no_suggested_pm AS
      WITH
      pm_separated AS (
        SELECT DISTINCT employee_id
        FROM separation_reports
        WHERE (separation_type ILIKE '%Resignation%' OR separation_type ILIKE '%Retirement%')
          AND lwd >= CURRENT_DATE - INTERVAL '90 days'
      ),
      -- Identical base population to getMisalignments
      all_misaligned AS (
        SELECT
          e.employee_id,
          e.name              AS employee_name,
          e.email             AS employee_email,
          e.practice          AS emp_practice,
          e.sub_practice      AS emp_sub_practice,
          e.cu                AS emp_cu,
          e.region            AS emp_region,
          e.grade             AS emp_grade,
          e.skill             AS emp_skill,
          e.location          AS emp_location,
          e.account           AS emp_account,
          pm.employee_id      AS pm_id,
          pm.name             AS pm_name,
          pm.email            AS pm_email,
          pm.practice         AS pm_practice,
          pm.sub_practice     AS pm_sub_practice,
          pm.cu               AS pm_cu,
          pm.region           AS pm_region,
          pm.grade            AS pm_grade,
          pm.skill            AS pm_skill,
          pm.leave_start_date,
          pm.leave_end_date,
          CASE
            WHEN pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE THEN 'PM_ON_LEAVE'
            WHEN ps.employee_id IS NOT NULL                                           THEN 'PM_SEPARATED'
            WHEN e.practice IS DISTINCT FROM pm.practice                              THEN 'WRONG_PRACTICE'
            WHEN e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                 AND e.sub_practice IS DISTINCT FROM pm.sub_practice                  THEN 'WRONG_SUB_PRACTICE'
            WHEN e.cu IS NOT NULL AND pm.cu IS NOT NULL
                 AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice         THEN 'WRONG_CU'
            WHEN e.region IS NOT NULL AND pm.region IS NOT NULL
                 AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice THEN 'WRONG_REGION'
            WHEN e.grade IS NOT NULL AND pm.grade IS NOT NULL
                 AND COALESCE(gl_pm.lvl, 0) <> COALESCE(gl_e.lvl, 0) + 1            THEN 'WRONG_GRADE'
            ELSE 'MISMATCH'
          END AS mismatch_type
        FROM employees e
        JOIN people_managers pm      ON e.current_pm_id  = pm.employee_id
        LEFT JOIN grade_levels gl_pm ON gl_pm.grade      = UPPER(TRIM(pm.grade))
        LEFT JOIN grade_levels gl_e  ON gl_e.grade       = UPPER(TRIM(e.grade))
        LEFT JOIN pm_separated ps    ON ps.employee_id   = pm.employee_id
        JOIN mv_practice_has_eligible_pm mhep ON mhep.practice = e.practice
        WHERE e.status = 'active' AND e.is_frozen = false
          AND (
            (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
            OR ps.employee_id IS NOT NULL
            OR e.practice IS DISTINCT FROM pm.practice
            OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
            OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL
                AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
            OR (e.region IS NOT NULL AND pm.region IS NOT NULL
                AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
            OR (e.grade IS NOT NULL AND pm.grade IS NOT NULL
                AND COALESCE(gl_pm.lvl, 0) <> COALESCE(gl_e.lvl, 0) + 1)
          )
          AND (ps.employee_id IS NOT NULL OR mhep.practice IS NOT NULL)
      ),
      -- Full LATERAL scoring — byte-for-byte identical to getMisalignments
      with_suggestion AS (
        SELECT
          am.*,
          sug.suggested_pm_id
        FROM all_misaligned am
        LEFT JOIN LATERAL (
          WITH grade_vals(g, lvl) AS (
            SELECT grade, lvl FROM grade_levels
          ),
          emp_lvl AS (
            SELECT COALESCE(gv.lvl, 0) AS lvl
            FROM grade_vals gv WHERE gv.g = UPPER(TRIM(am.emp_grade))
          ),
          skill_clusters AS (
            SELECT LOWER(sr.skill_name) AS skill_name,
                   LOWER(sr.skill_cluster) AS skill_cluster
            FROM skill_repository sr WHERE sr.practice = am.emp_practice
          ),
          eligible AS (
            SELECT pm2.*,
                   EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm2.created_at)) / 86400 AS tenure_days,
                   COALESCE(gv.lvl, 0) AS pm_lvl
            FROM people_managers pm2
            JOIN grade_vals gv ON gv.g = UPPER(TRIM(pm2.grade))
            WHERE pm2.is_active       = true
              AND pm2.reportee_count <= 10
              AND pm2.practice        = am.emp_practice
              AND pm2.employee_id    <> am.pm_id
              AND NOT (
                    pm2.leave_start_date IS NOT NULL
                AND pm2.leave_end_date   IS NOT NULL
                AND (pm2.leave_end_date - pm2.leave_start_date) > 30
                AND CURRENT_DATE BETWEEN pm2.leave_start_date AND pm2.leave_end_date
              )
              AND COALESCE(gv.lvl, 0) >= 7
              AND COALESCE(gv.lvl, 0) > (SELECT lvl FROM emp_lvl)
          ),
          grade_filtered AS (
            SELECT e2.*,
                   CASE WHEN (e2.pm_lvl - (SELECT lvl FROM emp_lvl)) = 1 THEN 1 ELSE 2 END AS escalation_tier
            FROM eligible e2
            WHERE (e2.pm_lvl - (SELECT lvl FROM emp_lvl)) = 1
               OR ((e2.pm_lvl - (SELECT lvl FROM emp_lvl)) BETWEEN 2 AND 3
                   AND NOT EXISTS (
                     SELECT 1 FROM eligible e3
                     WHERE (e3.pm_lvl - (SELECT lvl FROM emp_lvl)) = 1
                   ))
          ),
          scored AS (
            SELECT gf.*,
              CASE
                WHEN am.emp_skill IS NULL OR gf.skill IS NULL THEN 0
                WHEN LOWER(TRIM(gf.skill)) = LOWER(TRIM(am.emp_skill)) THEN 15
                WHEN EXISTS (
                  SELECT 1 FROM skill_clusters sc1
                  JOIN skill_clusters sc2 ON sc1.skill_cluster = sc2.skill_cluster
                  WHERE sc1.skill_name = LOWER(TRIM(gf.skill))
                    AND sc2.skill_name = LOWER(TRIM(am.emp_skill))
                    AND sc1.skill_cluster IS NOT NULL
                ) THEN 8
                WHEN LOWER(gf.skill) LIKE '%'||LOWER(TRIM(am.emp_skill))||'%'
                  OR LOWER(TRIM(am.emp_skill)) LIKE '%'||LOWER(gf.skill)||'%' THEN 7
                ELSE 0
              END AS skill_score,
              CASE WHEN gf.cu IS NOT NULL AND am.emp_cu IS NOT NULL
                        AND gf.cu = am.emp_cu THEN 35 ELSE 0 END AS cu_score,
              CASE WHEN gf.region IS NOT NULL AND am.emp_region IS NOT NULL
                        AND gf.region = am.emp_region THEN 20 ELSE 0 END AS region_score,
              CASE WHEN gf.sub_practice IS NOT NULL AND am.emp_sub_practice IS NOT NULL
                        AND gf.sub_practice = am.emp_sub_practice THEN 20 ELSE 0 END AS sub_score,
              CASE WHEN gf.account IS NOT NULL AND am.emp_account IS NOT NULL
                        AND gf.account = am.emp_account THEN 10 ELSE 0 END AS acct_score,
              FLOOR(5.0 * (10 - gf.reportee_count) / 10) AS cap_score
            FROM grade_filtered gf
          ),
          filtered_scored AS (
            SELECT s.*,
                   (s.cu_score + s.region_score + s.sub_score
                    + s.acct_score + s.skill_score + s.cap_score)::int AS total_score
            FROM scored s
            WHERE NOT (
              s.skill IS NOT NULL AND am.emp_skill IS NOT NULL
              AND s.skill_score = 0
              AND LOWER(TRIM(s.skill)) <> LOWER(TRIM(am.emp_skill))
              AND s.cu_score = 0
            )
          ),
          strict_best AS (
            SELECT employee_id AS suggested_pm_id
            FROM filtered_scored
            ORDER BY escalation_tier ASC, total_score DESC, reportee_count ASC,
                     tenure_days DESC,
                     CASE WHEN account = am.emp_account THEN 0 ELSE 1 END ASC,
                     employee_id ASC
            LIMIT 1
          ),
          relaxed_eligible AS (
            SELECT pm3.employee_id AS suggested_pm_id
            FROM people_managers pm3
            JOIN grade_vals gv3 ON gv3.g = UPPER(TRIM(pm3.grade))
            WHERE pm3.is_active    = true
              AND pm3.employee_id <> am.pm_id
              AND NOT (
                    pm3.leave_start_date IS NOT NULL
                AND pm3.leave_end_date   IS NOT NULL
                AND (pm3.leave_end_date - pm3.leave_start_date) > 30
                AND CURRENT_DATE BETWEEN pm3.leave_start_date AND pm3.leave_end_date
              )
              AND pm3.reportee_count < COALESCE(pm3.max_capacity, 15)
              AND am.mismatch_type = 'PM_SEPARATED'
              AND NOT EXISTS (SELECT 1 FROM strict_best)
            LIMIT 1
          )
          SELECT suggested_pm_id FROM strict_best
          UNION ALL
          SELECT suggested_pm_id FROM relaxed_eligible
          WHERE NOT EXISTS (SELECT 1 FROM strict_best)
          LIMIT 1
        ) sug ON true
      )
      -- Store only employees where BOTH strict and relaxed scoring returned NULL.
      -- These are the employees that match All Issues rows with suggested_pm_id = NULL.
      SELECT * FROM with_suggestion WHERE suggested_pm_id IS NULL;

      CREATE INDEX IF NOT EXISTS idx_mv_no_suggested_pm_practice_name
        ON mv_no_suggested_pm(emp_practice, employee_name);

      CREATE INDEX IF NOT EXISTS idx_mv_no_suggested_pm_employee_id
        ON mv_no_suggested_pm(employee_id);
    `);

    console.log('✅ Export performance indexes and grade_levels table verified');
  } catch (err: any) {
    // Non-fatal — indexes are optional performance hints
    console.warn('⚠️  Could not create export indexes:', err.message);
  }
}

// Refresh both materialized views after any data upload (called non-blocking).
// Order matters: mv_practice_has_eligible_pm must be refreshed first because
// mv_no_suggested_pm depends on it in its JOIN clause.
export async function refreshAlignmentCache(): Promise<void> {
  // 1. Refresh the eligible-PM view first
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_practice_has_eligible_pm');
  } catch {
    try {
      await pool.query('REFRESH MATERIALIZED VIEW mv_practice_has_eligible_pm');
    } catch { /* ignore */ }
  }
  // 2. Then refresh the no-suggestion cache (depends on view above)
  try {
    await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_no_suggested_pm');
  } catch {
    try {
      await pool.query('REFRESH MATERIALIZED VIEW mv_no_suggested_pm');
    } catch { /* ignore */ }
  }
}

export default pool;
