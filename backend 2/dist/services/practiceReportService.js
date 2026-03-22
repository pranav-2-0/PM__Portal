"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.practiceReportService = exports.PracticeReportService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
class PracticeReportService {
    /**
     * Generate comprehensive practice report with all metrics
     */
    async generatePracticeReport(filters) {
        logger_1.logger.info('Generating practice report', { filters });
        const whereClause = this.buildWhereClause(filters);
        const [pmCapacity, bench, separations, employees] = await Promise.all([
            this.getPMCapacityMetrics(whereClause),
            this.getBenchMetrics(whereClause),
            this.getSeparationMetrics(whereClause),
            this.getEmployeeMetrics(whereClause),
        ]);
        return {
            practice: filters.practice || 'All',
            cu: filters.cu || 'All',
            region: filters.region || 'All',
            generatedAt: new Date(),
            pmCapacity,
            bench,
            separations,
            employees,
        };
    }
    /**
     * Get PM capacity metrics with business rules applied
     */
    async getPMCapacityMetrics(whereClause) {
        const query = `
      SELECT 
        pm.*,
        CASE 
          WHEN pm.grade LIKE 'D%' THEN 15
          ELSE 10
        END as max_capacity,
        CASE 
          WHEN pm.grade LIKE 'D%' THEN 
            ROUND((pm.reportee_count::numeric / 15) * 100, 1)
          ELSE 
            ROUND((pm.reportee_count::numeric / 10) * 100, 1)
        END as utilization_percent
      FROM people_managers pm
      WHERE pm.is_active = true ${whereClause}
    `;
        const result = await database_1.default.query(query);
        const pms = result.rows;
        // Apply business rules for capacity categorization
        const overCapacity = pms.filter(pm => pm.utilization_percent >= 90);
        const highUtilization = pms.filter(pm => pm.utilization_percent >= 80 && pm.utilization_percent < 90);
        const optimal = pms.filter(pm => pm.utilization_percent >= 50 && pm.utilization_percent < 80);
        const underUtilized = pms.filter(pm => pm.utilization_percent < 50);
        const avgUtil = pms.length > 0
            ? pms.reduce((sum, pm) => sum + parseFloat(pm.utilization_percent), 0) / pms.length
            : 0;
        return {
            totalPMs: pms.length,
            overCapacity: overCapacity.length,
            highUtilization: highUtilization.length,
            optimal: optimal.length,
            underUtilized: underUtilized.length,
            averageUtilization: Math.round(avgUtil * 10) / 10,
            overCapacityList: overCapacity.slice(0, 20).map(pm => ({
                employee_id: pm.employee_id,
                name: pm.name,
                email: pm.email,
                grade: pm.grade,
                practice: pm.practice,
                reportee_count: pm.reportee_count,
                max_capacity: pm.max_capacity,
                utilization: pm.utilization_percent + '%',
            })),
            underUtilizedList: underUtilized.slice(0, 20).map(pm => ({
                employee_id: pm.employee_id,
                name: pm.name,
                email: pm.email,
                grade: pm.grade,
                practice: pm.practice,
                reportee_count: pm.reportee_count,
                max_capacity: pm.max_capacity,
                utilization: pm.utilization_percent + '%',
            })),
        };
    }
    /**
     * Get bench metrics with business rules applied
     */
    async getBenchMetrics(whereClause) {
        const query = `
      SELECT 
        e.*,
        CASE 
          WHEN e.joining_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (CURRENT_DATE - e.joining_date))
          ELSE 0
        END as days_on_bench
      FROM employees e
      WHERE e.current_pm_id IS NULL ${whereClause}
    `;
        const result = await database_1.default.query(query);
        const benchEmployees = result.rows;
        // Business rule: Critical = >30 days on bench
        const critical = benchEmployees.filter(emp => emp.days_on_bench > 30);
        const newJoiners = benchEmployees.filter(emp => emp.is_new_joiner);
        const avgDays = benchEmployees.length > 0
            ? benchEmployees.reduce((sum, emp) => sum + parseInt(emp.days_on_bench || '0'), 0) / benchEmployees.length
            : 0;
        return {
            totalBench: benchEmployees.length,
            critical: critical.length,
            newJoiners: newJoiners.length,
            averageDaysOnBench: Math.round(avgDays),
            criticalList: critical.slice(0, 20).map(emp => ({
                employee_id: emp.employee_id,
                name: emp.name,
                email: emp.email,
                grade: emp.grade,
                practice: emp.practice,
                skill: emp.skill,
                days_on_bench: emp.days_on_bench,
                is_new_joiner: emp.is_new_joiner,
            })),
        };
    }
    /**
     * Get separation metrics with business rules applied
     */
    async getSeparationMetrics(whereClause) {
        const query = `
      SELECT 
        sr.*,
        pm.name as pm_name,
        pm.email as pm_email,
        pm.grade as pm_grade,
        pm.practice as pm_practice,
        pm.reportee_count,
        EXTRACT(DAY FROM (sr.lwd - CURRENT_DATE)) as days_until_lwd
      FROM separation_reports sr
      LEFT JOIN people_managers pm ON sr.employee_id = pm.employee_id
      WHERE sr.status != 'completed' ${whereClause}
    `;
        const result = await database_1.default.query(query);
        const separations = result.rows;
        // Business rules: Critical ≤7 days, Warning ≤30 days
        const critical = separations.filter(sep => sep.days_until_lwd <= 7);
        const warning = separations.filter(sep => sep.days_until_lwd <= 30);
        const withReportees = separations.filter(sep => sep.reportee_count > 0);
        const affectedEmployees = withReportees.reduce((sum, sep) => sum + (sep.reportee_count || 0), 0);
        return {
            totalSeparations: separations.length,
            critical: critical.length,
            warning: warning.length,
            withReportees: withReportees.length,
            affectedEmployees,
            separationsList: separations.slice(0, 20).map(sep => ({
                employee_id: sep.employee_id,
                pm_name: sep.pm_name,
                pm_email: sep.pm_email,
                grade: sep.pm_grade,
                practice: sep.pm_practice,
                lwd: sep.lwd,
                days_until_lwd: sep.days_until_lwd,
                reportee_count: sep.reportee_count || 0,
                status: sep.status,
            })),
        };
    }
    /**
     * Get employee metrics
     */
    async getEmployeeMetrics(whereClause) {
        const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(current_pm_id) as with_pm,
        COUNT(*) FILTER (WHERE current_pm_id IS NULL) as without_pm,
        COUNT(*) FILTER (WHERE is_new_joiner = true) as new_joiners
      FROM employees
      WHERE 1=1 ${whereClause}
    `;
        const result = await database_1.default.query(query);
        const row = result.rows[0];
        return {
            total: parseInt(row.total),
            withPM: parseInt(row.with_pm),
            withoutPM: parseInt(row.without_pm),
            newJoiners: parseInt(row.new_joiners),
        };
    }
    /**
     * Build WHERE clause from filters
     */
    buildWhereClause(filters) {
        const conditions = [];
        if (filters.practice && filters.practice !== 'All') {
            conditions.push(`AND practice = '${filters.practice.replace(/'/g, "''")}'`);
        }
        if (filters.cu && filters.cu !== 'All') {
            conditions.push(`AND cu = '${filters.cu.replace(/'/g, "''")}'`);
        }
        if (filters.region && filters.region !== 'All') {
            conditions.push(`AND region = '${filters.region.replace(/'/g, "''")}'`);
        }
        return conditions.join(' ');
    }
    /**
     * Get list of all practices for dropdown
     */
    async getPracticesList() {
        // Union practices from both PMs and employees so filters cover all uploaded data
        const query = `
      SELECT DISTINCT practice FROM (
        SELECT practice FROM people_managers WHERE practice IS NOT NULL AND practice != ''
        UNION
        SELECT practice FROM employees WHERE practice IS NOT NULL AND practice != ''
      ) combined
      ORDER BY practice
    `;
        const result = await database_1.default.query(query);
        return result.rows.map(row => row.practice);
    }
    /**
     * Get list of all CUs for dropdown
     */
    async getCUsList() {
        const query = `
      SELECT DISTINCT cu FROM (
        SELECT cu FROM people_managers WHERE cu IS NOT NULL AND cu != ''
        UNION
        SELECT cu FROM employees WHERE cu IS NOT NULL AND cu != ''
      ) combined
      ORDER BY cu
    `;
        const result = await database_1.default.query(query);
        return result.rows.map(row => row.cu);
    }
    /**
     * Get list of all regions for dropdown
     */
    async getRegionsList() {
        const query = `
      SELECT DISTINCT region FROM (
        SELECT region FROM people_managers WHERE region IS NOT NULL AND region != ''
        UNION
        SELECT region FROM employees WHERE region IS NOT NULL AND region != ''
      ) combined
      ORDER BY region
    `;
        const result = await database_1.default.query(query);
        return result.rows.map(row => row.region);
    }
}
exports.PracticeReportService = PracticeReportService;
exports.practiceReportService = new PracticeReportService();
