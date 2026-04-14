import pool from '../config/database';
import { logger } from '../utils/logger';

export class ApprovalService {
  async createApprovalWorkflow(assignmentId: number, oldPmEmail?: string, newPmEmail?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const approvers = [
        { role: 'old_pm', email: oldPmEmail },
        { role: 'new_pm', email: newPmEmail },
        { role: 'dcx', email: 'dcx@capgemini.com' },
      ].filter(a => a.email);

      for (const approver of approvers) {
        await client.query(
          `INSERT INTO approval_workflows (assignment_id, approver_role, approver_email, status)
           VALUES ($1, $2, $3, 'pending')`,
          [assignmentId, approver.role, approver.email]
        );
      }

      await client.query('COMMIT');
      logger.info('Approval workflow created', { assignmentId });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async approveStep(workflowId: number, comments?: string) {
    const result = await pool.query(
      `UPDATE approval_workflows 
       SET status = 'approved', comments = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING *`,
      [comments, workflowId]
    );

    const workflow = result.rows[0];
    await this.checkAndCompleteAssignment(workflow.assignment_id);
    
    return workflow;
  }

  async rejectStep(workflowId: number, comments: string) {
    await pool.query(
      `UPDATE approval_workflows 
       SET status = 'rejected', comments = $1, approved_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [comments, workflowId]
    );

    const workflow = await pool.query('SELECT assignment_id FROM approval_workflows WHERE id = $1', [workflowId]);
    await pool.query(
      `UPDATE pm_assignments SET status = 'rejected' WHERE id = $1`,
      [workflow.rows[0].assignment_id]
    );
  }

  private async checkAndCompleteAssignment(assignmentId: number) {
    const pending = await pool.query(
      `SELECT COUNT(*) as count FROM approval_workflows 
       WHERE assignment_id = $1 AND status = 'pending'`,
      [assignmentId]
    );

    if (parseInt(pending.rows[0].count) === 0) {
      await pool.query(
        `UPDATE pm_assignments SET status = 'approved', effective_date = CURRENT_DATE 
         WHERE id = $1`,
        [assignmentId]
      );

      const assignment = await pool.query(
        `SELECT employee_id, new_pm_id FROM pm_assignments WHERE id = $1`,
        [assignmentId]
      );

      await pool.query(
        `UPDATE employees SET current_pm_id = $1 WHERE employee_id = $2`,
        [assignment.rows[0].new_pm_id, assignment.rows[0].employee_id]
      );

      logger.info('Assignment completed', { assignmentId });
    }
  }

  async getWorkflowsByAssignment(assignmentId: number) {
    const result = await pool.query(
      `SELECT * FROM approval_workflows WHERE assignment_id = $1 ORDER BY id`,
      [assignmentId]
    );
    return result.rows;
  }
}
