"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionService = void 0;
const database_1 = __importDefault(require("../config/database"));
const gradeUtils_1 = require("../utils/gradeUtils");
class DataIngestionService {
    async bulkInsertEmployees(employees) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            for (const emp of employees) {
                await client.query(`INSERT INTO employees (employee_id, name, email, practice, cu, region, account, skill, grade, current_pm_id, joining_date, is_new_joiner, sub_practice, location, hire_reason, bench_status, upload_source, leave_type, leave_start_date, leave_end_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
           ON CONFLICT (employee_id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             practice = EXCLUDED.practice,
             cu = EXCLUDED.cu,
             region = EXCLUDED.region,
             account = EXCLUDED.account,
             skill = COALESCE(EXCLUDED.skill, employees.skill),
             grade = EXCLUDED.grade,
             -- COALESCE: if new file has no PM column (e.g. GAD), keep existing assignment
             current_pm_id = COALESCE(EXCLUDED.current_pm_id, employees.current_pm_id),
             joining_date = COALESCE(EXCLUDED.joining_date, employees.joining_date),
             is_new_joiner = EXCLUDED.is_new_joiner,
             sub_practice = COALESCE(EXCLUDED.sub_practice, employees.sub_practice),
             location = COALESCE(EXCLUDED.location, employees.location),
             hire_reason = COALESCE(EXCLUDED.hire_reason, employees.hire_reason),
             bench_status = COALESCE(EXCLUDED.bench_status, employees.bench_status),
             upload_source = EXCLUDED.upload_source,
             leave_type = COALESCE(EXCLUDED.leave_type, employees.leave_type),
             leave_start_date = COALESCE(EXCLUDED.leave_start_date, employees.leave_start_date),
             leave_end_date = COALESCE(EXCLUDED.leave_end_date, employees.leave_end_date),
             updated_at = CURRENT_TIMESTAMP`, [emp.employee_id, emp.name, emp.email, emp.practice, emp.cu, emp.region,
                    emp.account, emp.skill, emp.grade, emp.current_pm_id ?? null, emp.joining_date, emp.is_new_joiner,
                    emp.sub_practice ?? null, emp.location ?? null, emp.hire_reason ?? null,
                    emp.bench_status ?? null, emp.upload_source ?? 'bench',
                    emp.leave_type ?? null, emp.leave_start_date ?? null, emp.leave_end_date ?? null]);
            }
            // ── PM email resolution (bench files) ──────────────────────────────────────
            // Bench files identify PMs by email (not GGID). For employees without a
            // current_pm_id but with _pm_email, look up the PM's employee_id by email.
            const needsResolution = employees.filter(e => !e.current_pm_id && e._pm_email);
            if (needsResolution.length > 0) {
                const empIds = needsResolution.map(e => e.employee_id);
                const pmEmails = needsResolution.map(e => e._pm_email);
                await client.query(`UPDATE employees e
           SET current_pm_id = pm.employee_id
           FROM unnest($1::text[], $2::text[]) AS t(emp_id, pm_email)
           JOIN people_managers pm ON pm.email = t.pm_email
           WHERE e.employee_id = t.emp_id
             AND e.is_frozen = false`, [empIds, pmEmails]);
            }
            await client.query('COMMIT');
            return { success: true, count: employees.length };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async bulkInsertPMs(pms) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            for (const pm of pms) {
                // BUSINESS RULE: Auto-calculate max_capacity based on grade if not provided
                const maxCapacity = pm.max_capacity || (0, gradeUtils_1.getMaxCapacityForGrade)(pm.grade);
                await client.query(`INSERT INTO people_managers (employee_id, name, email, practice, cu, region, account, skill, grade, reportee_count, max_capacity, is_active, sub_practice, location, upload_source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (employee_id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             practice = EXCLUDED.practice,
             cu = EXCLUDED.cu,
             region = EXCLUDED.region,
             account = EXCLUDED.account,
             skill = COALESCE(EXCLUDED.skill, people_managers.skill),
             grade = EXCLUDED.grade,
             max_capacity = EXCLUDED.max_capacity,
             is_active = EXCLUDED.is_active,
             sub_practice = COALESCE(EXCLUDED.sub_practice, people_managers.sub_practice),
             location = COALESCE(EXCLUDED.location, people_managers.location),
             upload_source = EXCLUDED.upload_source,
             updated_at = CURRENT_TIMESTAMP
             -- NOTE: reportee_count intentionally NOT updated here.
             -- It is recalculated from employees.current_pm_id after upload.`, [pm.employee_id, pm.name, pm.email, pm.practice, pm.cu, pm.region,
                    pm.account, pm.skill, pm.grade, pm.reportee_count, maxCapacity, pm.is_active,
                    pm.sub_practice ?? null, pm.location ?? null, pm.upload_source ?? 'gad']);
            }
            await client.query('COMMIT');
            return { success: true, count: pms.length };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Auto-generate People Managers from existing employee data.
     * Rules: grade >= C1 (first letter C or above) AND tenure >= 2 years.
     * @param dryRun true = preview only, false = insert into people_managers
     */
    async autoGeneratePMs(dryRun = true) {
        const query = `
      SELECT
        e.employee_id,
        e.name,
        e.email,
        e.grade,
        e.practice,
        e.cu,
        e.region,
        e.skill,
        e.joining_date,
        DATE_PART('year', AGE(CURRENT_DATE, e.joining_date))::int AS tenure_years,
        (pm.employee_id IS NOT NULL) AS already_pm
      FROM employees e
      LEFT JOIN people_managers pm ON pm.employee_id = e.employee_id
      WHERE
        e.grade IS NOT NULL
        AND TRIM(e.grade) ~ '^[C-Z][0-9]'
        AND e.joining_date IS NOT NULL
        AND e.joining_date <= CURRENT_DATE - INTERVAL '6 months'
        AND (e.status = 'active' OR e.status IS NULL)
      ORDER BY e.grade, e.name
    `;
        const { rows } = await database_1.default.query(query);
        const newOnes = rows.filter((r) => !r.already_pm);
        const existing = rows.filter((r) => r.already_pm);
        if (dryRun) {
            return {
                eligible: rows.length,
                new: newOnes.length,
                alreadyPM: existing.length,
                preview: rows.slice(0, 20),
            };
        }
        // ── actual insert/upsert ──
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            let inserted = 0;
            let updated = 0;
            for (const emp of rows) {
                const maxCapacity = (0, gradeUtils_1.getMaxCapacityForGrade)(emp.grade);
                const result = await client.query(`INSERT INTO people_managers
             (employee_id, name, email, practice, cu, region, skill, grade, max_capacity, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)
           ON CONFLICT (employee_id) DO UPDATE SET
             name         = EXCLUDED.name,
             email        = EXCLUDED.email,
             practice     = EXCLUDED.practice,
             cu           = EXCLUDED.cu,
             region       = EXCLUDED.region,
             skill        = EXCLUDED.skill,
             grade        = EXCLUDED.grade,
             max_capacity = EXCLUDED.max_capacity,
             updated_at   = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS is_new`, [emp.employee_id, emp.name, emp.email, emp.practice || '',
                    emp.cu || '', emp.region || '', emp.skill, emp.grade, maxCapacity]);
                if (result.rows[0]?.is_new)
                    inserted++;
                else
                    updated++;
            }
            await client.query('COMMIT');
            console.log(`✅ Auto-generated PMs: ${inserted} inserted, ${updated} updated`);
            return { success: true, inserted, updated, total: rows.length };
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    /**
     * Auto-assign unassigned employees to the best matching PM.
     * BUSINESS RULE: Practice is a 100% mandatory gate — employees only matched within same practice.
     * Scoring (within practice): same CU (25pts) + same region (15pts). Grade rule: PM must be C1+ and at least 1 level above.
     * Employees who ARE people managers are excluded (they don't need a PM).
     * @param dryRun true = preview only, false = commit assignments
     */
    async autoAssignEmployees(dryRun = true) {
        const matchQuery = `
      WITH grade_levels(grade, lvl) AS (
        VALUES ('A1',1),('A2',2),('B1',3),('B2',4),('C1',5),('C2',6),('D1',7),('D2',8)
        -- D3 grade does not exist in this system
      ),
      unassigned AS (
        SELECT e.employee_id, e.name, e.grade, e.practice, e.cu, e.region, e.skill,
               COALESCE(gl.lvl, 3) AS emp_level
        FROM employees e
        LEFT JOIN grade_levels gl ON gl.grade = e.grade
        WHERE e.current_pm_id IS NULL
          AND e.employee_id NOT IN (
            SELECT employee_id FROM people_managers WHERE is_active = true
          )
      ),
      pm_data AS (
        SELECT pm.employee_id AS pm_id, pm.name AS pm_name, pm.grade AS pm_grade,
               pm.practice, pm.cu, pm.region, pm.skill, pm.reportee_count, pm.max_capacity,
               COALESCE(gl.lvl, 5) AS pm_level
        FROM people_managers pm
        LEFT JOIN grade_levels gl ON gl.grade = pm.grade
        WHERE pm.is_active = true
          AND pm.reportee_count < pm.max_capacity
          AND COALESCE(gl.lvl, 5) >= 5
      ),
      scored AS (
        SELECT DISTINCT ON (u.employee_id)
          u.employee_id,
          u.name       AS emp_name,
          u.grade      AS emp_grade,
          u.practice   AS emp_practice,
          p.pm_id,
          p.pm_name,
          p.pm_grade,
          p.practice   AS pm_practice,
          -- Practice is a 100% mandatory gate enforced as a JOIN condition (not a score).
          -- Remaining weights applied within the same-practice pool.
          (CASE WHEN p.cu     = u.cu     THEN 25 ELSE 0 END +
           CASE WHEN p.region = u.region THEN 15 ELSE 0 END) AS score
        FROM unassigned u
        JOIN pm_data p ON p.pm_level > u.emp_level
                      AND p.practice = u.practice   -- 100% mandatory practice gate
        ORDER BY u.employee_id, score DESC, p.reportee_count ASC
      )
      SELECT * FROM scored ORDER BY emp_practice, score DESC
    `;
        const matchResult = await database_1.default.query(matchQuery);
        const matched = matchResult.rows;
        const totalResult = await database_1.default.query(`
      SELECT COUNT(*) FROM employees
      WHERE current_pm_id IS NULL
        AND employee_id NOT IN (
          SELECT employee_id FROM people_managers WHERE is_active = true
        )
    `);
        const totalUnassigned = parseInt(totalResult.rows[0].count);
        if (dryRun) {
            return {
                totalUnassigned,
                canBeAssigned: matched.length,
                cannotBeAssigned: totalUnassigned - matched.length,
                preview: matched.slice(0, 20),
            };
        }
        // ── actual bulk update ──
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            for (const row of matched) {
                await client.query('UPDATE employees SET current_pm_id = $1 WHERE employee_id = $2', [row.pm_id, row.employee_id]);
            }
            // Recalculate reportee_count for every PM in one query
            await client.query(`
        UPDATE people_managers
        SET reportee_count = (
          SELECT COUNT(*) FROM employees WHERE current_pm_id = people_managers.employee_id
        ),
        updated_at = CURRENT_TIMESTAMP
      `);
            await client.query('COMMIT');
            console.log(`✅ Auto-assigned ${matched.length} of ${totalUnassigned} unassigned employees`);
            return {
                success: true,
                assigned: matched.length,
                unassigned: totalUnassigned - matched.length,
                total: totalUnassigned,
            };
        }
        catch (err) {
            await client.query('ROLLBACK');
            throw err;
        }
        finally {
            client.release();
        }
    }
    async bulkInsertSeparations(separations) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Pre-build sets of known PM IDs and employee IDs for fast lookup
            const allIds = [...new Set(separations.map(s => s.employee_id))];
            const pmRes = await client.query('SELECT employee_id FROM people_managers WHERE employee_id = ANY($1::text[])', [allIds]);
            const empRes = await client.query('SELECT employee_id FROM employees WHERE employee_id = ANY($1::text[])', [allIds]);
            const pmSet = new Set(pmRes.rows.map((r) => r.employee_id));
            const empSet = new Set(empRes.rows.map((r) => r.employee_id));
            let inserted = 0;
            const skippedIds = [];
            for (const sep of separations) {
                const personType = pmSet.has(sep.employee_id) ? 'pm'
                    : empSet.has(sep.employee_id) ? 'employee'
                        : 'unknown';
                console.log(`Processing separation: id=${sep.employee_id} type=${personType} name=${sep.person_name || ''}`);
                await client.query(`INSERT INTO separation_reports
             (employee_id, lwd, reason, separation_type, person_name, grade, designation, person_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (employee_id) DO UPDATE SET
             lwd            = EXCLUDED.lwd,
             reason         = EXCLUDED.reason,
             separation_type= EXCLUDED.separation_type,
             person_name    = COALESCE(EXCLUDED.person_name, separation_reports.person_name),
             grade          = COALESCE(EXCLUDED.grade, separation_reports.grade),
             designation    = COALESCE(EXCLUDED.designation, separation_reports.designation),
             person_type    = EXCLUDED.person_type,
             updated_at     = CURRENT_TIMESTAMP`, [sep.employee_id, sep.lwd, sep.reason ?? null, sep.separation_type ?? null,
                    sep.person_name ?? null, sep.grade ?? null, sep.designation ?? null, personType]);
                inserted++;
            }
            await client.query('COMMIT');
            const pmCount = separations.filter(s => pmSet.has(s.employee_id)).length;
            const empCount = separations.filter(s => !pmSet.has(s.employee_id) && empSet.has(s.employee_id)).length;
            const unkCount = separations.length - pmCount - empCount;
            console.log(`✅ Inserted ${inserted} separations: ${pmCount} PMs, ${empCount} employees, ${unkCount} unmatched`);
            return {
                success: true,
                count: inserted,
                skipped: 0,
                pm_separations: pmCount,
                employee_separations: empCount,
                unmatched: unkCount,
                message: `${inserted} separations uploaded: ${pmCount} matched as PMs, ${empCount} matched as employees, ${unkCount} unmatched IDs.`,
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async bulkInsertSkills(skills) {
        if (skills.length === 0)
            return { success: true, count: 0, inserted: 0 };
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Deduplicate by (practice, skill_name) before hitting the DB
            const seen = new Map();
            for (const skill of skills) {
                const key = `${(skill.practice || 'All').toLowerCase()}||${skill.skill_name.toLowerCase()}`;
                if (!seen.has(key))
                    seen.set(key, skill);
            }
            const unique = [...seen.values()];
            console.log(`📊 Skills: ${skills.length} parsed → ${unique.length} unique (practice, skill_name) pairs`);
            // Batch multi-row INSERT in chunks of 500
            const BATCH = 500;
            let totalInserted = 0;
            for (let i = 0; i < unique.length; i += BATCH) {
                const chunk = unique.slice(i, i + BATCH);
                const values = [];
                const placeholders = chunk.map((skill, j) => {
                    values.push(skill.practice || 'All', skill.skill_name, skill.skill_cluster ?? null);
                    const base = j * 3;
                    return `($${base + 1}, $${base + 2}, $${base + 3})`;
                });
                const res = await client.query(`INSERT INTO skill_repository (practice, skill_name, skill_cluster)
           VALUES ${placeholders.join(', ')}
           ON CONFLICT (practice, skill_name) DO UPDATE SET
             skill_cluster = EXCLUDED.skill_cluster,
             updated_at = CURRENT_TIMESTAMP`, values);
                totalInserted += res.rowCount ?? chunk.length;
            }
            // Back-fill employees.skill where it is null, matching on practice + skill_name
            await client.query(`
        UPDATE employees e
        SET skill = sr.skill_name, updated_at = CURRENT_TIMESTAMP
        FROM skill_repository sr
        WHERE e.skill IS NULL
          AND LOWER(e.practice) = LOWER(sr.practice)
      `);
            await client.query('COMMIT');
            return { success: true, count: skills.length, inserted: totalInserted, unique: unique.length };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
exports.DataIngestionService = DataIngestionService;
