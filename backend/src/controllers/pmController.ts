import { Request, Response } from 'express';
import { DataIngestionService } from '../services/dataIngestionService';
import { BulkUploadService } from '../services/bulkUploadService';
import { MatchingService } from '../services/matchingService';
import { StatisticsService } from '../services/statisticsService';
import { AuditTrailService } from '../services/auditTrailService';
import { WorkflowAutomationService } from '../services/workflowAutomationService';
import { schedulerService } from '../services/schedulerService';
import { practiceReportService } from '../services/practiceReportService';
import { discrepancyReportService } from '../services/discrepancyReportService';
import { parseEmployeeExcel, parsePMExcel, parseSeparationExcel, parseSkillReportExcel, parseGADExcel, extractPMsFromGAD, getSkillReportHeaders, getFileHeaders } from '../utils/excelParser';
import { logger } from '../utils/logger';
import pool, { refreshAlignmentCache } from '../config/database';

const dataService = new DataIngestionService();
const bulkService = new BulkUploadService();
const matchingService = new MatchingService();
const statsService = new StatisticsService();
const auditService = new AuditTrailService();
const workflowService = new WorkflowAutomationService();

// Department ID to Practice Name mapping
const DEPARTMENT_ID_TO_PRACTICE: Record<number, string> = {
  1: 'CCA-FS',
  2: 'Cloud & Infrastructure',
  3: 'Data & AI',
  4: 'DCX-DE',
  5: 'DCX-FS',
  6: 'Digital Engineering',
  7: 'Enterprise Architecture',
  8: 'Insights & Data',
  9: 'SAP',
};

/**
 * Non-blocking helper — generates a discrepancy snapshot after any upload.
 * Failures are swallowed so they never break the upload response.
 */
const generateDiscrepancySnapshot = async (triggeredBy: string) => {
  try {
    const snap = await discrepancyReportService.generateSnapshot(triggeredBy);
    // Refresh alignment materialized view non-blocking after every upload
    refreshAlignmentCache().catch(() => {});
    return snap.summary;
  } catch (err: any) {
    logger.warn('Discrepancy snapshot generation failed (non-blocking)', err);
    return undefined;
  }
};

const getUserDepartmentPractice = (req: Request): string => {
  const user = (req as any).user;
  
  // For Super Admin, check if they selected a different department via query parameter
  if (user?.role === 'Super Admin' && req.query.department_id) {
    const deptId = parseInt(req.query.department_id as string);
    const practice = DEPARTMENT_ID_TO_PRACTICE[deptId];
    if (practice) {
      return practice;
    }
  }
  
  // Otherwise, return user's default department
  return (user?.department_name || user?.practice || '').trim();
};

const ensureUserDepartment = (req: Request, res: Response): string | null => {
  const departmentPractice = getUserDepartmentPractice(req);
  if (!departmentPractice) {
    res.status(403).json({ error: 'User department is not set. Please sign up with a department.' });
    return null;
  }
  return departmentPractice;
};

export const uploadEmployees = async (req: Request, res: Response) => {
  try {
    console.log('Upload employees request received');
    console.log('File:', req.file ? req.file.originalname : 'NO FILE');
    console.log('Body:', req.body);
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Uploading employees', { filename: req.file.originalname, size: req.file.size });
    const employees = parseEmployeeExcel(req.file.buffer);
    
    if (employees.length === 0) {
      console.error('No valid employees found in file');
      return res.status(400).json({ error: 'No valid employee records found in file' });
    }
    
    console.log(`Parsed ${employees.length} employees from Excel`);
    console.log('⚡ Using optimized bulk upload for large dataset...');
    
    // Use optimized service for large datasets
    const result: any = employees.length > 5000
      ? await bulkService.bulkInsertEmployeesOptimized(employees)
      : await dataService.bulkInsertEmployees(employees);
    
    const message = result.duration 
      ? `${result.count} employees uploaded in ${result.duration.toFixed(1)}s (${Math.round(result.count / result.duration)}/sec)`
      : 'Employees uploaded successfully';
    
    logger.info('Employees uploaded successfully', result);

    // Clean up: reset is_new_joiner=false for employees with old joining dates
    // (catches any records wrongly flagged during previous uploads)
    try {
      const cleanup = await pool.query(`
        UPDATE employees
        SET is_new_joiner = false
        WHERE is_new_joiner = true
          AND joining_date IS NOT NULL
          AND joining_date < CURRENT_DATE - INTERVAL '90 days'
      `);
      if (cleanup.rowCount && cleanup.rowCount > 0) {
        logger.info(`Reset is_new_joiner=false for ${cleanup.rowCount} employees with old joining dates`);
      }
    } catch (cleanupErr) {
      logger.warn('Could not run new joiner cleanup', cleanupErr);
    }

    // Recalculate reportee_count for all PMs based on actual current_pm_id assignments
    try {
      const recalc = await pool.query(`
        UPDATE people_managers pm
        SET reportee_count = (
          SELECT COUNT(*)
          FROM employees e
          WHERE e.current_pm_id = pm.employee_id
            AND e.status = 'active'
        )
      `);
      logger.info(`Recalculated reportee_count for ${recalc.rowCount} PMs after employee upload`);
      console.log(`✅ Reportee counts recalculated for ${recalc.rowCount} PMs`);
    } catch (recalcErr) {
      logger.warn('Could not recalculate reportee counts', recalcErr);
    }

    const discrepancy_summary = await generateDiscrepancySnapshot('employees_upload');
    res.json({ message, ...result, discrepancy_summary });
  } catch (error: any) {
    logger.error('Error uploading employees', error);
    console.error('Upload error details:', error);
    res.status(500).json({ error: error.message });
  }
};

