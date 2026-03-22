"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const database_1 = __importDefault(require("../config/database"));
const pmController_1 = require("../controllers/pmController");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit for large enterprise Excel files
        fieldSize: 100 * 1024 * 1024,
    },
    // No fileFilter — MIME types are unreliable (OS/browser dependent).
    // The front-end accept attribute handles UX filtering.
    // Each controller's XLSX/CSV parser throws a clear error for invalid files.
});
// Health check
router.get('/health/db', pmController_1.checkDatabaseHealth);
// Data upload routes
router.post('/upload/employees', upload.single('file'), pmController_1.uploadEmployees);
router.post('/upload/new-joiners', upload.single('file'), pmController_1.uploadNewJoiners);
router.post('/upload/pms', upload.single('file'), pmController_1.uploadPMs);
router.post('/upload/separations', upload.single('file'), pmController_1.uploadSeparations);
router.post('/upload/skills', upload.single('file'), pmController_1.uploadSkillReport);
router.post('/upload/gad', upload.single('file'), pmController_1.uploadGAD);
router.post('/upload/bench', upload.single('file'), pmController_1.uploadBenchReport);
// PM matching routes
router.get('/employees/new-joiners', pmController_1.getNewJoiners);
router.get('/employees/new-joiners/list', pmController_1.getNewJoinersList);
router.get('/employees/list', pmController_1.getAllEmployees);
router.patch('/employees/:employeeId/freeze', pmController_1.setEmployeeFreeze);
router.get('/pms/list', pmController_1.getAllPMs);
router.get('/pms/auto-generate/preview', pmController_1.previewAutoGeneratePMs);
router.post('/pms/auto-generate/confirm', pmController_1.confirmAutoGeneratePMs);
router.get('/employees/auto-assign/preview', pmController_1.previewAutoAssign);
router.post('/employees/auto-assign/confirm', pmController_1.confirmAutoAssign);
router.get('/pms/:pmId/report', pmController_1.getPMDetailReport);
router.get('/separations/list', pmController_1.getAllSeparations);
router.get('/employees/:employeeId/find-pm', pmController_1.findPMForEmployee);
router.post('/assignments', pmController_1.assignPMToEmployee);
router.get('/assignments/pending', pmController_1.getPendingAssignments);
// Statistics routes (Basic)
router.get('/stats/dashboard', pmController_1.getDashboardStats);
router.get('/stats/pm-capacity', pmController_1.getPMCapacityReport);
router.get('/stats/pm-report', pmController_1.getPMReportSummary);
router.get('/stats/assignment-trends', pmController_1.getAssignmentTrends);
router.get('/stats/practice-distribution', pmController_1.getPracticeDistribution);
router.get('/stats/approval-metrics', pmController_1.getApprovalMetrics);
router.get('/stats/grade-distribution', pmController_1.getGradeDistribution);
router.get('/stats/region-stats', pmController_1.getRegionStats);
router.get('/stats/upload-stats', pmController_1.getUploadStats);
// Phase 5: Analytics Routes
router.get('/analytics/sla-compliance', pmController_1.getSLACompliance);
router.get('/analytics/exception-queue', pmController_1.getExceptionQueue);
router.get('/analytics/pm-capacity-heatmap', pmController_1.getPMCapacityHeatmap);
router.get('/analytics/assignment-status', pmController_1.getAssignmentStatus);
router.get('/analytics/workflow-efficiency', pmController_1.getWorkflowEfficiency);
router.get('/analytics/monthly-trends', pmController_1.getMonthlyTrends);
router.get('/analytics/matching-performance', pmController_1.getMatchingPerformance);
// Phase 5: Audit Trail Routes
router.get('/audit-trail', pmController_1.getAuditTrail);
router.get('/audit-trail/statistics', pmController_1.getAuditStatistics);
// Assignment approval routes (simplified)
router.post('/assignments/:assignmentId/approve', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { comments } = req.body;
        await database_1.default.query('UPDATE pm_assignments SET status = $1, effective_date = CURRENT_DATE WHERE id = $2', ['approved', assignmentId]);
        // Update employee's current PM
        const assignment = await database_1.default.query('SELECT employee_id, new_pm_id FROM pm_assignments WHERE id = $1', [assignmentId]);
        if (assignment.rows.length > 0) {
            await database_1.default.query('UPDATE employees SET current_pm_id = $1 WHERE employee_id = $2', [assignment.rows[0].new_pm_id, assignment.rows[0].employee_id]);
        }
        res.json({ message: 'Assignment approved successfully' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/assignments/:assignmentId/reject', async (req, res) => {
    try {
        const { assignmentId } = req.params;
        const { comments } = req.body;
        await database_1.default.query('UPDATE pm_assignments SET status = $1 WHERE id = $2', ['rejected', assignmentId]);
        res.json({ message: 'Assignment rejected' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Phase 3: Workflow Automation Routes
router.post('/workflows/new-joiner', pmController_1.triggerNewJoinerWorkflow);
router.post('/workflows/reassignment', pmController_1.triggerReassignmentWorkflow);
router.post('/workflows/monthly-engagement', pmController_1.triggerMonthlyEngagement);
// Phase 2: Approval workflow
router.post('/approvals/:workflowId/approve', pmController_1.approveAssignment);
router.post('/approvals/:workflowId/reject', pmController_1.rejectAssignment);
router.get('/approvals/assignment/:assignmentId', pmController_1.getApprovalWorkflow);
// Phase 2: Automatic reassignment
router.post('/reassignment/lwd-check', pmController_1.triggerLWDCheck);
// Phase 2: Exception management
router.get('/exceptions', pmController_1.getExceptions);
router.post('/exceptions/:exceptionId/resolve', pmController_1.resolveException);
// Practice Reports
router.get('/reports/practice', pmController_1.generatePracticeReport);
router.get('/reports/filters', pmController_1.getPracticeFilters);
// Configuration: Matching Weights
router.get('/config/matching-weights', pmController_1.getMatchingWeights);
router.put('/config/matching-weights', pmController_1.updateMatchingWeights);
// Misalignment Detection
router.get('/employees/misalignments', pmController_1.getMisalignments);
router.get('/employees/misalignments/export', pmController_1.exportMisalignmentsCSV);
router.get('/employees/unmapped', pmController_1.getUnmappedEmployees);
// Gradewise PM Capacity
router.get('/pms/gradewise-capacity', pmController_1.getGradewisePMCapacity);
// GAD Analysis Report
router.get('/analysis/summary', pmController_1.getGADAnalysisSummary);
router.get('/analysis/correctly-mapped', pmController_1.getCorrectlyMappedEmployees);
router.get('/analysis/same-grade', pmController_1.getSameGradeExceptions);
router.get('/analysis/proposed-pms', pmController_1.getProposedPMs);
// Discrepancy Report
router.get('/reports/discrepancy', pmController_1.getDiscrepancyReport);
router.post('/reports/discrepancy/generate', pmController_1.triggerDiscrepancyReport);
router.get('/reports/discrepancy/details', pmController_1.getDiscrepancyDetails);
router.get('/reports/discrepancy/history', pmController_1.getDiscrepancyHistory);
// Manual PM Override
router.post('/employees/:employeeId/override-pm', pmController_1.overridePMAssignment);
router.get('/employees/:employeeId/pm-history', pmController_1.getEmployeePMHistory);
exports.default = router;
