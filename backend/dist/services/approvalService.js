"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../utils/logger");
class ApprovalService {
    async createApprovalWorkflow(assignmentId, oldPmEmail, newPmEmail) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            const approvers = [
                { role: 'old_pm', email: oldPmEmail },
                { role: 'new_pm', email: newPmEmail },
                { role: 'dcx', email: 'dcx@capgemini.com' },
            ].filter(a => a.email);
            for (const approver of approvers) {
                await client.query(`INSERT INTO approval_workflows (assignment_id, approver_role, approver_email, status)
           VALUES ($1, $2, $3, 'pending')`, [assignmentId, approver.role, approver.email]);
            }
            await client.query('COMMIT');
            logger_1.logger.info('Approval workflow created', { assignmentId });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async approveStep(workflowId, comments) {
        const result = await database_1.default.query(`UPDATE approval_workflows 
       SET status = 'approved', comments = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`, [comments, workflowId]);
        const workflow = result.rows[0];
        await this.checkAndCompleteAssignment(workflow.assignment_id);
        return workflow;
    }
    async rejectStep(workflowId, comments) {
        await database_1.default.query(`UPDATE approval_workflows 
       SET status = 'rejected', comments = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`, [comments, workflowId]);
        const workflow = await database_1.default.query('SELECT assignment_id FROM approval_workflows WHERE id = $1', [workflowId]);
        await database_1.default.query(`UPDATE pm_assignments SET status = 'rejected' WHERE id = $1`, [workflow.rows[0].assignment_id]);
    }
    async checkAndCompleteAssignment(assignmentId) {
        const pending = await database_1.default.query(`SELECT COUNT(*) as count FROM approval_workflows 
       WHERE assignment_id = $1 AND status = 'pending'`, [assignmentId]);
        if (parseInt(pending.rows[0].count) === 0) {
            await database_1.default.query(`UPDATE pm_assignments SET status = 'approved', effective_date = CURRENT_DATE 
         WHERE id = $1`, [assignmentId]);
            const assignment = await database_1.default.query(`SELECT employee_id, new_pm_id FROM pm_assignments WHERE id = $1`, [assignmentId]);
            await database_1.default.query(`UPDATE employees SET current_pm_id = $1 WHERE employee_id = $2`, [assignment.rows[0].new_pm_id, assignment.rows[0].employee_id]);
            logger_1.logger.info('Assignment completed', { assignmentId });
        }
    }
    async getWorkflowsByAssignment(assignmentId) {
        const result = await database_1.default.query(`SELECT * FROM approval_workflows WHERE assignment_id = $1 ORDER BY id`, [assignmentId]);
        return result.rows;
    }
}
exports.ApprovalService = ApprovalService;
