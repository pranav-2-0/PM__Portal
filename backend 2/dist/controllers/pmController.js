"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewAutoAssign = exports.confirmAutoGeneratePMs = exports.previewAutoGeneratePMs = exports.getPracticeFilters = exports.generatePracticeReport = exports.triggerMonthlyEngagement = exports.triggerReassignmentWorkflow = exports.triggerNewJoinerWorkflow = exports.getAuditStatistics = exports.getAuditTrail = exports.getMatchingPerformance = exports.getMonthlyTrends = exports.getWorkflowEfficiency = exports.getAssignmentStatus = exports.getPMCapacityHeatmap = exports.getExceptionQueue = exports.getSLACompliance = exports.setEmployeeFreeze = exports.getUploadStats = exports.getRegionStats = exports.getGradeDistribution = exports.getApprovalMetrics = exports.getPracticeDistribution = exports.getAssignmentTrends = exports.resolveException = exports.getExceptions = exports.triggerLWDCheck = exports.getApprovalWorkflow = exports.rejectAssignment = exports.approveAssignment = exports.getPMDetailReport = exports.checkDatabaseHealth = exports.getPMReportSummary = exports.getPMCapacityReport = exports.getDashboardStats = exports.getPendingAssignments = exports.getAllSeparations = exports.getAllPMs = exports.getAllEmployees = exports.getNewJoinersList = exports.getNewJoiners = exports.assignPMToEmployee = exports.findPMForEmployee = exports.uploadSkillReport = exports.uploadBenchReport = exports.uploadGAD = exports.uploadSeparations = exports.uploadPMs = exports.uploadNewJoiners = exports.uploadEmployees = void 0;
exports.getDiscrepancyHistory = exports.getDiscrepancyDetails = exports.triggerDiscrepancyReport = exports.getDiscrepancyReport = exports.getProposedPMs = exports.getSameGradeExceptions = exports.getCorrectlyMappedEmployees = exports.getGADAnalysisSummary = exports.getEmployeePMHistory = exports.overridePMAssignment = exports.getGradewisePMCapacity = exports.getUnmappedEmployees = exports.exportMisalignmentsCSV = exports.getMisalignments = exports.updateMatchingWeights = exports.getMatchingWeights = exports.confirmAutoAssign = void 0;
const dataIngestionService_1 = require("../services/dataIngestionService");
const bulkUploadService_1 = require("../services/bulkUploadService");
const matchingService_1 = require("../services/matchingService");
const statisticsService_1 = require("../services/statisticsService");
const auditTrailService_1 = require("../services/auditTrailService");
const workflowAutomationService_1 = require("../services/workflowAutomationService");
const schedulerService_1 = require("../services/schedulerService");
const practiceReportService_1 = require("../services/practiceReportService");
const discrepancyReportService_1 = require("../services/discrepancyReportService");
const excelParser_1 = require("../utils/excelParser");
const logger_1 = require("../utils/logger");
const database_1 = __importDefault(require("../config/database"));
const dataService = new dataIngestionService_1.DataIngestionService();
const bulkService = new bulkUploadService_1.BulkUploadService();
const matchingService = new matchingService_1.MatchingService();
const statsService = new statisticsService_1.StatisticsService();
const auditService = new auditTrailService_1.AuditTrailService();
const workflowService = new workflowAutomationService_1.WorkflowAutomationService();
/**
 * Non-blocking helper — generates a discrepancy snapshot after any upload.
 * Failures are swallowed so they never break the upload response.
 */
