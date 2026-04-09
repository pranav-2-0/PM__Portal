import { Router } from 'express';
import multer from 'multer';
import pool from '../config/database';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/rbacMiddleware';
import {
  uploadEmployees,
  uploadNewJoiners,
  uploadPMs,
  uploadSeparations,
  uploadSkillReport,
  findPMForEmployee,
  assignPMToEmployee,
  getNewJoiners,
  getNewJoinersList,
  getAllEmployees,
  exportAllEmployees,
  getAllPMs,
  getAllSeparations,
  getPMDetailReport,
  getPendingAssignments,
  getDashboardStats,
  getPMCapacityReport,
  getPMReportSummary,
  checkDatabaseHealth,
  approveAssignment,
  rejectAssignment,
  getApprovalWorkflow,
  triggerLWDCheck,
  getExceptions,
  resolveException,
  getAssignmentTrends,
  getPracticeDistribution,
  getApprovalMetrics,
  getGradeDistribution,
  getRegionStats,
  getUploadStats,
  setEmployeeFreeze,
  // Phase 5: Enhanced Analytics
  getSLACompliance,
  getExceptionQueue,
  getPMCapacityHeatmap,
  getAssignmentStatus,
  getWorkflowEfficiency,
  getMonthlyTrends,
  getMatchingPerformance,
  // Phase 5: Audit Trail
  getAuditTrail,
  getAuditStatistics,
  // Phase 3: Workflow Automation
  triggerNewJoinerWorkflow,
  triggerReassignmentWorkflow,
  triggerMonthlyEngagement,
  // Practice Reports
  generatePracticeReport,
  getPracticeFilters,
  // Auto-Generate PMs
  previewAutoGeneratePMs,
  confirmAutoGeneratePMs,
  // Auto-Assign Employees
  previewAutoAssign,
  confirmAutoAssign,
  // Configuration
  getMatchingWeights,
  updateMatchingWeights,
  // Misalignment Detection
  getMisalignments,
  exportMisalignmentsCSV,
  getUnmappedEmployees,
  // Skill Management
  getEmployeeSkillDistribution,
  bulkUpdateEmployeeSkills,
  removeEmployeeSkill,
  updateSingleEmployeeSkill,
  getSkillManagementCoverage,
  getFilteredEmployeesForSkillUpdate,
  // Manual Override
  overridePMAssignment,
  getEmployeePMHistory,
  // GAD / Bench uploads
  uploadGAD,
  uploadBenchReport,
  // Gradewise PM Capacity
  getGradewisePMCapacity,
  // GAD Analysis Report
  getGADAnalysisSummary,
  getCorrectlyMappedEmployees,
  getSameGradeExceptions,
  getProposedPMs,
  // Discrepancy Report
  getDiscrepancyReport,
  triggerDiscrepancyReport,
  getDiscrepancyDetails,
  getDiscrepancyHistory,
} from '../controllers/pmController';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for large enterprise Excel files
    fieldSize: 100 * 1024 * 1024,
  },
  // No fileFilter — MIME types are unreliable (OS/browser dependent).
  // The front-end accept attribute handles UX filtering.
  // Each controller's XLSX/CSV parser throws a clear error for invalid files.
});

// Health check
router.get('/health/db', checkDatabaseHealth);

// ✅ Apply auth middleware to all routes below
router.use(authMiddleware);

// Data upload routes
router.post('/upload/employees', upload.single('file'), uploadEmployees);
router.post('/upload/new-joiners', upload.single('file'), uploadNewJoiners);
router.post('/upload/pms', upload.single('file'), uploadPMs);
router.post('/upload/separations', upload.single('file'), uploadSeparations);
router.post('/upload/skills', upload.single('file'), uploadSkillReport);
router.post('/upload/gad', upload.single('file'), uploadGAD);
router.post('/upload/bench', upload.single('file'), uploadBenchReport);

// PM matching routes
router.get('/employees/new-joiners', getNewJoiners);
router.get('/employees/new-joiners/list', getNewJoinersList);
router.get('/employees/list', getAllEmployees);
router.get('/employees/export', exportAllEmployees);
router.patch('/employees/:employeeId/freeze', setEmployeeFreeze);
router.get('/pms/list', getAllPMs);
router.get('/pms/auto-generate/preview', previewAutoGeneratePMs);
router.post('/pms/auto-generate/confirm', confirmAutoGeneratePMs);
router.get('/employees/auto-assign/preview', previewAutoAssign);
router.post('/employees/auto-assign/confirm', confirmAutoAssign);
router.get('/pms/:pmId/report', getPMDetailReport);
router.get('/separations/list', getAllSeparations);
router.get('/employees/:employeeId/find-pm', findPMForEmployee);
router.post('/assignments', assignPMToEmployee);
router.get('/assignments/pending', getPendingAssignments);

