import pool from '../config/database';
import { MatchingService } from './matchingService';
import { ApprovalService } from './approvalService';
import { NotificationService } from './notificationService';
import { ReassignmentService } from './reassignmentService';
import { logger } from '../utils/logger';

export class WorkflowAutomationService {
  private matchingService = new MatchingService();
  private approvalService = new ApprovalService();
  private notificationService = new NotificationService();
  private reassignmentService = new ReassignmentService();

  /**
   * Phase 3: New Joiner Assignment Flow
   * Trigger: Daily schedule + new joiner detected
   * Actions: Fetch data → Run matching → Send notifications → Approval chain → Update system
   */
  async processNewJoiners() {
    try {
      logger.info('Starting new joiner assignment workflow');

      // Fetch new joiners without PM
      const result = await pool.query(`
        SELECT * FROM employees 
        WHERE is_new_joiner = true 
          AND current_pm_id IS NULL 
          AND is_frozen = false
          AND status = 'active'
        ORDER BY joining_date DESC
      `);

      const newJoiners = result.rows;
      logger.info(`Found ${newJoiners.length} new joiners to process`);

      for (const employee of newJoiners) {
        try {
          // Run matching algorithm
          const matches = await this.matchingService.findBestPM(employee);

          if (matches.length === 0) {
            // No match found - create exception
            await pool.query(
              `INSERT INTO exceptions (employee_id, exception_type, description, status)
               VALUES ($1, 'no_pm_found', 'No eligible PM found for new joiner', 'open')`,
              [employee.employee_id]
            );
            logger.warn('No PM match found', { employeeId: employee.employee_id });
            continue;
          }

          // Get best match
          const bestMatch = matches[0];
          
          // Create assignment
          const assignmentResult = await pool.query(
            `INSERT INTO pm_assignments 
             (employee_id, old_pm_id, new_pm_id, assignment_type, match_score, status)
             VALUES ($1, $2, $3, 'new_joiner', $4, 'pending')
             RETURNING id`,
            [employee.employee_id, employee.current_pm_id, bestMatch.pm.employee_id, bestMatch.score]
          );

          const assignmentId = assignmentResult.rows[0].id;

          // Create approval workflow
          await this.approvalService.createApprovalWorkflow(
            assignmentId,
            undefined, // No old PM for new joiners
            bestMatch.pm.email
          );

          // Send notifications
          await this.notificationService.notifyPMAssignment(
            employee.name,
            bestMatch.pm.name,
            bestMatch.pm.email
          );

          await this.notificationService.notifyApprovalRequired(
            assignmentId,
            'dcx@capgemini.com',
            employee.name
          );

          logger.info('New joiner assignment created', {
            employeeId: employee.employee_id,
            pmId: bestMatch.pm.employee_id,
            assignmentId
          });

        } catch (error) {
          logger.error('Error processing new joiner', { employeeId: employee.employee_id, error });
        }
      }

      return { processed: newJoiners.length };
    } catch (error) {
      logger.error('Error in new joiner workflow', error);
      throw error;
    }
  }

  /**
   * Phase 3: PM Reassignment Flow
   * Trigger: Separation report + capacity breach + data mismatch
   * Actions: Detect trigger → Find replacement → T-60/T-30/T-7 reminders → Approval → Update
   */
  async processReassignments() {
    try {
      logger.info('Starting PM reassignment workflow');

      // Check LWD alerts (T-60, T-30, T-7)
      await this.reassignmentService.checkLWDAlerts();

      // Check capacity breaches
      await this.reassignmentService.checkCapacityBreaches();

      // Check for data mismatches (practice, CU, region)
      await this.checkDataMismatches();

      // Check for bench vs separation discrepancies
      await this.checkBenchSeparationMismatch();

      logger.info('PM reassignment workflow completed');
      return { success: true };
    } catch (error) {
      logger.error('Error in reassignment workflow', error);
      throw error;
    }
  }

