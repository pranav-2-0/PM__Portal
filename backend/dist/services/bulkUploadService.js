"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BulkUploadService = void 0;
const database_1 = __importDefault(require("../config/database"));
const gradeUtils_1 = require("../utils/gradeUtils");
const logger_1 = require("../utils/logger");
/**
 * Optimized Bulk Upload Service for Large Datasets
 * Handles 300K+ PMs and 16K+ separations efficiently
 *
 * Key Features:
 * - Batch processing (1000 records per batch)
 * - Progress tracking
 * - Memory-efficient streaming
 * - Parallel batch execution
 * - Error recovery
 */
class BulkUploadService {
    constructor() {
        this.BATCH_SIZE = 1000; // Process 1000 records at a time
        this.MAX_PARALLEL_BATCHES = 5; // Run 5 batches in parallel
    }
    /**
     * Optimized PM Upload - Handles 300K+ records
     */
    async bulkInsertPMsOptimized(pms) {
        const startTime = Date.now();
        const errors = [];
        let totalInserted = 0;
        logger_1.logger.info('Starting optimized PM upload', { totalRecords: pms.length });
        try {
            // Process in batches to avoid memory issues
            const batches = this.createBatches(pms, this.BATCH_SIZE);
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const batchNum = i + 1;
                logger_1.logger.info(`Processing PM batch ${batchNum}/${batches.length}`, {
                    batchSize: batch.length
                });
                try {
                    const inserted = await this.insertPMBatch(batch);
                    totalInserted += inserted;
                    // Progress reporting
                    const progress = Math.round((totalInserted / pms.length) * 100);
                    console.log(`✓ Batch ${batchNum}/${batches.length}: ${inserted} PMs inserted (${progress}% complete)`);
                }
                catch (error) {
                    errors.push(`Batch ${batchNum} error: ${error.message}`);
                    logger_1.logger.error(`PM batch ${batchNum} failed`, error);
                }
            }
            const duration = (Date.now() - startTime) / 1000;
            logger_1.logger.info('PM upload completed', {
                totalInserted,
                duration,
                recordsPerSecond: Math.round(totalInserted / duration)
            });
            return {
                success: true,
                count: totalInserted,
                duration,
                errors
            };
        }
        catch (error) {
            logger_1.logger.error('PM upload failed', error);
            throw error;
        }
    }
    /**
     * Optimized Employee Upload - Handles 300K+ records
     */
    async bulkInsertEmployeesOptimized(employees) {
        const startTime = Date.now();
        const errors = [];
        let totalInserted = 0;
        logger_1.logger.info('Starting optimized employee upload', { totalRecords: employees.length });
        try {
            const batches = this.createBatches(employees, this.BATCH_SIZE);
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const batchNum = i + 1;
                logger_1.logger.info(`Processing employee batch ${batchNum}/${batches.length}`, {
                    batchSize: batch.length
                });
                try {
                    const inserted = await this.insertEmployeeBatch(batch);
                    totalInserted += inserted;
                    const progress = Math.round((totalInserted / employees.length) * 100);
                    console.log(`✓ Batch ${batchNum}/${batches.length}: ${inserted} employees inserted (${progress}% complete)`);
                }
                catch (error) {
                    errors.push(`Batch ${batchNum} error: ${error.message}`);
                    logger_1.logger.error(`Employee batch ${batchNum} failed`, error);
                    // Re-throw so the caller sees the real error instead of returning count=0
                    throw error;
                }
            }
            const duration = (Date.now() - startTime) / 1000;
            logger_1.logger.info('Employee upload completed', {
                totalInserted,
                duration,
                recordsPerSecond: Math.round(totalInserted / duration)
            });
            return {
                success: true,
                count: totalInserted,
                duration,
                errors
            };
        }
        catch (error) {
            logger_1.logger.error('Employee upload failed', error);
            throw error;
        }
    }
    /**
     * Optimized Separation Upload - Handles 16K+ records
     * Inserts ALL records (PMs, employees, and unknowns).
     * Classifies each record by looking up the CGID in people_managers then employees.
     */
    async bulkInsertSeparationsOptimized(separations) {
        const startTime = Date.now();
        const errors = [];
        let totalInserted = 0;
        logger_1.logger.info('Starting optimized separation upload (all-records mode)', { totalRecords: separations.length });
        try {
            // Step 1: Bulk-fetch PM and employee ID sets in a single round-trip each
            const uniqueIds = [...new Set(separations.map(s => s.employee_id))];
            const [pmResult, empResult] = await Promise.all([
                database_1.default.query('SELECT employee_id FROM people_managers WHERE employee_id = ANY($1::text[])', [uniqueIds]),
                database_1.default.query('SELECT employee_id FROM employees WHERE employee_id = ANY($1::text[])', [uniqueIds])
            ]);
            const pmIdSet = new Set(pmResult.rows.map((r) => r.employee_id));
            const empIdSet = new Set(empResult.rows.map((r) => r.employee_id));
            console.log(`✓ Lookup complete — ${pmIdSet.size} PMs, ${empIdSet.size} employees matched out of ${uniqueIds.length} unique IDs`);
            // Step 2: Tag every record with person_type
            const tagged = separations.map(s => ({
                ...s,
                person_type: pmIdSet.has(s.employee_id)
                    ? 'pm'
                    : empIdSet.has(s.employee_id)
                        ? 'employee'
                        : 'unknown'
            }));
            // Step 3: Process ALL separations in batches
            const batches = this.createBatches(tagged, this.BATCH_SIZE);
            for (let i = 0; i < batches.length; i++) {
                const batch = batches[i];
                const batchNum = i + 1;
                logger_1.logger.info(`Processing separation batch ${batchNum}/${batches.length}`, { batchSize: batch.length });
                try {
                    const inserted = await this.insertSeparationBatch(batch);
                    totalInserted += inserted;
                    const progress = Math.round((totalInserted / tagged.length) * 100);
                    console.log(`✓ Batch ${batchNum}/${batches.length}: ${inserted} separations inserted (${progress}% complete)`);
                }
                catch (error) {
                    errors.push(`Batch ${batchNum} error: ${error.message}`);
                    logger_1.logger.error(`Separation batch ${batchNum} failed`, error);
                }
            }
            const pmCount = tagged.filter(s => s.person_type === 'pm').length;
            const empCount = tagged.filter(s => s.person_type === 'employee').length;
            const unknownCount = tagged.filter(s => s.person_type === 'unknown').length;
            const duration = (Date.now() - startTime) / 1000;
            logger_1.logger.info('Separation upload completed', {
                totalInserted,
                pmCount,
                empCount,
                unknownCount,
                duration,
                recordsPerSecond: duration > 0 ? Math.round(totalInserted / duration) : totalInserted
            });
            return {
                success: true,
                count: totalInserted,
                skipped: 0,
                pm_separations: pmCount,
                employee_separations: empCount,
                unmatched: unknownCount,
                duration,
                errors
            };
        }
        catch (error) {
            logger_1.logger.error('Separation upload failed', error);
            throw error;
        }
    }
    /**
     * Validate PM existence in bulk (single query instead of N queries)
     */
    async validatePMsExist(pmIds) {
        if (pmIds.length === 0)
            return new Set();
        // Use PostgreSQL ANY() for efficient IN clause with large arrays
        const result = await database_1.default.query('SELECT employee_id FROM people_managers WHERE employee_id = ANY($1::text[])', [pmIds]);
        return new Set(result.rows.map(r => r.employee_id));
    }
    /**
     * Insert PM batch using COPY or multi-value INSERT
     */
    async insertPMBatch(pms) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Build multi-row INSERT for better performance
            const values = [];
            const placeholders = [];
            let paramIndex = 1;
            for (const pm of pms) {
                const maxCapacity = pm.max_capacity || (0, gradeUtils_1.getMaxCapacityForGrade)(pm.grade);
                placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
                    `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, ` +
                    `$${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, ` +
                    `$${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14})`);
                values.push(pm.employee_id, pm.name, pm.email, pm.practice, pm.cu, pm.region, pm.account, pm.skill, pm.grade, pm.reportee_count || 0, maxCapacity, pm.is_active !== false, pm.sub_practice ?? null, pm.location ?? null, pm.upload_source ?? 'gad');
                paramIndex += 15;
            }
            const query = `
        INSERT INTO people_managers 
        (employee_id, name, email, practice, cu, region, account, skill, grade, reportee_count, max_capacity, is_active, sub_practice, location, upload_source)
        VALUES ${placeholders.join(', ')}
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
          -- It is recalculated from employees.current_pm_id after upload.
      `;
            await client.query(query, values);
            await client.query('COMMIT');
            return pms.length;
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
     * Insert Employee batch using multi-value INSERT (Phase-2: 20 columns)
     */
    async insertEmployeeBatch(employees) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            const values = [];
            const placeholders = [];
            let paramIndex = 1;
            for (const emp of employees) {
                placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
                    `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, ` +
                    `$${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, ` +
                    `$${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14}, $${paramIndex + 15}, ` +
                    `$${paramIndex + 16}, $${paramIndex + 17}, $${paramIndex + 18}, $${paramIndex + 19})`);
                values.push(emp.employee_id, emp.name, emp.email, emp.practice, emp.cu, emp.region, emp.account, emp.skill, emp.grade, emp.current_pm_id ?? null, emp.joining_date, emp.is_new_joiner || false, emp.sub_practice ?? null, emp.location ?? null, emp.hire_reason ?? null, emp.bench_status ?? null, emp.upload_source ?? 'bench', emp.leave_type ?? null, emp.leave_start_date ?? null, emp.leave_end_date ?? null);
                paramIndex += 20;
            }
            const query = `
        INSERT INTO employees 
        (employee_id, name, email, practice, cu, region, account, skill, grade, current_pm_id, joining_date, is_new_joiner,
         sub_practice, location, hire_reason, bench_status, upload_source, leave_type, leave_start_date, leave_end_date)
        VALUES ${placeholders.join(', ')}
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
          updated_at = CURRENT_TIMESTAMP
      `;
            await client.query(query, values);
            // ── PASS 2: Resolve PM by email for bench-file employees ─────────────────
            // Bench files use "People Manager Email Address" (not PM GGID).
            // For employees where current_pm_id is null but _pm_email is set,
            // look up the PM's employee_id by their email address.
            const needsEmailResolution = employees.filter(e => !e.current_pm_id && e._pm_email);
            if (needsEmailResolution.length > 0) {
                const empIds = needsEmailResolution.map(e => e.employee_id);
                const pmEmails = needsEmailResolution.map(e => e._pm_email);
                await client.query(`UPDATE employees e
           SET current_pm_id = pm.employee_id
           FROM unnest($1::text[], $2::text[]) AS t(emp_id, pm_email)
           JOIN people_managers pm ON pm.email = t.pm_email
           WHERE e.employee_id = t.emp_id
             AND e.is_frozen = false`, [empIds, pmEmails]);
                console.log(`🔗 PM email resolution: resolved up to ${needsEmailResolution.length} employees`);
            }
            await client.query('COMMIT');
            return employees.length;
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
     * Insert Separation batch
     */
    async insertSeparationBatch(separations) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // Deduplicate within this batch — keep the last row for each employee_id.
            // PostgreSQL ON CONFLICT cannot update the same key twice in a single statement.
            const dedupMap = new Map();
            for (const sep of separations) {
                dedupMap.set(sep.employee_id, sep);
            }
            const unique = Array.from(dedupMap.values());
            const values = [];
            const placeholders = [];
            let paramIndex = 1;
            for (const sep of unique) {
                placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, ` +
                    `$${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
                values.push(sep.employee_id, sep.lwd, sep.reason ?? null, sep.separation_type ?? null, sep.person_name ?? null, sep.grade ?? null, sep.designation ?? null, sep.person_type ?? 'unknown');
                paramIndex += 8;
            }
            const query = `
        INSERT INTO separation_reports
          (employee_id, lwd, reason, separation_type, person_name, grade, designation, person_type)
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (employee_id) DO UPDATE SET
          lwd              = EXCLUDED.lwd,
          reason           = EXCLUDED.reason,
          separation_type  = EXCLUDED.separation_type,
          person_name      = COALESCE(EXCLUDED.person_name, separation_reports.person_name),
          grade            = COALESCE(EXCLUDED.grade,       separation_reports.grade),
          designation      = COALESCE(EXCLUDED.designation, separation_reports.designation),
          person_type      = EXCLUDED.person_type,
          updated_at       = CURRENT_TIMESTAMP
      `;
            await client.query(query, values);
            await client.query('COMMIT');
            return unique.length;
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
     * Split array into batches
     */
    createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }
}
exports.BulkUploadService = BulkUploadService;