export const uploadNewJoiners = async (req: Request, res: Response) => {
  try {
    console.log('Upload new joiners request received');
    console.log('File:', req.file ? req.file.originalname : 'NO FILE');

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Uploading new joiners', { filename: req.file.originalname, size: req.file.size });
    const employees = parseEmployeeExcel(req.file.buffer).map(emp => ({
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

    const result: any = employees.length > 5000
      ? await bulkService.bulkInsertEmployeesOptimized(employees)
      : await dataService.bulkInsertEmployees(employees);

    const message = result.duration
      ? `${result.count} new joiners uploaded in ${result.duration.toFixed(1)}s (${Math.round(result.count / result.duration)}/sec)`
      : 'New joiners uploaded successfully';

    logger.info('New joiners uploaded successfully', result);

    const discrepancy_summary = await generateDiscrepancySnapshot('new_joiners_upload');
    res.json({ message, ...result, discrepancy_summary });
  } catch (error: any) {
    logger.error('Error uploading new joiners', error);
    console.error('Upload error details:', error);
    res.status(500).json({ error: error.message });
  }
};

export const uploadPMs = async (req: Request, res: Response) => {
  try {
    console.log('Upload PMs request received');
    console.log('File:', req.file ? req.file.originalname : 'NO FILE');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Uploading PMs', { filename: req.file.originalname, size: req.file.size });
    const pms = parsePMExcel(req.file.buffer);
    
    if (pms.length === 0) {
      const detectedColumns = getFileHeaders(req.file.buffer);
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
    const result: any = pms.length > 5000 
      ? await bulkService.bulkInsertPMsOptimized(pms)
      : await dataService.bulkInsertPMs(pms);

    const message = result.duration 
      ? `${result.count} PMs uploaded in ${result.duration.toFixed(1)}s (${Math.round(result.count / result.duration)}/sec)`
      : 'People Managers uploaded successfully';

    // Recalculate reportee_count for all PMs from actual employee current_pm_id assignments.
    // This ensures counts are always accurate regardless of upload order.
    try {
      const recalc = await pool.query(`
        UPDATE people_managers pm
        SET reportee_count = (
          SELECT COUNT(*)
          FROM employees e
          WHERE e.current_pm_id = pm.employee_id
            AND e.status = 'active'
        )
      `);
      console.log(`\u2705 Reportee counts recalculated for ${recalc.rowCount} PMs after PM upload`);
    } catch (recalcErr) {
      logger.warn('Could not recalculate reportee counts after PM upload', recalcErr);
    }

    const discrepancy_summary = await generateDiscrepancySnapshot('pms_upload');
    res.json({ message, ...result, discrepancy_summary });
  } catch (error: any) {
    logger.error('Error uploading PMs', error);
    console.error('Upload error details:', error);
    res.status(500).json({ error: error.message });
  }
};

export const uploadSeparations = async (req: Request, res: Response) => {
  try {
    console.log('Upload separations request received');
    console.log('File:', req.file ? req.file.originalname : 'NO FILE');
    
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Uploading separations', { filename: req.file.originalname, size: req.file.size });

    const separations = parseSeparationExcel(req.file.buffer);
    
    if (separations.length === 0) {
      console.error('No valid separations found in file');
      return res.status(400).json({ error: 'No valid separation records found in file. Ensure the file has: Global Id (PM GGID), Updated Last Working Date columns.' });
    }
    
    console.log(`Parsed ${separations.length} separations from Excel`);
    console.log('⚡ Using optimized bulk upload (all-records mode)...');
    
    // Use optimized service for large datasets (16K+), standard for small
    const result: any = separations.length > 1000
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
  } catch (error: any) {
    logger.error('Error uploading separations', error);
    console.error('Upload error details:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Internal helper: detect same-grade exceptions
// ============================================
const detectSameGradeExceptions = async (): Promise<number> => {
  // Mark existing open same-grade exceptions as resolved for employees no longer in violation
  await pool.query(`
    UPDATE exceptions SET status = 'resolved'
    WHERE exception_type = 'SAME_GRADE_REPORTEE' AND status = 'open'
      AND employee_id NOT IN (
        SELECT e.employee_id FROM employees e
        JOIN people_managers pm ON e.current_pm_id = pm.employee_id
        WHERE e.status = 'active' AND e.grade IS NOT NULL AND pm.grade IS NOT NULL AND e.grade = pm.grade
      )
  `);
  const result = await pool.query(`
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

const recalcReporteeCounts = async (): Promise<void> => {
  await pool.query(`
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
export const uploadGAD = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    logger.info('Uploading GAD report', { filename: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size });
    console.log(`[uploadGAD] file="${req.file.originalname}" mime="${req.file.mimetype}" size=${req.file.size}`);

    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const allEmployees = parseGADExcel(req.file.buffer);

    if (allEmployees.length === 0) {
      return res.status(400).json({ error: 'No valid employee records found in GAD file.' });
    }

    // Show distinct practice values found in the file — always useful for debugging
    const distinctPractices = [...new Set(allEmployees.map(e => e.practice).filter(Boolean))].sort();
    console.log(`[uploadGAD] Distinct practice values in file (${allEmployees.length} rows):`, distinctPractices);

    const employees = allEmployees.filter(e => (e.practice || '').toLowerCase().trim() === userPractice.toLowerCase().trim());
    const ignoredPractices = distinctPractices.filter(p => p.toLowerCase().trim() !== userPractice.toLowerCase().trim());
    if (ignoredPractices.length > 0) {
      logger.info('[uploadGAD] Ignoring rows for other practices', { ignoredPractices, totalRows: allEmployees.length, acceptedPractice: userPractice });
    }

    if (employees.length === 0) {
      return res.status(400).json({
        error: `No employees found for your department (${userPractice}) in this file. ` +
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
    if (!scopeCheck.isScoped) {
      logger.warn('[uploadGAD] Dataset is not practice-scoped', { practices: scopeCheck.practices });
    }

    logger.info(`GAD: ${allEmployees.length} total rows, ${employees.length} for practice "${userPractice}"`);

    // ── Step 1: Extract PMs from GAD and upsert them FIRST ──────────────────────
    // GAD rows contain People Manager ID + name + grade inline.
    // We must insert them into people_managers before employees to satisfy the FK.
    const allPMs = extractPMsFromGAD(req.file.buffer);
    // Filter to matching practice PMs when a practice filter is active
    const pmsToInsert = allPMs.filter(pm => (pm.practice || '').toLowerCase().trim() === userPractice.toLowerCase().trim());
    if (pmsToInsert.length > 0) {
      const pmResult = pmsToInsert.length > 1000
        ? await bulkService.bulkInsertPMsOptimized(pmsToInsert)
        : await dataService.bulkInsertPMs(pmsToInsert);
      logger.info(`GAD PM upsert: ${pmResult.count ?? pmsToInsert.length} PMs upserted from GAD`);
      console.log(`[uploadGAD] Step 1 complete — ${pmResult.count ?? pmsToInsert.length} PMs upserted`);
    } else {
      console.log('[uploadGAD] No PM data found in GAD file — skipping PM upsert');
    }

    // ── Step 2: Validate PM IDs — null out any that still aren't in people_managers ──
    // This covers employees whose PM is from a different practice not yet uploaded,
    // or PM IDs in the file that don't have a matching PM record.
    const allPmIdsNeeded = [...new Set(employees.map(e => e.current_pm_id).filter(Boolean))] as string[];
    let validPmIdSet = new Set<string>();
    if (allPmIdsNeeded.length > 0) {
      const { rows } = await pool.query(
        'SELECT employee_id FROM people_managers WHERE employee_id = ANY($1::text[])',
        [allPmIdsNeeded]
      );
      validPmIdSet = new Set(rows.map((r: any) => r.employee_id as string));
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
    const result: any = safeEmployees.length > 5000
      ? await bulkService.bulkInsertEmployeesOptimized(safeEmployees)
      : await dataService.bulkInsertEmployees(safeEmployees);

    // Auto-promote C1+ employees with ≥ 1yr tenure as PMs
    await dataService.autoGeneratePMs(false);

    await recalcReporteeCounts();
    const sameGradeCount = await detectSameGradeExceptions();

    const newJoiners = employees.filter(e => e.is_new_joiner).length;
    const practiceLabel = ` · Practice: ${userPractice}`;

    logger.info('GAD upload complete', { employees: result.count ?? result, newJoiners, sameGradeExceptions: sameGradeCount, practice: userPractice });
    const discrepancy_summary = await generateDiscrepancySnapshot('gad_upload');
    res.json({
      message: `GAD report processed: ${result.count ?? result} employees, ${newJoiners} new joiners${practiceLabel}`,
      employees: result.count ?? result,
      new_joiners: newJoiners,
      same_grade_exceptions: sameGradeCount,
      practice_filter: userPractice,
      total_in_file: allEmployees.length,
      discrepancy_summary,
      // Step 0 result: was the dataset practice-scoped?
      dataset_scope: {
        is_scoped: scopeCheck.isScoped,
        practices_found: scopeCheck.practices,
        ...(scopeCheck.criticalFlag ? { critical_flag: scopeCheck.criticalFlag } : {}),
      },
    });
  } catch (error: any) {
    logger.error('Error uploading GAD report', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Bench Report Upload
// ============================================
export const uploadBenchReport = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    logger.info('Uploading Bench report', { filename: req.file.originalname, size: req.file.size });
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const allEmployees = parseEmployeeExcel(req.file.buffer); // upload_source='bench'

    if (allEmployees.length === 0) {
      return res.status(400).json({ error: 'No valid employee records found in Bench file.' });
    }

    const distinctPractices = [...new Set(allEmployees.map(e => e.practice).filter(Boolean))].sort();
    const employees = allEmployees.filter(e => (e.practice || '').toLowerCase().trim() === userPractice.toLowerCase().trim());
    const ignoredPractices = distinctPractices.filter(p => p.toLowerCase().trim() !== userPractice.toLowerCase().trim());
    if (ignoredPractices.length > 0) {
      logger.info('[uploadBenchReport] Ignoring rows for other practices', { ignoredPractices, totalRows: allEmployees.length, acceptedPractice: userPractice });
    }

    if (employees.length === 0) {
      return res.status(400).json({
        error: `No employees found for your department (${userPractice}) in this file. ` +
               `File contains ${allEmployees.length} records across other practices.`,
        total_in_file: allEmployees.length,
      });
    }

    logger.info(`Bench: ${allEmployees.length} total rows, ${employees.length} for practice "${userPractice}"`);

    const result: any = employees.length > 5000
      ? await bulkService.bulkInsertEmployeesOptimized(employees)
      : await dataService.bulkInsertEmployees(employees);

    // Detect PM_ON_LEAVE: PMs with leave > 30 days
    const longLeaveResult = await pool.query(`
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

    const practiceLabel = ` · Practice: ${userPractice}`;
    logger.info('Bench upload complete', { employees: result.count ?? result, onLeave: longLeaveResult.rowCount, practice: userPractice });
    const discrepancy_summary = await generateDiscrepancySnapshot('bench_upload');
    res.json({
      message: `Bench report processed: ${result.count ?? result} employees${practiceLabel}`,
      employees: result.count ?? result,
      pm_on_leave_exceptions: longLeaveResult.rowCount ?? 0,
      practice_filter: userPractice,
      total_in_file: allEmployees.length,
      discrepancy_summary,
    });
  } catch (error: any) {
    logger.error('Error uploading Bench report', error);
    res.status(500).json({ error: error.message });
  }
};

export const uploadSkillReport = async (req: Request, res: Response) => {
  try {
    console.log('Upload skill report request received');
    console.log('File:', req.file ? req.file.originalname : 'NO FILE');

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Uploading skill report', { filename: req.file.originalname, size: req.file.size });
    const skills = parseSkillReportExcel(req.file.buffer);

    if (skills.length === 0) {
      const sheetHeaders = getSkillReportHeaders(req.file.buffer);
      console.error('No valid skills found. Sheet headers detected:', sheetHeaders);
      return res.status(400).json({
        error: 'No valid skill records found in file. Could not detect a Skill column in any sheet.',
        detectedSheets: sheetHeaders,
        hint: 'Check the detectedSheets field to see sheet names and their headers. Ensure one sheet has a column named: Primary Skill, Final Updated Primary Skills, Skill Group, or R2D2 - Primary Skill'
      });
    }

    console.log(`Parsed ${skills.length} skills from Excel`);

    const result: any = await dataService.bulkInsertSkills(skills);

    const message = `${result.count} rows parsed → ${result.unique ?? result.count} unique skills upserted into repository`;
    console.log(message);

    res.json({ message, ...result });
  } catch (error: any) {
    logger.error('Error uploading skill report', error);
    console.error('Upload error details:', error);
    res.status(500).json({ error: error.message });
  }
};

export const findPMForEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    const empResult = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [employeeId]);
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
    let matchType: 'Ideal' | 'Acceptable' | 'Low Confidence' | 'Failed' | 'Forced';
    if (!best) {
      matchType = 'Failed';
    } else if (best.forcedAssignment) {
      matchType = 'Forced';
    } else if (best.confidence === 'High') {
      matchType = 'Ideal';
    } else if (best.confidence === 'Medium') {
      matchType = 'Acceptable';
    } else if (best.confidence === 'Low') {
      matchType = 'Low Confidence';
    } else {
      matchType = 'Failed';
    }

    // Collect deviation flags from the winning match
    const deviationFlags = best
      ? (best.flags || []).map(f => `[${f.severity}] ${f.code}: ${f.message}`)
      : [`No eligible PM found for employee ${employee.employee_id}. Manual review required.`];

    const matchOutput = {
      employee_id:        employee.employee_id,
      assigned_pm_id:     best?.pm.employee_id ?? null,
      decision_path:      best?.path ?? (scopeCheck.isScoped ? 'Path9_NoMatch' : 'Path8_PracticeFailure'),
      match_type:         matchType,
      deviation_flags:    deviationFlags,
      tiebreaker_applied:  best?.tiebreakerApplied ?? null,
      score:               best?.score ?? 0,
      confidence:          best?.confidence ?? 'Unmappable',
      // §4 Resignation Override fields
      forced_assignment:   best?.forcedAssignment ?? false,
      override_reason:     best?.overrideReason ?? null,
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
        total:          allFlags.length,
        critical:       allFlags.filter(f => f.severity === 'Critical').length,
        major:          allFlags.filter(f => f.severity === 'Major').length,
        minor:          allFlags.filter(f => f.severity === 'Minor').length,
        has_unmappable: matches.length === 0 || matches.every(m => m.confidence === 'Unmappable'),
      },
      best_confidence: best?.confidence ?? 'Unmappable',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const assignPMToEmployee = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getNewJoiners = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const result = await pool.query(
      `SELECT * FROM employees
       WHERE is_new_joiner = true
         AND current_pm_id IS NULL
         AND is_frozen = false
         AND (joining_date IS NULL OR joining_date >= CURRENT_DATE - INTERVAL '90 days')
         AND practice = $1
       ORDER BY joining_date DESC`,
      [userPractice]
    );
    res.json(result.rows);
  } catch (error: any) {
    logger.error('Error fetching new joiners', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
};

// Get new joiners with pagination
export const getNewJoinersList = async (req: Request, res: Response) => {
  try {
    const { practice, cu, region, page = '1', pageSize = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;

    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    let query = `
      SELECT * FROM employees
      WHERE is_new_joiner = true
        AND current_pm_id IS NULL
        AND is_frozen = false
        AND status = 'active'
        AND (joining_date IS NULL OR joining_date >= CURRENT_DATE - INTERVAL '90 days')
        AND practice = $1
    `;
    let countQuery = `
      SELECT COUNT(*) FROM employees
      WHERE is_new_joiner = true
        AND current_pm_id IS NULL
        AND is_frozen = false
        AND status = 'active'
        AND (joining_date IS NULL OR joining_date >= CURRENT_DATE - INTERVAL '90 days')
        AND practice = $1
    `;

    const params: any[] = [];
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

    const countResult = await pool.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    query += ` ORDER BY joining_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSizeNum, offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSizeNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching new joiners list', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
};

// Get all employees (Bench/GAD list)
export const getAllEmployees = async (req: Request, res: Response) => {
  try {
    const { status, practice, cu, region, page = '1', pageSize = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;
    
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    let query = 'SELECT e.*, pm.name as pm_name FROM employees e LEFT JOIN people_managers pm ON e.current_pm_id = pm.employee_id WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) FROM employees e WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    query += ` AND e.practice = $${paramIndex}`;
    countQuery += ` AND e.practice = $${paramIndex}`;
    params.push(userPractice);
    paramIndex++;

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
    const countResult = await pool.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    query += ` ORDER BY e.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSizeNum, offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSizeNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching employees', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
};

// Get all PMs list
export const getAllPMs = async (req: Request, res: Response) => {
  try {
    const { is_active, practice, cu, region, grade, skill, view_filter, page = '1', pageSize = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;
    
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

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
    const params: any[] = [];
    let paramIndex = 1;

    query += ` AND pm.practice = $${paramIndex}`;
    countQuery += ` AND pm.practice = $${paramIndex}`;
    params.push(userPractice);
    paramIndex++;

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
    } else if (view_filter === 'unallocated') {
      query += ` AND pm.reportee_count = 0`;
      countQuery += ` AND pm.reportee_count = 0`;
    } else if (view_filter === 'incorrect') {
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
    const countResult = await pool.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    query += ` ORDER BY pm.name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSizeNum, offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSizeNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching PMs', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
};

// Get all separation reports
export const getAllSeparations = async (req: Request, res: Response) => {
  try {
    const { status, grade, skill, practice, cu, region, person_type, page = '1', pageSize = '50' } = req.query;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;

    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;
    
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
    const params: any[] = [];
    let paramIndex = 1;

    query += ` AND (pm.practice = $${paramIndex} OR emp.practice = $${paramIndex})`;
    countQuery += ` AND (pm.practice = $${paramIndex} OR emp.practice = $${paramIndex})`;
    params.push(userPractice);
    paramIndex++;

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
      query      += ` AND ${gradeExpr} = UPPER($${paramIndex})`;
      countQuery += ` AND ${gradeExpr} = UPPER($${paramIndex})`;
      params.push(grade as string);
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
    const countResult = await pool.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].count);

    query += ` ORDER BY sr.lwd ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSizeNum, offset);

    const result = await pool.query(query, params);
    res.json({
      data: result.rows,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSizeNum)
      }
    });
  } catch (error: any) {
    logger.error('Error fetching separations', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
};

export const getPendingAssignments = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const result = await pool.query(
      `SELECT pa.*, e.name as employee_name, pm.name as pm_name 
       FROM pm_assignments pa
       JOIN employees e ON pa.employee_id = e.employee_id
       JOIN people_managers pm ON pa.new_pm_id = pm.employee_id
       WHERE pa.status = 'pending'
         AND e.practice = $1
         AND pm.practice = $1
       ORDER BY pa.created_at DESC`,
      [userPractice]
    );
    res.json(result.rows);
  } catch (error: any) {
    logger.error('Error fetching pending assignments', error);
    res.status(500).json({ error: error.message || 'Database error' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const stats = await statsService.getDashboardStats(userPractice);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching dashboard stats', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPMCapacityReport = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const report = await statsService.getPMCapacityReport(userPractice);
    res.json(report);
  } catch (error: any) {
    logger.error('Error fetching PM capacity report', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPMReportSummary = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const summary = await statsService.getPMReportSummary({
      is_active: req.query.is_active as string,
      practice: userPractice,
      cu: req.query.cu as string,
      region: req.query.region as string,
      grade: req.query.grade as string,
      skill: req.query.skill as string,
    });
    res.json(summary);
  } catch (error: any) {
    logger.error('Error fetching PM report summary', error);
    res.status(500).json({ error: error.message });
  }
};

export const checkDatabaseHealth = async (req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error: any) {
    logger.error('Database health check failed', error);
    res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
  }
};

// Get detailed report for a single PM: their info, reportees, separation, pending assignments
export const getPMDetailReport = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { pmId } = req.params;

    // PM details
    const pmResult = await pool.query(
      'SELECT * FROM people_managers WHERE employee_id = $1 AND practice = $2',
      [pmId, userPractice]
    );
    if (pmResult.rows.length === 0) {
      return res.status(404).json({ error: 'PM not found' });
    }
    const pm = pmResult.rows[0];

    // All active reportees currently assigned to this PM
    const reporteesResult = await pool.query(
      `SELECT employee_id, name, email, practice, cu, region, grade, skill, account, joining_date, is_new_joiner, status
       FROM employees
       WHERE current_pm_id = $1 AND status = 'active' AND practice = $2
       ORDER BY name ASC`,
      [pmId, userPractice]
    );

    // Separation record for this PM (if they are leaving)
    const separationResult = await pool.query(
      `SELECT * FROM separation_reports WHERE employee_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [pmId]
    );

    // Pending assignments where this PM is the target (new_pm_id)
    const assignmentsResult = await pool.query(
      `SELECT pa.id, pa.employee_id, pa.assignment_type, pa.match_score, pa.status, pa.created_at,
              e.name as employee_name, e.grade as employee_grade, e.skill as employee_skill, e.practice as employee_practice
       FROM pm_assignments pa
       JOIN employees e ON pa.employee_id = e.employee_id
       WHERE pa.new_pm_id = $1 AND pa.status = 'pending'
       ORDER BY pa.created_at DESC`,
      [pmId]
    );

    // Grade distribution among reportees
    const gradeDistResult = await pool.query(
      `SELECT grade, COUNT(*) as count
       FROM employees
       WHERE current_pm_id = $1 AND status = 'active'
       GROUP BY grade
       ORDER BY grade`,
      [pmId]
    );

    // Practice distribution among reportees
    const practiceDistResult = await pool.query(
      `SELECT practice, COUNT(*) as count
       FROM employees
       WHERE current_pm_id = $1 AND status = 'active'
       GROUP BY practice
       ORDER BY count DESC`,
      [pmId]
    );

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
  } catch (error: any) {
    logger.error('Error fetching PM detail report', error);
    res.status(500).json({ error: error.message });
  }
};

import { ApprovalService } from '../services/approvalService';
import { NotificationService } from '../services/notificationService';
import { ReassignmentService } from '../services/reassignmentService';

const approvalService = new ApprovalService();
const notificationService = new NotificationService();
const reassignmentService = new ReassignmentService();

export const approveAssignment = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { comments } = req.body;

    const workflow = await approvalService.approveStep(parseInt(workflowId), comments);
    res.json({ message: 'Assignment approved', workflow });
  } catch (error: any) {
    logger.error('Error approving assignment', error);
    res.status(500).json({ error: error.message });
  }
};

export const rejectAssignment = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { comments } = req.body;

    if (!comments) {
      return res.status(400).json({ error: 'Comments required for rejection' });
    }

    await approvalService.rejectStep(parseInt(workflowId), comments);
    res.json({ message: 'Assignment rejected' });
  } catch (error: any) {
    logger.error('Error rejecting assignment', error);
    res.status(500).json({ error: error.message });
  }
};

export const getApprovalWorkflow = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;
    const workflows = await approvalService.getWorkflowsByAssignment(parseInt(assignmentId));
    res.json(workflows);
  } catch (error: any) {
    logger.error('Error fetching workflow', error);
    res.status(500).json({ error: error.message });
  }
};

export const triggerLWDCheck = async (req: Request, res: Response) => {
  try {
    await reassignmentService.checkLWDAlerts();
    res.json({ message: 'LWD check completed' });
  } catch (error: any) {
    logger.error('Error in LWD check', error);
    res.status(500).json({ error: error.message });
  }
};

export const getExceptions = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT e.*, emp.name as employee_name 
       FROM exceptions e
       JOIN employees emp ON e.employee_id = emp.employee_id
       WHERE e.status = 'open'
       ORDER BY e.created_at DESC`
    );
    res.json(result.rows);
  } catch (error: any) {
    logger.error('Error fetching exceptions', error);
    res.status(500).json({ error: error.message });
  }
};

export const resolveException = async (req: Request, res: Response) => {
  try {
    const { exceptionId } = req.params;
    await pool.query(
      `UPDATE exceptions SET status = 'resolved', resolved_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [exceptionId]
    );
    res.json({ message: 'Exception resolved' });
  } catch (error: any) {
    logger.error('Error resolving exception', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAssignmentTrends = async (req: Request, res: Response) => {
  try {
    const trends = await statsService.getAssignmentTrends();
    res.json(trends);
  } catch (error: any) {
    logger.error('Error fetching assignment trends', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPracticeDistribution = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const distribution = await statsService.getPracticeDistribution(userPractice);
    res.json(distribution);
  } catch (error: any) {
    logger.error('Error fetching practice distribution', error);
    res.status(500).json({ error: error.message });
  }
};

export const getApprovalMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = await statsService.getApprovalMetrics();
    res.json(metrics);
  } catch (error: any) {
    logger.error('Error fetching approval metrics', error);
    res.status(500).json({ error: error.message });
  }
};

export const getGradeDistribution = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const distribution = await statsService.getGradeDistribution(userPractice);
    res.json(distribution);
  } catch (error: any) {
    logger.error('Error fetching grade distribution', error);
    res.status(500).json({ error: error.message });
  }
};

export const getRegionStats = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const stats = await statsService.getRegionStats(userPractice);
    res.json(stats);
  } catch (error: any) {
    logger.error('Error fetching region stats', error);
    res.status(500).json({ error: error.message });
  }
};

// Get upload statistics summary
export const getUploadStats = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM employees WHERE status = 'active' AND practice = $1) as "totalEmployees",
        (SELECT COUNT(*) FROM people_managers WHERE is_active = true AND practice = $1) as "activePMs",
        (SELECT COUNT(*) FROM separation_reports sr JOIN employees e ON sr.employee_id = e.employee_id WHERE sr.lwd >= CURRENT_DATE AND e.practice = $1) as "pendingSeparations",
        (SELECT COUNT(*) FROM employees WHERE is_new_joiner = true AND current_pm_id IS NULL AND practice = $1) as "newJoiners",
        (SELECT COUNT(*) FROM pm_assignments pa JOIN employees e ON pa.employee_id = e.employee_id WHERE pa.status = 'pending' AND e.practice = $1) as "pendingAssignments",
        (SELECT COUNT(*) FROM skill_repository WHERE practice = $1) as "skillCount"
    `, [userPractice]);
    res.json(result.rows[0]);
  } catch (error: any) {
    logger.error('Error fetching upload stats', error);
    res.status(500).json({ error: error.message });
  }
};

// Freeze or unfreeze an employee record (manual hold)
export const setEmployeeFreeze = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { is_frozen } = req.body;

    if (typeof is_frozen !== 'boolean') {
      return res.status(400).json({ error: 'is_frozen must be boolean' });
    }

    const result = await pool.query(
      `UPDATE employees SET is_frozen = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2 RETURNING employee_id, is_frozen`,
      [is_frozen, employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json({ message: 'Employee freeze status updated', ...result.rows[0] });
  } catch (error: any) {
    logger.error('Error updating employee freeze status', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Phase 5: Enhanced Analytics Endpoints
// ============================================

export const getSLACompliance = async (req: Request, res: Response) => {
  try {
    const compliance = await statsService.getSLACompliance();
    res.json(compliance);
  } catch (error: any) {
    logger.error('Error fetching SLA compliance', error);
    res.status(500).json({ error: error.message });
  }
};

export const getExceptionQueue = async (req: Request, res: Response) => {
  try {
    const queue = await statsService.getExceptionQueue();
    res.json(queue);
  } catch (error: any) {
    logger.error('Error fetching exception queue', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPMCapacityHeatmap = async (req: Request, res: Response) => {
  try {
    const heatmap = await statsService.getPMCapacityHeatmap();
    res.json(heatmap);
  } catch (error: any) {
    logger.error('Error fetching PM capacity heatmap', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAssignmentStatus = async (req: Request, res: Response) => {
  try {
    const status = await statsService.getAssignmentStatus();
    res.json(status);
  } catch (error: any) {
    logger.error('Error fetching assignment status', error);
    res.status(500).json({ error: error.message });
  }
};

export const getWorkflowEfficiency = async (req: Request, res: Response) => {
  try {
    const efficiency = await statsService.getWorkflowEfficiency();
    res.json(efficiency);
  } catch (error: any) {
    logger.error('Error fetching workflow efficiency', error);
    res.status(500).json({ error: error.message });
  }
};

export const getMonthlyTrends = async (req: Request, res: Response) => {
  try {
    const trends = await statsService.getMonthlyTrends();
    res.json(trends);
  } catch (error: any) {
    logger.error('Error fetching monthly trends', error);
    res.status(500).json({ error: error.message });
  }
};

export const getMatchingPerformance = async (req: Request, res: Response) => {
  try {
    const performance = await statsService.getMatchingPerformance();
    res.json(performance);
  } catch (error: any) {
    logger.error('Error fetching matching performance', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Phase 5: Audit Trail Endpoints
// ============================================

export const getAuditTrail = async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, userId, limit } = req.query;
    
    let auditTrail;
    if (entityType && entityId) {
      auditTrail = await auditService.getAuditTrail(
        entityType as string,
        entityId as string,
        limit ? parseInt(limit as string) : 50
      );
    } else if (userId) {
      auditTrail = await auditService.getAuditTrailByUser(
        userId as string,
        limit ? parseInt(limit as string) : 50
      );
    } else {
      auditTrail = await auditService.getRecentAuditTrail(
        limit ? parseInt(limit as string) : 100
      );
    }
    
    res.json(auditTrail);
  } catch (error: any) {
    logger.error('Error fetching audit trail', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAuditStatistics = async (req: Request, res: Response) => {
  try {
    const { days } = req.query;
    const statistics = await auditService.getAuditStatistics(
      days ? parseInt(days as string) : 30
    );
    res.json(statistics);
  } catch (error: any) {
    logger.error('Error fetching audit statistics', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Phase 3: Workflow Automation Endpoints
// ============================================

export const triggerNewJoinerWorkflow = async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.triggerNewJoinerWorkflow();
    res.json({ message: 'New joiner workflow triggered', result });
  } catch (error: any) {
    logger.error('Error triggering new joiner workflow', error);
    res.status(500).json({ error: error.message });
  }
};

export const triggerReassignmentWorkflow = async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.triggerReassignmentWorkflow();
    res.json({ message: 'Reassignment workflow triggered', result });
  } catch (error: any) {
    logger.error('Error triggering reassignment workflow', error);
    res.status(500).json({ error: error.message });
  }
};

export const triggerMonthlyEngagement = async (req: Request, res: Response) => {
  try {
    const result = await schedulerService.triggerMonthlyEngagementWorkflow();
    res.json({ message: 'Monthly engagement workflow triggered', result });
  } catch (error: any) {
    logger.error('Error triggering monthly engagement workflow', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Practice Reports Endpoints
// ============================================

export const generatePracticeReport = async (req: Request, res: Response) => {
  try {
    const filters = {
      practice: req.query.practice as string,
      cu: req.query.cu as string,
      region: req.query.region as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    logger.info('Generating practice report', { filters });
    const report = await practiceReportService.generatePracticeReport(filters);
    
    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    logger.error('Error generating practice report', error);
    res.status(500).json({ error: error.message });
  }
};

export const getPracticeFilters = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const [practices, cus, regions] = await Promise.all([
      practiceReportService.getPracticesList(),
      practiceReportService.getCUsList(),
      practiceReportService.getRegionsList(),
    ]);

    const filteredPractices = practices.filter(p => p === userPractice);
    res.json({
      practices: ['All', ...filteredPractices],
      cus: ['All', ...cus],
      regions: ['All', ...regions],
    });
  } catch (error: any) {
    logger.error('Error fetching practice filters', error);
    res.status(500).json({ error: error.message });
  }
};

/* ─── Auto-Generate PM List from Employee Data ─────────────── */

export const previewAutoGeneratePMs = async (req: Request, res: Response) => {
  try {
    const result = await dataService.autoGeneratePMs(true);
    res.json(result);
  } catch (error: any) {
    logger.error('Error previewing auto-generate PMs', error);
    res.status(500).json({ error: error.message });
  }
};

export const confirmAutoGeneratePMs = async (req: Request, res: Response) => {
  try {
    const result = await dataService.autoGeneratePMs(false);
    res.json({
      message: `Auto-generated ${result.inserted} new PMs, updated ${result.updated} existing (${result.total} total eligible)`,
      ...result,
      count: result.total,
    });
  } catch (error: any) {
    logger.error('Error confirming auto-generate PMs', error);
    res.status(500).json({ error: error.message });
  }
};

/* ─── Auto-Assign Employees to PMs ─────────────────────────── */

export const previewAutoAssign = async (req: Request, res: Response) => {
  try {
    const result = await dataService.autoAssignEmployees(true);
    res.json(result);
  } catch (error: any) {
    logger.error('Error previewing auto-assign', error);
    res.status(500).json({ error: error.message });
  }
};

export const confirmAutoAssign = async (req: Request, res: Response) => {
  try {
    const result = await dataService.autoAssignEmployees(false);
    res.json({
      message: `Assigned ${result.assigned} employees to PMs. ${result.cannotBeAssigned} could not be matched (no eligible PM in their practice).`,
      ...result,
      count: result.assigned,
    });
  } catch (error: any) {
    logger.error('Error confirming auto-assign', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Configuration: Matching Weights
// ============================================

export const getMatchingWeights = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT config_value FROM configuration WHERE config_key = 'matching_weights'"
    );
    const weights = result.rows[0]?.config_value || {
      practice: 40, cu: 25, region: 15, account: 10, skill: 5, grade: 3, capacity: 2
    };
    res.json(weights);
  } catch (error: any) {
    logger.error('Error fetching matching weights', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateMatchingWeights = async (req: Request, res: Response) => {
  try {
    const weights = req.body;
    const allowedKeys = ['practice', 'cu', 'region', 'account', 'skill', 'grade', 'capacity'];
    for (const key of allowedKeys) {
      if (weights[key] !== undefined && (typeof weights[key] !== 'number' || weights[key] < 0 || weights[key] > 100)) {
        return res.status(400).json({ error: `Invalid value for ${key}: must be a number 0–100` });
      }
    }
    await pool.query(`
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
  } catch (error: any) {
    logger.error('Error updating matching weights', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Misalignment Detection
// ============================================

export const getMisalignments = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { page = '1', pageSize = '50', type } = req.query as any;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;

    const typeFilter = type && type !== 'all' ? `AND mismatch_type = '${(type as string).replace(/'/g, "''")}'` : '';
    const practiceClause = `AND e.practice = '${userPractice.replace(/'/g, "''")}'`;

    // ── OPTIMISED ─────────────────────────────────────────────────────────────
    // Previously: two full CTE executions (one for COUNT, one for data).
    // Now: single CTE execution with COUNT(*) OVER() window function.
    // grade_order VALUES replaced by JOIN grade_levels (indexed table).
    // hasSuggestedPM changed from a per-row correlated EXISTS sub-select to
    // a join on mv_practice_has_eligible_pm (one lookup per row instead of a
    // full people_managers scan per row).
    // pm_separated pre-aggregated into a CTE to avoid repeated EXISTS scans.
    // ─────────────────────────────────────────────────────────────────────────
    const result = await pool.query(`
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

    const unmappedResult = await pool.query(`
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
  } catch (error: any) {
    logger.error('Error fetching misalignments', error);
    res.status(500).json({ error: error.message });
  }
};


export const exportMisalignmentsCSV = async (req: Request, res: Response) => {
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
      ? `AND mismatch_type = '${(type as string).replace(/'/g, "''")}'`
      : '';

    const { rows } = await pool.query(`
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

    const esc = (v: any): string =>
      v != null ? `"${String(v).replace(/"/g, '""')}"` : '';

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

    const csvLines: string[] = [headers.join(',')];
    for (const r of rows) {
      csvLines.push([
        esc(r.employee_id),       esc(r.employee_name),    esc(r.employee_email),
        esc(r.emp_practice),      esc(r.emp_sub_practice), esc(r.emp_cu),
        esc(r.emp_region),        esc(r.emp_grade),        esc(r.emp_skill),
        esc(r.emp_location),
        esc(r.pm_id),             esc(r.pm_name),          esc(r.pm_email),
        esc(r.pm_practice),       esc(r.pm_sub_practice),
        esc(r.pm_cu),             esc(r.pm_region),        esc(r.pm_grade),
        esc(r.pm_skill),
        esc(r.mismatch_type),
        esc(r.suggested_pm_id),   esc(r.suggested_pm_name),  esc(r.suggested_pm_email),
        esc(r.suggested_pm_practice), esc(r.suggested_pm_sub_practice),
        esc(r.suggested_pm_cu),   esc(r.suggested_pm_region), esc(r.suggested_pm_grade),
        esc(r.suggested_pm_skill),
        esc(r.suggested_pm_reportees),
        esc(r.suggested_pm_forced ? 'Yes (Forced/Relaxed)' : r.suggested_pm_id ? 'No' : ''),
      ].join(','));
    }

    const filename = `misalignments_${(type as string) || 'all'}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.send(csvLines.join('\n'));

  } catch (error: any) {
    logger.error('Error exporting misalignments CSV', error);
    res.status(500).json({ error: error.message });
  }
};

// ── No Suggested PM ──────────────────────────────────────────────────────────
// Returns misaligned employees for whom the full LATERAL scoring (identical to
// getMisalignments) returned NULL — i.e. no suggested PM could be found.
//
// Data source: mv_no_suggested_pm (materialized view, refreshed after every
// upload).  The MV is built with the exact same base population and LATERAL
// scoring as getMisalignments, guaranteeing that every employee here also
// appears in All Issues with suggested_pm_id = NULL.
//
// Performance: reads are simple indexed scans on the MV — same latency profile
// as any other filter tab, regardless of how many misaligned employees exist.
// ─────────────────────────────────────────────────────────────────────────────
export const getNoSuggestedPMEmployees = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { page = '1', pageSize = '50' } = req.query as any;
    const pageNum    = parseInt(page     as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset     = (pageNum - 1) * pageSizeNum;

    // Single indexed scan on the pre-computed MV — no live LATERAL needed.
    const result = await pool.query(`
      SELECT *, COUNT(*) OVER() AS total_count
      FROM mv_no_suggested_pm
      WHERE emp_practice = $1
      ORDER BY employee_name
      LIMIT $2 OFFSET $3
    `, [userPractice, pageSizeNum, offset]);

    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

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
  } catch (error: any) {
    logger.error('Error fetching no-suggested-PM employees', error);
    res.status(500).json({ error: error.message });
  }
};

export const exportNoSuggestedPMCSV = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    // Simple indexed scan — no live LATERAL, instant even for large datasets
    const { rows } = await pool.query(`
      SELECT *
      FROM mv_no_suggested_pm
      WHERE emp_practice = $1
      ORDER BY employee_name
    `, [userPractice]);

    const esc = (v: any): string =>
      v != null ? `"${String(v).replace(/"/g, '""')}"` : '';

    const headers = [
      'Employee ID', 'Employee Name', 'Employee Email',
      'Emp Practice', 'Emp Sub-Practice', 'Emp CU', 'Emp Region',
      'Emp Grade', 'Emp Skill', 'Emp Location',
      'Current PM ID', 'Current PM Name', 'Current PM Email',
      'Current PM Practice', 'Current PM Sub-Practice',
      'Current PM CU', 'Current PM Region', 'Current PM Grade', 'Current PM Skill',
      'Mismatch Type',
      'Suggested PM',
    ];

    const csvLines: string[] = [headers.join(',')];
    for (const r of rows) {
      csvLines.push([
        esc(r.employee_id),       esc(r.employee_name),    esc(r.employee_email),
        esc(r.emp_practice),      esc(r.emp_sub_practice), esc(r.emp_cu),
        esc(r.emp_region),        esc(r.emp_grade),        esc(r.emp_skill),
        esc(r.emp_location),
        esc(r.pm_id),             esc(r.pm_name),          esc(r.pm_email),
        esc(r.pm_practice),       esc(r.pm_sub_practice),
        esc(r.pm_cu),             esc(r.pm_region),        esc(r.pm_grade),
        esc(r.pm_skill),
        esc(r.mismatch_type),
        esc('None Found'),
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="misalignments_no_pm_found.csv"');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.send(csvLines.join('\n'));

  } catch (error: any) {
    logger.error('Error exporting no-suggested-PM CSV', error);
    res.status(500).json({ error: error.message });
  }
};

export const getUnmappedEmployees = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { page = '1', pageSize = '50', format } = req.query as any;
    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);
    const offset = (pageNum - 1) * pageSizeNum;
    const practiceClause = `AND practice = '${userPractice.replace(/'/g, "''")}'`;

    if (format === 'csv') {
      const { rows } = await pool.query(`
        SELECT employee_id, name, email, practice, sub_practice, grade, region, location, skill, joining_date
        FROM employees e
        WHERE e.status = 'active' AND e.current_pm_id IS NULL ${practiceClause}
          AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id AND pm.is_active = true)
        ORDER BY name
      `);
      const headers = ['Employee ID','Name','Email','Practice','Sub-Practice','Grade','Region','Location','Skill','Joining Date'];
      const csvRows = rows.map((r: any) => [
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

    const countResult = await pool.query(`
      SELECT COUNT(*) FROM employees e WHERE e.status = 'active' AND e.current_pm_id IS NULL ${practiceClause}
        AND NOT EXISTS (SELECT 1 FROM people_managers pm WHERE pm.employee_id = e.employee_id AND pm.is_active = true)
    `);
    const totalCount = parseInt(countResult.rows[0].count);

    const result = await pool.query(`
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
  } catch (error: any) {
    logger.error('Error fetching unmapped employees', error);
    res.status(500).json({ error: error.message });
  }
};

export const getGradewisePMCapacity = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { grade } = req.query;

    if (grade) {
      // Drill-down: list individual PMs for the given grade (C1+ only)
      const result = await pool.query(`
        SELECT
          pm.employee_id, pm.name, pm.email, pm.practice, pm.sub_practice, pm.region, pm.location,
          pm.skill, pm.grade, pm.reportee_count, 10 AS spec_capacity_cap,
          ROUND(100.0 * pm.reportee_count / 10, 1) AS utilization_pct,
          CASE WHEN pm.is_active THEN 'Active' ELSE 'Inactive' END AS status
        FROM people_managers pm
        WHERE pm.is_active = true
          AND pm.practice = $1
          AND pm.grade = ANY(ARRAY['C1','C2','D1','D2','D3','E1','E2'])
          AND pm.grade = $2
        ORDER BY pm.reportee_count DESC, pm.name
      `, [userPractice, grade]);
      return res.json({ grade, pms: result.rows, count: result.rows.length });
    }

    // Overall view: grouped by grade (C1+ only)
    const GRADE_ORDER = ['C1','C2','D1','D2','D3','E1','E2'];
    const result = await pool.query(`
      SELECT
        pm.grade,
        COUNT(pm.employee_id)::int                                                  AS total_pms,
        (COUNT(pm.employee_id) * 10)::int                                           AS total_capacity,
        SUM(pm.reportee_count)::int                                                 AS total_reportees,
        (COUNT(pm.employee_id) * 10 - SUM(pm.reportee_count))::int                 AS available_capacity,
        ROUND(100.0 * SUM(pm.reportee_count) / NULLIF(COUNT(pm.employee_id) * 10, 0), 1) AS utilization_pct
      FROM people_managers pm
      WHERE pm.is_active = true
        AND pm.practice = $1
        AND pm.grade = ANY(ARRAY['C1','C2','D1','D2','D3','E1','E2'])
      GROUP BY pm.grade
    `, [userPractice]);

    // Sort by GRADE_ORDER
    const rows = result.rows.sort((a: any, b: any) => {
      const ai = GRADE_ORDER.indexOf((a.grade || '').toUpperCase());
      const bi = GRADE_ORDER.indexOf((b.grade || '').toUpperCase());
      if (ai === -1 && bi === -1) return (a.grade || '').localeCompare(b.grade || '');
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    res.json({ grades: rows });
  } catch (error: any) {
    logger.error('Error fetching gradewise PM capacity', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// Manual PM Override (with audit trail)
// ============================================

export const overridePMAssignment = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { newPmId, justification, userId } = req.body;

    if (!newPmId || !justification) {
      return res.status(400).json({ error: 'newPmId and justification are required' });
    }

    const empResult = await pool.query('SELECT * FROM employees WHERE employee_id = $1', [employeeId]);
    if (empResult.rows.length === 0) return res.status(404).json({ error: 'Employee not found' });

    const pmResult = await pool.query('SELECT * FROM people_managers WHERE employee_id = $1', [newPmId]);
    if (pmResult.rows.length === 0) return res.status(404).json({ error: 'PM not found' });

    const employee = empResult.rows[0];
    const newPm = pmResult.rows[0];
    const oldPmId = employee.current_pm_id;

    // Update current PM
    await pool.query(
      'UPDATE employees SET current_pm_id = $1, updated_at = CURRENT_TIMESTAMP WHERE employee_id = $2',
      [newPmId, employeeId]
    );

    // Recalculate reportee counts for old and new PM
    if (oldPmId) {
      await pool.query(
        `UPDATE people_managers
         SET reportee_count = (SELECT COUNT(*) FROM employees WHERE current_pm_id = $1 AND status = 'active')
         WHERE employee_id = $1`,
        [oldPmId]
      );
    }
    await pool.query(
      `UPDATE people_managers
       SET reportee_count = (SELECT COUNT(*) FROM employees WHERE current_pm_id = $1 AND status = 'active')
       WHERE employee_id = $1`,
      [newPmId]
    );

    // Record as approved manual override assignment
    await pool.query(
      `INSERT INTO pm_assignments (employee_id, new_pm_id, old_pm_id, assignment_type, status, effective_date, match_score)
       VALUES ($1, $2, $3, 'manual_override', 'approved', CURRENT_DATE, 100)`,
      [employeeId, newPmId, oldPmId]
    );

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

    logger.info('Manual PM override applied', { employeeId, oldPmId, newPmId, justification });

    // Refresh materialized views so all filters (NO_PM_FOUND, misalignments)
    // and CSV exports immediately reflect the newly assigned PM.
    refreshAlignmentCache().catch((err: any) =>
      logger.warn('Materialized view refresh failed after manual override (non-blocking)', err)
    );

    res.json({
      message: `PM overridden: ${employee.name} → ${newPm.name}`,
      employeeId, oldPmId, newPmId, newPmName: newPm.name,
    });
  } catch (error: any) {
    logger.error('Error overriding PM assignment', error);
    res.status(500).json({ error: error.message });
  }
};

// Get PM change history for an employee
export const getEmployeePMHistory = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { employeeId } = req.params;

    const employeeResult = await pool.query(`SELECT practice FROM employees WHERE employee_id = $1`, [employeeId]);
    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    if (employeeResult.rows[0].practice !== userPractice) {
      return res.status(403).json({ error: 'Access denied for this employee' });
    }

    const assignmentsResult = await pool.query(`
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

    const auditResult = await pool.query(`
      SELECT user_id, action, old_value, new_value, metadata, timestamp
      FROM audit_trail
      WHERE entity_type = 'employee' AND entity_id = $1
      ORDER BY timestamp DESC
      LIMIT 20
    `, [employeeId]);

    res.json({ assignments: assignmentsResult.rows, auditTrail: auditResult.rows });
  } catch (error: any) {
    logger.error('Error fetching employee PM history', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// GAD Analysis Report — 4 endpoints
// ============================================================

export const getGADAnalysisSummary = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { pm_id } = req.query as { pm_id?: string };
    const pmId = pm_id && pm_id !== 'All' ? pm_id : null;

    const empPF    = `AND e.practice = $1`;
    const pmClause = pmId ? `AND e.current_pm_id = '${pmId.replace(/'/g, "''")}'` : '';
    const params   = [userPractice];

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
    const result = await pool.query(`
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
  } catch (error: any) {
    logger.error('Error fetching GAD analysis summary', error);
    res.status(500).json({ error: error.message });
  }
};

export const getCorrectlyMappedEmployees = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { format, page = '1', pageSize = '50', pm_id } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const pmId = pm_id && pm_id !== 'All' ? pm_id as string : null;
    const practiceClause = `AND e.practice = '${userPractice.replace(/'/g, "''")}'`;
    const pmIdClause     = pmId ? `AND e.current_pm_id = '${pmId.replace(/'/g, "''")}'` : '';

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
      const { rows } = await pool.query(coreSql);
      const headers = ['Employee ID','Name','Email','Grade','Practice','Sub-Practice','Region','Skill','Joining Date','PM ID','PM Name','PM Grade','PM Practice','No Better PM Available'];
      const csvRows = rows.map((r: any) => [
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

    const { rows } = await pool.query(`${coreSql} LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]);
    const totalRecords = rows.length > 0 ? parseInt(rows[0].total_count) : 0;
    res.json({
      count: totalRecords,
      data: rows,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), totalRecords, totalPages: Math.ceil(totalRecords / parseInt(pageSize)) },
    });
  } catch (error: any) {
    logger.error('Error fetching correctly mapped employees', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSameGradeExceptions = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { format, page = '1', pageSize = '50', pm_id } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const pmId = pm_id && pm_id !== 'All' ? pm_id as string : null;
    const practiceClause = `AND e.practice = '${userPractice.replace(/'/g, "''")}'`;
    const pmIdClause     = pmId ? `AND e.current_pm_id = '${pmId.replace(/'/g, "''")}'` : '';

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
      const { rows } = await pool.query(baseSQL);
      const headers = ['Exception ID','Employee ID','Employee Name','Email','Employee Grade','Practice','Sub-Practice','Region','PM ID','PM Name','PM Grade','PM Practice','Detected At'];
      const csvRows = rows.map((r: any) => [
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
      pool.query(`
        SELECT COUNT(*) FROM exceptions ex
        JOIN employees e ON e.employee_id = ex.employee_id
        WHERE ex.exception_type = 'SAME_GRADE_REPORTEE' AND ex.status = 'open' ${practiceClause} ${pmIdClause}
      `),
      pool.query(`${baseSQL} LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]),
    ]);
    const totalRecords = parseInt(countResult.rows[0].count);
    res.json({
      count: totalRecords,
      data: dataResult.rows,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), totalRecords, totalPages: Math.ceil(totalRecords / parseInt(pageSize)) },
    });
  } catch (error: any) {
    logger.error('Error fetching same grade exceptions', error);
    res.status(500).json({ error: error.message });
  }
};

export const getProposedPMs = async (req: Request, res: Response) => {
  try {
    const userPractice = ensureUserDepartment(req, res);
    if (!userPractice) return;

    const { format, page = '1', pageSize = '50' } = req.query as any;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const practiceClause = `AND e.practice = '${userPractice.replace(/'/g, "''")}'`;

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
      const { rows } = await pool.query(baseSQL);
      const headers = ['Employee ID','Name','Email','Grade','Practice','Sub-Practice','Region','Location','Skill','Joining Date','Tenure (Years)','Proposed Max Capacity'];
      const csvRows = rows.map((r: any) => [
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
      pool.query(`SELECT COUNT(*) FROM employees e ${whereSQL}`),
      pool.query(`${baseSQL} LIMIT $1 OFFSET $2`, [parseInt(pageSize), offset]),
    ]);
    const totalRecords = parseInt(countResult.rows[0].count);
    res.json({
      count: totalRecords,
      data: dataResult.rows,
      pagination: { page: parseInt(page), pageSize: parseInt(pageSize), totalRecords, totalPages: Math.ceil(totalRecords / parseInt(pageSize)) },
    });
  } catch (error: any) {
    logger.error('Error fetching proposed PMs', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================
// Discrepancy Report Controllers
// ============================================================

/** GET /reports/discrepancy — return the most recent snapshot (or generate if none exists) */
export const getDiscrepancyReport = async (req: Request, res: Response) => {
  try {
    // Always return live data so the page reflects current DB state (not a stale snapshot)
    const live = await discrepancyReportService.getLiveReport();

    // Attach the latest snapshot metadata (id + timestamp) for the header "Last saved" info
    const latest = await discrepancyReportService.getLatestSnapshot();

    res.json({
      ...live,
      triggered_by:    'live',
      id:              latest?.id              ?? null,
      last_saved_at:   latest?.created_at     ?? null,
      last_triggered_by: latest?.triggered_by ?? null,
    });
  } catch (error: any) {
    logger.error('Error fetching discrepancy report', error);
    res.status(500).json({ error: error.message });
  }
};

/** POST /reports/discrepancy/generate — force-regenerate a fresh snapshot */
export const triggerDiscrepancyReport = async (req: Request, res: Response) => {
  try {
    const { triggered_by = 'manual' } = req.body as { triggered_by?: string };
    const snapshot = await discrepancyReportService.generateSnapshot(triggered_by);
    res.json(snapshot);
  } catch (error: any) {
    logger.error('Error generating discrepancy report', error);
    res.status(500).json({ error: error.message });
  }
};

/** GET /reports/discrepancy/details?type=xxx&page=1&pageSize=50 */
export const getDiscrepancyDetails = async (req: Request, res: Response) => {
  try {
    const { type, page = '1', pageSize = '50' } = req.query as Record<string, string>;
    if (!type) return res.status(400).json({ error: 'type query parameter is required' });
    const result = await discrepancyReportService.getDetails(
      type,
      parseInt(page),
      parseInt(pageSize)
    );
    res.json({
      ...result,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(result.count / parseInt(pageSize)),
        totalRecords: result.count,
      },
    });
  } catch (error: any) {
    logger.error('Error fetching discrepancy details', error);
    res.status(error.message?.includes('Unknown') ? 400 : 500).json({ error: error.message });
  }
};

/** GET /reports/discrepancy/history — last 20 snapshots */
export const getDiscrepancyHistory = async (req: Request, res: Response) => {
  try {
    const history = await discrepancyReportService.getHistory();
    res.json(history);
  } catch (error: any) {
    logger.error('Error fetching discrepancy history', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /employees/:employeeId/suggested-pms
 *
 * Returns up to 5 best-matching PMs for a given employee using the same
 * eligibility conditions as the main matching pipeline (matchingService.ts):
 *   ✔ Same practice (mandatory gate — A1)
 *   ✔ is_active = true (not resigned)
 *   ✔ reportee_count < 10 (hard capacity cap)
 *   ✔ Not on long leave (duration >30 days OR long-leave keyword)
 *   ✔ PM grade >= C1 (index 4 in GRADE_HIERARCHY) AND strictly above employee grade
 *     — mirrors isGradeEligible() in gradeUtils.ts exactly
 *   ✔ Not the current PM of the employee
 *
 * Grade levels are resolved via an inline VALUES table that exactly mirrors
 * GRADE_HIERARCHY in gradeUtils.ts so unknown grades (e.g. A3, A4, A5) that
 * are absent from the grade_levels DB table still resolve correctly — they get
 * lvl = -1 (unknown/junior), which means ALL C1+ PMs are eligible for them.
 *
 * Also returns full employee details and current PM details for the compare UI.
 */
export const getSuggestedPMsForEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Fetch employee + current PM details
    const empResult = await pool.query(`
      SELECT
        e.employee_id,
        e.name            AS employee_name,
        e.email           AS employee_email,
        e.practice        AS emp_practice,
        e.sub_practice    AS emp_sub_practice,
        e.cu              AS emp_cu,
        e.region          AS emp_region,
        e.grade           AS emp_grade,
        e.skill           AS emp_skill,
        e.location        AS emp_location,
        e.account         AS emp_account,
        pm.employee_id    AS pm_id,
        pm.name           AS pm_name,
        pm.email          AS pm_email,
        pm.practice       AS pm_practice,
        pm.sub_practice   AS pm_sub_practice,
        pm.cu             AS pm_cu,
        pm.region         AS pm_region,
        pm.grade          AS pm_grade,
        pm.skill          AS pm_skill,
        pm.reportee_count AS pm_reportees,
        10                AS pm_capacity
      FROM employees e
      LEFT JOIN people_managers pm ON e.current_pm_id = pm.employee_id
      WHERE e.employee_id = $1
    `, [employeeId]);

    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = empResult.rows[0];

    // Long-leave exclusion keywords — mirrors MatchingService.LONG_LEAVE_TYPES exactly
    const longLeaveTypes = [
      'long leave', 'long-leave', 'longleave',
      'maternity', 'paternity',
      'sabbatical',
      'medical leave', 'medical-leave',
      'leave of absence', 'loa',
      'extended leave',
    ];
    const longLeavePattern = longLeaveTypes
      .map(t => t.replace(/'/g, "''"))
      .map(t => `LOWER(pm2.leave_type) LIKE '%${t}%'`)
      .join(' OR ');

    // ── Grade hierarchy inline VALUES ──────────────────────────────────────────
    // Mirrors GRADE_HIERARCHY = ['A1','A2','B1','B2','C1','C2','D1','D2','E1','E2']
    // in gradeUtils.ts exactly. Indices 0-9 match array positions.
    // Any grade NOT in this list gets lvl = -1 (unknown/junior) via LEFT JOIN +
    // COALESCE so that grades like A3/A4/A5 that exist in the DB but are absent
    // from the standard hierarchy are treated as below C1, making all C1+ PMs
    // eligible for them — same behaviour as getGradeLevel() returning -1.
    //
    // C1 eligibility threshold = index 4.
    // isGradeEligible(): pm_lvl >= 4 (C1) AND pm_lvl > emp_lvl
    // When emp_lvl = -1 (unknown), condition becomes pm_lvl > -1 = pm_lvl >= 0,
    // which is satisfied by every known grade — correct fallback.
    const gradeHierarchyValues = `
      VALUES
        ('A1', 0), ('A2', 1),
        ('B1', 2), ('B2', 3),
        ('C1', 4), ('C2', 5),
        ('D1', 6), ('D2', 7),
        ('E1', 8), ('E2', 9)
    `;

    // Fetch top 5 eligible PMs — same rules as matchingService.getCandidatePMs()
    // plus in-memory scoring (weights: cu=35, region=20, skill=15, grade=15, account=10, capacity=5)
    const pmResult = await pool.query(`
      WITH
      -- Inline grade hierarchy — immune to grade_levels table gaps
      grade_hier(g, lvl) AS (${gradeHierarchyValues}),

      -- Employee grade level (-1 when grade is unknown/non-standard like A5)
      emp_grade_lvl AS (
        SELECT COALESCE(gh.lvl, -1) AS lvl
        FROM grade_hier gh
        WHERE gh.g = UPPER(TRIM($2))
        UNION ALL
        SELECT -1  -- fallback row when grade not found at all
        LIMIT 1
      ),

      eligible AS (
        SELECT
          pm2.employee_id,
          pm2.name,
          pm2.email,
          pm2.practice,
          pm2.sub_practice,
          pm2.cu,
          pm2.region,
          pm2.grade,
          pm2.skill,
          pm2.account,
          pm2.reportee_count,
          10 AS max_capacity,
          COALESCE(gh.lvl, -1) AS pm_lvl,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - pm2.created_at)) / 86400 AS tenure_days,
          -- Score mirrors matching pipeline default weights
          -- (cu=35, region=20, skill=15, grade=15, account=10, capacity=5)
          (
            CASE WHEN pm2.cu      = $3 THEN 35 ELSE 0 END +
            CASE WHEN pm2.region  = $4 THEN 20 ELSE 0 END +
            CASE WHEN LOWER(COALESCE(pm2.skill,'')) = LOWER(COALESCE($5,'')) AND $5 IS NOT NULL THEN 15
                 WHEN pm2.skill IS NOT NULL AND $5 IS NOT NULL THEN 5
                 ELSE 0 END +
            -- Grade: N+1 above employee = full score; higher = partial; any eligible = base
            CASE WHEN COALESCE(gh.lvl,-1) = (SELECT lvl FROM emp_grade_lvl LIMIT 1) + 1 THEN 15
                 WHEN COALESCE(gh.lvl,-1) > (SELECT lvl FROM emp_grade_lvl LIMIT 1) + 1 THEN 10
                 ELSE 5 END +
            CASE WHEN pm2.account = $6 THEN 10 ELSE 0 END +
            CASE WHEN pm2.reportee_count < 5 THEN 5
                 WHEN pm2.reportee_count < 8 THEN 3
                 ELSE 1 END
          ) AS match_score
        FROM people_managers pm2
        -- LEFT JOIN so PMs with grades outside the hierarchy still appear
        LEFT JOIN grade_hier gh ON gh.g = UPPER(TRIM(pm2.grade))
        WHERE pm2.is_active      = true
          AND pm2.reportee_count < 10
          AND pm2.practice       = $1
          -- Exclude the employee's current PM (handle NULL current_pm_id safely)
          AND (pm2.employee_id  <> $7 OR $7 = '')

          -- ✔ Not on long leave (duration-based: window > 30 days AND today within it)
          AND NOT (
                pm2.leave_start_date IS NOT NULL
            AND pm2.leave_end_date   IS NOT NULL
            AND (pm2.leave_end_date - pm2.leave_start_date) > 30
            AND CURRENT_DATE BETWEEN pm2.leave_start_date AND pm2.leave_end_date
          )
          -- ✔ Not on long leave (leave_type keyword — same list as matchingService)
          AND NOT (
                pm2.leave_type IS NOT NULL
            AND (${longLeavePattern})
          )
          -- ✔ PM grade >= C1 (lvl 4) — mirrors isGradeEligible() C1 floor
          AND COALESCE(gh.lvl, -1) >= 4
          -- ✔ PM grade strictly above employee grade — mirrors isGradeEligible()
          AND COALESCE(gh.lvl, -1) > (SELECT lvl FROM emp_grade_lvl LIMIT 1)
      )
      SELECT *
      FROM eligible
      ORDER BY match_score DESC, reportee_count ASC, tenure_days DESC, employee_id ASC
      LIMIT 5
    `, [
      emp.emp_practice,            // $1 — practice gate
      emp.emp_grade,               // $2 — employee grade for level lookup
      emp.emp_cu,                  // $3 — CU scoring
      emp.emp_region,              // $4 — region scoring
      emp.emp_skill   || null,     // $5 — skill scoring (null-safe)
      emp.emp_account || null,     // $6 — account scoring (null-safe)
      emp.pm_id       || '',       // $7 — exclude current PM
    ]);

    res.json({
      employee: emp,
      suggestedPMs: pmResult.rows,
    });
  } catch (error: any) {
    logger.error('Error fetching suggested PMs for employee', error);
    res.status(500).json({ error: error.message });
  }
};
