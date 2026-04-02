import pool from '../config/database';
import { logger } from '../utils/logger';

export interface DiscrepancySummary {
  no_pm_assigned:       number;
  wrong_practice:       number;   // Priority 1 — 100% mandatory gate
  wrong_sub_practice:   number;   // Priority 2
  wrong_cu:             number;   // Priority 3 — same CU is heavily weighted
  wrong_region:         number;   // Priority 4
  wrong_grade:          number;   // Priority 5 — PM must be exactly 1 grade above
  same_grade_violation: number;   // Subset of wrong_grade (exactly equal)
  pm_not_active:        number;
  pm_overloaded:        number;
  pm_separated:         number;
  pm_on_leave:          number;
  total_issues:         number;
}

export interface DiscrepancySnapshot {
  id:               number;
  triggered_by:     string;
  total_employees:  number;
  total_pms:        number;
  health_score:     number;
  summary:          DiscrepancySummary;
  created_at:       Date;
}

export class DiscrepancyReportService {
  /** Create snapshot table + index if they don't exist yet (idempotent) */
  async ensureTable(): Promise<void> {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pm_discrepancy_snapshots (
        id              SERIAL PRIMARY KEY,
        triggered_by    VARCHAR(100)  NOT NULL,
        total_employees INTEGER       NOT NULL DEFAULT 0,
        total_pms       INTEGER       NOT NULL DEFAULT 0,
        health_score    DECIMAL(5,2)  NOT NULL DEFAULT 0,
        summary         JSONB         NOT NULL DEFAULT '{}',
        created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_discrepancy_snapshots_created
        ON pm_discrepancy_snapshots(created_at DESC)
    `);
  }

  /**
   * Run all 8 discrepancy checks in one pass and store a snapshot.
   * Returns the saved snapshot including the computed summary.
   *
   * Checks:
   *  1. NO_PM_ASSIGNED       — active employee has no PM
   *  2. WRONG_PRACTICE       — employee.practice ≠ pm.practice
   *  3. WRONG_SUB_PRACTICE   — employee.sub_practice ≠ pm.sub_practice (same practice)
   *  4. SAME_GRADE_VIOLATION — employee.grade = pm.grade
   *  5. PM_NOT_ACTIVE        — employee's PM is inactive
   *  6. PM_OVERLOADED        — pm.reportee_count > 10 (spec hard cap)
   *  7. PM_SEPARATED         — PM has a separation record with upcoming / recent LWD
   *  8. PM_ON_LEAVE          — PM on leave > 30 days
   */
  async generateSnapshot(triggeredBy: string): Promise<DiscrepancySnapshot> {
    await this.ensureTable();

    const result = await pool.query(`
      WITH active_emp AS (
        SELECT
          e.*,
          pm.employee_id      AS pm_employee_id,
          pm.name             AS pm_name,
          pm.practice         AS pm_practice,
          pm.sub_practice     AS pm_sub_practice,
          pm.cu               AS pm_cu,
          pm.region           AS pm_region,
          pm.grade            AS pm_grade,
          pm.is_active        AS pm_is_active,
          pm.leave_start_date AS pm_leave_start_date,
          pm.leave_end_date   AS pm_leave_end_date,
          pm.reportee_count   AS pm_reportee_count,
          pm.max_capacity     AS pm_max_capacity
        FROM employees e
        LEFT JOIN people_managers pm ON pm.employee_id = e.current_pm_id
        WHERE e.status = 'active'
      ),
      grade_order(grade, lvl) AS (
        VALUES
          ('A1',1),('A2',2),('A3',3),('A4',4),
          ('B1',5),('B2',6),
          ('C1',7),('C2',8),
          ('D1',9),('D2',10),
          ('E1',11),('E2',12)
      ),
      counts AS (
        SELECT
          COUNT(*)                                                    AS total_employees,
          -- 1. No PM — excludes employees who ARE active PMs themselves (they need no PM above them)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM people_managers pm2
                WHERE pm2.employee_id = e.employee_id AND pm2.is_active = true
              )
          )                                                           AS no_pm_assigned,
          -- 2. Wrong Practice (Priority 1 — 100% mandatory)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND is_frozen = false
              AND practice IS DISTINCT FROM pm_practice
          )                                                           AS wrong_practice,
          -- 3. Wrong Sub-Practice (Priority 2)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND is_frozen = false
              AND sub_practice IS NOT NULL
              AND pm_sub_practice IS NOT NULL
              AND sub_practice IS DISTINCT FROM pm_sub_practice
              AND practice = pm_practice
          )                                                           AS wrong_sub_practice,
          -- 4. Wrong CU (Priority 3)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND is_frozen = false
              AND practice = pm_practice
              AND cu IS NOT NULL AND pm_cu IS NOT NULL
              AND cu IS DISTINCT FROM pm_cu
          )                                                           AS wrong_cu,
          -- 5. Wrong Region (Priority 4)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND is_frozen = false
              AND practice = pm_practice
              AND region IS NOT NULL AND pm_region IS NOT NULL
              AND region IS DISTINCT FROM pm_region
          )                                                           AS wrong_region,
          -- 6. Wrong Grade: PM not exactly 1 level above employee (Priority 5)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND grade IS NOT NULL AND pm_grade IS NOT NULL
              AND NOT (
                (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm_grade)))
                =
                (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
              )
          )                                                           AS wrong_grade,
          -- 7. Same Grade (subset of wrong_grade — exactly equal)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND grade IS NOT NULL
              AND pm_grade IS NOT NULL
              AND grade = pm_grade
          )                                                           AS same_grade_violation,
          -- 8. PM Not Active
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND pm_is_active = false
          )                                                           AS pm_not_active,
          -- 9. PM On Leave > 30 days
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND pm_leave_end_date IS NOT NULL
              AND pm_leave_end_date >= CURRENT_DATE
              AND pm_leave_start_date IS NOT NULL
              AND (pm_leave_end_date - pm_leave_start_date) > 30
          )                                                           AS pm_on_leave
        FROM active_emp e
      ),
      overloaded_count AS (
        SELECT COUNT(*) AS pm_overloaded
        FROM people_managers
        WHERE is_active = true AND reportee_count > 10  -- spec hard cap
      ),
      separated_count AS (
        SELECT COUNT(*) AS pm_separated
        FROM employees e
        JOIN separation_reports sr ON sr.employee_id = e.current_pm_id
        WHERE e.status = 'active'
          AND e.current_pm_id IS NOT NULL
          AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
      ),
      total_pms_count AS (
        SELECT COUNT(*) AS total FROM people_managers WHERE is_active = true
      )
      SELECT
        c.total_employees,
        tp.total          AS total_pms,
        c.no_pm_assigned,
        c.wrong_practice,
        c.wrong_sub_practice,
        c.wrong_cu,
        c.wrong_region,
        c.wrong_grade,
        c.same_grade_violation,
        c.pm_not_active,
        c.pm_on_leave,
        o.pm_overloaded,
        s.pm_separated
      FROM counts c, overloaded_count o, separated_count s, total_pms_count tp
    `);

    const row = result.rows[0];
    const totalEmp = parseInt(row.total_employees) || 0;

    const summary: DiscrepancySummary = {
      no_pm_assigned:       parseInt(row.no_pm_assigned)       || 0,
      wrong_practice:       parseInt(row.wrong_practice)       || 0,
      wrong_sub_practice:   parseInt(row.wrong_sub_practice)   || 0,
      wrong_cu:             parseInt(row.wrong_cu)             || 0,
      wrong_region:         parseInt(row.wrong_region)         || 0,
      wrong_grade:          parseInt(row.wrong_grade)          || 0,
      same_grade_violation: parseInt(row.same_grade_violation) || 0,
      pm_not_active:        parseInt(row.pm_not_active)        || 0,
      pm_overloaded:        parseInt(row.pm_overloaded)        || 0,
      pm_separated:         parseInt(row.pm_separated)         || 0,
      pm_on_leave:          parseInt(row.pm_on_leave)          || 0,
      total_issues:         0,
    };

    // total_issues = mapping errors only (no_pm_assigned is informational — expected during initial setup)
    // Priority: wrong_practice > wrong_sub_practice > wrong_cu > wrong_region > wrong_grade > pm issues
    summary.total_issues =
      summary.wrong_practice +
      summary.wrong_sub_practice +
      summary.wrong_cu +
      summary.wrong_region +
      summary.wrong_grade +
      summary.pm_not_active +
      summary.pm_separated +
      summary.pm_on_leave;

    // Health score excludes no_pm_assigned from penalty (those are setup-phase gaps, not mapping errors)
    const healthScore = totalEmp > 0
      ? Math.round(Math.max(0, (totalEmp - summary.total_issues) / totalEmp * 100) * 10) / 10
      : 100;

    const insertResult = await pool.query(
      `INSERT INTO pm_discrepancy_snapshots
         (triggered_by, total_employees, total_pms, health_score, summary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [triggeredBy, totalEmp, parseInt(row.total_pms) || 0, healthScore, JSON.stringify(summary)]
    );

    logger.info('PM discrepancy snapshot generated', { triggeredBy, healthScore, summary });
    return this.mapRow(insertResult.rows[0]);
  }

  /** Fetch the most recent snapshot */
  async getLatestSnapshot(): Promise<DiscrepancySnapshot | null> {
    await this.ensureTable();
    const result = await pool.query(
      `SELECT * FROM pm_discrepancy_snapshots ORDER BY created_at DESC LIMIT 1`
    );
    return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
  }

  /**
   * Run all 8 checks LIVE and return the current state WITHOUT saving a snapshot row.
   * Used by the GET /reports/discrepancy endpoint so the page always shows fresh data.
   */
  async getLiveReport(): Promise<Omit<DiscrepancySnapshot, 'id' | 'triggered_by'>> {
    const result = await pool.query(`
      WITH active_emp AS (
        SELECT
          e.*,
          pm.employee_id      AS pm_employee_id,
          pm.name             AS pm_name,
          pm.practice         AS pm_practice,
          pm.sub_practice     AS pm_sub_practice,
          pm.cu               AS pm_cu,
          pm.region           AS pm_region,
          pm.grade            AS pm_grade,
          pm.is_active        AS pm_is_active,
          pm.leave_start_date AS pm_leave_start_date,
          pm.leave_end_date   AS pm_leave_end_date,
          pm.reportee_count   AS pm_reportee_count,
          pm.max_capacity     AS pm_max_capacity
        FROM employees e
        LEFT JOIN people_managers pm ON pm.employee_id = e.current_pm_id
        WHERE e.status = 'active'
      ),
      grade_order(grade, lvl) AS (
        VALUES
          ('A1',1),('A2',2),('A3',3),('A4',4),
          ('B1',5),('B2',6),
          ('C1',7),('C2',8),
          ('D1',9),('D2',10),
          ('E1',11),('E2',12)
      ),
      counts AS (
        SELECT
          COUNT(*)                                                    AS total_employees,
          -- 1. No PM
          COUNT(*) FILTER (
            WHERE current_pm_id IS NULL
              AND NOT EXISTS (
                SELECT 1 FROM people_managers pm2
                WHERE pm2.employee_id = e.employee_id AND pm2.is_active = true
              )
          )                                                           AS no_pm_assigned,
          -- 2. Wrong Practice
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL AND is_frozen = false
              AND practice IS DISTINCT FROM pm_practice
          )                                                           AS wrong_practice,
          -- 3. Wrong Sub-Practice
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL AND is_frozen = false
              AND sub_practice IS NOT NULL AND pm_sub_practice IS NOT NULL
              AND sub_practice IS DISTINCT FROM pm_sub_practice
              AND practice = pm_practice
          )                                                           AS wrong_sub_practice,
          -- 4. Wrong CU
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL AND is_frozen = false
              AND practice = pm_practice
              AND cu IS NOT NULL AND pm_cu IS NOT NULL
              AND cu IS DISTINCT FROM pm_cu
          )                                                           AS wrong_cu,
          -- 5. Wrong Region
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL AND is_frozen = false
              AND practice = pm_practice
              AND region IS NOT NULL AND pm_region IS NOT NULL
              AND region IS DISTINCT FROM pm_region
          )                                                           AS wrong_region,
          -- 6. Wrong Grade (PM not exactly 1 level above employee)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND grade IS NOT NULL AND pm_grade IS NOT NULL
              AND NOT (
                (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm_grade)))
                =
                (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
              )
          )                                                           AS wrong_grade,
          -- 7. Same Grade (subset of wrong_grade)
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND grade IS NOT NULL AND pm_grade IS NOT NULL
              AND grade = pm_grade
          )                                                           AS same_grade_violation,
          -- 8. PM Not Active
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL AND pm_is_active = false
          )                                                           AS pm_not_active,
          -- 9. PM On Leave > 30 days
          COUNT(*) FILTER (
            WHERE current_pm_id IS NOT NULL
              AND pm_leave_end_date IS NOT NULL
              AND pm_leave_end_date >= CURRENT_DATE
              AND pm_leave_start_date IS NOT NULL
              AND (pm_leave_end_date - pm_leave_start_date) > 30
          )                                                           AS pm_on_leave
        FROM active_emp e
      ),
      overloaded_count AS (
        SELECT COUNT(*) AS pm_overloaded
        FROM people_managers
        WHERE is_active = true AND reportee_count > 10  -- spec hard cap
      ),
      separated_count AS (
        SELECT COUNT(*) AS pm_separated
        FROM employees e
        JOIN separation_reports sr ON sr.employee_id = e.current_pm_id
        WHERE e.status = 'active'
          AND e.current_pm_id IS NOT NULL
          AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
      ),
      total_pms_count AS (
        SELECT COUNT(*) AS total FROM people_managers WHERE is_active = true
      )
      SELECT
        c.total_employees, tp.total AS total_pms,
        c.no_pm_assigned, c.wrong_practice, c.wrong_sub_practice,
        c.wrong_cu, c.wrong_region, c.wrong_grade,
        c.same_grade_violation, c.pm_not_active, c.pm_on_leave,
        o.pm_overloaded, s.pm_separated
      FROM counts c, overloaded_count o, separated_count s, total_pms_count tp
    `);

    const row = result.rows[0];
    const totalEmp = parseInt(row.total_employees) || 0;

    const summary: DiscrepancySummary = {
      no_pm_assigned:       parseInt(row.no_pm_assigned)       || 0,
      wrong_practice:       parseInt(row.wrong_practice)       || 0,
      wrong_sub_practice:   parseInt(row.wrong_sub_practice)   || 0,
      wrong_cu:             parseInt(row.wrong_cu)             || 0,
      wrong_region:         parseInt(row.wrong_region)         || 0,
      wrong_grade:          parseInt(row.wrong_grade)          || 0,
      same_grade_violation: parseInt(row.same_grade_violation) || 0,
      pm_not_active:        parseInt(row.pm_not_active)        || 0,
      pm_overloaded:        parseInt(row.pm_overloaded)        || 0,
      pm_separated:         parseInt(row.pm_separated)         || 0,
      pm_on_leave:          parseInt(row.pm_on_leave)          || 0,
      total_issues:         0,
    };

    summary.total_issues =
      summary.wrong_practice +
      summary.wrong_sub_practice +
      summary.wrong_cu +
      summary.wrong_region +
      summary.wrong_grade +
      summary.pm_not_active +
      summary.pm_separated +
      summary.pm_on_leave;

    const healthScore = totalEmp > 0
      ? Math.round(Math.max(0, (totalEmp - summary.total_issues) / totalEmp * 100) * 10) / 10
      : 100;

    return {
      total_employees: totalEmp,
      total_pms:       parseInt(row.total_pms) || 0,
      health_score:    healthScore,
      summary,
      created_at:      new Date(),
    };
  }

  /** Fetch last 20 snapshots for history view */
  async getHistory(): Promise<DiscrepancySnapshot[]> {
    await this.ensureTable();
    const result = await pool.query(
      `SELECT id, triggered_by, total_employees, total_pms, health_score, summary, created_at
       FROM pm_discrepancy_snapshots
       ORDER BY created_at DESC LIMIT 20`
    );
    return result.rows.map(r => this.mapRow(r));
  }

  /**
   * Live-query detail rows for a specific discrepancy type.
   * Returns paginated results — always fresh from DB.
   */
  async getDetails(type: string, page: number = 1, pageSize: number = 50): Promise<{ count: number; data: any[] }> {
    const offset = (page - 1) * pageSize;

    const QUERIES: Record<string, { count: string; data: string }> = {
      no_pm_assigned: {
        count: `SELECT COUNT(*) FROM employees e WHERE e.status = 'active' AND e.current_pm_id IS NULL
                  AND NOT EXISTS (SELECT 1 FROM people_managers pm2 WHERE pm2.employee_id = e.employee_id AND pm2.is_active = true)`,
        data: `
          SELECT e.employee_id, e.name, e.email, e.practice, e.sub_practice, e.grade, e.region, e.location, e.skill,
                 e.joining_date,
                 EXTRACT(DAY FROM (CURRENT_DATE - e.joining_date))::int AS days_since_joining
          FROM employees e
          WHERE e.status = 'active' AND e.current_pm_id IS NULL
            AND NOT EXISTS (SELECT 1 FROM people_managers pm2 WHERE pm2.employee_id = e.employee_id AND pm2.is_active = true)
          ORDER BY e.joining_date ASC NULLS LAST
          LIMIT $1 OFFSET $2`,
      },

      wrong_practice: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.practice IS DISTINCT FROM pm.practice`,
        data: `
          SELECT e.employee_id, e.name, e.email,
                 e.practice        AS emp_practice,
                 e.sub_practice    AS emp_sub_practice,
                 pm.practice       AS pm_practice,
                 pm.sub_practice   AS pm_sub_practice,
                 e.grade           AS emp_grade,
                 pm.grade          AS pm_grade,
                 pm.employee_id    AS pm_id,
                 pm.name           AS pm_name
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.practice IS DISTINCT FROM pm.practice
          ORDER BY e.practice, e.name
          LIMIT $1 OFFSET $2`,
      },

      wrong_sub_practice: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
            AND e.sub_practice IS DISTINCT FROM pm.sub_practice
            AND e.practice = pm.practice`,
        data: `
          SELECT e.employee_id, e.name, e.email,
                 e.practice        AS practice,
                 e.sub_practice    AS emp_sub_practice,
                 pm.sub_practice   AS pm_sub_practice,
                 e.grade           AS emp_grade,
                 pm.grade          AS pm_grade,
                 pm.employee_id    AS pm_id,
                 pm.name           AS pm_name
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
            AND e.sub_practice IS DISTINCT FROM pm.sub_practice
            AND e.practice = pm.practice
          ORDER BY e.practice, e.sub_practice, e.name
          LIMIT $1 OFFSET $2`,
      },

      wrong_cu: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.practice = pm.practice
            AND e.cu IS NOT NULL AND pm.cu IS NOT NULL
            AND e.cu IS DISTINCT FROM pm.cu`,
        data: `
          SELECT e.employee_id, e.name, e.email,
                 e.practice     AS practice,
                 e.cu           AS emp_cu,
                 pm.cu          AS pm_cu,
                 e.grade        AS emp_grade,
                 pm.grade       AS pm_grade,
                 pm.employee_id AS pm_id,
                 pm.name        AS pm_name
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.practice = pm.practice
            AND e.cu IS NOT NULL AND pm.cu IS NOT NULL
            AND e.cu IS DISTINCT FROM pm.cu
          ORDER BY e.cu, e.name
          LIMIT $1 OFFSET $2`,
      },

      wrong_region: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.practice = pm.practice
            AND e.region IS NOT NULL AND pm.region IS NOT NULL
            AND e.region IS DISTINCT FROM pm.region`,
        data: `
          SELECT e.employee_id, e.name, e.email,
                 e.practice     AS practice,
                 e.region       AS emp_region,
                 pm.region      AS pm_region,
                 e.grade        AS emp_grade,
                 pm.grade       AS pm_grade,
                 pm.employee_id AS pm_id,
                 pm.name        AS pm_name
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false
            AND e.practice = pm.practice
            AND e.region IS NOT NULL AND pm.region IS NOT NULL
            AND e.region IS DISTINCT FROM pm.region
          ORDER BY e.region, e.name
          LIMIT $1 OFFSET $2`,
      },

      wrong_grade: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          CROSS JOIN LATERAL (
            SELECT lvl FROM (VALUES
              ('A1',1),('A2',2),('A3',3),('A4',4),
              ('B1',5),('B2',6),('C1',7),('C2',8),
              ('D1',9),('D2',10),('E1',11),('E2',12)
            ) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(e.grade))
          ) emp_lvl
          CROSS JOIN LATERAL (
            SELECT lvl FROM (VALUES
              ('A1',1),('A2',2),('A3',3),('A4',4),
              ('B1',5),('B2',6),('C1',7),('C2',8),
              ('D1',9),('D2',10),('E1',11),('E2',12)
            ) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(pm.grade))
          ) pm_lvl
          WHERE e.status = 'active'
            AND e.grade IS NOT NULL AND pm.grade IS NOT NULL
            AND pm_lvl.lvl <> emp_lvl.lvl + 1`,
        data: `
          SELECT e.employee_id, e.name, e.email, e.practice,
                 e.grade        AS emp_grade,
                 pm.grade       AS pm_grade,
                 pm_lvl.lvl - emp_lvl.lvl AS grade_gap,
                 pm.employee_id AS pm_id,
                 pm.name        AS pm_name
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          CROSS JOIN LATERAL (
            SELECT lvl FROM (VALUES
              ('A1',1),('A2',2),('A3',3),('A4',4),
              ('B1',5),('B2',6),('C1',7),('C2',8),
              ('D1',9),('D2',10),('E1',11),('E2',12)
            ) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(e.grade))
          ) emp_lvl
          CROSS JOIN LATERAL (
            SELECT lvl FROM (VALUES
              ('A1',1),('A2',2),('A3',3),('A4',4),
              ('B1',5),('B2',6),('C1',7),('C2',8),
              ('D1',9),('D2',10),('E1',11),('E2',12)
            ) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(pm.grade))
          ) pm_lvl
          WHERE e.status = 'active'
            AND e.grade IS NOT NULL AND pm.grade IS NOT NULL
            AND pm_lvl.lvl <> emp_lvl.lvl + 1
          ORDER BY ABS(pm_lvl.lvl - emp_lvl.lvl - 1) DESC, e.name
          LIMIT $1 OFFSET $2`,
      },

      same_grade_violation: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active'
            AND e.grade IS NOT NULL AND pm.grade IS NOT NULL
            AND e.grade = pm.grade`,
        data: `
          SELECT e.employee_id, e.name, e.email, e.practice, e.sub_practice,
                 e.grade           AS emp_grade,
                 pm.grade          AS pm_grade,
                 pm.employee_id    AS pm_id,
                 pm.name           AS pm_name
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active'
            AND e.grade IS NOT NULL AND pm.grade IS NOT NULL
            AND e.grade = pm.grade
          ORDER BY e.grade, e.name
          LIMIT $1 OFFSET $2`,
      },

      pm_not_active: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND pm.is_active = false`,
        data: `
          SELECT e.employee_id, e.name, e.email, e.practice, e.sub_practice,
                 pm.employee_id AS pm_id,
                 pm.name        AS pm_name,
                 pm.email       AS pm_email,
                 pm.grade       AS pm_grade
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND pm.is_active = false
          ORDER BY pm.name, e.name
          LIMIT $1 OFFSET $2`,
      },

      pm_overloaded: {
        count: `SELECT COUNT(*) FROM people_managers WHERE is_active = true AND reportee_count > 10  -- spec hard cap`,
        data: `
          SELECT pm.employee_id, pm.name, pm.email,
                 pm.practice, pm.sub_practice, pm.grade,
                 pm.reportee_count, 10 AS spec_capacity_cap,
                 ROUND((pm.reportee_count::numeric / 10) * 100, 1) AS utilization_pct
          FROM people_managers pm
          WHERE pm.is_active = true AND pm.reportee_count > 10  -- spec hard cap
          ORDER BY pm.reportee_count DESC
          LIMIT $1 OFFSET $2`,
      },

      pm_separated: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN separation_reports sr ON sr.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.current_pm_id IS NOT NULL
            AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'`,
        data: `
          SELECT e.employee_id, e.name, e.email, e.practice, e.sub_practice,
                 pm.employee_id  AS pm_id,
                 pm.name         AS pm_name,
                 pm.email        AS pm_email,
                 sr.lwd,
                 sr.separation_type,
                 EXTRACT(DAY FROM (sr.lwd - CURRENT_DATE))::int AS days_until_lwd
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          JOIN separation_reports sr ON sr.employee_id = e.current_pm_id
          WHERE e.status = 'active'
            AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
          ORDER BY sr.lwd ASC, e.name
          LIMIT $1 OFFSET $2`,
      },

      pm_on_leave: {
        count: `
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active'
            AND pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE
            AND pm.leave_start_date IS NOT NULL
            AND (pm.leave_end_date - pm.leave_start_date) > 30`,
        data: `
          SELECT e.employee_id, e.name, e.email, e.practice, e.sub_practice,
                 pm.employee_id    AS pm_id,
                 pm.name           AS pm_name,
                 pm.email          AS pm_email,
                 pm.leave_start_date,
                 pm.leave_end_date,
                 (pm.leave_end_date - pm.leave_start_date)::int AS leave_days
          FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active'
            AND pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE
            AND pm.leave_start_date IS NOT NULL
            AND (pm.leave_end_date - pm.leave_start_date) > 30
          ORDER BY pm.leave_end_date DESC, e.name
          LIMIT $1 OFFSET $2`,
      },
    };

    if (!QUERIES[type]) {
      throw new Error(`Unknown discrepancy type: ${type}`);
    }

    const [countResult, dataResult] = await Promise.all([
      pool.query(QUERIES[type].count),
      pool.query(QUERIES[type].data, [pageSize, offset]),
    ]);

    return {
      count: parseInt(countResult.rows[0].count) || 0,
      data:  dataResult.rows,
    };
  }

  private mapRow(row: any): DiscrepancySnapshot {
    return {
      id:              row.id,
      triggered_by:   row.triggered_by,
      total_employees: parseInt(row.total_employees) || 0,
      total_pms:       parseInt(row.total_pms)       || 0,
      health_score:    parseFloat(row.health_score)  || 0,
      summary:         typeof row.summary === 'string' ? JSON.parse(row.summary) : row.summary,
      created_at:      row.created_at,
    };
  }
}

export const discrepancyReportService = new DiscrepancyReportService();