  /**
   * Phase 3: Monthly Engagement Flow
   * Trigger: 1st business day of month
   * Actions: Generate team snapshot → Send to all PMs
   */
  async processMonthlyEngagement() {
    try {
      logger.info('Starting monthly engagement workflow');

      // Get all active PMs
      const pmsResult = await pool.query(`
        SELECT * FROM people_managers WHERE is_active = true
      `);

      for (const pm of pmsResult.rows) {
        // Get team snapshot
        const teamResult = await pool.query(`
          SELECT e.employee_id, e.name, e.email, e.practice, e.cu, e.grade, e.joining_date
          FROM employees e
          WHERE e.current_pm_id = $1 AND e.status = 'active'
          ORDER BY e.name
        `, [pm.employee_id]);

        const teamMembers = teamResult.rows;

        // Generate snapshot message
        const snapshot = `
Dear ${pm.name},

Here is your team snapshot as of ${new Date().toLocaleDateString()}:

Total Team Members: ${teamMembers.length}
Current Capacity: ${pm.reportee_count}/${pm.max_capacity}

Team Members:
${teamMembers.map((m, i) => `${i + 1}. ${m.name} (${m.employee_id}) - ${m.grade} - Joined: ${m.joining_date}`).join('\n')}

Please review your team and report any discrepancies to pm-alignment@capgemini.com.

Best regards,
PM Alignment System
        `;

        // Send notification
        await this.notificationService.sendNotification({
          to: [pm.email],
          subject: 'Monthly Team Snapshot',
          body: snapshot,
          type: 'email'
        });

        logger.info('Monthly snapshot sent', { pmId: pm.employee_id });
      }

      return { pmsNotified: pmsResult.rows.length };
    } catch (error) {
      logger.error('Error in monthly engagement workflow', error);
      throw error;
    }
  }

  /**
   * Check for data mismatches between employees and PMs
   */
  private async checkDataMismatches() {
    const result = await pool.query(`
      SELECT e.employee_id, e.name, e.practice as emp_practice, e.cu as emp_cu, e.region as emp_region,
             pm.employee_id as pm_id, pm.name as pm_name, pm.practice as pm_practice, pm.cu as pm_cu, pm.region as pm_region
      FROM employees e
      JOIN people_managers pm ON e.current_pm_id = pm.employee_id
      WHERE e.status = 'active'
        AND e.is_frozen = false
        AND (e.practice != pm.practice OR e.cu != pm.cu OR e.region != pm.region)
    `);

    for (const mismatch of result.rows) {
      await pool.query(
        `INSERT INTO exceptions (employee_id, exception_type, description, status)
         VALUES ($1, 'data_mismatch', $2, 'open')
         ON CONFLICT (employee_id, exception_type) WHERE status = 'open' DO NOTHING`,
        [
          mismatch.employee_id,
          `Mismatch detected: Employee (${mismatch.emp_practice}/${mismatch.emp_cu}/${mismatch.emp_region}) vs PM (${mismatch.pm_practice}/${mismatch.pm_cu}/${mismatch.pm_region})`
        ]
      );

      logger.warn('Data mismatch detected', {
        employeeId: mismatch.employee_id,
        pmId: mismatch.pm_id
      });
    }

    return result.rows.length;
  }

  /**
   * Check for bench vs separation discrepancies
   * - Employees still active/bench but already in separation feed
   */
  private async checkBenchSeparationMismatch() {
    const result = await pool.query(`
      SELECT e.employee_id, e.name, e.practice, e.cu, e.region, sr.lwd
      FROM employees e
      JOIN separation_reports sr ON sr.employee_id = e.employee_id
      WHERE e.status = 'active'
        AND e.is_frozen = false
        AND e.current_pm_id IS NULL
        AND sr.status = 'pending'
    `);

    for (const row of result.rows) {
      await pool.query(
        `INSERT INTO exceptions (employee_id, exception_type, description, status)
         VALUES ($1, 'bench_separation_mismatch', $2, 'open')
         ON CONFLICT (employee_id, exception_type) WHERE status = 'open' DO NOTHING`,
        [
          row.employee_id,
          `Employee is on bench but also appears in separation feed (LWD: ${row.lwd}).`
        ]
      );
    }

    return result.rows.length;
  }

  /**
   * Process all pending approvals and send reminders
   */
  async processPendingApprovals() {
    try {
      // Get approvals pending for more than 2 days
      const result = await pool.query(`
        SELECT aw.*, pa.employee_id, e.name as employee_name
        FROM approval_workflows aw
        JOIN pm_assignments pa ON aw.assignment_id = pa.id
        JOIN employees e ON pa.employee_id = e.employee_id
        WHERE aw.status = 'pending'
          AND aw.created_at < CURRENT_TIMESTAMP - INTERVAL '2 days'
      `);

      for (const approval of result.rows) {
        await this.notificationService.sendNotification({
          to: [approval.approver_email],
          subject: 'Reminder: PM Assignment Approval Pending',
          body: `This is a reminder that PM assignment for ${approval.employee_name} (Assignment ID: ${approval.assignment_id}) requires your approval.`,
          type: 'email'
        });

        logger.info('Approval reminder sent', {
          workflowId: approval.id,
          approverEmail: approval.approver_email
        });
      }

      return { remindersSent: result.rows.length };
    } catch (error) {
      logger.error('Error processing pending approvals', error);
      throw error;
    }
  }
}
