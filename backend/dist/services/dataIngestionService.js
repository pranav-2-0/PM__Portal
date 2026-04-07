"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngestionService = void 0;
const database_1 = __importDefault(require("../config/database"));
const gradeUtils_1 = require("../utils/gradeUtils");
const matchingService_1 = require("./matchingService");
const matchingService = new matchingService_1.MatchingService();
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
             -- NOTE: reportee_count intentionally NOT updated here.`, [pm.employee_id, pm.name, pm.email, pm.practice, pm.cu, pm.region,
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
        AND e.joining_date <= CURRENT_DATE - INTERVAL '2 years'
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
     * Auto-assign unassigned employees using the FULL 5-step rule flow from MatchingService.
     *
     * Steps enforced:
     *  0. Practice gate (mandatory — no cross-practice assignment ever)
     *  1. Region check (Major flag if mismatch)
     *  2. BU/CU check (Major flag if mismatch → Low confidence)
     *  3. Account check (Minor flag if same-BU diff-account; Major if cross-BU)
     *  4. Skill check (exact / cluster / partial / missing → flags + confidence)
     *  5. Tie-breakers: capacity → tenure → account history → PM ID sort
     *
     * Unmappable employees (no eligible PM in same practice, or confidence=Low with
     * cross-BU and cross-account) are left unassigned and get an exception record.
     */
    async autoAssignEmployees(dryRun = true) {
        // Fetch all unassigned employees who are not PMs themselves
        const { rows: unassigned } = await database_1.default.query(`
      SELECT e.*
      FROM employees e
      WHERE e.current_pm_id IS NULL
        AND e.is_frozen = false
        AND e.employee_id NOT IN (
          SELECT employee_id FROM people_managers WHERE is_active = true
        )
        AND (e.status = 'active' OR e.status IS NULL)
    `);
        const totalUnassigned = unassigned.length;
        if (dryRun) {
            // For preview: run matching but don't commit, just return counts
            let canBeAssigned = 0;
            let cannotBeAssigned = 0;
            const preview = [];
            for (const emp of unassigned.slice(0, 50)) { // preview first 50
                try {
                    const matches = await matchingService.findBestPM(emp);
                    // Only accept High or Medium confidence matches for auto-assignment
                    const best = matches.find(m => m.confidence === 'High' || m.confidence === 'Medium');
                    if (best) {
                        canBeAssigned++;
                        if (preview.length < 20) {
                            preview.push({
                                employee_id: emp.employee_id,
                                emp_name: emp.name,
                                emp_grade: emp.grade,
                                emp_practice: emp.practice,
                                pm_id: best.pm.employee_id,
                                pm_name: best.pm.name,
                                pm_grade: best.pm.grade,
                                pm_practice: best.pm.practice,
                                score: best.score,
                                confidence: best.confidence,
                                matchTier: best.matchTier,
                                flag_count: (best.flags || []).length,
                            });
                        }
                    }
                    else {
                        cannotBeAssigned++;
                    }
                }
                catch {
                    cannotBeAssigned++;
                }
            }
            return {
                totalUnassigned,
                canBeAssigned,
                cannotBeAssigned: totalUnassigned - canBeAssigned,
                preview,
                note: 'Only High/Medium confidence matches are auto-assigned. Low confidence requires manual review.',
            };
        }
        // ── Actual assignment ──
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            let assigned = 0;
            let skipped = 0;
            let lowConf = 0;
            for (const emp of unassigned) {
                try {
                    const matches = await matchingService.findBestPM(emp);
                    if (matches.length === 0) {
                        skipped++;
                        continue;
                    }
                    // RULE: Only auto-assign High or Medium confidence matches.
                    // Low confidence (cross-BU or skill mismatch) is flagged but NOT auto-assigned —
                    // it requires human review. This enforces the spirit of the 5-step cascade.
                    const best = matches.find(m => m.confidence === 'High' || m.confidence === 'Medium');
                    if (!best) {
                        lowConf++;
                        // Exception already persisted by matchingService.findBestPM for low-confidence cases
                        continue;
                    }
                    await client.query(`UPDATE employees SET current_pm_id = $1, updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $2`, [best.pm.employee_id, emp.employee_id]);
                    // ── Log decision path + deviation flags for transparency (spec §4) ──
                    const deviationFlags = (best.flags || []).map(f => `[${f.severity}] ${f.code}: ${f.message}`);
                    await client.query(`INSERT INTO pm_assignments
               (employee_id, old_pm_id, new_pm_id, match_score, assignment_type, status, effective_date)
             VALUES ($1, $2, $3, $4, 'new_joiner', 'completed', CURRENT_DATE)`, [emp.employee_id, emp.current_pm_id ?? null, best.pm.employee_id, best.score]);
                    await client.query(`INSERT INTO audit_logs
               (entity_type, entity_id, action, changed_by, new_value, justification)
             VALUES ('employee', $1, 'pm_auto_assigned', 'system', $2, $3)`, [
                        emp.employee_id,
                        JSON.stringify({
                            pm_id: best.pm.employee_id,
                            score: best.score,
                            decision_path: best.path,
                            confidence: best.confidence,
                            match_tier: best.matchTier,
                            tiebreaker: best.tiebreakerApplied ?? null,
                        }),
                        deviationFlags.length > 0
                            ? `Deviation flags: ${deviationFlags.join(' | ')}`
                            : 'No deviation flags — clean match.',
                    ]);
                    assigned++;
                }
                catch (err) {
                    console.warn(`⚠️  autoAssign: skipping ${emp.employee_id} — ${err.message}`);
                    skipped++;
                }
            }
            // Recalculate reportee_count for every PM in one pass
            await client.query(`
        UPDATE people_managers
        SET reportee_count = (
          SELECT COUNT(*) FROM employees
          WHERE current_pm_id = people_managers.employee_id
            AND (status = 'active' OR status IS NULL)
        ),
        updated_at = CURRENT_TIMESTAMP
      `);
            await client.query('COMMIT');
            console.log(`✅ autoAssignEmployees: ${assigned} assigned, ${lowConf} skipped (low confidence), ${skipped} unmappable`);
            return {
                success: true,
                assigned,
                low_confidence: lowConf,
                unmappable: skipped,
                unassigned_before: totalUnassigned,
                note: 'Low-confidence matches (cross-BU / skill mismatch) were not auto-assigned. Check exceptions table.',
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
            const allIds = [...new Set(separations.map(s => s.employee_id))];
            const pmRes = await client.query('SELECT employee_id FROM people_managers WHERE employee_id = ANY($1::text[])', [allIds]);
            const empRes = await client.query('SELECT employee_id FROM employees WHERE employee_id = ANY($1::text[])', [allIds]);
            const pmSet = new Set(pmRes.rows.map((r) => r.employee_id));
            const empSet = new Set(empRes.rows.map((r) => r.employee_id));
            let inserted = 0;
            for (const sep of separations) {
                const personType = pmSet.has(sep.employee_id) ? 'pm'
                    : empSet.has(sep.employee_id) ? 'employee'
                        : 'unknown';
                await client.query(`INSERT INTO separation_reports
             (employee_id, lwd, reason, separation_type, person_name, grade, designation, person_type)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (employee_id) DO UPDATE SET
             lwd             = EXCLUDED.lwd,
             reason          = EXCLUDED.reason,
             separation_type = EXCLUDED.separation_type,
             person_name     = COALESCE(EXCLUDED.person_name, separation_reports.person_name),
             grade           = COALESCE(EXCLUDED.grade, separation_reports.grade),
             designation     = COALESCE(EXCLUDED.designation, separation_reports.designation),
             person_type     = EXCLUDED.person_type,
             updated_at      = CURRENT_TIMESTAMP`, [sep.employee_id, sep.lwd, sep.reason ?? null, sep.separation_type ?? null,
                    sep.person_name ?? null, sep.grade ?? null, sep.designation ?? null, personType]);
                inserted++;
            }
            await client.query('COMMIT');
            const pmCount = separations.filter(s => pmSet.has(s.employee_id)).length;
            const empCount = separations.filter(s => !pmSet.has(s.employee_id) && empSet.has(s.employee_id)).length;
            const unkCount = separations.length - pmCount - empCount;
            return {
                success: true,
                count: inserted,
                skipped: 0,
                pm_separations: pmCount,
                employee_separations: empCount,
                unmatched: unkCount,
                message: `${inserted} separations uploaded: ${pmCount} PMs, ${empCount} employees, ${unkCount} unmatched.`,
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
            const seen = new Map();
            for (const skill of skills) {
                const key = `${(skill.practice || 'All').toLowerCase()}||${skill.skill_name.toLowerCase()}`;
                if (!seen.has(key))
                    seen.set(key, skill);
            }
            const unique = [...seen.values()];
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
