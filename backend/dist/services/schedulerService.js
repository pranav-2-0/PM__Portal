"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schedulerService = exports.SchedulerService = void 0;
const workflowAutomationService_1 = require("./workflowAutomationService");
const logger_1 = require("../utils/logger");
/**
 * Scheduler Service for automated workflows
 * Uses simple setInterval for now - can be replaced with node-cron or Azure Functions Timer Trigger
 */
class SchedulerService {
    constructor() {
        this.workflowService = new workflowAutomationService_1.WorkflowAutomationService();
        this.intervals = [];
    }
    /**
     * Start all scheduled jobs
     */
    start() {
        logger_1.logger.info('Starting scheduler service');
        // Daily new joiner assignment - runs every day at 9 AM
        this.scheduleDailyJob(() => this.workflowService.processNewJoiners(), '09:00');
        // Daily reassignment check - runs every day at 10 AM
        this.scheduleDailyJob(() => this.workflowService.processReassignments(), '10:00');
        // Approval reminders - runs every 6 hours
        this.schedulePeriodicJob(() => this.workflowService.processPendingApprovals(), 6 * 60 * 60 * 1000);
        // Monthly engagement - runs on 1st of every month at 8 AM
        this.scheduleMonthlyJob(() => this.workflowService.processMonthlyEngagement(), 1, '08:00');
        logger_1.logger.info('All scheduled jobs started');
    }
    /**
     * Stop all scheduled jobs
     */
    stop() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        logger_1.logger.info('All scheduled jobs stopped');
    }
    /**
     * Schedule a job to run daily at a specific time
     */
    scheduleDailyJob(job, time) {
        const [hours, minutes] = time.split(':').map(Number);
        const runJob = async () => {
            const now = new Date();
            if (now.getHours() === hours && now.getMinutes() === minutes) {
                try {
                    logger_1.logger.info(`Running scheduled job at ${time}`);
                    await job();
                }
                catch (error) {
                    logger_1.logger.error('Error in scheduled job', error);
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
    schedulePeriodicJob(job, intervalMs) {
        const runJob = async () => {
            try {
                logger_1.logger.info('Running periodic job');
                await job();
            }
            catch (error) {
                logger_1.logger.error('Error in periodic job', error);
            }
        };
        const interval = setInterval(runJob, intervalMs);
        this.intervals.push(interval);
    }
    /**
     * Schedule a job to run monthly on a specific day
     */
    scheduleMonthlyJob(job, day, time) {
        const [hours, minutes] = time.split(':').map(Number);
        const runJob = async () => {
            const now = new Date();
            if (now.getDate() === day && now.getHours() === hours && now.getMinutes() === minutes) {
                try {
                    logger_1.logger.info(`Running monthly job on day ${day} at ${time}`);
                    await job();
                }
                catch (error) {
                    logger_1.logger.error('Error in monthly job', error);
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
        logger_1.logger.info('Manually triggering new joiner workflow');
        return await this.workflowService.processNewJoiners();
    }
    /**
     * Manually trigger reassignment workflow
     */
    async triggerReassignmentWorkflow() {
        logger_1.logger.info('Manually triggering reassignment workflow');
        return await this.workflowService.processReassignments();
    }
    /**
     * Manually trigger monthly engagement workflow
     */
    async triggerMonthlyEngagementWorkflow() {
        logger_1.logger.info('Manually triggering monthly engagement workflow');
        return await this.workflowService.processMonthlyEngagement();
    }
}
exports.SchedulerService = SchedulerService;
// Export singleton instance
exports.schedulerService = new SchedulerService();
