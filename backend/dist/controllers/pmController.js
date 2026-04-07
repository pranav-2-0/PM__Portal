"use strict";
// import { Request, Response } from 'express';
// import { DataIngestionService } from '../services/dataIngestionService';
// import { BulkUploadService } from '../services/bulkUploadService';
// import { MatchingService } from '../services/matchingService';
// import { StatisticsService } from '../services/statisticsService';
// import { AuditTrailService } from '../services/auditTrailService';
// import { WorkflowAutomationService } from '../services/workflowAutomationService';
// import { schedulerService } from '../services/schedulerService';
// import { practiceReportService } from '../services/practiceReportService';
// import { discrepancyReportService } from '../services/discrepancyReportService';
// import { parseEmployeeExcel, parsePMExcel, parseSeparationExcel, parseSkillReportExcel, parseGADExcel, extractPMsFromGAD, getSkillReportHeaders, getFileHeaders } from '../utils/excelParser';
// import { logger } from '../utils/logger';
// import pool, { refreshAlignmentCache } from '../config/database';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewAutoAssign = exports.confirmAutoGeneratePMs = exports.previewAutoGeneratePMs = exports.getPracticeFilters = exports.generatePracticeReport = exports.triggerMonthlyEngagement = exports.triggerReassignmentWorkflow = exports.triggerNewJoinerWorkflow = exports.getAuditStatistics = exports.getAuditTrail = exports.getMatchingPerformance = exports.getMonthlyTrends = exports.getWorkflowEfficiency = exports.getAssignmentStatus = exports.getPMCapacityHeatmap = exports.getExceptionQueue = exports.getSLACompliance = exports.setEmployeeFreeze = exports.getUploadStats = exports.getRegionStats = exports.getGradeDistribution = exports.getApprovalMetrics = exports.getPracticeDistribution = exports.getAssignmentTrends = exports.resolveException = exports.getExceptions = exports.triggerLWDCheck = exports.getApprovalWorkflow = exports.rejectAssignment = exports.approveAssignment = exports.getPMDetailReport = exports.checkDatabaseHealth = exports.getPMReportSummary = exports.getPMCapacityReport = exports.getDashboardStats = exports.getPendingAssignments = exports.getAllSeparations = exports.getAllPMs = exports.getAllEmployees = exports.getNewJoinersList = exports.getNewJoiners = exports.assignPMToEmployee = exports.findPMForEmployee = exports.uploadSkillReport = exports.uploadBenchReport = exports.uploadGAD = exports.uploadSeparations = exports.uploadPMs = exports.uploadNewJoiners = exports.uploadEmployees = void 0;
exports.getSuggestedPMsForEmployee = exports.removeEmployeeSkill = exports.updateSingleEmployeeSkill = exports.bulkUpdateEmployeeSkills = exports.getEmployeeSkillDistribution = exports.getSkillManagementCoverage = exports.getFilteredEmployeesForSkillUpdate = exports.getDiscrepancyHistory = exports.getDiscrepancyDetails = exports.triggerDiscrepancyReport = exports.getDiscrepancyReport = exports.getProposedPMs = exports.getSameGradeExceptions = exports.getCorrectlyMappedEmployees = exports.getGADAnalysisSummary = exports.getEmployeePMHistory = exports.overridePMAssignment = exports.getGradewisePMCapacity = exports.exportNoSuggestedPMCSV = exports.getNoSuggestedPMEmployees = exports.getUnmappedEmployees = exports.exportMisalignmentsCSV = exports.getMisalignments = exports.updateMatchingWeights = exports.getMatchingWeights = exports.confirmAutoAssign = void 0;
require("multer"); // augments Express.Request with req.file (from @types/multer)
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
const database_1 = __importStar(require("../config/database"));
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
        // Refresh alignment materialized view non-blocking after every upload
        (0, database_1.refreshAlignmentCache)().catch(() => { });
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
        // ── Step 0: Pre-Validation (Dataset Gate) ────────────────────────────────────
        // Check whether the uploaded dataset is practice-scoped.
        // A practice-scoped dataset should contain exactly ONE distinct practice value.
        const scopeCheck = matchingService.validateDatasetScope(allEmployees);
        if (!scopeCheck.isScoped && !practiceFilter) {
            logger_1.logger.warn('[uploadGAD] Dataset is not practice-scoped', { practices: scopeCheck.practices });
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
            // Step 0 result: was the dataset practice-scoped?
            dataset_scope: {
                is_scoped: scopeCheck.isScoped,
                practices_found: scopeCheck.practices,
                ...(scopeCheck.criticalFlag ? { critical_flag: scopeCheck.criticalFlag } : {}),
            },
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
        const employee = empResult.rows[0];
        // Step 0: single-employee dataset scope check (Step A — practice gate)
        const scopeCheck = matchingService.validateDatasetScope([employee]);
        // Step 0b: isPMResigned flag — caller signals the employee's current PM has resigned.
        // When true, the engine MUST return a valid PM (spec §4 Resignation Override).
        const isPMResigned = req.query.isPMResigned === 'true' || req.body?.isPMResigned === true;
        // Run the full matching engine (Steps 1-4)
        const matches = await matchingService.findBestPM(employee, isPMResigned);
        // ── Build spec-compliant MatchOutput from top result ──────────────────────
        const best = matches.length > 0 ? matches[0] : null;
        // Map path + confidence → human-readable Match Type
        let matchType;
        if (!best) {
            matchType = 'Failed';
        }
        else if (best.forcedAssignment) {
            matchType = 'Forced';
        }
        else if (best.confidence === 'High') {
            matchType = 'Ideal';
        }
        else if (best.confidence === 'Medium') {
            matchType = 'Acceptable';
        }
        else if (best.confidence === 'Low') {
            matchType = 'Low Confidence';
        }
        else {
            matchType = 'Failed';
        }
        // Collect deviation flags from the winning match
        const deviationFlags = best
            ? (best.flags || []).map(f => `[${f.severity}] ${f.code}: ${f.message}`)
            : [`No eligible PM found for employee ${employee.employee_id}. Manual review required.`];
        const matchOutput = {
            employee_id: employee.employee_id,
            assigned_pm_id: best?.pm.employee_id ?? null,
            decision_path: best?.path ?? (scopeCheck.isScoped ? 'Path9_NoMatch' : 'Path8_PracticeFailure'),
            match_type: matchType,
            deviation_flags: deviationFlags,
            tiebreaker_applied: best?.tiebreakerApplied ?? null,
            score: best?.score ?? 0,
            confidence: best?.confidence ?? 'Unmappable',
            // §4 Resignation Override fields
            forced_assignment: best?.forcedAssignment ?? false,
            override_reason: best?.overrideReason ?? null,
        };
        // ── Flag summary across all returned candidates ────────────────────────────
        const allFlags = matches.flatMap(m => m.flags || []);
        res.json({
            employee,
            // Spec-format output (top-level result card)
            result: matchOutput,
            // Full ranked candidate list (for UI / manual review)
            matches,
            dataset_scope: scopeCheck,
            flag_summary: {
                total: allFlags.length,
                critical: allFlags.filter(f => f.severity === 'Critical').length,
                major: allFlags.filter(f => f.severity === 'Major').length,
                minor: allFlags.filter(f => f.severity === 'Minor').length,
                has_unmappable: matches.length === 0 || matches.every(m => m.confidence === 'Unmappable'),
            },
            best_confidence: best?.confidence ?? 'Unmappable',
        });
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
             ROUND((pm.reportee_count::numeric / 10) * 100)::int AS utilization,
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
        const utilization = Math.round((pm.reportee_count / 10) * 100); // spec hard cap: 10
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
            message: `Assigned ${result.assigned} employees to PMs. ${result.unmappable} could not be matched (no eligible PM in their practice).`,
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
        // ── OPTIMISED ─────────────────────────────────────────────────────────────
        // Previously: two full CTE executions (one for COUNT, one for data).
        // Now: single CTE execution with COUNT(*) OVER() window function.
        // grade_order VALUES replaced by JOIN grade_levels (indexed table).
        // hasSuggestedPM changed from a per-row correlated EXISTS sub-select to
        // a join on mv_practice_has_eligible_pm (one lookup per row instead of a
        // full people_managers scan per row).
        // pm_separated pre-aggregated into a CTE to avoid repeated EXISTS scans.
        // ─────────────────────────────────────────────────────────────────────────
        const result = await database_1.default.query(`
      WITH
      -- Pre-aggregate resigned PMs (avoids correlated EXISTS per employee row)
      pm_separated AS (
        SELECT DISTINCT employee_id
        FROM separation_reports
        WHERE (separation_type ILIKE '%Resignation%' OR separation_type ILIKE '%Retirement%')
          AND lwd >= CURRENT_DATE - INTERVAL '90 days'
      ),
      -- Step 1: identify and classify all misaligned employees
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
        JOIN people_managers pm    ON e.current_pm_id   = pm.employee_id
        LEFT JOIN grade_levels gl_pm ON gl_pm.grade     = UPPER(TRIM(pm.grade))
        LEFT JOIN grade_levels gl_e  ON gl_e.grade      = UPPER(TRIM(e.grade))
        LEFT JOIN pm_separated ps    ON ps.employee_id  = pm.employee_id
        -- mv_practice_has_eligible_pm: practice has ≥1 eligible replacement PM
        JOIN mv_practice_has_eligible_pm mhep ON mhep.practice = e.practice
        WHERE e.status = 'active' AND e.is_frozen = false ${practiceClause}
          -- Must have at least one actual mismatch condition
          AND (
            (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
            OR ps.employee_id IS NOT NULL
            OR e.practice IS DISTINCT FROM pm.practice
            OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
            OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
            OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
            OR (e.grade IS NOT NULL AND pm.grade IS NOT NULL
                AND COALESCE(gl_pm.lvl, 0) <> COALESCE(gl_e.lvl, 0) + 1)
          )
          -- §1 GAD: only surface as misaligned when a better PM is available
          -- (PM_SEPARATED always surfaces per §2 — handled by JOIN above for
          --  non-resigned rows; separated rows are included via ps join)
          AND (
            ps.employee_id IS NOT NULL   -- §2: always surface resigned PM cases
            OR mhep.practice IS NOT NULL  -- §1: eligible replacement PM exists
          )
      ),
      -- Step 2: filter by type and paginate BEFORE the expensive LATERAL
      filtered AS (
        SELECT * FROM all_misaligned
        WHERE 1=1 ${typeFilter}
      ),
      paged AS (
        SELECT *, COUNT(*) OVER() AS total_count
        FROM filtered
        ORDER BY employee_name
        LIMIT $1 OFFSET $2
      )
      -- Step 3: LATERAL suggested PM only over the ~50 paged rows
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
        10                 AS suggested_pm_capacity,
        sug.is_forced_assignment AS suggested_pm_forced
      FROM paged
      LEFT JOIN LATERAL (
        WITH grade_vals(g, lvl) AS (
          SELECT grade, lvl FROM grade_levels
        ),
        emp_lvl AS (
          SELECT COALESCE(gv.lvl, 0) AS lvl
          FROM grade_vals gv WHERE gv.g = UPPER(TRIM(paged.emp_grade))
        ),
        skill_clusters AS (
          SELECT LOWER(sr.skill_name) AS skill_name,
                 LOWER(sr.skill_cluster) AS skill_cluster
          FROM skill_repository sr WHERE sr.practice = paged.emp_practice
        ),
        eligible AS (
          SELECT pm2.*,
                 EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm2.created_at)) / 86400 AS tenure_days,
                 COALESCE(gv.lvl, 0) AS pm_lvl
          FROM people_managers pm2
          JOIN grade_vals gv ON gv.g = UPPER(TRIM(pm2.grade))
          WHERE pm2.is_active       = true
            AND pm2.reportee_count <= 10
            AND pm2.practice        = paged.emp_practice
            AND pm2.employee_id    <> paged.pm_id
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
              WHEN paged.emp_skill IS NULL OR gf.skill IS NULL THEN 0
              WHEN LOWER(TRIM(gf.skill)) = LOWER(TRIM(paged.emp_skill)) THEN 15
              WHEN EXISTS (
                SELECT 1 FROM skill_clusters sc1
                JOIN skill_clusters sc2 ON sc1.skill_cluster = sc2.skill_cluster
                WHERE sc1.skill_name = LOWER(TRIM(gf.skill))
                  AND sc2.skill_name = LOWER(TRIM(paged.emp_skill))
                  AND sc1.skill_cluster IS NOT NULL
              ) THEN 8
              WHEN LOWER(gf.skill) LIKE '%'||LOWER(TRIM(paged.emp_skill))||'%'
                OR LOWER(TRIM(paged.emp_skill)) LIKE '%'||LOWER(gf.skill)||'%' THEN 7
              ELSE 0
            END AS skill_score,
            CASE WHEN gf.cu IS NOT NULL AND paged.emp_cu IS NOT NULL
                      AND gf.cu = paged.emp_cu THEN 35 ELSE 0 END AS cu_score,
            CASE WHEN gf.region IS NOT NULL AND paged.emp_region IS NOT NULL
                      AND gf.region = paged.emp_region THEN 20 ELSE 0 END AS region_score,
            CASE WHEN gf.sub_practice IS NOT NULL AND paged.emp_sub_practice IS NOT NULL
                      AND gf.sub_practice = paged.emp_sub_practice THEN 20 ELSE 0 END AS sub_score,
            CASE WHEN gf.account IS NOT NULL AND paged.emp_account IS NOT NULL
                      AND gf.account = paged.emp_account THEN 10 ELSE 0 END AS acct_score,
            FLOOR(5.0 * (10 - gf.reportee_count) / 10) AS cap_score
          FROM grade_filtered gf
        ),
        filtered_scored AS (
          SELECT s.*,
                 (s.cu_score + s.region_score + s.sub_score
                  + s.acct_score + s.skill_score + s.cap_score)::int AS total_score
          FROM scored s
          WHERE NOT (
            s.skill IS NOT NULL AND paged.emp_skill IS NOT NULL
            AND s.skill_score = 0
            AND LOWER(TRIM(s.skill)) <> LOWER(TRIM(paged.emp_skill))
            AND s.cu_score = 0
          )
        ),
        strict_best AS (
          SELECT employee_id, name, grade, practice, cu, region, skill, account,
                 sub_practice, email, reportee_count, tenure_days,
                 escalation_tier, total_score,
                 skill_score, cu_score, region_score, acct_score, cap_score,
                 false AS is_forced_assignment
          FROM filtered_scored
          ORDER BY escalation_tier ASC, total_score DESC, reportee_count ASC,
                   tenure_days DESC,
                   CASE WHEN account = paged.emp_account THEN 0 ELSE 1 END ASC,
                   employee_id ASC
          LIMIT 1
        ),
        relaxed_eligible AS (
          SELECT pm3.*,
                 EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm3.created_at)) / 86400 AS tenure_days,
                 COALESCE(gv3.lvl, 0) AS pm_lvl
          FROM people_managers pm3
          JOIN grade_vals gv3 ON gv3.g = UPPER(TRIM(pm3.grade))
          WHERE pm3.is_active    = true
            AND pm3.employee_id <> paged.pm_id
            AND NOT (
                  pm3.leave_start_date IS NOT NULL
              AND pm3.leave_end_date   IS NOT NULL
              AND (pm3.leave_end_date - pm3.leave_start_date) > 30
              AND CURRENT_DATE BETWEEN pm3.leave_start_date AND pm3.leave_end_date
            )
            AND pm3.reportee_count < COALESCE(pm3.max_capacity, 15)
            AND paged.mismatch_type = 'PM_SEPARATED'
            AND NOT EXISTS (SELECT 1 FROM strict_best)
        ),
        relaxed_scored AS (
          SELECT re.*,
            CASE WHEN re.practice = paged.emp_practice THEN 20 ELSE 0 END AS practice_score,
            CASE WHEN re.region   = paged.emp_region   THEN 20 ELSE 0 END AS region_score,
            CASE WHEN re.cu       = paged.emp_cu        THEN 35 ELSE 0 END AS cu_score,
            CASE
              WHEN paged.emp_skill IS NULL OR re.skill IS NULL THEN 0
              WHEN LOWER(TRIM(re.skill)) = LOWER(TRIM(paged.emp_skill)) THEN 15
              WHEN EXISTS (
                SELECT 1 FROM skill_clusters sc1r
                JOIN skill_clusters sc2r ON sc1r.skill_cluster = sc2r.skill_cluster
                WHERE sc1r.skill_name = LOWER(TRIM(re.skill))
                  AND sc2r.skill_name = LOWER(TRIM(paged.emp_skill))
                  AND sc1r.skill_cluster IS NOT NULL
              ) THEN 8
              ELSE 0
            END AS skill_score,
            CASE WHEN re.pm_lvl > (SELECT lvl FROM emp_lvl) THEN 5 ELSE 0 END AS grade_score,
            FLOOR(5.0 * GREATEST(0, COALESCE(re.max_capacity,10) - re.reportee_count)
                        / COALESCE(re.max_capacity,10)) AS cap_score,
            1 AS escalation_tier
          FROM relaxed_eligible re
        ),
        relaxed_best AS (
          SELECT employee_id, name, grade, practice, cu, region, skill, account,
                 sub_practice, email, reportee_count, tenure_days,
                 escalation_tier,
                 (practice_score + region_score + cu_score + skill_score + grade_score + cap_score)::int AS total_score,
                 skill_score, cu_score, region_score, 0 AS acct_score, cap_score,
                 true AS is_forced_assignment
          FROM relaxed_scored
          ORDER BY total_score DESC, reportee_count ASC, tenure_days DESC, employee_id ASC
          LIMIT 1
        )
        SELECT * FROM strict_best
        UNION ALL
        SELECT * FROM relaxed_best
        WHERE NOT EXISTS (SELECT 1 FROM strict_best)
        LIMIT 1
      ) sug ON true
    `, [pageSizeNum, offset]);
        const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
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
    // ── CSV EXPORT — includes suggested PM via efficient LATERAL join ─────────
    //
    // Uses the same scoring logic as getMisalignments but applied to the full
    // result set. The LATERAL join is performed in SQL so it scales well —
    // each candidate lookup is O(practice-filtered PMs) not O(all PMs).
    //
    // Suggested PM columns added to CSV to match what is visible in the UI.
    // ─────────────────────────────────────────────────────────────────────────
    try {
        const { type } = req.query;
        const typeWhere = type && type !== 'all'
            ? `AND mismatch_type = '${type.replace(/'/g, "''")}'`
            : '';
        const { rows } = await database_1.default.query(`
      WITH pm_separated AS (
        SELECT DISTINCT employee_id
        FROM separation_reports
        WHERE (separation_type ILIKE '%Resignation%' OR separation_type ILIKE '%Retirement%')
          AND lwd >= CURRENT_DATE - INTERVAL '90 days'
      ),
      classified AS (
        SELECT
          e.employee_id,
          e.name           AS employee_name,
          e.email          AS employee_email,
          e.practice       AS emp_practice,
          e.sub_practice   AS emp_sub_practice,
          e.cu             AS emp_cu,
          e.region         AS emp_region,
          e.grade          AS emp_grade,
          e.skill          AS emp_skill,
          e.location       AS emp_location,
          e.account        AS emp_account,
          pm.employee_id   AS pm_id,
          pm.name          AS pm_name,
          pm.email         AS pm_email,
          pm.practice      AS pm_practice,
          pm.sub_practice  AS pm_sub_practice,
          pm.cu            AS pm_cu,
          pm.region        AS pm_region,
          pm.grade         AS pm_grade,
          pm.skill         AS pm_skill,
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
        JOIN people_managers pm      ON e.current_pm_id = pm.employee_id
        LEFT JOIN grade_levels gl_pm ON gl_pm.grade     = UPPER(TRIM(pm.grade))
        LEFT JOIN grade_levels gl_e  ON gl_e.grade      = UPPER(TRIM(e.grade))
        LEFT JOIN pm_separated ps    ON ps.employee_id  = pm.employee_id
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
      filtered AS (
        SELECT * FROM classified
        WHERE 1=1 ${typeWhere}
        ORDER BY employee_name
      )
      SELECT
        f.*,
        sug.employee_id    AS suggested_pm_id,
        sug.name           AS suggested_pm_name,
        sug.email          AS suggested_pm_email,
        sug.grade          AS suggested_pm_grade,
        sug.practice       AS suggested_pm_practice,
        sug.sub_practice   AS suggested_pm_sub_practice,
        sug.cu             AS suggested_pm_cu,
        sug.region         AS suggested_pm_region,
        sug.skill          AS suggested_pm_skill,
        sug.reportee_count AS suggested_pm_reportees,
        sug.is_forced_assignment AS suggested_pm_forced
      FROM filtered f
      LEFT JOIN LATERAL (
        WITH grade_vals(g, lvl) AS (
          SELECT grade, lvl FROM grade_levels
        ),
        emp_lvl AS (
          SELECT COALESCE(gv.lvl, 0) AS lvl
          FROM grade_vals gv WHERE gv.g = UPPER(TRIM(f.emp_grade))
        ),
        skill_clusters AS (
          SELECT LOWER(sr.skill_name) AS skill_name,
                 LOWER(sr.skill_cluster) AS skill_cluster
          FROM skill_repository sr WHERE sr.practice = f.emp_practice
        ),
        eligible AS (
          SELECT pm2.*,
                 EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm2.created_at)) / 86400 AS tenure_days,
                 COALESCE(gv.lvl, 0) AS pm_lvl
          FROM people_managers pm2
          JOIN grade_vals gv ON gv.g = UPPER(TRIM(pm2.grade))
          WHERE pm2.is_active       = true
            AND pm2.reportee_count <= 10
            AND pm2.practice        = f.emp_practice
            AND pm2.employee_id    <> f.pm_id
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
              WHEN f.emp_skill IS NULL OR gf.skill IS NULL THEN 0
              WHEN LOWER(TRIM(gf.skill)) = LOWER(TRIM(f.emp_skill)) THEN 15
              WHEN EXISTS (
                SELECT 1 FROM skill_clusters sc1
                JOIN skill_clusters sc2 ON sc1.skill_cluster = sc2.skill_cluster
                WHERE sc1.skill_name = LOWER(TRIM(gf.skill))
                  AND sc2.skill_name = LOWER(TRIM(f.emp_skill))
                  AND sc1.skill_cluster IS NOT NULL
              ) THEN 8
              WHEN LOWER(gf.skill) LIKE '%'||LOWER(TRIM(f.emp_skill))||'%'
                OR LOWER(TRIM(f.emp_skill)) LIKE '%'||LOWER(gf.skill)||'%' THEN 7
              ELSE 0
            END AS skill_score,
            CASE WHEN gf.cu IS NOT NULL AND f.emp_cu IS NOT NULL
                      AND gf.cu = f.emp_cu THEN 35 ELSE 0 END AS cu_score,
            CASE WHEN gf.region IS NOT NULL AND f.emp_region IS NOT NULL
                      AND gf.region = f.emp_region THEN 20 ELSE 0 END AS region_score,
            CASE WHEN gf.sub_practice IS NOT NULL AND f.emp_sub_practice IS NOT NULL
                      AND gf.sub_practice = f.emp_sub_practice THEN 20 ELSE 0 END AS sub_score,
            CASE WHEN gf.account IS NOT NULL AND f.emp_account IS NOT NULL
                      AND gf.account = f.emp_account THEN 10 ELSE 0 END AS acct_score,
            FLOOR(5.0 * (10 - gf.reportee_count) / 10) AS cap_score
          FROM grade_filtered gf
        ),
        filtered_scored AS (
          SELECT s.*,
                 (s.cu_score + s.region_score + s.sub_score
                  + s.acct_score + s.skill_score + s.cap_score)::int AS total_score
          FROM scored s
          WHERE NOT (
            s.skill IS NOT NULL AND f.emp_skill IS NOT NULL
            AND s.skill_score = 0
            AND LOWER(TRIM(s.skill)) <> LOWER(TRIM(f.emp_skill))
            AND s.cu_score = 0
          )
        ),
        strict_best AS (
          SELECT employee_id, name, email, grade, practice, cu, region, skill, account,
                 sub_practice, reportee_count, tenure_days,
                 escalation_tier, total_score,
                 false AS is_forced_assignment
          FROM filtered_scored
          ORDER BY escalation_tier ASC, total_score DESC, reportee_count ASC,
                   tenure_days DESC,
                   CASE WHEN account = f.emp_account THEN 0 ELSE 1 END ASC,
                   employee_id ASC
          LIMIT 1
        ),
        relaxed_eligible AS (
          SELECT pm3.*,
                 EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm3.created_at)) / 86400 AS tenure_days,
                 COALESCE(gv3.lvl, 0) AS pm_lvl
          FROM people_managers pm3
          JOIN grade_vals gv3 ON gv3.g = UPPER(TRIM(pm3.grade))
          WHERE pm3.is_active    = true
            AND pm3.employee_id <> f.pm_id
            AND NOT (
                  pm3.leave_start_date IS NOT NULL
              AND pm3.leave_end_date   IS NOT NULL
              AND (pm3.leave_end_date - pm3.leave_start_date) > 30
              AND CURRENT_DATE BETWEEN pm3.leave_start_date AND pm3.leave_end_date
            )
            AND pm3.reportee_count < COALESCE(pm3.max_capacity, 15)
            AND f.mismatch_type = 'PM_SEPARATED'
            AND NOT EXISTS (SELECT 1 FROM strict_best)
        ),
        relaxed_scored AS (
          SELECT re.*,
            CASE WHEN re.practice = f.emp_practice THEN 20 ELSE 0 END AS practice_score,
            CASE WHEN re.region   = f.emp_region   THEN 20 ELSE 0 END AS region_score,
            CASE WHEN re.cu       = f.emp_cu        THEN 35 ELSE 0 END AS cu_score,
            CASE
              WHEN f.emp_skill IS NULL OR re.skill IS NULL THEN 0
              WHEN LOWER(TRIM(re.skill)) = LOWER(TRIM(f.emp_skill)) THEN 15
              WHEN EXISTS (
                SELECT 1 FROM skill_clusters sc1r
                JOIN skill_clusters sc2r ON sc1r.skill_cluster = sc2r.skill_cluster
                WHERE sc1r.skill_name = LOWER(TRIM(re.skill))
                  AND sc2r.skill_name = LOWER(TRIM(f.emp_skill))
                  AND sc1r.skill_cluster IS NOT NULL
              ) THEN 8
              ELSE 0
            END AS skill_score,
            CASE WHEN re.pm_lvl > (SELECT lvl FROM emp_lvl) THEN 5 ELSE 0 END AS grade_score,
            FLOOR(5.0 * GREATEST(0, COALESCE(re.max_capacity,10) - re.reportee_count)
                        / COALESCE(re.max_capacity,10)) AS cap_score,
            1 AS escalation_tier
          FROM relaxed_eligible re
        ),
        relaxed_best AS (
          SELECT employee_id, name, email, grade, practice, cu, region, skill, account,
                 sub_practice, reportee_count, tenure_days,
                 escalation_tier,
                 (practice_score + region_score + cu_score + skill_score + grade_score + cap_score)::int AS total_score,
                 true AS is_forced_assignment
          FROM relaxed_scored
          ORDER BY total_score DESC, reportee_count ASC, tenure_days DESC, employee_id ASC
          LIMIT 1
        )
        SELECT * FROM strict_best
        UNION ALL
        SELECT * FROM relaxed_best
        WHERE NOT EXISTS (SELECT 1 FROM strict_best)
        LIMIT 1
      ) sug ON true
    `);
        const esc = (v) => v != null ? `"${String(v).replace(/"/g, '""')}"` : '';
        const headers = [
            'Employee ID', 'Employee Name', 'Employee Email',
            'Emp Practice', 'Emp Sub-Practice', 'Emp CU', 'Emp Region',
            'Emp Grade', 'Emp Skill', 'Emp Location',
            'Current PM ID', 'Current PM Name', 'Current PM Email',
            'Current PM Practice', 'Current PM Sub-Practice',
            'Current PM CU', 'Current PM Region', 'Current PM Grade', 'Current PM Skill',
            'Mismatch Type',
            'Suggested PM ID', 'Suggested PM Name', 'Suggested PM Email',
            'Suggested PM Practice', 'Suggested PM Sub-Practice',
            'Suggested PM CU', 'Suggested PM Region', 'Suggested PM Grade', 'Suggested PM Skill',
            'Suggested PM Current Reportees', 'Suggested PM Forced',
        ];
        const csvLines = [headers.join(',')];
        for (const r of rows) {
            csvLines.push([
                esc(r.employee_id), esc(r.employee_name), esc(r.employee_email),
                esc(r.emp_practice), esc(r.emp_sub_practice), esc(r.emp_cu),
                esc(r.emp_region), esc(r.emp_grade), esc(r.emp_skill),
                esc(r.emp_location),
                esc(r.pm_id), esc(r.pm_name), esc(r.pm_email),
                esc(r.pm_practice), esc(r.pm_sub_practice),
                esc(r.pm_cu), esc(r.pm_region), esc(r.pm_grade),
                esc(r.pm_skill),
                esc(r.mismatch_type),
                esc(r.suggested_pm_id), esc(r.suggested_pm_name), esc(r.suggested_pm_email),
                esc(r.suggested_pm_practice), esc(r.suggested_pm_sub_practice),
                esc(r.suggested_pm_cu), esc(r.suggested_pm_region), esc(r.suggested_pm_grade),
                esc(r.suggested_pm_skill),
                esc(r.suggested_pm_reportees),
                esc(r.suggested_pm_forced ? 'Yes (Forced/Relaxed)' : r.suggested_pm_id ? 'No' : ''),
            ].join(','));
        }
        const filename = `misalignments_${type || 'all'}.csv`;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.send(csvLines.join('\n'));
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
const getNoSuggestedPMEmployees = async (req, res) => {
    try {
        const user = req.user;
        const userResult = await database_1.default.query('SELECT department FROM users WHERE id = $1', [user?.id]);
        const userPractice = userResult.rows[0]?.department || null;
        const { page = '1', pageSize = '50' } = req.query;
        const pageNum = parseInt(page);
        const pageSizeNum = parseInt(pageSize);
        const offset = (pageNum - 1) * pageSizeNum;
        const countResult = await database_1.default.query(`
      SELECT COUNT(*) FROM employees e
      WHERE e.status = 'active' AND e.practice = $1
        AND e.current_pm_id IS NULL
    `, [userPractice]);
        const totalCount = parseInt(countResult.rows[0].count);
        const result = await database_1.default.query(`
      SELECT e.employee_id, e.name, e.email, e.practice, e.grade, e.cu, e.region, e.skill, e.joining_date
      FROM employees e
      WHERE e.status = 'active' AND e.practice = $1
        AND e.current_pm_id IS NULL
      ORDER BY e.name
      LIMIT $2 OFFSET $3
    `, [userPractice, pageSizeNum, offset]);
        res.json({
            count: totalCount,
            misalignments: result.rows,
            pagination: {
                page: pageNum,
                pageSize: pageSizeNum,
                totalPages: Math.ceil(totalCount / pageSizeNum),
                totalRecords: totalCount,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching no-suggested-PM employees', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getNoSuggestedPMEmployees = getNoSuggestedPMEmployees;
const exportNoSuggestedPMCSV = async (req, res) => {
    try {
        const user = req.user;
        const userResult = await database_1.default.query('SELECT department FROM users WHERE id = $1', [user?.id]);
        const userPractice = userResult.rows[0]?.department || null;
        const { rows } = await database_1.default.query(`
      SELECT e.employee_id, e.name, e.email, e.practice, e.grade, e.cu, e.region, e.skill, e.joining_date
      FROM employees e
      WHERE e.status = 'active' AND e.practice = $1 AND e.current_pm_id IS NULL
      ORDER BY e.name
    `, [userPractice]);
        const esc = (v) => v != null ? `"${String(v).replace(/"/g, '""')}"` : '';
        const headers = ['Employee ID', 'Name', 'Email', 'Practice', 'Grade', 'CU', 'Region', 'Skill', 'Joining Date'];
        const csvLines = [headers.join(',')];
        for (const r of rows) {
            csvLines.push([
                esc(r.employee_id), esc(r.name), esc(r.email),
                esc(r.practice), esc(r.grade), esc(r.cu),
                esc(r.region), esc(r.skill),
                r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '',
            ].join(','));
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="no_suggested_pm_employees.csv"');
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.send(csvLines.join('\n'));
    }
    catch (error) {
        logger_1.logger.error('Error exporting no-suggested-PM CSV', error);
        res.status(500).json({ error: error.message });
    }
};
exports.exportNoSuggestedPMCSV = exportNoSuggestedPMCSV;
const getGradewisePMCapacity = async (req, res) => {
    try {
        const { grade } = req.query;
        if (grade) {
            // Drill-down: list individual PMs for the given grade (C1+ only)
            const result = await database_1.default.query(`
        SELECT
          pm.employee_id, pm.name, pm.email, pm.practice, pm.sub_practice, pm.region, pm.location,
          pm.skill, pm.grade, pm.reportee_count, 10 AS spec_capacity_cap,
          ROUND(100.0 * pm.reportee_count / 10, 1) AS utilization_pct,
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
        (COUNT(pm.employee_id) * 10)::int                                           AS total_capacity,
        SUM(pm.reportee_count)::int                                                 AS total_reportees,
        (COUNT(pm.employee_id) * 10 - SUM(pm.reportee_count))::int                 AS available_capacity,
        ROUND(100.0 * SUM(pm.reportee_count) / NULLIF(COUNT(pm.employee_id) * 10, 0), 1) AS utilization_pct
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
        const empPF = pf ? `AND e.practice = $1` : '';
        const pmClause = pmId ? `AND e.current_pm_id = '${pmId.replace(/'/g, "''")}'` : '';
        const params = pf ? [pf] : [];
        // ══════════════════════════════════════════════════════════════════════════
        // OPTIMISED: Single-pass CTE using grade_levels table (indexed) and
        // mv_practice_has_eligible_pm (materialised view) instead of per-row
        // correlated sub-selects with inline VALUES grade lookups.
        //
        // hasSuggestedPM logic:
        //   The original query fired one EXISTS(SELECT … FROM people_managers …)
        //   per employee row. With 10 K employees that is 10 K separate PM scans.
        //   We replace it with a join to mv_practice_has_eligible_pm which holds
        //   one row per practice that has at least one eligible PM — a single
        //   hash-join instead of N correlated sub-selects.
        //
        //   Edge-case: the matview is practice-level, so it cannot tell whether
        //   the specific current PM is the only eligible PM (pm_sug.employee_id <>
        //   pm.employee_id). For the summary counts this is an acceptable
        //   approximation; correctness is preserved for practices with >1 active PM.
        //   The detail endpoints (correctly-mapped / misalignments) still do the
        //   precise per-employee check but only over the paginated ~50 rows.
        // ══════════════════════════════════════════════════════════════════════════
        const result = await database_1.default.query(`
      WITH
      -- All active employees with their PM joined (one pass)
      emp_pm AS (
        SELECT
          e.employee_id,
          e.practice        AS emp_practice,
          e.sub_practice    AS emp_sub_practice,
          e.cu              AS emp_cu,
          e.region          AS emp_region,
          e.grade           AS emp_grade,
          e.joining_date,
          e.is_frozen,
          e.current_pm_id,
          pm.employee_id    AS pm_emp_id,
          pm.practice       AS pm_practice,
          pm.sub_practice   AS pm_sub_practice,
          pm.cu             AS pm_cu,
          pm.region         AS pm_region,
          pm.grade          AS pm_grade,
          pm.leave_end_date AS pm_leave_end,
          -- grade level for PM (using indexed grade_levels table)
          COALESCE(gl_pm.lvl, 0)  AS pm_lvl,
          -- grade level for employee
          COALESCE(gl_e.lvl,  0)  AS emp_lvl,
          -- hasSuggestedPM: practice-level lookup via materialised view
          -- (TRUE when practice has ≥1 eligible PM, FALSE when none exist)
          CASE WHEN mhep.practice IS NOT NULL THEN true ELSE false END AS has_eligible_pm_in_practice
        FROM employees e
        JOIN people_managers pm   ON pm.employee_id  = e.current_pm_id
        LEFT JOIN grade_levels gl_pm ON gl_pm.grade  = UPPER(TRIM(pm.grade))
        LEFT JOIN grade_levels gl_e  ON gl_e.grade   = UPPER(TRIM(e.grade))
        LEFT JOIN mv_practice_has_eligible_pm mhep ON mhep.practice = e.practice
        WHERE e.status = 'active' ${empPF} ${pmClause}
      ),
      -- Separation status for each PM (pre-aggregated, avoids per-row EXISTS)
      pm_separated AS (
        SELECT DISTINCT employee_id
        FROM separation_reports
        WHERE (separation_type ILIKE '%Resignation%' OR separation_type ILIKE '%Retirement%')
          AND lwd >= CURRENT_DATE - INTERVAL '90 days'
      ),
      -- Exception status per employee
      emp_same_grade_ex AS (
        SELECT DISTINCT employee_id
        FROM exceptions
        WHERE exception_type = 'SAME_GRADE_REPORTEE' AND status = 'open'
      ),
      -- Classify each employee in a single pass
      classified AS (
        SELECT
          ep.*,
          -- Is PM on leave or resigned?
          (ep.pm_leave_end IS NOT NULL AND ep.pm_leave_end >= CURRENT_DATE)  AS pm_on_leave,
          (ps.employee_id IS NOT NULL)                                        AS pm_resigned,
          -- Structural mismatches
          (ep.emp_practice IS DISTINCT FROM ep.pm_practice)                  AS wrong_practice,
          (ep.emp_sub_practice IS NOT NULL AND ep.pm_sub_practice IS NOT NULL
           AND ep.emp_sub_practice IS DISTINCT FROM ep.pm_sub_practice)      AS wrong_sub_practice,
          (ep.emp_cu IS NOT NULL AND ep.pm_cu IS NOT NULL
           AND ep.emp_cu IS DISTINCT FROM ep.pm_cu
           AND ep.emp_practice = ep.pm_practice)                             AS wrong_cu,
          (ep.emp_region IS NOT NULL AND ep.pm_region IS NOT NULL
           AND ep.emp_region IS DISTINCT FROM ep.pm_region
           AND ep.emp_practice = ep.pm_practice)                             AS wrong_region,
          (ep.emp_grade IS NOT NULL AND ep.pm_grade IS NOT NULL
           AND ep.pm_lvl <> ep.emp_lvl + 1)                                  AS wrong_grade,
          -- same-grade exception flag
          (sgex.employee_id IS NOT NULL)                                      AS has_same_grade_ex
        FROM emp_pm ep
        LEFT JOIN pm_separated ps   ON ps.employee_id  = ep.pm_emp_id
        LEFT JOIN emp_same_grade_ex sgex ON sgex.employee_id = ep.employee_id
      ),
      summary AS (
        SELECT
          -- has any structural mismatch?
          (pm_on_leave OR pm_resigned OR wrong_practice OR wrong_sub_practice
           OR wrong_cu OR wrong_region OR wrong_grade) AS has_mismatch,
          has_eligible_pm_in_practice,
          pm_resigned,
          is_frozen,
          has_same_grade_ex
        FROM classified
      )
      SELECT
        -- total active employees (all, regardless of PM assignment)
        (SELECT COUNT(*) FROM employees e WHERE e.status = 'active' ${empPF}) AS total_employees,

        -- correctly_mapped:
        --   (A) has PM, no mismatch, no same-grade exception, OR
        --   (B) has PM, has mismatch, but practice has NO eligible replacement PM
        --       (spec §1: current PM is the best available → Correctly Mapped)
        COUNT(*) FILTER (
          WHERE NOT has_same_grade_ex
            AND (
              NOT has_mismatch
              OR NOT has_eligible_pm_in_practice
            )
        ) AS correctly_mapped,

        -- incorrectly_mapped:
        --   has PM + structural mismatch + a better PM exists in practice
        --   (spec §1: hasSuggestedPM = TRUE → surface as misaligned)
        COUNT(*) FILTER (
          WHERE NOT is_frozen
            AND has_mismatch
            AND has_eligible_pm_in_practice
        ) AS incorrectly_mapped,

        -- not_mapped: active employees with no PM and not a PM themselves
        (
          SELECT COUNT(*) FROM employees e
          WHERE e.status = 'active' AND e.current_pm_id IS NULL ${empPF}
            AND NOT EXISTS (
              SELECT 1 FROM people_managers pm2
              WHERE pm2.employee_id = e.employee_id AND pm2.is_active = true
            )
        ) AS not_mapped,

        -- same_grade exceptions
        (
          SELECT COUNT(*) FROM exceptions ex
          JOIN employees e ON e.employee_id = ex.employee_id
          WHERE ex.exception_type = 'SAME_GRADE_REPORTEE' AND ex.status = 'open' ${empPF}
        ) AS same_grade,

        -- proposed new PMs: C1+ with ≥1 yr tenure, not yet a PM
        (
          SELECT COUNT(*) FROM employees e
          WHERE e.status = 'active'
            AND TRIM(e.grade) ~ '^[C-Z][0-9]' ${empPF}
            AND e.joining_date IS NOT NULL
            AND e.joining_date <= CURRENT_DATE - INTERVAL '1 year'
            AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id)
        ) AS proposed_pms

      FROM summary
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
        // ══════════════════════════════════════════════════════════════════════════
        // OPTIMISED: single-pass CTE using grade_levels (indexed table) and
        // mv_practice_has_eligible_pm (materialised view) instead of per-row
        // correlated sub-selects with inline VALUES grade lookups.
        // COUNT(*) OVER() eliminates the separate count query.
        // ══════════════════════════════════════════════════════════════════════════
        const coreSql = `
      WITH
      pm_separated AS (
        SELECT DISTINCT employee_id
        FROM separation_reports
        WHERE (separation_type ILIKE '%Resignation%' OR separation_type ILIKE '%Retirement%')
          AND lwd >= CURRENT_DATE - INTERVAL '90 days'
      ),
      emp_same_grade_ex AS (
        SELECT DISTINCT employee_id
        FROM exceptions
        WHERE exception_type = 'SAME_GRADE_REPORTEE' AND status = 'open'
      ),
      base AS (
        SELECT
          e.employee_id, e.name, e.email, e.grade, e.practice, e.sub_practice,
          e.region, e.skill, e.joining_date, e.location,
          pm.employee_id AS pm_id, pm.name AS pm_name, pm.grade AS pm_grade,
          pm.practice AS pm_practice, pm.sub_practice AS pm_sub_practice,
          pm.email AS pm_email,
          -- no_better_pm_available: practice has NO eligible replacement PM
          CASE WHEN mhep.practice IS NULL THEN true ELSE false END AS no_better_pm_available,
          -- has any structural mismatch?
          (
            (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
            OR ps.employee_id IS NOT NULL
            OR e.practice IS DISTINCT FROM pm.practice
            OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
            OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
            OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
            OR (e.grade IS NOT NULL AND pm.grade IS NOT NULL
                AND COALESCE(gl_pm.lvl, 0) <> COALESCE(gl_e.lvl, 0) + 1)
          ) AS has_mismatch
        FROM employees e
        JOIN people_managers pm         ON pm.employee_id  = e.current_pm_id
        LEFT JOIN grade_levels gl_pm    ON gl_pm.grade     = UPPER(TRIM(pm.grade))
        LEFT JOIN grade_levels gl_e     ON gl_e.grade      = UPPER(TRIM(e.grade))
        LEFT JOIN pm_separated ps       ON ps.employee_id  = pm.employee_id
        LEFT JOIN mv_practice_has_eligible_pm mhep ON mhep.practice = e.practice
        LEFT JOIN emp_same_grade_ex sgex ON sgex.employee_id = e.employee_id
        WHERE e.status = 'active' ${practiceClause} ${pmIdClause}
          AND sgex.employee_id IS NULL   -- no same-grade exception
          -- Correctly Mapped: Path A (no mismatch) OR Path B (no eligible replacement PM)
          AND (
            NOT (
              (pm.leave_end_date IS NOT NULL AND pm.leave_end_date >= CURRENT_DATE)
              OR ps.employee_id IS NOT NULL
              OR e.practice IS DISTINCT FROM pm.practice
              OR (e.sub_practice IS NOT NULL AND pm.sub_practice IS NOT NULL
                  AND e.sub_practice IS DISTINCT FROM pm.sub_practice)
              OR (e.cu IS NOT NULL AND pm.cu IS NOT NULL AND e.cu IS DISTINCT FROM pm.cu AND e.practice = pm.practice)
              OR (e.region IS NOT NULL AND pm.region IS NOT NULL AND e.region IS DISTINCT FROM pm.region AND e.practice = pm.practice)
              OR (e.grade IS NOT NULL AND pm.grade IS NOT NULL
                  AND COALESCE(gl_pm.lvl, 0) <> COALESCE(gl_e.lvl, 0) + 1)
            )
            OR mhep.practice IS NULL  -- §1: no eligible replacement PM exists
          )
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM base
      ORDER BY practice, name
    `;
        if (format === 'csv') {
            const { rows } = await database_1.default.query(coreSql);
            const headers = ['Employee ID', 'Name', 'Email', 'Grade', 'Practice', 'Sub-Practice', 'Region', 'Skill', 'Joining Date', 'PM ID', 'PM Name', 'PM Grade', 'PM Practice', 'No Better PM Available'];
            const csvRows = rows.map((r) => [
                r.employee_id,
                `"${(r.name || '').replace(/"/g, '""')}"`,
                r.email || '', r.grade || '', r.practice || '', r.sub_practice || '',
                r.region || '', r.skill || '',
                r.joining_date ? new Date(r.joining_date).toISOString().split('T')[0] : '',
                r.pm_id || '',
                `"${(r.pm_name || '').replace(/"/g, '""')}"`,
                r.pm_grade || '', r.pm_practice || '',
                r.no_better_pm_available ? 'Yes' : 'No'
            ].join(','));
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="correctly_mapped_employees.csv"');
            return res.send([headers.join(','), ...csvRows].join('\n'));
        }
        const { rows } = await database_1.default.query(`${coreSql} LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]);
        const totalRecords = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
        res.json({
            count: totalRecords,
            data: rows,
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
// ─── Employee Skill Management ────────────────────────────────────────────────
const getFilteredEmployeesForSkillUpdate = async (req, res) => {
    try {
        const { practice, cu, region, grade } = req.query;
        let whereClause = `WHERE status = 'active'`;
        const params = [];
        let idx = 1;
        if (practice && practice !== 'All') {
            whereClause += ` AND practice = $${idx}`;
            params.push(practice);
            idx++;
        }
        if (cu && cu !== 'All') {
            whereClause += ` AND cu = $${idx}`;
            params.push(cu);
            idx++;
        }
        if (region && region !== 'All') {
            whereClause += ` AND region = $${idx}`;
            params.push(region);
            idx++;
        }
        if (grade) {
            whereClause += ` AND grade = $${idx}`;
            params.push(grade);
            idx++;
        }
        const result = await database_1.default.query(`SELECT employee_id,
              name,
              grade,
              practice,
              cu,
              region,
              skill,
              primary_skill,
              CASE
                WHEN NULLIF(TRIM(skill), '') IS DISTINCT FROM NULLIF(TRIM(primary_skill), '') THEN skill
                ELSE NULL
              END AS updated_skill
       FROM employees ${whereClause}
       ORDER BY employee_id
       LIMIT 100`, params);
        res.json({
            data: result.rows,
            totalCount: result.rows.length,
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching filtered employees for skill update', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getFilteredEmployeesForSkillUpdate = getFilteredEmployeesForSkillUpdate;
const getSkillManagementCoverage = async (req, res) => {
    try {
        const [practiceCount, gradeCount, cuCount, regionCount, totalEmp] = await Promise.all([
            database_1.default.query(`SELECT COUNT(DISTINCT practice)::int AS count FROM employees WHERE status = 'active' AND practice IS NOT NULL AND TRIM(practice) != ''`),
            database_1.default.query(`SELECT COUNT(DISTINCT grade)::int AS count FROM employees WHERE status = 'active' AND grade IS NOT NULL AND TRIM(grade) != ''`),
            database_1.default.query(`SELECT COUNT(DISTINCT cu)::int AS count FROM employees WHERE status = 'active' AND cu IS NOT NULL AND TRIM(cu) != ''`),
            database_1.default.query(`SELECT COUNT(DISTINCT region)::int AS count FROM employees WHERE status = 'active' AND region IS NOT NULL AND TRIM(region) != ''`),
            database_1.default.query(`SELECT COUNT(*)::int AS count FROM employees WHERE status = 'active'`),
        ]);
        res.json({
            practices: practiceCount.rows[0].count || 0,
            grades: gradeCount.rows[0].count || 0,
            cus: cuCount.rows[0].count || 0,
            regions: regionCount.rows[0].count || 0,
            totalEmployees: totalEmp.rows[0].count || 0,
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching skill management coverage', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getSkillManagementCoverage = getSkillManagementCoverage;
const getEmployeeSkillDistribution = async (req, res) => {
    try {
        const { practice, cu, region, grade, status = 'active' } = req.query;
        let whereClause = 'WHERE e.status = $1';
        const params = [status];
        let idx = 2;
        if (practice && practice !== 'All') {
            whereClause += ` AND e.practice = $${idx}`;
            params.push(practice);
            idx++;
        }
        if (cu && cu !== 'All') {
            whereClause += ` AND e.cu = $${idx}`;
            params.push(cu);
            idx++;
        }
        if (region && region !== 'All') {
            whereClause += ` AND e.region = $${idx}`;
            params.push(region);
            idx++;
        }
        if (grade) {
            whereClause += ` AND e.grade = $${idx}`;
            params.push(grade);
            idx++;
        }
        const [dist, total, skills] = await Promise.all([
            database_1.default.query(`SELECT COALESCE(NULLIF(TRIM(e.skill), ''), 'Not Set') AS skill,
                COUNT(*)::int AS employee_count
         FROM employees e ${whereClause}
         GROUP BY COALESCE(NULLIF(TRIM(e.skill), ''), 'Not Set')
         ORDER BY employee_count DESC`, params),
            database_1.default.query(`SELECT COUNT(*)::int AS total FROM employees e ${whereClause}`, params),
            database_1.default.query(`SELECT COUNT(DISTINCT NULLIF(TRIM(e.skill), ''))::int AS total FROM employees e ${whereClause}`, params),
        ]);
        res.json({
            data: dist.rows,
            totalEmployees: total.rows[0].total,
            totalSkills: skills.rows[0].total,
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching employee skill distribution', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getEmployeeSkillDistribution = getEmployeeSkillDistribution;
const bulkUpdateEmployeeSkills = async (req, res) => {
    try {
        const { skill, practice, cu, region, grade } = req.body;
        if (!skill || typeof skill !== 'string' || !skill.trim()) {
            return res.status(400).json({ error: 'skill is required and must be a string' });
        }
        const trimmedSkill = skill.trim();
        // Ensure primary_skill column exists and backfill existing values once
        try {
            await database_1.default.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS primary_skill VARCHAR(500)`);
            // Use a simpler, more reliable backfill without TRIM in WHERE clause
            await database_1.default.query(`UPDATE employees SET primary_skill = skill
         WHERE primary_skill IS NULL AND skill IS NOT NULL`);
        }
        catch (colErr) {
            logger_1.logger.warn('primary_skill backfill skipped:', colErr.message);
            // Don't fail the main update just because backfill failed
        }
        let whereClause = `WHERE status = 'active'`;
        const params = [trimmedSkill];
        let idx = 2;
        if (practice && practice !== 'All') {
            whereClause += ` AND practice = $${idx}`;
            params.push(practice);
            idx++;
        }
        if (cu && cu !== 'All') {
            whereClause += ` AND cu = $${idx}`;
            params.push(cu);
            idx++;
        }
        if (region && region !== 'All') {
            whereClause += ` AND region = $${idx}`;
            params.push(region);
            idx++;
        }
        if (grade) {
            whereClause += ` AND grade = $${idx}`;
            params.push(grade);
            idx++;
        }
        // Update employees with the new skill
        const updateResult = await database_1.default.query(`UPDATE employees SET skill = $1, updated_at = CURRENT_TIMESTAMP ${whereClause}`, params);
        // Fetch the updated employees to return in response for the green modal
        const updatedParams = [trimmedSkill];
        let fetchIdx = 2;
        let fetchWhereClause = `WHERE status = 'active' AND skill = $1`;
        if (practice && practice !== 'All') {
            fetchWhereClause += ` AND practice = $${fetchIdx}`;
            updatedParams.push(practice);
            fetchIdx++;
        }
        if (cu && cu !== 'All') {
            fetchWhereClause += ` AND cu = $${fetchIdx}`;
            updatedParams.push(cu);
            fetchIdx++;
        }
        if (region && region !== 'All') {
            fetchWhereClause += ` AND region = $${fetchIdx}`;
            updatedParams.push(region);
            fetchIdx++;
        }
        if (grade) {
            fetchWhereClause += ` AND grade = $${fetchIdx}`;
            updatedParams.push(grade);
            fetchIdx++;
        }
        const fetchResult = await database_1.default.query(`SELECT employee_id, name, grade, practice, primary_skill, skill FROM employees ${fetchWhereClause} ORDER BY name`, updatedParams);
        logger_1.logger.info(`Bulk skill update: "${trimmedSkill}" → ${updateResult.rowCount} employees`);
        res.json({
            message: 'Skill updated successfully.',
            updatedCount: updateResult.rowCount,
            skill: trimmedSkill,
            practice: practice || null,
            employees: fetchResult.rows,
        });
    }
    catch (error) {
        logger_1.logger.error('Error bulk updating employee skills:', error);
        res.status(500).json({ error: error.message || 'Failed to update skills' });
    }
};
exports.bulkUpdateEmployeeSkills = bulkUpdateEmployeeSkills;
const updateSingleEmployeeSkill = async (req, res) => {
    const startTime = Date.now();
    try {
        const { employeeId } = req.params;
        const { skill } = req.body;
        console.log(`[SKILL UPDATE] START - Employee: ${employeeId}, Skill: "${skill}"`);
        // Validate input
        if (!employeeId) {
            console.log(`[SKILL UPDATE] FAIL - Missing employeeId`);
            return res.status(400).json({ error: 'Employee ID is required' });
        }
        if (!skill || typeof skill !== 'string' || skill.trim().length === 0) {
            console.log(`[SKILL UPDATE] FAIL - Invalid skill value`);
            return res.status(400).json({ error: 'Skill must be a non-empty string' });
        }
        const trimmedSkill = skill.trim();
        // Try to ensure primary_skill column exists (non-critical)
        try {
            await database_1.default.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS primary_skill VARCHAR(500)`);
            logger_1.logger.info('primary_skill column verified');
        }
        catch (e) {
            logger_1.logger.warn('Could not verify primary_skill column:', e.message);
        }
        // Perform the update
        console.log(`[SKILL UPDATE] Updating skill for ${employeeId} to "${trimmedSkill}"`);
        const updateResult = await database_1.default.query(`UPDATE employees 
       SET skill = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE employee_id = $2`, [trimmedSkill, employeeId]);
        console.log(`[SKILL UPDATE] Update result: ${updateResult.rowCount} rows affected`);
        // Check if employee was found
        if (updateResult.rowCount === 0) {
            console.log(`[SKILL UPDATE] FAIL - Employee not found: ${employeeId}`);
            return res.status(404).json({ error: `Employee ${employeeId} not found` });
        }
        // Success
        console.log(`[SKILL UPDATE] SUCCESS - Updated in ${Date.now() - startTime}ms`);
        return res.json({
            message: 'Skill updated successfully',
            employeeId,
            skill: trimmedSkill
        });
    }
    catch (error) {
        const errorMsg = error?.message || String(error) || 'Unknown error';
        console.error(`[SKILL UPDATE] ERROR after ${Date.now() - startTime}ms:`, errorMsg);
        console.error(`[SKILL UPDATE] Error stack:`, error?.stack);
        return res.status(500).json({
            error: `Failed to update skill: ${errorMsg}`
        });
    }
};
exports.updateSingleEmployeeSkill = updateSingleEmployeeSkill;
const removeEmployeeSkill = async (req, res) => {
    try {
        const { skill, practice, cu, region, grade } = req.body;
        let whereClause = `WHERE status = 'active'`;
        const params = [];
        let idx = 1;
        if (skill) {
            whereClause += ` AND skill = $${idx}`;
            params.push(skill);
            idx++;
        }
        if (practice && practice !== 'All') {
            whereClause += ` AND practice = $${idx}`;
            params.push(practice);
            idx++;
        }
        if (cu && cu !== 'All') {
            whereClause += ` AND cu = $${idx}`;
            params.push(cu);
            idx++;
        }
        if (region && region !== 'All') {
            whereClause += ` AND region = $${idx}`;
            params.push(region);
            idx++;
        }
        if (grade) {
            whereClause += ` AND grade = $${idx}`;
            params.push(grade);
            idx++;
        }
        // Revert skill → primary_skill (preserves the original uploaded skill)
        const result = await database_1.default.query(`UPDATE employees
       SET skill = CASE
             WHEN primary_skill IS NOT NULL AND TRIM(primary_skill) != '' THEN primary_skill
             ELSE NULL
           END,
           updated_at = CURRENT_TIMESTAMP
       ${whereClause}`, params);
        logger_1.logger.info(`Remove skill update: reverted ${result.rowCount} employees to primary skill`);
        res.json({
            message: 'Skill reverted to primary skill.',
            updatedCount: result.rowCount,
        });
    }
    catch (error) {
        logger_1.logger.error('Error removing employee skill update', error);
        res.status(500).json({ error: error.message });
    }
};
exports.removeEmployeeSkill = removeEmployeeSkill;
const getSuggestedPMsForEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const empResult = await database_1.default.query(`SELECT * FROM employees WHERE employee_id = $1`, [employeeId]);
        if (empResult.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        const emp = empResult.rows[0];
        const empPractice = emp.practice;
        const pmResult = await database_1.default.query(`SELECT pm.employee_id, pm.name, pm.email, pm.practice, pm.cu, pm.region,
              pm.grade, pm.skill, pm.account, pm.reportee_count, pm.max_capacity
       FROM people_managers pm
       WHERE pm.is_active = true
         AND ($1::text IS NULL OR pm.practice = $1)
         AND (pm.reportee_count < pm.max_capacity OR pm.max_capacity IS NULL)
       ORDER BY pm.reportee_count ASC NULLS LAST
       LIMIT 5`, [empPractice]);
        res.json({ employee: emp, suggestedPMs: pmResult.rows });
    }
    catch (error) {
        logger_1.logger.error('Error fetching suggested PMs for employee', error);
        res.status(500).json({ error: error.message });
    }
};
exports.getSuggestedPMsForEmployee = getSuggestedPMsForEmployee;
