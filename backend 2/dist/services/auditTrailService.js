"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditTrailService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
/**
 * Phase 5: Audit Trail Service
 * Tracks all changes for compliance and monitoring
 */
class AuditTrailService {
    /**
     * Log an audit entry
     */
    async log(entry) {
        try {
            await database_1.default.query(`INSERT INTO audit_trail 
         (user_id, action, entity_type, entity_id, old_value, new_value, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`, [
                entry.userId || 'system',
                entry.action,
                entry.entityType,
                entry.entityId,
                entry.oldValue ? JSON.stringify(entry.oldValue) : null,
                entry.newValue ? JSON.stringify(entry.newValue) : null,
                entry.metadata ? JSON.stringify(entry.metadata) : null
            ]);
            logger_1.logger.info('Audit entry logged', {
                action: entry.action,
                entityType: entry.entityType,
                entityId: entry.entityId
            });
        }
        catch (error) {
            logger_1.logger.error('Error logging audit entry', error);
        }
    }
    /**
     * Log assignment creation
     */
    async logAssignmentCreated(assignmentId, employeeId, pmId, userId) {
        await this.log({
            userId,
            action: 'assignment_created',
            entityType: 'pm_assignment',
            entityId: assignmentId.toString(),
            newValue: { employeeId, pmId },
            metadata: { timestamp: new Date().toISOString() }
        });
    }
    /**
     * Log assignment approval
     */
    async logAssignmentApproved(assignmentId, approverEmail, comments) {
        await this.log({
            userId: approverEmail,
            action: 'assignment_approved',
            entityType: 'pm_assignment',
            entityId: assignmentId.toString(),
            metadata: { comments, timestamp: new Date().toISOString() }
        });
    }
    /**
     * Log assignment rejection
     */
    async logAssignmentRejected(assignmentId, approverEmail, comments) {
        await this.log({
            userId: approverEmail,
            action: 'assignment_rejected',
            entityType: 'pm_assignment',
            entityId: assignmentId.toString(),
            metadata: { comments, timestamp: new Date().toISOString() }
        });
    }
    /**
     * Log PM change
     */
    async logPMChange(employeeId, oldPmId, newPmId, userId) {
        await this.log({
            userId,
            action: 'pm_changed',
            entityType: 'employee',
            entityId: employeeId,
            oldValue: { pmId: oldPmId },
            newValue: { pmId: newPmId },
            metadata: { timestamp: new Date().toISOString() }
        });
    }
    /**
     * Log exception created
     */
    async logExceptionCreated(exceptionId, employeeId, exceptionType, userId) {
        await this.log({
            userId,
            action: 'exception_created',
            entityType: 'exception',
            entityId: exceptionId.toString(),
            newValue: { employeeId, exceptionType },
            metadata: { timestamp: new Date().toISOString() }
        });
    }
    /**
     * Log exception resolved
     */
    async logExceptionResolved(exceptionId, resolvedBy, resolution) {
        await this.log({
            userId: resolvedBy,
            action: 'exception_resolved',
            entityType: 'exception',
            entityId: exceptionId.toString(),
            metadata: { resolution, timestamp: new Date().toISOString() }
        });
    }
    /**
     * Get audit trail for an entity
     */
    async getAuditTrail(entityType, entityId, limit = 50) {
        const result = await database_1.default.query(`SELECT * FROM audit_trail 
       WHERE entity_type = $1 AND entity_id = $2 
       ORDER BY timestamp DESC 
       LIMIT $3`, [entityType, entityId, limit]);
        return result.rows;
    }
    /**
     * Get audit trail by user
     */
    async getAuditTrailByUser(userId, limit = 50) {
        const result = await database_1.default.query(`SELECT * FROM audit_trail 
       WHERE user_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`, [userId, limit]);
        return result.rows;
    }
    /**
     * Get recent audit trail
     */
    async getRecentAuditTrail(limit = 100) {
        const result = await database_1.default.query(`SELECT * FROM audit_trail 
       ORDER BY timestamp DESC 
       LIMIT $1`, [limit]);
        return result.rows;
    }
    /**
     * Get audit trail by date range
     */
    async getAuditTrailByDateRange(startDate, endDate) {
        const result = await database_1.default.query(`SELECT * FROM audit_trail 
       WHERE timestamp BETWEEN $1 AND $2 
       ORDER BY timestamp DESC`, [startDate, endDate]);
        return result.rows;
    }
    /**
     * Get audit statistics
     */
    async getAuditStatistics(days = 30) {
        const result = await database_1.default.query(`SELECT 
         action,
         COUNT(*) as count,
         COUNT(DISTINCT user_id) as unique_users
       FROM audit_trail
       WHERE timestamp >= CURRENT_DATE - INTERVAL '${days} days'
       GROUP BY action
       ORDER BY count DESC`);
        return result.rows;
    }
}
exports.AuditTrailService = AuditTrailService;