// Statistics routes (Basic)
router.get('/stats/dashboard', getDashboardStats);
router.get('/stats/pm-capacity', getPMCapacityReport);
router.get('/stats/pm-report', getPMReportSummary);
router.get('/stats/assignment-trends', getAssignmentTrends);
router.get('/stats/practice-distribution', getPracticeDistribution);
router.get('/stats/approval-metrics', getApprovalMetrics);
router.get('/stats/grade-distribution', getGradeDistribution);
router.get('/stats/region-stats', getRegionStats);
router.get('/stats/upload-stats', getUploadStats);

// Phase 5: Analytics Routes
router.get('/analytics/sla-compliance', getSLACompliance);
router.get('/analytics/exception-queue', getExceptionQueue);
router.get('/analytics/pm-capacity-heatmap', getPMCapacityHeatmap);
router.get('/analytics/assignment-status', getAssignmentStatus);
router.get('/analytics/workflow-efficiency', getWorkflowEfficiency);
router.get('/analytics/monthly-trends', getMonthlyTrends);
router.get('/analytics/matching-performance', getMatchingPerformance);

// Phase 5: Audit Trail Routes
router.get('/audit-trail', getAuditTrail);
router.get('/audit-trail/statistics', getAuditStatistics);
// Assignment approval routes (simplified)
router.post('/assignments/:assignmentId/approve', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { comments } = req.body;
    
    await pool.query(
      'UPDATE pm_assignments SET status = $1, effective_date = CURRENT_DATE WHERE id = $2',
      ['approved', assignmentId]
    );
    
    // Update employee's current PM
    const assignment = await pool.query(
      'SELECT employee_id, new_pm_id FROM pm_assignments WHERE id = $1',
      [assignmentId]
    );
    
    if (assignment.rows.length > 0) {
      await pool.query(
        'UPDATE employees SET current_pm_id = $1 WHERE employee_id = $2',
        [assignment.rows[0].new_pm_id, assignment.rows[0].employee_id]
      );
    }
    
    res.json({ message: 'Assignment approved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/assignments/:assignmentId/reject', async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { comments } = req.body;
    
    await pool.query(
      'UPDATE pm_assignments SET status = $1 WHERE id = $2',
      ['rejected', assignmentId]
    );
    
    res.json({ message: 'Assignment rejected' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
// Phase 3: Workflow Automation Routes
router.post('/workflows/new-joiner', triggerNewJoinerWorkflow);
router.post('/workflows/reassignment', triggerReassignmentWorkflow);
router.post('/workflows/monthly-engagement', triggerMonthlyEngagement);

// Phase 2: Approval workflow
router.post('/approvals/:workflowId/approve', approveAssignment);
router.post('/approvals/:workflowId/reject', rejectAssignment);
router.get('/approvals/assignment/:assignmentId', getApprovalWorkflow);

// Phase 2: Automatic reassignment
router.post('/reassignment/lwd-check', triggerLWDCheck);

// Phase 2: Exception management
router.get('/exceptions', getExceptions);
router.post('/exceptions/:exceptionId/resolve', resolveException);

// Practice Reports
router.get('/reports/practice', generatePracticeReport);
router.get('/reports/filters', getPracticeFilters);

// Configuration: Matching Weights
router.get('/config/matching-weights', getMatchingWeights);
router.put('/config/matching-weights', updateMatchingWeights);

// Misalignment Detection
router.get('/employees/misalignments', getMisalignments);
router.get('/employees/misalignments/export', exportMisalignmentsCSV);
router.get('/employees/unmapped', getUnmappedEmployees);

// Gradewise PM Capacity
router.get('/pms/gradewise-capacity', getGradewisePMCapacity);

// GAD Analysis Report
router.get('/analysis/summary', getGADAnalysisSummary);
router.get('/analysis/correctly-mapped', getCorrectlyMappedEmployees);
router.get('/analysis/same-grade', getSameGradeExceptions);
router.get('/analysis/proposed-pms', getProposedPMs);

// Discrepancy Report
router.get('/reports/discrepancy', getDiscrepancyReport);
router.post('/reports/discrepancy/generate', triggerDiscrepancyReport);
router.get('/reports/discrepancy/details', getDiscrepancyDetails);
router.get('/reports/discrepancy/history', getDiscrepancyHistory);

// Skill Management
router.get('/employees/skills/distribution', getEmployeeSkillDistribution);
router.get('/employees/skills/coverage', getSkillManagementCoverage);
router.get('/employees/skills/preview', getFilteredEmployeesForSkillUpdate);
router.put('/employees/skills/bulk-update', bulkUpdateEmployeeSkills);
router.post('/employees/skills/remove', removeEmployeeSkill);
router.patch('/employees/:employeeId/skill', updateSingleEmployeeSkill);

// Manual PM Override
router.post('/employees/:employeeId/override-pm', overridePMAssignment);
router.get('/employees/:employeeId/pm-history', getEmployeePMHistory);

export default router;
