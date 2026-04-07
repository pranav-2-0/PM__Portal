"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatisticsService = void 0;
const database_1 = __importDefault(require("../config/database"));
const gradeUtils_1 = require("../utils/gradeUtils");
class StatisticsService {
    async getDashboardStats(practice) {
        const client = await database_1.default.connect();
        try {
            const employeeQuery = practice
                ? 'SELECT COUNT(*) as count FROM employees WHERE status = $1 AND practice = $2'
                : 'SELECT COUNT(*) as count FROM employees WHERE status = $1';
            const employeeParams = practice ? ['active', practice] : ['active'];
            const pmQuery = practice
                ? 'SELECT COUNT(*) as count FROM people_managers WHERE is_active = true AND practice = $1'
                : 'SELECT COUNT(*) as count FROM people_managers WHERE is_active = true';
            const pmParams = practice ? [practice] : [];
            const newJoinersQuery = practice
                ? 'SELECT COUNT(*) as count FROM employees WHERE is_new_joiner = true AND current_pm_id IS NULL AND practice = $1'
                : 'SELECT COUNT(*) as count FROM employees WHERE is_new_joiner = true AND current_pm_id IS NULL';
            const newJoinersParams = practice ? [practice] : [];
            const pendingAssignmentsQuery = practice
                ? `SELECT COUNT(*) as count FROM pm_assignments pa
           JOIN employees e ON pa.employee_id = e.employee_id
           WHERE pa.status = $1 AND e.practice = $2`
                : 'SELECT COUNT(*) as count FROM pm_assignments WHERE status = $1';
            const pendingAssignmentsParams = practice ? ['pending', practice] : ['pending'];
            const separationsQuery = practice
                ? `SELECT COUNT(*) as count FROM separation_reports sr
           JOIN employees e ON sr.employee_id = e.employee_id
           WHERE sr.status = $1 AND e.practice = $2`
                : 'SELECT COUNT(*) as count FROM separation_reports WHERE status = $1';
            const separationsParams = practice ? ['pending', practice] : ['pending'];
            const skillRepositoryQuery = practice
                ? 'SELECT COUNT(*) as count FROM skill_repository WHERE practice = $1'
                : 'SELECT COUNT(*) as count FROM skill_repository';
            const skillRepositoryParams = practice ? [practice] : [];
            const [employees, pms, newJoiners, pendingAssignments, separations, skillRepository] = await Promise.all([
                client.query(employeeQuery, employeeParams),
                client.query(pmQuery, pmParams),
                client.query(newJoinersQuery, newJoinersParams),
                client.query(pendingAssignmentsQuery, pendingAssignmentsParams),
                client.query(separationsQuery, separationsParams),
                client.query(skillRepositoryQuery, skillRepositoryParams),
            ]);
            return {
                totalEmployees: parseInt(employees.rows[0].count),
                totalPMs: parseInt(pms.rows[0].count),
                newJoinersWithoutPM: parseInt(newJoiners.rows[0].count),
                pendingAssignments: parseInt(pendingAssignments.rows[0].count),
                pendingSeparations: parseInt(separations.rows[0].count),
                skillRepository: parseInt(skillRepository.rows[0].count),
            };
        }
        finally {
            client.release();
        }
    }
    async getPMCapacityReport(practice) {
        const params = [];
        let whereClause = 'WHERE is_active = true';
        if (practice) {
            whereClause += ' AND practice = $1';
            params.push(practice);
        }
        const result = await database_1.default.query(`
      SELECT 
        employee_id,
        name,
        grade,
        practice,
        cu,
        reportee_count,
        10 AS spec_capacity_cap,
        ROUND((reportee_count::decimal / 10) * 100, 2) as utilization
      FROM people_managers
      ${whereClause}
      ORDER BY utilization DESC
    `, params);
        return result.rows;
    }
    async getAssignmentTrends() {
        const result = await database_1.default.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        assignment_type
      FROM pm_assignments
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at), assignment_type
      ORDER BY date DESC
    `);
        return result.rows;
    }
    async getPracticeDistribution(practice) {
        const params = [];
        let whereClause = 'WHERE status = $1';
        params.push('active');
        if (practice) {
            whereClause += ' AND practice = $2';
            params.push(practice);
        }
        const result = await database_1.default.query(`
      SELECT 
        practice,
        COUNT(*) as employee_count,
        COUNT(DISTINCT current_pm_id) as pm_count
      FROM employees
      ${whereClause}
      GROUP BY practice
      ORDER BY employee_count DESC
    `, params);
        return result.rows;
    }
    async getApprovalMetrics() {
        const result = await database_1.default.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_hours
      FROM approval_workflows
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY status
    `);
        return result.rows;
    }
    async getGradeDistribution(practice) {
        const params = [];
        let whereClause = 'WHERE status = $1';
        params.push('active');
        if (practice) {
            whereClause += ' AND practice = $2';
            params.push(practice);
        }
        const result = await database_1.default.query(`
      SELECT 
        grade,
        COUNT(*) as count
      FROM employees
      ${whereClause}
      GROUP BY grade
      ORDER BY grade
    `, params);
        return result.rows;
    }
    async getRegionStats(practice) {
        const params = [];
        let whereClause = 'WHERE status = $1';
        params.push('active');
        if (practice) {
            whereClause += ' AND practice = $2';
            params.push(practice);
        }
        const result = await database_1.default.query(`
      SELECT 
        region,
        COUNT(*) as employee_count,
        COUNT(CASE WHEN current_pm_id IS NULL THEN 1 END) as without_pm
      FROM employees
      ${whereClause}
      GROUP BY region
      ORDER BY employee_count DESC
    `, params);
        return result.rows;
    }
    async getPMReportSummary(filters) {
        const params = [];
        let paramIndex = 1;
        let where = 'WHERE 1=1';
        if (filters?.is_active !== undefined && filters.is_active !== '') {
            where += ` AND pm.is_active = $${paramIndex}`;
            params.push(filters.is_active === 'true');
            paramIndex++;
        }
        if (filters?.practice) {
            where += ` AND pm.practice = $${paramIndex}`;
            params.push(filters.practice);
            paramIndex++;
        }
        if (filters?.cu) {
            where += ` AND pm.cu = $${paramIndex}`;
            params.push(filters.cu);
            paramIndex++;
        }
        if (filters?.region) {
            where += ` AND pm.region = $${paramIndex}`;
            params.push(filters.region);
            paramIndex++;
        }
        if (filters?.grade) {
            where += ` AND pm.grade ILIKE $${paramIndex}`;
            params.push(`%${filters.grade}%`);
            paramIndex++;
        }
        if (filters?.skill) {
            where += ` AND pm.skill ILIKE $${paramIndex}`;
            params.push(`%${filters.skill}%`);
            paramIndex++;
        }
        const summaryResult = await database_1.default.query(`SELECT
         COUNT(*) as total,
         COUNT(CASE WHEN pm.reportee_count > 0 THEN 1 END) as allocated,
         COUNT(CASE WHEN pm.reportee_count = 0 THEN 1 END) as unallocated
       FROM people_managers pm
       ${where}`, params);
        const mappingResult = await database_1.default.query(`SELECT e.employee_id, e.practice as emp_practice, e.cu as emp_cu, e.region as emp_region, e.grade as emp_grade,
              pm.employee_id as pm_id, pm.practice as pm_practice, pm.cu as pm_cu, pm.region as pm_region, pm.grade as pm_grade
       FROM employees e
       JOIN people_managers pm ON e.current_pm_id = pm.employee_id
       WHERE e.status = 'active' AND e.current_pm_id IS NOT NULL`, []);
        const incorrectMappings = mappingResult.rows.filter(row => {
            if (row.emp_practice !== row.pm_practice)
                return true;
            if (row.emp_cu !== row.pm_cu)
                return true;
            if (row.emp_region !== row.pm_region)
                return true;
            if (!(0, gradeUtils_1.isGradeEligible)(row.pm_grade, row.emp_grade))
                return true;
            if (!(0, gradeUtils_1.isGradeGapAllowed)(row.pm_grade, row.emp_grade))
                return true;
            return false;
        });
        return {
            totalPMs: parseInt(summaryResult.rows[0].total),
            allocatedPMs: parseInt(summaryResult.rows[0].allocated),
            unallocatedPMs: parseInt(summaryResult.rows[0].unallocated),
            incorrectMappings: incorrectMappings.length,
        };
    }
    /**
     * Phase 5: SLA Compliance Metrics
     * Track assignment completion times against SLA targets
     */
    async getSLACompliance() {
        const result = await database_1.default.query(`
      SELECT 
        assignment_type,
        COUNT(*) as total,
        COUNT(CASE 
          WHEN effective_date IS NOT NULL 
            AND effective_date <= created_at + INTERVAL '3 days' 
          THEN 1 
        END) as within_sla,
        AVG(EXTRACT(EPOCH FROM (effective_date - created_at))/3600) as avg_completion_hours
      FROM pm_assignments
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY assignment_type
    `);
        return result.rows.map(row => ({
            assignmentType: row.assignment_type,
            total: parseInt(row.total),
            withinSLA: parseInt(row.within_sla || 0),
            complianceRate: row.total > 0 ? ((row.within_sla || 0) / row.total * 100).toFixed(2) : 0,
            avgCompletionHours: parseFloat(row.avg_completion_hours || 0).toFixed(2)
        }));
    }
    /**
     * Phase 5: Exception Queue Status
     * Monitor open exceptions by type and age
     */
    async getExceptionQueue() {
        const result = await database_1.default.query(`
      SELECT 
        exception_type,
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at))/86400) as avg_age_days
      FROM exceptions
      GROUP BY exception_type, status
      ORDER BY count DESC
    `);
        return result.rows.map(row => ({
            exceptionType: row.exception_type,
            status: row.status,
            count: parseInt(row.count),
            avgAgeDays: parseFloat(row.avg_age_days || 0).toFixed(1)
        }));
    }
    /**
     * Phase 5: PM Capacity Heatmap Data
     * Provide data for visual capacity heatmap
     */
    async getPMCapacityHeatmap() {
        const result = await database_1.default.query(`
      SELECT 
        pm.name,
        pm.practice,
        pm.cu,
        pm.region,
        pm.reportee_count,
        10 AS spec_capacity_cap,
        ROUND((pm.reportee_count::decimal / 10) * 100, 0) as utilization_percent,
        CASE 
          WHEN pm.reportee_count::decimal / 10 < 0.5 THEN 'Low'
          WHEN pm.reportee_count::decimal / 10 < 0.75 THEN 'Medium'
          WHEN pm.reportee_count::decimal / 10 < 0.9 THEN 'High'
          ELSE 'Critical'
        END as capacity_status
      FROM people_managers pm
      WHERE pm.is_active = true
      ORDER BY utilization_percent DESC
    `);
        return result.rows;
    }
    /**
     * Phase 5: Real-time Assignment Status
     * Current state of all assignments in the system
     */
    async getAssignmentStatus() {
        const result = await database_1.default.query(`
      SELECT 
        pa.status,
        pa.assignment_type,
        COUNT(*) as count,
        AVG(pa.match_score) as avg_score
      FROM pm_assignments pa
      WHERE pa.created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY pa.status, pa.assignment_type
      ORDER BY pa.status, count DESC
    `);
        return result.rows.map(row => ({
            status: row.status,
            assignmentType: row.assignment_type,
            count: parseInt(row.count),
            avgScore: parseFloat(row.avg_score || 0).toFixed(2)
        }));
    }
    /**
     * Phase 5: Workflow Efficiency Metrics
     * Measure time spent in each approval stage
     */
    async getWorkflowEfficiency() {
        const result = await database_1.default.query(`
      SELECT 
        aw.approver_role,
        COUNT(*) as total_approvals,
        AVG(EXTRACT(EPOCH FROM (aw.approved_at - aw.created_at))/3600) as avg_hours,
        COUNT(CASE WHEN aw.status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN aw.status = 'rejected' THEN 1 END) as rejected
      FROM approval_workflows aw
      WHERE aw.created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY aw.approver_role
      ORDER BY total_approvals DESC
    `);
        return result.rows.map(row => ({
            approverRole: row.approver_role,
            totalApprovals: parseInt(row.total_approvals),
            avgHours: parseFloat(row.avg_hours || 0).toFixed(2),
            approved: parseInt(row.approved || 0),
            rejected: parseInt(row.rejected || 0),
            approvalRate: row.total_approvals > 0
                ? ((row.approved || 0) / row.total_approvals * 100).toFixed(2)
                : 0
        }));
    }
    /**
     * Phase 5: Monthly Trends Summary
     * High-level KPIs for executive dashboard
     */
    async getMonthlyTrends() {
        const result = await database_1.default.query(`
      WITH monthly_data AS (
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          assignment_type,
          status,
          COUNT(*) as count
        FROM pm_assignments
        WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at), assignment_type, status
      )
      SELECT 
        TO_CHAR(month, 'YYYY-MM') as month,
        assignment_type,
        SUM(CASE WHEN status = 'approved' THEN count ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN count ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'pending' THEN count ELSE 0 END) as pending,
        SUM(count) as total
      FROM monthly_data
      GROUP BY month, assignment_type
      ORDER BY month DESC, assignment_type
    `);
        return result.rows;
    }
    /**
     * Phase 5: Matching Algorithm Performance
     * Evaluate quality of PM matches over time
     */
    async getMatchingPerformance() {
        const result = await database_1.default.query(`
      SELECT 
        DATE_TRUNC('week', pa.created_at) as week,
        AVG(pa.match_score) as avg_match_score,
        COUNT(*) as assignments,
        COUNT(CASE WHEN pa.status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN pa.status = 'rejected' THEN 1 END) as rejected
      FROM pm_assignments pa
      WHERE pa.created_at >= CURRENT_DATE - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', pa.created_at)
      ORDER BY week DESC
    `);
        return result.rows.map(row => ({
            week: row.week,
            avgMatchScore: parseFloat(row.avg_match_score || 0).toFixed(2),
            assignments: parseInt(row.assignments),
            approved: parseInt(row.approved || 0),
            rejected: parseInt(row.rejected || 0),
            approvalRate: row.assignments > 0
                ? ((row.approved || 0) / row.assignments * 100).toFixed(2)
                : 0
        }));
    }
}
exports.StatisticsService = StatisticsService;