const generateDiscrepancySnapshot = async (triggeredBy) => {
    try {
        const snap = await discrepancyReportService_1.discrepancyReportService.generateSnapshot(triggeredBy);
        return snap.summary;
    }
    catch (err) {
        logger_1.logger.warn('Discrepancy snapshot generation failed (non-blocking)', err);
        return undefined;
    }
};
const uploadEmployees = async (req, res) => {
    try {
        console.log('Upload employees request received');
        console.log('File:', req.file ? req.file.originalname : 'NO FILE');
        console.log('Body:', req.body);
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        logger_1.logger.info('Uploading employees', { filename: req.file.originalname, size: req.file.size });
        const employees = (0, excelParser_1.parseEmployeeExcel)(req.file.buffer);
        if (employees.length === 0) {
            console.error('No valid employees found in file');
            return res.status(400).json({ error: 'No valid employee records found in file' });
        }
        console.log(`Parsed ${employees.length} employees from Excel`);
        console.log('⚡ Using optimized bulk upload for large dataset...');
        // Use optimized service for large datasets
        const result = employees.length > 5000
            ? await bulkService.bulkInsertEmployeesOptimized(employees)
            : await dataService.bulkInsertEmployees(employees);
        const message = result.duration
            ? `${result.count} employees uploaded in ${result.duration.toFixed(1)}s (${Math.round(result.count / result.duration)}/sec)`
            : 'Employees uploaded successfully';
        logger_1.logger.info('Employees uploaded successfully', result);
        // Clean up: reset is_new_joiner=false for employees with old joining dates
        // (catches any records wrongly flagged during previous uploads)
        try {
            const cleanup = await database_1.default.query(`
        UPDATE employees
        SET is_new_joiner = false
        WHERE is_new_joiner = true
          AND joining_date IS NOT NULL
          AND joining_date < CURRENT_DATE - INTERVAL '90 days'
      `);
            if (cleanup.rowCount && cleanup.rowCount > 0) {
                logger_1.logger.info(`Reset is_new_joiner=false for ${cleanup.rowCount} employees with old joining dates`);
            }
        }
        catch (cleanupErr) {
            logger_1.logger.warn('Could not run new joiner cleanup', cleanupErr);
        }
        // Recalculate reportee_count for all PMs based on actual current_pm_id assignments
        try {
            const recalc = await database_1.default.query(`
        UPDATE people_managers pm
        SET reportee_count = (
          SELECT COUNT(*)
          FROM employees e
          WHERE e.current_pm_id = pm.employee_id
            AND e.status = 'active'
        )
      `);
            logger_1.logger.info(`Recalculated reportee_count for ${recalc.rowCount} PMs after employee upload`);
            console.log(`✅ Reportee counts recalculated for ${recalc.rowCount} PMs`);
        }
        catch (recalcErr) {
            logger_1.logger.warn('Could not recalculate reportee counts', recalcErr);
        }
        const discrepancy_summary = await generateDiscrepancySnapshot('employees_upload');
        res.json({ message, ...result, discrepancy_summary });
    }
    catch (error) {
        logger_1.logger.error('Error uploading employees', error);
        console.error('Upload error details:', error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadEmployees = uploadEmployees;
const uploadNewJoiners = async (req, res) => {
    try {
        console.log('Upload new joiners request received');
        console.log('File:', req.file ? req.file.originalname : 'NO FILE');
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        logger_1.logger.info('Uploading new joiners', { filename: req.file.originalname, size: req.file.size });
        const employees = (0, excelParser_1.parseEmployeeExcel)(req.file.buffer).map(emp => ({
            ...emp,
            is_new_joiner: true,
            current_pm_id: undefined,
        }));
        if (employees.length === 0) {
            console.error('No valid employees found in file');
            return res.status(400).json({ error: 'No valid employee records found in file' });
        }
        console.log(`Parsed ${employees.length} new joiners from Excel`);
        console.log('⚡ Using optimized bulk upload for large dataset...');
        const result = employees.length > 5000
            ? await bulkService.bulkInsertEmployeesOptimized(employees)
            : await dataService.bulkInsertEmployees(employees);
        const message = result.duration
            ? `${result.count} new joiners uploaded in ${result.duration.toFixed(1)}s (${Math.round(result.count / result.duration)}/sec)`
            : 'New joiners uploaded successfully';
        logger_1.logger.info('New joiners uploaded successfully', result);
        const discrepancy_summary = await generateDiscrepancySnapshot('new_joiners_upload');
        res.json({ message, ...result, discrepancy_summary });
    }
    catch (error) {
        logger_1.logger.error('Error uploading new joiners', error);
        console.error('Upload error details:', error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadNewJoiners = uploadNewJoiners;
const uploadPMs = async (req, res) => {
    try {
        console.log('Upload PMs request received');
        console.log('File:', req.file ? req.file.originalname : 'NO FILE');
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        logger_1.logger.info('Uploading PMs', { filename: req.file.originalname, size: req.file.size });
        const pms = (0, excelParser_1.parsePMExcel)(req.file.buffer);
        if (pms.length === 0) {
            const detectedColumns = (0, excelParser_1.getFileHeaders)(req.file.buffer);
            const colList = detectedColumns.length
                ? detectedColumns.join(', ')
                : '(none detected — file may be empty or unreadable)';
            console.error('No valid PMs found. Detected columns:', colList);
            return res.status(400).json({
                error: `No valid PM records found. The file must contain an Employee ID or GGID column. ` +
                    `Detected columns: ${colList}`,
                detectedColumns,
            });
        }
        console.log(`Parsed ${pms.length} PMs from Excel`);
        console.log('⚡ Using optimized bulk upload for large dataset...');
        // Use optimized service for large datasets (300K+ records)
        const result = pms.length > 5000
            ? await bulkService.bulkInsertPMsOptimized(pms)
            : await dataService.bulkInsertPMs(pms);
        const message = result.duration
            ? `${result.count} PMs uploaded in ${result.duration.toFixed(1)}s (${Math.round(result.count / result.duration)}/sec)`
            : 'People Managers uploaded successfully';
        // Recalculate reportee_count for all PMs from actual employee current_pm_id assignments.
        // This ensures counts are always accurate regardless of upload order.
        try {
            const recalc = await database_1.default.query(`
        UPDATE people_managers pm
        SET reportee_count = (
          SELECT COUNT(*)
          FROM employees e
          WHERE e.current_pm_id = pm.employee_id
            AND e.status = 'active'
        )
      `);
            console.log(`\u2705 Reportee counts recalculated for ${recalc.rowCount} PMs after PM upload`);
        }
        catch (recalcErr) {
            logger_1.logger.warn('Could not recalculate reportee counts after PM upload', recalcErr);
        }
        const discrepancy_summary = await generateDiscrepancySnapshot('pms_upload');
        res.json({ message, ...result, discrepancy_summary });
    }
    catch (error) {
        logger_1.logger.error('Error uploading PMs', error);
        console.error('Upload error details:', error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadPMs = uploadPMs;
const uploadSeparations = async (req, res) => {
    try {
        console.log('Upload separations request received');
        console.log('File:', req.file ? req.file.originalname : 'NO FILE');
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        logger_1.logger.info('Uploading separations', { filename: req.file.originalname, size: req.file.size });
        const separations = (0, excelParser_1.parseSeparationExcel)(req.file.buffer);
        if (separations.length === 0) {
            console.error('No valid separations found in file');
            return res.status(400).json({ error: 'No valid separation records found in file. Ensure the file has: Global Id (PM GGID), Updated Last Working Date columns.' });
        }
        console.log(`Parsed ${separations.length} separations from Excel`);
        console.log('⚡ Using optimized bulk upload (all-records mode)...');
        // Use optimized service for large datasets (16K+), standard for small
        const result = separations.length > 1000
            ? await bulkService.bulkInsertSeparationsOptimized(separations)
            : await dataService.bulkInsertSeparations(separations);
        const breakdown = result.pm_separations !== undefined
            ? ` (${result.pm_separations} PMs, ${result.employee_separations} employees, ${result.unmatched} unmatched)`
            : '';
        const message = result.duration
            ? `${result.count} separations uploaded in ${result.duration.toFixed(1)}s${breakdown}.`
            : (result.message || 'Separation reports uploaded successfully');
        const discrepancy_summary = await generateDiscrepancySnapshot('separations_upload');
        res.json({ message, ...result, discrepancy_summary });
    }
    catch (error) {
        logger_1.logger.error('Error uploading separations', error);
        console.error('Upload error details:', error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadSeparations = uploadSeparations;
// ============================================
// Internal helper: detect same-grade exceptions
// ============================================
const detectSameGradeExceptions = async () => {
    // Mark existing open same-grade exceptions as resolved for employees no longer in violation
    await database_1.default.query(`
    UPDATE exceptions SET status = 'resolved'
    WHERE exception_type = 'SAME_GRADE_REPORTEE' AND status = 'open'
      AND employee_id NOT IN (
        SELECT e.employee_id FROM employees e
        JOIN people_managers pm ON e.current_pm_id = pm.employee_id
        WHERE e.status = 'active' AND e.grade IS NOT NULL AND pm.grade IS NOT NULL AND e.grade = pm.grade
      )
  `);
    const result = await database_1.default.query(`
    INSERT INTO exceptions (employee_id, exception_type, description, status)
    SELECT e.employee_id,
           'SAME_GRADE_REPORTEE',
           'Employee grade ' || COALESCE(e.grade,'?') || ' equals PM grade ' || COALESCE(pm.grade,'?'),
           'open'
    FROM employees e
    JOIN people_managers pm ON e.current_pm_id = pm.employee_id
    WHERE e.status = 'active'
      AND e.grade IS NOT NULL
      AND pm.grade IS NOT NULL
      AND e.grade = pm.grade
    ON CONFLICT (employee_id, exception_type) WHERE status = 'open'
    DO UPDATE SET description = EXCLUDED.description
  `);
    return result.rowCount ?? 0;
};
const recalcReporteeCounts = async () => {
    await database_1.default.query(`
    UPDATE people_managers pm
    SET reportee_count = (
      SELECT COUNT(*) FROM employees e
      WHERE e.current_pm_id = pm.employee_id AND e.status = 'active'
    )
  `);
};
// ============================================
// GAD Report Upload
// ============================================
const uploadGAD = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        logger_1.logger.info('Uploading GAD report', { filename: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
        console.log(`[uploadGAD] file="${req.file.originalname}" mime="${req.file.mimetype}" size=${req.file.size}`);
        const practiceFilter = (req.body?.practice || '').trim();
        const allEmployees = (0, excelParser_1.parseGADExcel)(req.file.buffer);
        if (allEmployees.length === 0) {
            return res.status(400).json({ error: 'No valid employee records found in GAD file.' });
        }
        // Show distinct practice values found in the file — always useful for debugging
        const distinctPractices = [...new Set(allEmployees.map(e => e.practice).filter(Boolean))].sort();
        console.log(`[uploadGAD] Distinct practice values in file (${allEmployees.length} rows):`, distinctPractices);
        // Filter to selected practice when provided; process all if not specified
        const employees = practiceFilter
            ? allEmployees.filter(e => (e.practice || '').toLowerCase().trim() === practiceFilter.toLowerCase().trim())
            : allEmployees;
        if (practiceFilter && employees.length === 0) {
            return res.status(400).json({
                error: `No employees found for practice "${practiceFilter}" in this file. ` +
                    `File contains ${allEmployees.length} records. ` +
                    `Practices found: ${distinctPractices.join(', ') || '(none parsed — check column names)'}`,
                total_in_file: allEmployees.length,
                practices_in_file: distinctPractices,
            });
        }
        logger_1.logger.info(`GAD: ${allEmployees.length} total rows, ${employees.length} for practice "${practiceFilter || 'ALL'}"`);
        // ── Step 1: Extract PMs from GAD and upsert them FIRST ──────────────────────
        // GAD rows contain People Manager ID + name + grade inline.
        // We must insert them into people_managers before employees to satisfy the FK.
        const allPMs = (0, excelParser_1.extractPMsFromGAD)(req.file.buffer);
        // Filter to matching practice PMs when a practice filter is active
        const pmsToInsert = practiceFilter
            ? allPMs.filter(pm => (pm.practice || '').toLowerCase().trim() === practiceFilter.toLowerCase().trim())
            : allPMs;
        if (pmsToInsert.length > 0) {
            const pmResult = pmsToInsert.length > 1000
                ? await bulkService.bulkInsertPMsOptimized(pmsToInsert)
                : await dataService.bulkInsertPMs(pmsToInsert);
            logger_1.logger.info(`GAD PM upsert: ${pmResult.count ?? pmsToInsert.length} PMs upserted from GAD`);
            console.log(`[uploadGAD] Step 1 complete — ${pmResult.count ?? pmsToInsert.length} PMs upserted`);
        }
        else {
            console.log('[uploadGAD] No PM data found in GAD file — skipping PM upsert');
        }
        // ── Step 2: Validate PM IDs — null out any that still aren't in people_managers ──
        // This covers employees whose PM is from a different practice not yet uploaded,
        // or PM IDs in the file that don't have a matching PM record.
        const allPmIdsNeeded = [...new Set(employees.map(e => e.current_pm_id).filter(Boolean))];
        let validPmIdSet = new Set();
        if (allPmIdsNeeded.length > 0) {
            const { rows } = await database_1.default.query('SELECT employee_id FROM people_managers WHERE employee_id = ANY($1::text[])', [allPmIdsNeeded]);
            validPmIdSet = new Set(rows.map((r) => r.employee_id));
            const nulledCount = allPmIdsNeeded.length - validPmIdSet.size;
            if (nulledCount > 0) {
                console.log(`⚠️  ${nulledCount} PM ID(s) not in people_managers — current_pm_id set to NULL for those employees`);
            }
        }
        const safeEmployees = employees.map(e => ({
            ...e,
            current_pm_id: e.current_pm_id && validPmIdSet.has(e.current_pm_id) ? e.current_pm_id : undefined,
        }));
        // ── Step 3: Insert employees (FK now satisfied) ───────────────────────────────
        const result = safeEmployees.length > 5000
            ? await bulkService.bulkInsertEmployeesOptimized(safeEmployees)
            : await dataService.bulkInsertEmployees(safeEmployees);
        // Auto-promote C1+ employees with ≥ 1yr tenure as PMs
        await dataService.autoGeneratePMs(false);
        await recalcReporteeCounts();
        const sameGradeCount = await detectSameGradeExceptions();
        const newJoiners = employees.filter(e => e.is_new_joiner).length;
        const practiceLabel = practiceFilter ? ` · Practice: ${practiceFilter}` : '';
        logger_1.logger.info('GAD upload complete', { employees: result.count ?? result, newJoiners, sameGradeExceptions: sameGradeCount, practice: practiceFilter || 'ALL' });
        const discrepancy_summary = await generateDiscrepancySnapshot('gad_upload');
        res.json({
            message: `GAD report processed: ${result.count ?? result} employees, ${newJoiners} new joiners${practiceLabel}`,
            employees: result.count ?? result,
            new_joiners: newJoiners,
            same_grade_exceptions: sameGradeCount,
            practice_filter: practiceFilter || null,
            total_in_file: allEmployees.length,
            discrepancy_summary,
        });
    }
    catch (error) {
        logger_1.logger.error('Error uploading GAD report', error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadGAD = uploadGAD;
// ============================================
// Bench Report Upload
// ============================================
const uploadBenchReport = async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ error: 'No file uploaded' });
        logger_1.logger.info('Uploading Bench report', { filename: req.file.originalname, size: req.file.size });
        const practiceFilter = (req.body?.practice || '').trim();
        const allEmployees = (0, excelParser_1.parseEmployeeExcel)(req.file.buffer); // upload_source='bench'
        if (allEmployees.length === 0) {
            return res.status(400).json({ error: 'No valid employee records found in Bench file.' });
        }
        // Filter to selected practice when provided; process all if not specified
        const employees = practiceFilter
            ? allEmployees.filter(e => (e.practice || '').toLowerCase().trim() === practiceFilter.toLowerCase().trim())
            : allEmployees;
        if (practiceFilter && employees.length === 0) {
            return res.status(400).json({
                error: `No employees found for practice "${practiceFilter}" in this file. ` +
                    `File contains ${allEmployees.length} records across other practices.`,
                total_in_file: allEmployees.length,
            });
        }
        logger_1.logger.info(`Bench: ${allEmployees.length} total rows, ${employees.length} for practice "${practiceFilter || 'ALL'}"`);
        const result = employees.length > 5000
            ? await bulkService.bulkInsertEmployeesOptimized(employees)
            : await dataService.bulkInsertEmployees(employees);
        // Detect PM_ON_LEAVE: PMs with leave > 30 days
        const longLeaveResult = await database_1.default.query(`
      INSERT INTO exceptions (employee_id, exception_type, description, status)
      SELECT pm.employee_id,
             'PM_ON_LEAVE',
             'PM on leave from ' || COALESCE(pm.leave_start_date::text,'?') || ' to ' || COALESCE(pm.leave_end_date::text,'?'),
             'open'
      FROM people_managers pm
      WHERE pm.leave_start_date IS NOT NULL
        AND pm.leave_end_date IS NOT NULL
        AND (pm.leave_end_date - pm.leave_start_date) > 30
      ON CONFLICT (employee_id, exception_type) WHERE status = 'open'
      DO UPDATE SET description = EXCLUDED.description
    `);
        await recalcReporteeCounts();
        const practiceLabel = practiceFilter ? ` · Practice: ${practiceFilter}` : '';
        logger_1.logger.info('Bench upload complete', { employees: result.count ?? result, onLeave: longLeaveResult.rowCount, practice: practiceFilter || 'ALL' });
        const discrepancy_summary = await generateDiscrepancySnapshot('bench_upload');
        res.json({
            message: `Bench report processed: ${result.count ?? result} employees${practiceLabel}`,
            employees: result.count ?? result,
            pm_on_leave_exceptions: longLeaveResult.rowCount ?? 0,
            practice_filter: practiceFilter || null,
            total_in_file: allEmployees.length,
            discrepancy_summary,
        });
    }
    catch (error) {
        logger_1.logger.error('Error uploading Bench report', error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadBenchReport = uploadBenchReport;
const uploadSkillReport = async (req, res) => {
    try {
        console.log('Upload skill report request received');
        console.log('File:', req.file ? req.file.originalname : 'NO FILE');
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        logger_1.logger.info('Uploading skill report', { filename: req.file.originalname, size: req.file.size });
        const skills = (0, excelParser_1.parseSkillReportExcel)(req.file.buffer);
        if (skills.length === 0) {
            const sheetHeaders = (0, excelParser_1.getSkillReportHeaders)(req.file.buffer);
            console.error('No valid skills found. Sheet headers detected:', sheetHeaders);
            return res.status(400).json({
                error: 'No valid skill records found in file. Could not detect a Skill column in any sheet.',
                detectedSheets: sheetHeaders,
                hint: 'Check the detectedSheets field to see sheet names and their headers. Ensure one sheet has a column named: Primary Skill, Final Updated Primary Skills, Skill Group, or R2D2 - Primary Skill'
            });
        }
        console.log(`Parsed ${skills.length} skills from Excel`);
        const result = await dataService.bulkInsertSkills(skills);
        const message = `${result.count} rows parsed → ${result.unique ?? result.count} unique skills upserted into repository`;
        console.log(message);
        res.json({ message, ...result });
    }
    catch (error) {
        logger_1.logger.error('Error uploading skill report', error);
        console.error('Upload error details:', error);
        res.status(500).json({ error: error.message });
    }
};
exports.uploadSkillReport = uploadSkillReport;
const findPMForEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const empResult = await database_1.default.query('SELECT * FROM employees WHERE employee_id = $1', [employeeId]);
        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        const matches = await matchingService.findBestPM(empResult.rows[0]);
        res.json({ employee: empResult.rows[0], matches });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.findPMForEmployee = findPMForEmployee;
const assignPMToEmployee = async (req, res) => {
    try {
        const { employeeId, pmId, assignmentType, score } = req.body;
        if (!employeeId || !pmId || !assignmentType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!['new_joiner', 'reassignment'].includes(assignmentType)) {
            return res.status(400).json({ error: 'Invalid assignment type' });
        }
        const assignmentId = await matchingService.assignPM(employeeId, pmId, assignmentType, score);
        res.json({ message: 'PM assignment created', assignmentId });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.assignPMToEmployee = assignPMToEmployee;
const getNewJoiners = async (req, res) => {
    try {
        const result = await database_1.default.query(`SELECT * FROM employees
       WHERE is_new_joiner = true
         AND current_pm_id IS NULL
         AND is_frozen = false
         AND (joining_date IS NULL OR joining_date >= CURRENT_DATE - INTERVAL '90 days')
       ORDER BY joining_date DESC`);
        res.json(result.rows);
    }
    catch (error) {
        logger_1.logger.error('Error fetching new joiners', error);
        res.status(500).json({ error: error.message || 'Database error' });
    }
};
exports.getNewJoiners = getNewJoiners;
// Get new joiners with pagination
const getNewJoinersList = async (req, res) => {
    try {
        const { practice, cu, region, page = '1', pageSize = '50' } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        let query = `
      SELECT * FROM employees
      WHERE is_new_joiner = true
        AND current_pm_id IS NULL
        AND is_frozen = false
        AND status = 'active'
        AND (joining_date IS NULL OR joining_date >= CURRENT_DATE - INTERVAL '90 days')
    `;
        let countQuery = `
      SELECT COUNT(*) FROM employees
      WHERE is_new_joiner = true
        AND current_pm_id IS NULL
        AND is_frozen = false
        AND status = 'active'
        AND (joining_date IS NULL OR joining_date >= CURRENT_DATE - INTERVAL '90 days')
    `;
        const params = [];
        let paramIndex = 1;
        if (practice) {
            query += ` AND practice = $${paramIndex}`;
            countQuery += ` AND practice = $${paramIndex}`;
            params.push(practice);
            paramIndex++;
        }
        if (cu) {
            query += ` AND cu = $${paramIndex}`;
            countQuery += ` AND cu = $${paramIndex}`;
            params.push(cu);
            paramIndex++;
        }
        if (region) {
            query += ` AND region = $${paramIndex}`;
            countQuery += ` AND region = $${paramIndex}`;
            params.push(region);
            paramIndex++;
        }
        const countResult = await database_1.default.query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].count);
        query += ` ORDER BY joining_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(pageSizeNum, offset);
        const result = await database_1.default.query(query, params);
        res.json({
            data: result.rows,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSizeNum)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching new joiners list', error);
        res.status(500).json({ error: error.message || 'Database error' });
    }
};
exports.getNewJoinersList = getNewJoinersList;
// Get all employees (Bench/GAD list)
const getAllEmployees = async (req, res) => {
    try {
        const { status, practice, cu, region, page = '1', pageSize = '50' } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        let query = 'SELECT e.*, pm.name as pm_name FROM employees e LEFT JOIN people_managers pm ON e.current_pm_id = pm.employee_id WHERE 1=1';
        let countQuery = 'SELECT COUNT(*) FROM employees e WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (status) {
            query += ` AND e.status = $${paramIndex}`;
            countQuery += ` AND e.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (practice) {
            query += ` AND e.practice = $${paramIndex}`;
            countQuery += ` AND e.practice = $${paramIndex}`;
            params.push(practice);
            paramIndex++;
        }
        if (cu) {
            query += ` AND e.cu = $${paramIndex}`;
            countQuery += ` AND e.cu = $${paramIndex}`;
            params.push(cu);
            paramIndex++;
        }
        if (region) {
            query += ` AND e.region = $${paramIndex}`;
            countQuery += ` AND e.region = $${paramIndex}`;
            params.push(region);
            paramIndex++;
        }
        // Get total count for pagination
        const countResult = await database_1.default.query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].count);
        query += ` ORDER BY e.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(pageSizeNum, offset);
        const result = await database_1.default.query(query, params);
        res.json({
            data: result.rows,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSizeNum)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching employees', error);
        res.status(500).json({ error: error.message || 'Database error' });
    }
};
exports.getAllEmployees = getAllEmployees;
// Get all PMs list
const getAllPMs = async (req, res) => {
    try {
        const { is_active, practice, cu, region, grade, skill, view_filter, page = '1', pageSize = '50' } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        let query = `
      SELECT pm.*,
             ROUND((pm.reportee_count::numeric / NULLIF(pm.max_capacity, 0)) * 100)::int AS utilization,
             sr.lwd AS separation_lwd,
             sr.status AS separation_status,
             sr.reason AS separation_reason
      FROM people_managers pm
      LEFT JOIN separation_reports sr ON pm.employee_id = sr.employee_id
      WHERE pm.grade = ANY(ARRAY['C1','C2','D1','D2','D3','E1','E2'])`;
        let countQuery = `SELECT COUNT(*) FROM people_managers pm WHERE pm.grade = ANY(ARRAY['C1','C2','D1','D2','D3','E1','E2'])`;
        const params = [];
        let paramIndex = 1;
        if (is_active !== undefined) {
            query += ` AND pm.is_active = $${paramIndex}`;
            countQuery += ` AND pm.is_active = $${paramIndex}`;
            params.push(is_active === 'true');
            paramIndex++;
        }
        if (practice) {
            query += ` AND pm.practice = $${paramIndex}`;
            countQuery += ` AND pm.practice = $${paramIndex}`;
            params.push(practice);
            paramIndex++;
        }
        if (cu) {
            query += ` AND pm.cu = $${paramIndex}`;
            countQuery += ` AND pm.cu = $${paramIndex}`;
            params.push(cu);
            paramIndex++;
        }
        if (region) {
            query += ` AND pm.region = $${paramIndex}`;
            countQuery += ` AND pm.region = $${paramIndex}`;
            params.push(region);
            paramIndex++;
        }
        if (grade) {
            query += ` AND pm.grade ILIKE $${paramIndex}`;
            countQuery += ` AND pm.grade ILIKE $${paramIndex}`;
            params.push(`%${grade}%`);
            paramIndex++;
        }
        if (skill) {
            query += ` AND pm.skill ILIKE $${paramIndex}`;
            countQuery += ` AND pm.skill ILIKE $${paramIndex}`;
            params.push(`%${skill}%`);
            paramIndex++;
        }
        // Quick-view filters from stat card clicks
        if (view_filter === 'allocated') {
            query += ` AND pm.reportee_count > 0`;
            countQuery += ` AND pm.reportee_count > 0`;
        }
        else if (view_filter === 'unallocated') {
            query += ` AND pm.reportee_count = 0`;
            countQuery += ` AND pm.reportee_count = 0`;
        }
        else if (view_filter === 'incorrect') {
            // PMs who have at least one employee whose practice or skill doesn't match the PM
            const incorrectSubquery = `
        AND EXISTS (
          SELECT 1 FROM employees e
          WHERE e.current_pm_id = pm.employee_id
            AND e.status = 'active'
            AND (
              e.practice IS DISTINCT FROM pm.practice
              OR (e.skill IS NOT NULL AND pm.skill IS NOT NULL AND e.skill IS DISTINCT FROM pm.skill)
            )
        )`;
            query += incorrectSubquery;
            countQuery += incorrectSubquery;
        }
        // Get total count for pagination
        const countResult = await database_1.default.query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].count);
        query += ` ORDER BY pm.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(pageSizeNum, offset);
        const result = await database_1.default.query(query, params);
        res.json({
            data: result.rows,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSizeNum)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching PMs', error);
        res.status(500).json({ error: error.message || 'Database error' });
    }
};
exports.getAllPMs = getAllPMs;
// Get all separation reports
const getAllSeparations = async (req, res) => {
    try {
        const { status, grade, skill, practice, cu, region, person_type, page = '1', pageSize = '50' } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        let query = `
      SELECT
        sr.*,
        -- Name: stored person_name first, fall back to PM/Employee name
        COALESCE(sr.person_name, pm.name, emp.name)  AS display_name,
        -- Grade: employees/pm tables have clean grades (VARCHAR 10 e.g. 'B1'), sr.grade may be raw ('B', 'B1 - Senior')
        UPPER(COALESCE(
          NULLIF(SUBSTRING(UPPER(COALESCE(emp.grade, '')) FROM '[A-E][0-9]+'), ''),
          NULLIF(SUBSTRING(UPPER(COALESCE(pm.grade,  '')) FROM '[A-E][0-9]+'), ''),
          NULLIF(SUBSTRING(UPPER(COALESCE(sr.grade,  '')) FROM '[A-E][0-9]+'), ''),
          UPPER(TRIM(COALESCE(sr.grade, '')))
        ))                                           AS display_grade,
        COALESCE(sr.designation, pm.skill)           AS display_designation,
        pm.name                                      AS pm_name,
        COALESCE(pm.email, emp.email)                AS email,
        pm.practice                                  AS pm_practice,
        pm.cu,
        pm.region,
        pm.reportee_count,
        pm.skill                                     AS primary_skill
      FROM separation_reports sr
      LEFT JOIN people_managers pm  ON sr.employee_id = pm.employee_id
      LEFT JOIN employees     emp ON sr.employee_id = emp.employee_id
      WHERE 1=1
    `;
        let countQuery = `
      SELECT COUNT(*)
      FROM separation_reports sr
      LEFT JOIN people_managers pm  ON sr.employee_id = pm.employee_id
      LEFT JOIN employees     emp ON sr.employee_id = emp.employee_id
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (status) {
            query += ` AND sr.status = $${paramIndex}`;
            countQuery += ` AND sr.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (grade) {
            // Match against the same normalized grade expression used in SELECT
            const gradeExpr = `UPPER(COALESCE(
        NULLIF(SUBSTRING(UPPER(COALESCE(emp.grade, '')) FROM '[A-E][0-9]+'), ''),
        NULLIF(SUBSTRING(UPPER(COALESCE(pm.grade,  '')) FROM '[A-E][0-9]+'), ''),
        NULLIF(SUBSTRING(UPPER(COALESCE(sr.grade,  '')) FROM '[A-E][0-9]+'), ''),
        UPPER(TRIM(COALESCE(sr.grade, '')))
      ))`;
            query += ` AND ${gradeExpr} = UPPER($${paramIndex})`;
            countQuery += ` AND ${gradeExpr} = UPPER($${paramIndex})`;
            params.push(grade);
            paramIndex++;
        }
        if (skill) {
            query += ` AND pm.skill ILIKE $${paramIndex}`;
            countQuery += ` AND pm.skill ILIKE $${paramIndex}`;
            params.push(`%${skill}%`);
            paramIndex++;
        }
        if (practice) {
            query += ` AND pm.practice = $${paramIndex}`;
            countQuery += ` AND pm.practice = $${paramIndex}`;
            params.push(practice);
            paramIndex++;
        }
        if (cu) {
            query += ` AND pm.cu = $${paramIndex}`;
            countQuery += ` AND pm.cu = $${paramIndex}`;
            params.push(cu);
            paramIndex++;
        }
        if (region) {
            query += ` AND pm.region = $${paramIndex}`;
            countQuery += ` AND pm.region = $${paramIndex}`;
            params.push(region);
            paramIndex++;
        }
        if (person_type) {
            query += ` AND sr.person_type = $${paramIndex}`;
            countQuery += ` AND sr.person_type = $${paramIndex}`;
            params.push(person_type);
            paramIndex++;
        }
        // Get total count for pagination
        const countResult = await database_1.default.query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].count);
        query += ` ORDER BY sr.lwd ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(pageSizeNum, offset);
        const result = await database_1.default.query(query, params);
        res.json({
            data: result.rows,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalRecords,
                totalPages: Math.ceil(totalRecords / pageSizeNum)
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching separations', error);
        res.status(500).json({ error: error.message || 'Database error' });
    }
};
exports.getAllSeparations = getAllSeparations;
const getPendingAssignments = async (req, res) => {
    try {
        const result = await database_1.default.query(`SELECT pa.*, e.name as employee_name, pm.name as pm_name 
       FROM pm_assignments pa
       JOIN employees e ON pa.employee_id = e.employee_id
       JOIN people_managers pm ON pa.new_pm_id = pm.employee_id
       WHERE pa.status = 'pending'
       ORDER BY pa.created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        logger_1.logger.error('Error fetching pending assignments', error);
        res.status(500).json({ error: error.message || 'Database error' });
    }
};
exports.getPendingAssignments = getPendingAssignments;
const getDashboardStats = async (req, res) => {
    try {
        const stats = await statsService.getDashboardStats();
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error fetching dashboard stats', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getDashboardStats = getDashboardStats;
const getPMCapacityReport = async (req, res) => {
    try {
        const report = await statsService.getPMCapacityReport();
        res.json(report);
    }
    catch (error) {
        logger_1.logger.error('Error fetching PM capacity report', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getPMCapacityReport = getPMCapacityReport;
const getPMReportSummary = async (req, res) => {
    try {
        const summary = await statsService.getPMReportSummary({
            is_active: req.query.is_active,
            practice: req.query.practice,
            cu: req.query.cu,
            region: req.query.region,
            grade: req.query.grade,
            skill: req.query.skill,
        });
        res.json(summary);
    }
    catch (error) {
        logger_1.logger.error('Error fetching PM report summary', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getPMReportSummary = getPMReportSummary;
const checkDatabaseHealth = async (req, res) => {
    try {
        await database_1.default.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    }
    catch (error) {
        logger_1.logger.error('Database health check failed', error);
        res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
};
exports.checkDatabaseHealth = checkDatabaseHealth;
// Get detailed report for a single PM: their info, reportees, separation, pending assignments
const getPMDetailReport = async (req, res) => {
    try {
        const { pmId } = req.params;
        // PM details
        const pmResult = await database_1.default.query('SELECT * FROM people_managers WHERE employee_id = $1', [pmId]);
        if (pmResult.rows.length === 0) {
            return res.status(404).json({ error: 'PM not found' });
        }
        const pm = pmResult.rows[0];
        // All active reportees currently assigned to this PM
        const reporteesResult = await database_1.default.query(`SELECT employee_id, name, email, practice, cu, region, grade, skill, account, joining_date, is_new_joiner, status
       FROM employees
       WHERE current_pm_id = $1 AND status = 'active'
       ORDER BY name ASC`, [pmId]);
        // Separation record for this PM (if they are leaving)
        const separationResult = await database_1.default.query(`SELECT * FROM separation_reports WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 1`, [pmId]);
        // Pending assignments where this PM is the target (new_pm_id)
        const assignmentsResult = await database_1.default.query(`SELECT pa.id, pa.employee_id, pa.assignment_type, pa.match_score, pa.status, pa.created_at,
              e.name as employee_name, e.grade as employee_grade, e.skill as employee_skill, e.practice as employee_practice
       FROM pm_assignments pa
       JOIN employees e ON pa.employee_id = e.employee_id
       WHERE pa.new_pm_id = $1 AND pa.status = 'pending'
       ORDER BY pa.created_at DESC`, [pmId]);
        // Grade distribution among reportees
        const gradeDistResult = await database_1.default.query(`SELECT grade, COUNT(*) as count
       FROM employees
       WHERE current_pm_id = $1 AND status = 'active'
       GROUP BY grade
       ORDER BY grade`, [pmId]);
        // Practice distribution among reportees
        const practiceDistResult = await database_1.default.query(`SELECT practice, COUNT(*) as count
       FROM employees
       WHERE current_pm_id = $1 AND status = 'active'
       GROUP BY practice
       ORDER BY count DESC`, [pmId]);
        const utilization = pm.max_capacity > 0
            ? Math.round((pm.reportee_count / pm.max_capacity) * 100)
            : 0;
        res.json({
            pm,
            utilization,
            reportees: reporteesResult.rows,
            separation: separationResult.rows[0] || null,
            pendingAssignments: assignmentsResult.rows,
            gradeDistribution: gradeDistResult.rows,
            practiceDistribution: practiceDistResult.rows,
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching PM detail report', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getPMDetailReport = getPMDetailReport;
const approvalService_1 = require("../services/approvalService");
const notificationService_1 = require("../services/notificationService");
const reassignmentService_1 = require("../services/reassignmentService");
const approvalService = new approvalService_1.ApprovalService();
const notificationService = new notificationService_1.NotificationService();
const reassignmentService = new reassignmentService_1.ReassignmentService();
const approveAssignment = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { comments } = req.body;
        const workflow = await approvalService.approveStep(parseInt(workflowId), comments);
        res.json({ message: 'Assignment approved', workflow });
    }
    catch (error) {
        logger_1.logger.error('Error approving assignment', error);
        res.status(500).json({ error: error.message });
    }
};
exports.approveAssignment = approveAssignment;
const rejectAssignment = async (req, res) => {
    try {
        const { workflowId } = req.params;
        const { comments } = req.body;
        if (!comments) {
            return res.status(400).json({ error: 'Comments required for rejection' });
        }
        await approvalService.rejectStep(parseInt(workflowId), comments);
        res.json({ message: 'Assignment rejected' });
    }
    catch (error) {
        logger_1.logger.error('Error rejecting assignment', error);
        res.status(500).json({ error: error.message });
    }
};
exports.rejectAssignment = rejectAssignment;
const getApprovalWorkflow = async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const workflows = await approvalService.getWorkflowsByAssignment(parseInt(assignmentId));
        res.json(workflows);
    }
    catch (error) {
        logger_1.logger.error('Error fetching workflow', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getApprovalWorkflow = getApprovalWorkflow;
const triggerLWDCheck = async (req, res) => {
    try {
        await reassignmentService.checkLWDAlerts();
        res.json({ message: 'LWD check completed' });
    }
    catch (error) {
        logger_1.logger.error('Error in LWD check', error);
        res.status(500).json({ error: error.message });
    }
};
exports.triggerLWDCheck = triggerLWDCheck;
const getExceptions = async (req, res) => {
    try {
        const result = await database_1.default.query(`SELECT e.*, emp.name as employee_name 
       FROM exceptions e
       JOIN employees emp ON e.employee_id = emp.employee_id
       WHERE e.status = 'open'
       ORDER BY e.created_at DESC`);
        res.json(result.rows);
    }
    catch (error) {
        logger_1.logger.error('Error fetching exceptions', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getExceptions = getExceptions;
const resolveException = async (req, res) => {
    try {
        const { exceptionId } = req.params;
        await database_1.default.query(`UPDATE exceptions SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = $1`, [exceptionId]);
        res.json({ message: 'Exception resolved' });
    }
    catch (error) {
        logger_1.logger.error('Error resolving exception', error);
        res.status(500).json({ error: error.message });
    }
};
exports.resolveException = resolveException;
const getAssignmentTrends = async (req, res) => {
    try {
        const trends = await statsService.getAssignmentTrends();
        res.json(trends);
    }
    catch (error) {
        logger_1.logger.error('Error fetching assignment trends', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getAssignmentTrends = getAssignmentTrends;
const getPracticeDistribution = async (req, res) => {
    try {
        const distribution = await statsService.getPracticeDistribution();
        res.json(distribution);
    }
    catch (error) {
        logger_1.logger.error('Error fetching practice distribution', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getPracticeDistribution = getPracticeDistribution;
const getApprovalMetrics = async (req, res) => {
    try {
        const metrics = await statsService.getApprovalMetrics();
        res.json(metrics);
    }
    catch (error) {
        logger_1.logger.error('Error fetching approval metrics', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getApprovalMetrics = getApprovalMetrics;
const getGradeDistribution = async (req, res) => {
    try {
        const distribution = await statsService.getGradeDistribution();
        res.json(distribution);
    }
    catch (error) {
        logger_1.logger.error('Error fetching grade distribution', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getGradeDistribution = getGradeDistribution;
const getRegionStats = async (req, res) => {
    try {
        const stats = await statsService.getRegionStats();
        res.json(stats);
    }
    catch (error) {
        logger_1.logger.error('Error fetching region stats', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getRegionStats = getRegionStats;
// Get upload statistics summary
const getUploadStats = async (req, res) => {
    try {
        const result = await database_1.default.query(`
      SELECT 
        (SELECT COUNT(*) FROM employees WHERE status = 'active') as "totalEmployees",
        (SELECT COUNT(*) FROM people_managers WHERE is_active = true) as "activePMs",
        (SELECT COUNT(*) FROM separation_reports WHERE lwd >= CURRENT_DATE) as "pendingSeparations",
        (SELECT COUNT(*) FROM employees WHERE is_new_joiner = true AND current_pm_id IS NULL) as "newJoiners",
        (SELECT COUNT(*) FROM pm_assignments WHERE status = 'pending') as "pendingAssignments",
        (SELECT COUNT(*) FROM skill_repository) as "skillCount"
    `);
        res.json(result.rows[0]);
    }
    catch (error) {
        logger_1.logger.error('Error fetching upload stats', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getUploadStats = getUploadStats;
// Freeze or unfreeze an employee record (manual hold)
const setEmployeeFreeze = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { is_frozen } = req.body;
        if (typeof is_frozen !== 'boolean') {
            return res.status(400).json({ error: 'is_frozen must be boolean' });
        }
        const result = await database_1.default.query(`UPDATE employees SET is_frozen = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2 RETURNING employee_id, is_frozen`, [is_frozen, employeeId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ message: 'Employee freeze status updated', ...result.rows[0] });
    }
    catch (error) {
        logger_1.logger.error('Error updating employee freeze status', error);
        res.status(500).json({ error: error.message });
    }
};
exports.setEmployeeFreeze = setEmployeeFreeze;
// ============================================
// Phase 5: Enhanced Analytics Endpoints
// ============================================
const getSLACompliance = async (req, res) => {
    try {
        const compliance = await statsService.getSLACompliance();
        res.json(compliance);
    }
    catch (error) {
        logger_1.logger.error('Error fetching SLA compliance', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getSLACompliance = getSLACompliance;
const getExceptionQueue = async (req, res) => {
    try {
        const queue = await statsService.getExceptionQueue();
        res.json(queue);
    }
    catch (error) {
        logger_1.logger.error('Error fetching exception queue', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getExceptionQueue = getExceptionQueue;
const getPMCapacityHeatmap = async (req, res) => {
    try {
        const heatmap = await statsService.getPMCapacityHeatmap();
        res.json(heatmap);
    }
    catch (error) {
        logger_1.logger.error('Error fetching PM capacity heatmap', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getPMCapacityHeatmap = getPMCapacityHeatmap;
const getAssignmentStatus = async (req, res) => {
    try {
        const status = await statsService.getAssignmentStatus();
        res.json(status);
    }
    catch (error) {
        logger_1.logger.error('Error fetching assignment status', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getAssignmentStatus = getAssignmentStatus;
const getWorkflowEfficiency = async (req, res) => {
    try {
        const efficiency = await statsService.getWorkflowEfficiency();
        res.json(efficiency);
    }
    catch (error) {
        logger_1.logger.error('Error fetching workflow efficiency', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getWorkflowEfficiency = getWorkflowEfficiency;
const getMonthlyTrends = async (req, res) => {
    try {
        const trends = await statsService.getMonthlyTrends();
        res.json(trends);
    }
    catch (error) {
        logger_1.logger.error('Error fetching monthly trends', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getMonthlyTrends = getMonthlyTrends;
const getMatchingPerformance = async (req, res) => {
    try {
        const performance = await statsService.getMatchingPerformance();
        res.json(performance);
    }
    catch (error) {
        logger_1.logger.error('Error fetching matching performance', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getMatchingPerformance = getMatchingPerformance;
// ============================================
// Phase 5: Audit Trail Endpoints
// ============================================
const getAuditTrail = async (req, res) => {
    try {
        const { entityType, entityId, userId, limit } = req.query;
        let auditTrail;
        if (entityType && entityId) {
            auditTrail = await auditService.getAuditTrail(entityType, entityId, limit ? parseInt(limit) : 50);
        }
        else if (userId) {
            auditTrail = await auditService.getAuditTrailByUser(userId, limit ? parseInt(limit) : 50);
        }
        else {
            auditTrail = await auditService.getRecentAuditTrail(limit ? parseInt(limit) : 100);
        }
        res.json(auditTrail);
    }
    catch (error) {
        logger_1.logger.error('Error fetching audit trail', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getAuditTrail = getAuditTrail;
const getAuditStatistics = async (req, res) => {
    try {
        const { days } = req.query;
        const statistics = await auditService.getAuditStatistics(days ? parseInt(days) : 30);
        res.json(statistics);
    }
    catch (error) {
        logger_1.logger.error('Error fetching audit statistics', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getAuditStatistics = getAuditStatistics;
// ============================================
// Phase 3: Workflow Automation Endpoints
// ============================================
const triggerNewJoinerWorkflow = async (req, res) => {
    try {
        const result = await schedulerService_1.schedulerService.triggerNewJoinerWorkflow();
        res.json({ message: 'New joiner workflow triggered', result });
    }
    catch (error) {
        logger_1.logger.error('Error triggering new joiner workflow', error);
        res.status(500).json({ error: error.message });
    }
};
exports.triggerNewJoinerWorkflow = triggerNewJoinerWorkflow;
const triggerReassignmentWorkflow = async (req, res) => {
    try {
        const result = await schedulerService_1.schedulerService.triggerReassignmentWorkflow();
        res.json({ message: 'Reassignment workflow triggered', result });
    }
    catch (error) {
        logger_1.logger.error('Error triggering reassignment workflow', error);
        res.status(500).json({ error: error.message });
    }
};
exports.triggerReassignmentWorkflow = triggerReassignmentWorkflow;
const triggerMonthlyEngagement = async (req, res) => {
    try {
        const result = await schedulerService_1.schedulerService.triggerMonthlyEngagementWorkflow();
        res.json({ message: 'Monthly engagement workflow triggered', result });
    }
    catch (error) {
        logger_1.logger.error('Error triggering monthly engagement workflow', error);
        res.status(500).json({ error: error.message });
    }
};
exports.triggerMonthlyEngagement = triggerMonthlyEngagement;
// ============================================
// Practice Reports Endpoints
// ============================================
const generatePracticeReport = async (req, res) => {
    try {
        const filters = {
            practice: req.query.practice,
            cu: req.query.cu,
            region: req.query.region,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
        };
        logger_1.logger.info('Generating practice report', { filters });
        const report = await practiceReportService_1.practiceReportService.generatePracticeReport(filters);
        res.json({
            success: true,
            report,
        });
    }
    catch (error) {
        logger_1.logger.error('Error generating practice report', error);
        res.status(500).json({ error: error.message });
    }
};
exports.generatePracticeReport = generatePracticeReport;
const getPracticeFilters = async (req, res) => {
    try {
        const [practices, cus, regions] = await Promise.all([
            practiceReportService_1.practiceReportService.getPracticesList(),
            practiceReportService_1.practiceReportService.getCUsList(),
            practiceReportService_1.practiceReportService.getRegionsList(),
        ]);
        res.json({
            practices: ['All', ...practices],
            cus: ['All', ...cus],
            regions: ['All', ...regions],
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching practice filters', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getPracticeFilters = getPracticeFilters;
/* ─── Auto-Generate PM List from Employee Data ─────────────── */
const previewAutoGeneratePMs = async (req, res) => {
    try {
        const result = await dataService.autoGeneratePMs(true);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error previewing auto-generate PMs', error);
        res.status(500).json({ error: error.message });
    }
};
exports.previewAutoGeneratePMs = previewAutoGeneratePMs;
const confirmAutoGeneratePMs = async (req, res) => {
    try {
        const result = await dataService.autoGeneratePMs(false);
        res.json({
            message: `Auto-generated ${result.inserted} new PMs, updated ${result.updated} existing (${result.total} total eligible)`,
            ...result,
            count: result.total,
        });
    }
    catch (error) {
        logger_1.logger.error('Error confirming auto-generate PMs', error);
        res.status(500).json({ error: error.message });
    }
};
exports.confirmAutoGeneratePMs = confirmAutoGeneratePMs;
/* ─── Auto-Assign Employees to PMs ─────────────────────────── */
const previewAutoAssign = async (req, res) => {
    try {
        const result = await dataService.autoAssignEmployees(true);
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Error previewing auto-assign', error);
        res.status(500).json({ error: error.message });
    }
};
exports.previewAutoAssign = previewAutoAssign;
const confirmAutoAssign = async (req, res) => {
    try {
        const result = await dataService.autoAssignEmployees(false);
        res.json({
            message: `Assigned ${result.assigned} employees to PMs. ${result.unassigned} could not be matched (no eligible PM in their practice).`,
            ...result,
            count: result.assigned,
        });
    }
    catch (error) {
        logger_1.logger.error('Error confirming auto-assign', error);
        res.status(500).json({ error: error.message });
    }
};
exports.confirmAutoAssign = confirmAutoAssign;
// ============================================
// Configuration: Matching Weights
// ============================================
const getMatchingWeights = async (req, res) => {
    try {
        const result = await database_1.default.query("SELECT config_value FROM configuration WHERE config_key = 'matching_weights'");
        const weights = result.rows[0]?.config_value || {
            practice: 40, cu: 25, region: 15, account: 10, skill: 5, grade: 3, capacity: 2
        };
        res.json(weights);
    }
    catch (error) {
        logger_1.logger.error('Error fetching matching weights', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getMatchingWeights = getMatchingWeights;
const updateMatchingWeights = async (req, res) => {
    try {
        const weights = req.body;
        const allowedKeys = ['practice', 'cu', 'region', 'account', 'skill', 'grade', 'capacity'];
        for (const key of allowedKeys) {
            if (weights[key] !== undefined && (typeof weights[key] !== 'number' || weights[key] < 0 || weights[key] > 100)) {
                return res.status(400).json({ error: `Invalid value for ${key}: must be a number 0–100` });
            }
        }
        await database_1.default.query(`
      INSERT INTO configuration (config_key, config_value)
      VALUES ('matching_weights', $1::jsonb)
      ON CONFLICT (config_key) DO UPDATE SET config_value = $1::jsonb, updated_at = CURRENT_TIMESTAMP
    `, [JSON.stringify(weights)]);
        await auditService.log({
            action: 'config_updated',
            entityType: 'configuration',
            entityId: 'matching_weights',
            newValue: weights,
        });
        res.json({ message: 'Matching weights updated successfully', weights });
    }
    catch (error) {
        logger_1.logger.error('Error updating matching weights', error);
        res.status(500).json({ error: error.message });
    }
};
exports.updateMatchingWeights = updateMatchingWeights;
// ============================================
// Misalignment Detection
// ============================================
const getMisalignments = async (req, res) => {
    try {
        const { page = '1', pageSize = '50', type, practice } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        const typeFilter = type && type !== 'all' ? `AND mismatch_type = '${type.replace(/'/g, "''")}'` : '';
        const pf = practice && practice !== 'All' ? practice : null;
        const practiceClause = pf ? `AND e.practice = '${pf.replace(/'/g, "''")}'` : '';
        const countResult = await database_1.default.query(`
      WITH grade_order(grade, lvl) AS (
        VALUES ('A1',1),('A2',2),('A3',3),('A4',4),
               ('B1',5),('B2',6),('C1',7),('C2',8),
               ('D1',9),('D2',10),('E1',11),('E2',12)
      ),
      misaligned AS (
        SELECT e.employee_id,
          CASE
            WHEN pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE THEN 'PM_ON_LEAVE'
            WHEN EXISTS (
              SELECT 1 FROM separation_reports sr
              WHERE sr.employee_id = pm.employee_id
                AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
            ) THEN 'PM_SEPARATED'
            WHEN e.practice IS DISTINCT FROM pm.practice THEN 'WRONG_PRACTICE'
            WHEN e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                 AND e.sub_practice IS DISTINCT FROM pm.sub_practice THEN 'WRONG_SUB_PRACTICE'
            WHEN e.cu IS NOT NULL AND pm.cu IS NOT NULL
                 AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice THEN 'WRONG_CU'
            WHEN e.region IS NOT NULL AND pm.region IS NOT NULL
                 AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice THEN 'WRONG_REGION'
            WHEN e.grade IS NOT NULL AND pm.grade IS NOT NULL
                 AND (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm.grade)))
                     IS DISTINCT FROM
                     (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
                 THEN 'WRONG_GRADE'
            ELSE 'MISMATCH'
          END AS mismatch_type
        FROM employees e
        JOIN people_managers pm ON e.current_pm_id = pm.employee_id
        WHERE e.status = 'active' AND e.is_frozen = false ${practiceClause}
          AND (
            (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
            OR EXISTS (
              SELECT 1 FROM separation_reports sr
              WHERE sr.employee_id = pm.employee_id
                AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
            )
            OR e.practice IS DISTINCT FROM pm.practice
            OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
            OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
            OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
            OR (
              e.grade IS NOT NULL AND pm.grade IS NOT NULL
              AND (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm.grade)))
                  IS DISTINCT FROM
                  (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
            )
          )
      )
      SELECT COUNT(*) FROM misaligned WHERE 1=1 ${typeFilter}
    `);
        const totalCount = parseInt(countResult.rows[0].count);
        const result = await database_1.default.query(`
      WITH grade_order(grade, lvl) AS (
        VALUES ('A1',1),('A2',2),('A3',3),('A4',4),
               ('B1',5),('B2',6),('C1',7),('C2',8),
               ('D1',9),('D2',10),('E1',11),('E2',12)
      ),
      -- Step 1: find all misaligned rows (no LATERAL yet)
      all_misaligned AS (
        SELECT
          e.employee_id, e.name AS employee_name, e.email AS employee_email,
          e.practice AS emp_practice, e.sub_practice AS emp_sub_practice,
          e.cu AS emp_cu, e.region AS emp_region,
          e.grade AS emp_grade, e.skill AS emp_skill, e.location AS emp_location,
          pm.employee_id AS pm_id, pm.name AS pm_name, pm.email AS pm_email,
          pm.practice AS pm_practice, pm.sub_practice AS pm_sub_practice,
          pm.cu AS pm_cu, pm.region AS pm_region, pm.skill AS pm_skill,
          pm.leave_start_date, pm.leave_end_date,
          CASE
            WHEN pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE THEN 'PM_ON_LEAVE'
            WHEN EXISTS (
              SELECT 1 FROM separation_reports sr
              WHERE sr.employee_id = pm.employee_id
                AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
            ) THEN 'PM_SEPARATED'
            WHEN e.practice IS DISTINCT FROM pm.practice THEN 'WRONG_PRACTICE'
            WHEN e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                 AND e.sub_practice IS DISTINCT FROM pm.sub_practice THEN 'WRONG_SUB_PRACTICE'
            WHEN e.cu IS NOT NULL AND pm.cu IS NOT NULL
                 AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice THEN 'WRONG_CU'
            WHEN e.region IS NOT NULL AND pm.region IS NOT NULL
                 AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice THEN 'WRONG_REGION'
            WHEN e.grade IS NOT NULL AND pm.grade IS NOT NULL
                 AND (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm.grade)))
                     IS DISTINCT FROM
                     (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
                 THEN 'WRONG_GRADE'
            ELSE 'MISMATCH'
          END AS mismatch_type
        FROM employees e
        JOIN people_managers pm ON e.current_pm_id = pm.employee_id
        WHERE e.status = 'active' AND e.is_frozen = false ${practiceClause}
          AND (
            (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
            OR EXISTS (
              SELECT 1 FROM separation_reports sr
              WHERE sr.employee_id = pm.employee_id
                AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
            )
            OR e.practice IS DISTINCT FROM pm.practice
            OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
            OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
            OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
            OR (
              e.grade IS NOT NULL AND pm.grade IS NOT NULL
              AND (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm.grade)))
                  IS DISTINCT FROM
                  (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
            )
          )
      ),
      -- Step 2: paginate BEFORE the expensive LATERAL join
      paged AS (
        SELECT * FROM all_misaligned
        WHERE 1=1 ${typeFilter}
        ORDER BY employee_name
        LIMIT $1 OFFSET $2
      )
      -- Step 3: apply LATERAL only to the ~50 paged rows
      SELECT
        paged.*,
        sug.employee_id    AS suggested_pm_id,
        sug.name           AS suggested_pm_name,
        sug.grade          AS suggested_pm_grade,
        sug.practice       AS suggested_pm_practice,
        sug.cu             AS suggested_pm_cu,
        sug.region         AS suggested_pm_region,
        sug.skill          AS suggested_pm_skill,
        sug.reportee_count AS suggested_pm_reportees,
        sug.max_capacity   AS suggested_pm_capacity
      FROM paged
      LEFT JOIN LATERAL (
        SELECT pm2.employee_id, pm2.name, pm2.grade, pm2.practice,
               pm2.cu, pm2.region, pm2.skill, pm2.reportee_count, pm2.max_capacity,
               (
                 CASE WHEN pm2.cu IS NOT NULL AND paged.emp_cu IS NOT NULL AND pm2.cu = paged.emp_cu THEN 35 ELSE 0 END
                 + CASE WHEN pm2.region IS NOT NULL AND paged.emp_region IS NOT NULL AND pm2.region = paged.emp_region THEN 20 ELSE 0 END
                 + CASE WHEN pm2.sub_practice IS NOT NULL AND paged.emp_sub_practice IS NOT NULL AND pm2.sub_practice = paged.emp_sub_practice THEN 20 ELSE 0 END
                 + CASE WHEN
                     (SELECT g.lvl FROM (VALUES
                       ('A1',1),('A2',2),('A3',3),('A4',4),
                       ('B1',5),('B2',6),('C1',7),('C2',8),
                       ('D1',9),('D2',10),('E1',11),('E2',12)
                     ) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(pm2.grade)))
                     =
                     (SELECT g.lvl FROM (VALUES
                       ('A1',1),('A2',2),('A3',3),('A4',4),
                       ('B1',5),('B2',6),('C1',7),('C2',8),
                       ('D1',9),('D2',10),('E1',11),('E2',12)
                     ) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(paged.emp_grade))) + 1
                   THEN 15 ELSE 0 END
                 + CASE WHEN pm2.max_capacity > 0
                     THEN FLOOR(5.0 * (pm2.max_capacity - pm2.reportee_count) / pm2.max_capacity)
                   ELSE 0 END
               )::int AS match_score
        FROM people_managers pm2
        WHERE pm2.is_active = true
          AND pm2.reportee_count < pm2.max_capacity
          AND pm2.practice = paged.emp_practice
          AND pm2.employee_id <> paged.pm_id
        ORDER BY match_score DESC, (pm2.max_capacity - pm2.reportee_count) DESC
        LIMIT 1
      ) sug ON true
    `, [pageSizeNum, offset]);
        const unmappedResult = await database_1.default.query(`
      SELECT COUNT(*) FROM employees WHERE status = 'active' AND current_pm_id IS NULL
    `);
        res.json({
            count: totalCount,
            misalignments: result.rows,
            unmappedCount: parseInt(unmappedResult.rows[0].count),
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalPages: Math.ceil(totalCount / pageSizeNum),
                totalRecords: totalCount,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching misalignments', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getMisalignments = getMisalignments;
const exportMisalignmentsCSV = async (req, res) => {
    try {
        const { type } = req.query;
        const typeFilter = type && type !== 'all' ? `AND mismatch_type = '${type.replace(/'/g, "''")}'` : '';
        const result = await database_1.default.query(`
      WITH grade_order(grade, lvl) AS (
        VALUES ('A1',1),('A2',2),('A3',3),('A4',4),
               ('B1',5),('B2',6),('C1',7),('C2',8),
               ('D1',9),('D2',10),('E1',11),('E2',12)
      ),
      misaligned AS (
        SELECT
          e.employee_id, e.name AS employee_name,
          e.practice AS emp_practice, e.sub_practice AS emp_sub_practice,
          e.cu AS emp_cu, e.region AS emp_region, e.grade AS emp_grade,
          pm.employee_id AS pm_id, pm.name AS pm_name,
          pm.practice AS pm_practice, pm.sub_practice AS pm_sub_practice,
          CASE
            WHEN pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE THEN 'PM_ON_LEAVE'
            WHEN EXISTS (
              SELECT 1 FROM separation_reports sr
              WHERE sr.employee_id = pm.employee_id
                AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
            ) THEN 'PM_SEPARATED'
            WHEN e.practice IS DISTINCT FROM pm.practice THEN 'WRONG_PRACTICE'
            WHEN e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                 AND e.sub_practice IS DISTINCT FROM pm.sub_practice THEN 'WRONG_SUB_PRACTICE'
            WHEN e.cu IS NOT NULL AND pm.cu IS NOT NULL
                 AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice THEN 'WRONG_CU'
            WHEN e.region IS NOT NULL AND pm.region IS NOT NULL
                 AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice THEN 'WRONG_REGION'
            WHEN e.grade IS NOT NULL AND pm.grade IS NOT NULL
                 AND (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm.grade)))
                     IS DISTINCT FROM
                     (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
                 THEN 'WRONG_GRADE'
            ELSE 'MISMATCH'
          END AS mismatch_type
        FROM employees e
        JOIN people_managers pm ON e.current_pm_id = pm.employee_id
        WHERE e.status = 'active' AND e.is_frozen = false
          AND (
            (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
            OR EXISTS (
              SELECT 1 FROM separation_reports sr
              WHERE sr.employee_id = pm.employee_id
                AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
            )
            OR e.practice IS DISTINCT FROM pm.practice
            OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
            OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
            OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
            OR (
              e.grade IS NOT NULL AND pm.grade IS NOT NULL
              AND (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(pm.grade)))
                  IS DISTINCT FROM
                  (SELECT lvl FROM grade_order WHERE grade_order.grade = UPPER(TRIM(e.grade))) + 1
            )
          )
      )
      SELECT * FROM misaligned WHERE 1=1 ${typeFilter}
      ORDER BY employee_name
    `);
        const headers = ['Employee ID', 'Employee Name', 'Emp Practice', 'Emp Sub-Practice', 'Emp Grade', 'PM ID', 'PM Name', 'PM Practice', 'PM Sub-Practice', 'Mismatch Type'];
        const csvRows = [
            headers.join(','),
            ...result.rows.map(r => [
                r.employee_id, `"${(r.employee_name || '').replace(/"/g, '""')}"`,
                r.emp_practice, r.emp_sub_practice,
                r.emp_grade, r.pm_id,
                `"${(r.pm_name || '').replace(/"/g, '""')}"`,
                r.pm_practice, r.pm_sub_practice,
                r.mismatch_type
            ].join(','))
        ];
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="misalignments_${type || 'all'}.csv"`);
        res.send(csvRows.join('\n'));
    }
    catch (error) {
        logger_1.logger.error('Error exporting misalignments CSV', error);
        res.status(500).json({ error: error.message });
    }
};
exports.exportMisalignmentsCSV = exportMisalignmentsCSV;
const getUnmappedEmployees = async (req, res) => {
    try {
        const { page = '1', pageSize = '50', format, practice } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        const pf = practice && practice !== 'All' ? practice : null;
        const practiceClause = pf ? `AND practice = '${pf.replace(/'/g, "''")}'` : '';
        if (format === 'csv') {
            const { rows } = await database_1.default.query(`
        SELECT employee_id, name, email, practice, sub_practice, grade, region, location, skill, joining_date
        FROM employees e
        WHERE e.status = 'active' AND e.current_pm_id IS NULL ${practiceClause}
          AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id AND pm.is_active = true)
        ORDER BY name
      `);
            const headers = ['Employee ID', 'Name', 'Email', 'Practice', 'Sub-Practice', 'Grade', 'Region', 'Location', 'Skill', 'Joining Date'];
            const csvRows = rows.map((r) => [
                r.employee_id,
                `"${(r.name || '').replace(/"/g, '""')}"`,
                r.email || '',
                r.practice || '', r.sub_practice || '', r.grade || '',
                r.region || '', r.location || '', r.skill || '',
                r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : ''
            ].join(','));
            const csv = [headers.join(','), ...csvRows].join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="not_mapped_employees.csv"');
            return res.send(csv);
        }
        const countResult = await database_1.default.query(`
      SELECT COUNT(*) FROM employees e WHERE e.status = 'active' AND e.current_pm_id IS NULL ${practiceClause}
        AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id AND pm.is_active = true)
    `);
        const totalCount = parseInt(countResult.rows[0].count);
        const result = await database_1.default.query(`
      SELECT e.employee_id, e.name, e.email, e.practice, e.sub_practice, e.grade, e.region, e.location, e.skill, e.joining_date
      FROM employees e
      WHERE e.status = 'active' AND e.current_pm_id IS NULL ${practiceClause}
        AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id AND pm.is_active = true)
      ORDER BY e.name
      LIMIT $1 OFFSET $2
    `, [pageSizeNum, offset]);
        res.json({
            count: totalCount,
            data: result.rows,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalPages: Math.ceil(totalCount / pageSizeNum),
                totalRecords: totalCount,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching unmapped employees', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getUnmappedEmployees = getUnmappedEmployees;
const getGradewisePMCapacity = async (req, res) => {
    try {
        const { grade } = req.query;
        if (grade) {
            // Drill-down: list individual PMs for the given grade (C1+ only)
            const result = await database_1.default.query(`
        SELECT
          pm.employee_id, pm.name, pm.email, pm.practice, pm.sub_practice, pm.region, pm.location,
          pm.skill, pm.grade, pm.reportee_count, pm.max_capacity,
          ROUND(100.0 * pm.reportee_count / NULLIF(pm.max_capacity, 0), 1) AS utilization_pct,
          CASE WHEN pm.is_active THEN 'Active' ELSE 'Inactive' END AS status
        FROM people_managers pm
        WHERE pm.is_active = true
          AND pm.grade = ANY(ARRAY['C1','C2','D1','D2','D3','E1','E2'])
          AND pm.grade = $1
        ORDER BY pm.reportee_count DESC, pm.name
      `, [grade]);
            return res.json({ grade, pms: result.rows, count: result.rows.length });
        }
        // Overall view: grouped by grade (C1+ only)
        const GRADE_ORDER = ['C1', 'C2', 'D1', 'D2', 'D3', 'E1', 'E2'];
        const result = await database_1.default.query(`
      SELECT
        pm.grade,
        COUNT(pm.employee_id)::int                                                  AS total_pms,
        SUM(pm.max_capacity)::int                                                   AS total_capacity,
        SUM(pm.reportee_count)::int                                                 AS total_reportees,
        (SUM(pm.max_capacity) - SUM(pm.reportee_count))::int                       AS available_capacity,
        ROUND(100.0 * SUM(pm.reportee_count) / NULLIF(SUM(pm.max_capacity), 0), 1) AS utilization_pct
      FROM people_managers pm
      WHERE pm.is_active = true
        AND pm.grade = ANY(ARRAY['C1','C2','D1','D2','D3','E1','E2'])
      GROUP BY pm.grade
    `);
        // Sort by GRADE_ORDER
        const rows = result.rows.sort((a, b) => {
            const ai = GRADE_ORDER.indexOf((a.grade || '').toUpperCase());
            const bi = GRADE_ORDER.indexOf((b.grade || '').toUpperCase());
            if (ai === -1 && bi === -1)
                return (a.grade || '').localeCompare(b.grade || '');
            if (ai === -1)
                return 1;
            if (bi === -1)
                return -1;
            return ai - bi;
        });
        res.json({ grades: rows });
    }
    catch (error) {
        logger_1.logger.error('Error fetching gradewise PM capacity', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getGradewisePMCapacity = getGradewisePMCapacity;
// ============================================
// Manual PM Override (with audit trail)
// ============================================
const overridePMAssignment = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { newPmId, justification, userId } = req.body;
        if (!newPmId || !justification) {
            return res.status(400).json({ error: 'newPmId and justification are required' });
        }
        const empResult = await database_1.default.query('SELECT * FROM employees WHERE employee_id = $1', [employeeId]);
        if (empResult.rows.length === 0)
            return res.status(404).json({ error: 'Employee not found' });
        const pmResult = await database_1.default.query('SELECT * FROM people_managers WHERE employee_id = $1', [newPmId]);
        if (pmResult.rows.length === 0)
            return res.status(404).json({ error: 'PM not found' });
        const employee = empResult.rows[0];
        const newPm = pmResult.rows[0];
        const oldPmId = employee.current_pm_id;
        // Update current PM
        await database_1.default.query('UPDATE employees SET current_pm_id = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2', [newPmId, employeeId]);
        // Recalculate reportee counts for old and new PM
        if (oldPmId) {
            await database_1.default.query(`UPDATE people_managers
         SET reportee_count = (SELECT COUNT(*) FROM employees WHERE current_pm_id = $1 AND status = 'active')
         WHERE employee_id = $1`, [oldPmId]);
        }
        await database_1.default.query(`UPDATE people_managers
       SET reportee_count = (SELECT COUNT(*) FROM employees WHERE current_pm_id = $1 AND status = 'active')
       WHERE employee_id = $1`, [newPmId]);
        // Record as approved manual override assignment
        await database_1.default.query(`INSERT INTO pm_assignments (employee_id, new_pm_id, old_pm_id, assignment_type, status, effective_date, match_score)
       VALUES ($1, $2, $3, 'manual_override', 'approved', CURRENT_DATE, 100)`, [employeeId, newPmId, oldPmId]);
        // Audit trail
        await auditService.logPMChange(employeeId, oldPmId, newPmId, userId || 'manual');
        await auditService.log({
            userId: userId || 'manual',
            action: 'manual_pm_override',
            entityType: 'employee',
            entityId: employeeId,
            oldValue: { pmId: oldPmId },
            newValue: { pmId: newPmId, pmName: newPm.name },
            metadata: { justification, timestamp: new Date().toISOString() },
        });
        logger_1.logger.info('Manual PM override applied', { employeeId, oldPmId, newPmId, justification });
        res.json({
            message: `PM overridden: ${employee.name} → ${newPm.name}`,
            employeeId, oldPmId, newPmId, newPmName: newPm.name,
        });
    }
    catch (error) {
        logger_1.logger.error('Error overriding PM assignment', error);
        res.status(500).json({ error: error.message });
    }
};
exports.overridePMAssignment = overridePMAssignment;
// Get PM change history for an employee
const getEmployeePMHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const assignmentsResult = await database_1.default.query(`
      SELECT
        pa.id, pa.assignment_type, pa.status, pa.match_score, pa.effective_date, pa.created_at,
        pa.old_pm_id, pa.new_pm_id,
        old_pm.name AS old_pm_name, new_pm.name AS new_pm_name
      FROM pm_assignments pa
      LEFT JOIN people_managers old_pm ON pa.old_pm_id = old_pm.employee_id
      LEFT JOIN people_managers new_pm ON pa.new_pm_id = new_pm.employee_id
      WHERE pa.employee_id = $1
      ORDER BY pa.created_at DESC
      LIMIT 20
    `, [employeeId]);
        const auditResult = await database_1.default.query(`
      SELECT user_id, action, old_value, new_value, metadata, timestamp
      FROM audit_trail
      WHERE entity_type = 'employee' AND entity_id = $1
      ORDER BY timestamp DESC
      LIMIT 20
    `, [employeeId]);
        res.json({ assignments: assignmentsResult.rows, auditTrail: auditResult.rows });
    }
    catch (error) {
        logger_1.logger.error('Error fetching employee PM history', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getEmployeePMHistory = getEmployeePMHistory;
// ============================================================
// GAD Analysis Report — 4 endpoints
// ============================================================
const getGADAnalysisSummary = async (req, res) => {
    try {
        const { practice, pm_id } = req.query;
        const pf = practice && practice !== 'All' ? practice : null;
        const pmId = pm_id && pm_id !== 'All' ? pm_id : null;
        // Practice filter applied as $1 param (empty array when no filter)
        const empPF = pf ? `AND e.practice = $1` : '';
        const pmClause = pmId ? `AND e.current_pm_id = '${pmId.replace(/'/g, "''")}'` : '';
        const params = pf ? [pf] : [];
        const result = await database_1.default.query(`
      SELECT
        (SELECT COUNT(*) FROM employees e WHERE e.status = 'active' ${empPF}) AS total_employees,
        -- correctly_mapped: has PM, no dynamic misalignment, no same-grade exception
        -- NOTE: includes is_frozen=true employees — frozen means "locked assignment", not "wrong assignment"
        (
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' ${empPF} ${pmClause}
            AND NOT (
              (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
              OR EXISTS (
                SELECT 1 FROM separation_reports sr
                WHERE sr.employee_id = pm.employee_id
                  AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                  AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
              )
              OR e.practice IS DISTINCT FROM pm.practice
              OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                  AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
              OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
              OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
              OR (
                e.grade IS NOT NULL AND pm.grade IS NOT NULL
                AND COALESCE((SELECT lvl FROM (VALUES ('A1',1),('A2',2),('A3',3),('A4',4),('B1',5),('B2',6),('C1',7),('C2',8),('D1',9),('D2',10),('E1',11),('E2',12)) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(pm.grade))), 0)
                    <>
                    COALESCE((SELECT lvl FROM (VALUES ('A1',1),('A2',2),('A3',3),('A4',4),('B1',5),('B2',6),('C1',7),('C2',8),('D1',9),('D2',10),('E1',11),('E2',12)) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(e.grade))), 0) + 1
              )
            )
            AND NOT EXISTS (
              SELECT 1 FROM exceptions ex
              WHERE ex.employee_id = e.employee_id
                AND ex.status = 'open' AND ex.exception_type = 'SAME_GRADE_REPORTEE'
            )
        ) AS correctly_mapped,
        -- incorrectly_mapped: has PM + any dynamic misalignment
        (
          SELECT COUNT(*) FROM employees e
          JOIN people_managers pm ON pm.employee_id = e.current_pm_id
          WHERE e.status = 'active' AND e.is_frozen = false ${empPF} ${pmClause}
            AND (
              (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
              OR EXISTS (
                SELECT 1 FROM separation_reports sr
                WHERE sr.employee_id = pm.employee_id
                  AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
                  AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
              )
              OR e.practice IS DISTINCT FROM pm.practice
              OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                  AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
              OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
              OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
              OR (
                e.grade IS NOT NULL AND pm.grade IS NOT NULL
                AND COALESCE((SELECT lvl FROM (VALUES ('A1',1),('A2',2),('A3',3),('A4',4),('B1',5),('B2',6),('C1',7),('C2',8),('D1',9),('D2',10),('E1',11),('E2',12)) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(pm.grade))), 0)
                    <>
                    COALESCE((SELECT lvl FROM (VALUES ('A1',1),('A2',2),('A3',3),('A4',4),('B1',5),('B2',6),('C1',7),('C2',8),('D1',9),('D2',10),('E1',11),('E2',12)) AS g(grade,lvl) WHERE g.grade = UPPER(TRIM(e.grade))), 0) + 1
              )
            )
        ) AS incorrectly_mapped,
        (SELECT COUNT(*) FROM employees e WHERE e.status = 'active' AND e.current_pm_id IS NULL ${empPF}
          AND NOT EXISTS (SELECT 1 FROM people_managers pm2 WHERE pm2.employee_id = e.employee_id AND pm2.is_active = true)
        ) AS not_mapped,
        (
          SELECT COUNT(*) FROM exceptions ex
          JOIN employees e ON e.employee_id = ex.employee_id
          WHERE ex.exception_type = 'SAME_GRADE_REPORTEE' AND ex.status = 'open' ${empPF}
        ) AS same_grade,
        (
          SELECT COUNT(*) FROM employees e
          WHERE e.status = 'active'
            AND TRIM(e.grade) ~ '^[C-Z][0-9]' ${empPF}
            AND e.joining_date IS NOT NULL
            AND e.joining_date <= CURRENT_DATE - INTERVAL '1 year'
            AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id)
        ) AS proposed_pms
    `, params);
        res.json(result.rows[0]);
    }
    catch (error) {
        logger_1.logger.error('Error fetching GAD analysis summary', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getGADAnalysisSummary = getGADAnalysisSummary;
const getCorrectlyMappedEmployees = async (req, res) => {
    try {
        const { format, page = '1', pageSize = '50', practice, pm_id } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const pf = practice && practice !== 'All' ? practice : null;
        const pmId = pm_id && pm_id !== 'All' ? pm_id : null;
        const practiceClause = pf ? `AND e.practice = '${pf.replace(/'/g, "''")}'` : '';
        const pmIdClause = pmId ? `AND e.current_pm_id = '${pmId.replace(/'/g, "''")}'` : '';
        const baseSQL = `
      SELECT
        e.employee_id, e.name, e.email, e.grade, e.practice, e.sub_practice,
        e.region, e.skill, e.joining_date, e.location,
        pm.employee_id AS pm_id, pm.name AS pm_name, pm.grade AS pm_grade,
        pm.practice AS pm_practice, pm.sub_practice AS pm_sub_practice,
        pm.email AS pm_email
      FROM employees e
      JOIN people_managers pm ON pm.employee_id = e.current_pm_id
      WHERE e.status = 'active' ${practiceClause} ${pmIdClause}
        AND NOT (
          (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
          OR EXISTS (
            SELECT 1 FROM separation_reports sr
            WHERE sr.employee_id = pm.employee_id
              AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
              AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
          )
          OR e.practice IS DISTINCT FROM pm.practice
          OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
              AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
        )
        AND NOT EXISTS (
          SELECT 1 FROM exceptions ex
          WHERE ex.employee_id = e.employee_id
            AND ex.status = 'open' AND ex.exception_type = 'SAME_GRADE_REPORTEE'
        )
      ORDER BY e.practice, e.name
    `;
        if (format === 'csv') {
            const { rows } = await database_1.default.query(baseSQL);
            const headers = ['Employee ID', 'Name', 'Email', 'Grade', 'Practice', 'Sub-Practice', 'Region', 'Skill', 'Joining Date', 'PM ID', 'PM Name', 'PM Grade', 'PM Practice'];
            const csvRows = rows.map((r) => [
                r.employee_id,
                `"${(r.name || '').replace(/"/g, '""')}"`,
                r.email || '', r.grade || '', r.practice || '', r.sub_practice || '',
                r.region || '', r.skill || '',
                r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '',
                r.pm_id || '',
                `"${(r.pm_name || '').replace(/"/g, '""')}"`,
                r.pm_grade || '', r.pm_practice || ''
            ].join(','));
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="correctly_mapped_employees.csv"');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }
        const countSQL = `
      SELECT COUNT(*) FROM employees e
      JOIN people_managers pm ON pm.employee_id = e.current_pm_id
      WHERE e.status = 'active' ${practiceClause} ${pmIdClause}
        AND NOT (
          (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
          OR EXISTS (
            SELECT 1 FROM separation_reports sr
            WHERE sr.employee_id = pm.employee_id
              AND (sr.separation_type ILIKE '%Resignation%' OR sr.separation_type ILIKE '%Retirement%')
              AND sr.lwd >= CURRENT_DATE - INTERVAL '90 days'
          )
          OR e.practice IS DISTINCT FROM pm.practice
          OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
              AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
        )
        AND NOT EXISTS (
          SELECT 1 FROM exceptions ex
          WHERE ex.employee_id = e.employee_id
            AND ex.status = 'open' AND ex.exception_type = 'SAME_GRADE_REPORTEE'
        )
    `;
        const [countResult, dataResult] = await Promise.all([
            database_1.default.query(countSQL),
            database_1.default.query(`${baseSQL} LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]),
        ]);
        const totalRecords = parseInt(countResult.rows[0].count);
        res.json({
            count: totalRecords,
            data: dataResult.rows,
            pagination: { page: parseInt(page), pageSize: parseInt(pageSize), totalRecords, totalPages: Math.ceil(totalRecords / parseInt(pageSize)) },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching correctly mapped employees', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getCorrectlyMappedEmployees = getCorrectlyMappedEmployees;
const getSameGradeExceptions = async (req, res) => {
    try {
        const { format, page = '1', pageSize = '50', practice, pm_id } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const pf = practice && practice !== 'All' ? practice : null;
        const pmId = pm_id && pm_id !== 'All' ? pm_id : null;
        const practiceClause = pf ? `AND e.practice = '${pf.replace(/'/g, "''")}'` : '';
        const pmIdClause = pmId ? `AND e.current_pm_id = '${pmId.replace(/'/g, "''")}'` : '';
        const baseSQL = `
      SELECT
        ex.id AS exception_id, ex.created_at,
        e.employee_id, e.name AS employee_name, e.email, e.grade AS employee_grade,
        e.practice, e.sub_practice, e.region,
        pm.employee_id AS pm_id, pm.name AS pm_name, pm.grade AS pm_grade, pm.practice AS pm_practice
      FROM exceptions ex
      JOIN employees e ON e.employee_id = ex.employee_id
      LEFT JOIN people_managers pm ON pm.employee_id = e.current_pm_id
      WHERE ex.exception_type = 'SAME_GRADE_REPORTEE' AND ex.status = 'open' ${practiceClause} ${pmIdClause}
      ORDER BY e.grade, e.name
    `;
        if (format === 'csv') {
            const { rows } = await database_1.default.query(baseSQL);
            const headers = ['Exception ID', 'Employee ID', 'Employee Name', 'Email', 'Employee Grade', 'Practice', 'Sub-Practice', 'Region', 'PM ID', 'PM Name', 'PM Grade', 'PM Practice', 'Detected At'];
            const csvRows = rows.map((r) => [
                r.exception_id, r.employee_id,
                `"${(r.employee_name || '').replace(/"/g, '""')}"`,
                r.email || '', r.employee_grade || '', r.practice || '',
                r.sub_practice || '', r.region || '',
                r.pm_id || '',
                `"${(r.pm_name || '').replace(/"/g, '""')}"`,
                r.pm_grade || '', r.pm_practice || '',
                r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : ''
            ].join(','));
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="same_grade_exceptions.csv"');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }
        const [countResult, dataResult] = await Promise.all([
            database_1.default.query(`
        SELECT COUNT(*) FROM exceptions ex
        JOIN employees e ON e.employee_id = ex.employee_id
        WHERE ex.exception_type = 'SAME_GRADE_REPORTEE' AND ex.status = 'open' ${practiceClause} ${pmIdClause}
      `),
            database_1.default.query(`${baseSQL} LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]),
        ]);
        const totalRecords = parseInt(countResult.rows[0].count);
        res.json({
            count: totalRecords,
            data: dataResult.rows,
            pagination: { page: parseInt(page), pageSize: parseInt(pageSize), totalRecords, totalPages: Math.ceil(totalRecords / parseInt(pageSize)) },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching same grade exceptions', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getSameGradeExceptions = getSameGradeExceptions;
const getProposedPMs = async (req, res) => {
    try {
        const { format, page = '1', pageSize = '50', practice } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(pageSize);
        const pf = practice && practice !== 'All' ? practice : null;
        const practiceClause = pf ? `AND e.practice = '${pf.replace(/'/g, "''")}'` : '';
        const whereSQL = `
      WHERE e.status = 'active'
        AND TRIM(e.grade) ~ '^[C-Z][0-9]'
        AND e.joining_date IS NOT NULL
        AND e.joining_date <= CURRENT_DATE - INTERVAL '1 year'
        AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id)
        ${practiceClause}
    `;
        const baseSQL = `
      SELECT
        e.employee_id, e.name, e.email, e.grade, e.practice, e.sub_practice,
        e.region, e.skill, e.location, e.joining_date,
        DATE_PART('year', AGE(CURRENT_DATE, e.joining_date))::int AS tenure_years,
        CASE e.grade
          WHEN 'C1' THEN 10 WHEN 'C2' THEN 10
          WHEN 'D1' THEN 15 WHEN 'D2' THEN 15 WHEN 'D3' THEN 15
          WHEN 'E1' THEN 25 WHEN 'E2' THEN 25
          ELSE 10
        END AS proposed_max_capacity
      FROM employees e
      ${whereSQL}
      ORDER BY e.grade, e.name
    `;
        if (format === 'csv') {
            const { rows } = await database_1.default.query(baseSQL);
            const headers = ['Employee ID', 'Name', 'Email', 'Grade', 'Practice', 'Sub-Practice', 'Region', 'Location', 'Skill', 'Joining Date', 'Tenure (Years)', 'Proposed Max Capacity'];
            const csvRows = rows.map((r) => [
                r.employee_id,
                `"${(r.name || '').replace(/"/g, '""')}"`,
                r.email || '', r.grade || '', r.practice || '', r.sub_practice || '',
                r.region || '', r.location || '', r.skill || '',
                r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '',
                r.tenure_years || 0, r.proposed_max_capacity
            ].join(','));
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="proposed_pms.csv"');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }
        const [countResult, dataResult] = await Promise.all([
            database_1.default.query(`SELECT COUNT(*) FROM employees e ${whereSQL}`),
            database_1.default.query(`${baseSQL} LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]),
        ]);
        const totalRecords = parseInt(countResult.rows[0].count);
        res.json({
            count: totalRecords,
            data: dataResult.rows,
            pagination: { page: parseInt(page), pageSize: parseInt(pageSize), totalRecords, totalPages: Math.ceil(totalRecords / parseInt(pageSize)) },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching proposed PMs', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getProposedPMs = getProposedPMs;
// ============================================================
// Discrepancy Report Controllers
// ============================================================
/** GET /reports/discrepancy — return the most recent snapshot (or generate if none exists) */
const getDiscrepancyReport = async (req, res) => {
    try {
        // Always return live data so the page reflects current DB state (not a stale snapshot)
        const live = await discrepancyReportService_1.discrepancyReportService.getLiveReport();
        // Attach the latest snapshot metadata (id + timestamp) for the header "Last saved" info
        const latest = await discrepancyReportService_1.discrepancyReportService.getLatestSnapshot();
        res.json({
            ...live,
            triggered_by: 'live',
            id: latest?.id ?? null,
            last_saved_at: latest?.created_at ?? null,
            last_triggered_by: latest?.triggered_by ?? null,
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching discrepancy report', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getDiscrepancyReport = getDiscrepancyReport;
/** POST /reports/discrepancy/generate — force-regenerate a fresh snapshot */
const triggerDiscrepancyReport = async (req, res) => {
    try {
        const { triggered_by = 'manual' } = req.body;
        const snapshot = await discrepancyReportService_1.discrepancyReportService.generateSnapshot(triggered_by);
        res.json(snapshot);
    }
    catch (error) {
        logger_1.logger.error('Error generating discrepancy report', error);
        res.status(500).json({ error: error.message });
    }
};
exports.triggerDiscrepancyReport = triggerDiscrepancyReport;
/** GET /reports/discrepancy/details?type=xxx&page=1&pageSize=50 */
const getDiscrepancyDetails = async (req, res) => {
    try {
        const { type, page = '1', pageSize = '50' } = req.query;
        if (!type)
            return res.status(400).json({ error: 'type query parameter is required' });
        const result = await discrepancyReportService_1.discrepancyReportService.getDetails(type, parseInt(page), parseInt(pageSize));
        res.json({
            ...result,
            pagination: {
                page: parseInt(page),
                pageSize: parseInt(pageSize),
                totalPages: Math.ceil(result.count / parseInt(pageSize)),
                totalRecords: result.count,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching discrepancy details', error);
        res.status(error.message?.includes('Unknown') ? 400 : 500).json({ error: error.message });
    }
};
exports.getDiscrepancyDetails = getDiscrepancyDetails;
/** GET /reports/discrepancy/history — last 20 snapshots */
const getDiscrepancyHistory = async (req, res) => {
    try {
        const history = await discrepancyReportService_1.discrepancyReportService.getHistory();
        res.json(history);
    }
    catch (error) {
        logger_1.logger.error('Error fetching discrepancy history', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getDiscrepancyHistory = getDiscrepancyHistory;
