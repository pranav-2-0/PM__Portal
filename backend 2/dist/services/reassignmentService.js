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
            const matches = await this.matchingService.findBestPM(employee);
            if (matches.length > 0) {
                const bestMatch = matches[0];
                await this.matchingService.assignPM(employee.employee_id, bestMatch.pm.employee_id, 'reassignment', bestMatch.score);
            }
            else {
                await database_1.default.query(`INSERT INTO exceptions (employee_id, exception_type, description, status)
           VALUES ($1, 'no_pm_found', 'No eligible PM found for reassignment', 'open')`, [employee.employee_id]);
            }
        }
    }
    async checkCapacityBreaches() {
        const result = await database_1.default.query(`SELECT * FROM people_managers 
       WHERE reportee_count >= max_capacity AND is_active = true`);
        for (const pm of result.rows) {
            logger_1.logger.warn('PM capacity breach detected', { pmId: pm.employee_id, capacity: pm.reportee_count });
            await database_1.default.query(`INSERT INTO exceptions (employee_id, exception_type, description, status)
         VALUES ($1, 'capacity_breach', $2, 'open')
         ON CONFLICT DO NOTHING`, [pm.employee_id, `PM has ${pm.reportee_count}/${pm.max_capacity} reportees`]);
            // Trigger re-alignment notification so the team can redistribute reportees
            await this.notificationService.notifyOverloadedPM(pm.employee_id, pm.name, pm.email, pm.reportee_count, pm.max_capacity);
        }
    }
}
exports.ReassignmentService = ReassignmentService;
