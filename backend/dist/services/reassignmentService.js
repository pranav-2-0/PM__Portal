"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReassignmentService = void 0;
const database_1 = __importDefault(require("../config/database"));
const matchingService_1 = require("./matchingService");
const notificationService_1 = require("./notificationService");
const logger_1 = require("../utils/logger");
const date_fns_1 = require("date-fns");
class ReassignmentService {
    constructor() {
        this.matchingService = new matchingService_1.MatchingService();
        this.notificationService = new notificationService_1.NotificationService();
    }
    async checkLWDAlerts() {
        const result = await database_1.default.query(`SELECT sr.*, pm.name, pm.email 
       FROM separation_reports sr
       JOIN people_managers pm ON sr.employee_id = pm.employee_id
       WHERE sr.status = 'pending' AND sr.lwd > CURRENT_DATE`);
        for (const separation of result.rows) {
            const daysRemaining = (0, date_fns_1.differenceInDays)(new Date(separation.lwd), new Date());
            if ([60, 30, 7].includes(daysRemaining)) {
                await this.notificationService.notifyLWDAlert(separation.name, separation.email, daysRemaining);
                if (daysRemaining === 60) {
                    await this.initiateReassignment(separation.employee_id);
                }
            }
        }
    }
    async initiateReassignment(pmId) {
        const employees = await database_1.default.query(`SELECT * FROM employees WHERE current_pm_id = $1 AND status = 'active' AND is_frozen = false`, [pmId]);
        logger_1.logger.info('Initiating reassignment', { pmId, employeeCount: employees.rows.length });
        for (const employee of employees.rows) {
            const matches = await this.matchingService.findBestPM(employee, true); // isPMResigned=true — MUST assign a PM (spec §4)
            if (matches.length > 0) {
                const bestMatch = matches[0];
                const assignmentType = bestMatch.forcedAssignment
                    ? 'FORCED_ASSIGNMENT'
                    : 'reassignment';
                await this.matchingService.assignPM(employee.employee_id, bestMatch.pm.employee_id, assignmentType, bestMatch.score);
                // Log decision path + deviation flags for transparency (spec §4)
                const deviationFlags = (bestMatch.flags || []).map(f => `[${f.severity}] ${f.code}`);
                logger_1.logger.info('Reassignment decision path logged', {
                    employeeId: employee.employee_id,
                    pmId: bestMatch.pm.employee_id,
                    decisionPath: bestMatch.path,
                    confidence: bestMatch.confidence,
                    matchTier: bestMatch.matchTier,
                    tiebreaker: bestMatch.tiebreakerApplied ?? null,
                    deviationFlags,
                    forcedAssignment: bestMatch.forcedAssignment ?? false,
                    overrideReason: bestMatch.overrideReason ?? null,
                });
            }
            else {
                await database_1.default.query(`INSERT INTO exceptions (employee_id, exception_type, description, status)
           VALUES ($1, 'no_pm_found', 'No eligible PM found for reassignment', 'open')`, [employee.employee_id]);
            }
        }
    }
    async checkCapacityBreaches() {
        // Spec mandates PM capacity < 10 — PMs at 10+ cannot accept new reportees
        const result = await database_1.default.query(`SELECT * FROM people_managers 
       WHERE reportee_count >= 10 AND is_active = true`);
        for (const pm of result.rows) {
            logger_1.logger.warn('PM at or over capacity (spec gate: <10)', { pmId: pm.employee_id, capacity: pm.reportee_count });
            await database_1.default.query(`INSERT INTO exceptions (employee_id, exception_type, description, status)
         VALUES ($1, 'capacity_breach', $2, 'open')
         ON CONFLICT DO NOTHING`, [pm.employee_id, `PM has ${pm.reportee_count}/10 reportees (at or above spec cap — excluded from new assignments)`]);
            // Trigger re-alignment notification so the team can redistribute reportees
            await this.notificationService.notifyOverloadedPM(pm.employee_id, pm.name, pm.email, pm.reportee_count, 10 // spec hard cap
            );
        }
    }
}
exports.ReassignmentService = ReassignmentService;
