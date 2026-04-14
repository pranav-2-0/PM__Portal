import { WorkflowAutomationService } from './workflowAutomationService';
import { logger } from '../utils/logger';

/**
 * Scheduler Service for automated workflows
 * Uses simple setInterval for now - can be replaced with node-cron or Azure Functions Timer Trigger
 */
export class SchedulerService {
  private workflowService = new WorkflowAutomationService();
  private intervals: NodeJS.Timeout[] = [];

  /**
   * Start all scheduled jobs
   */
  start() {
    logger.info('Starting scheduler service');

    // Daily new joiner assignment - runs every day at 9 AM
    this.scheduleDailyJob(() => this.workflowService.processNewJoiners(), '09:00');

    // Daily reassignment check - runs every day at 10 AM
    this.scheduleDailyJob(() => this.workflowService.processReassignments(), '10:00');

    // Approval reminders - runs every 6 hours
    this.schedulePeriodicJob(() => this.workflowService.processPendingApprovals(), 6 * 60 * 60 * 1000);

    // Monthly engagement - runs on 1st of every month at 8 AM
    this.scheduleMonthlyJob(() => this.workflowService.processMonthlyEngagement(), 1, '08:00');

    logger.info('All scheduled jobs started');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    logger.info('All scheduled jobs stopped');
  }

  /**
   * Schedule a job to run daily at a specific time
   */
  private scheduleDailyJob(job: () => Promise<any>, time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    
    const runJob = async () => {
      const now = new Date();
      if (now.getHours() === hours && now.getMinutes() === minutes) {
        try {
          logger.info(`Running scheduled job at ${time}`);
          await job();
        } catch (error) {
          logger.error('Error in scheduled job', error);
        }
      }
    };

    // Check every minute
    const interval = setInterval(runJob, 60 * 1000);
    this.intervals.push(interval);
  }

  /**
   * Schedule a job to run periodically
   */
  private schedulePeriodicJob(job: () => Promise<any>, intervalMs: number) {
    const runJob = async () => {
      try {
        logger.info('Running periodic job');
        await job();
      } catch (error) {
        logger.error('Error in periodic job', error);
      }
    };

    const interval = setInterval(runJob, intervalMs);
    this.intervals.push(interval);
  }

  /**
   * Schedule a job to run monthly on a specific day
   */
  private scheduleMonthlyJob(job: () => Promise<any>, day: number, time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    
    const runJob = async () => {
      const now = new Date();
      if (now.getDate() === day && now.getHours() === hours && now.getMinutes() === minutes) {
        try {
          logger.info(`Running monthly job on day ${day} at ${time}`);
          await job();
        } catch (error) {
          logger.error('Error in monthly job', error);
        }
      }
    };

    // Check every minute
    const interval = setInterval(runJob, 60 * 1000);
    this.intervals.push(interval);
  }

  /**
   * Manually trigger new joiner workflow
   */
  async triggerNewJoinerWorkflow() {
    logger.info('Manually triggering new joiner workflow');
    return await this.workflowService.processNewJoiners();
  }

  /**
   * Manually trigger reassignment workflow
   */
  async triggerReassignmentWorkflow() {
    logger.info('Manually triggering reassignment workflow');
    return await this.workflowService.processReassignments();
  }

  /**
   * Manually trigger monthly engagement workflow
   */
  async triggerMonthlyEngagementWorkflow() {
    logger.info('Manually triggering monthly engagement workflow');
    return await this.workflowService.processMonthlyEngagement();
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();
