import pool from '../config/database';
import { MatchingService } from './matchingService';
import { NotificationService } from './notificationService';
import { logger } from '../utils/logger';
import { differenceInDays } from 'date-fns';

export class ReassignmentService {
  private matchingService = new MatchingService();
  private notificationService = new NotificationService();

  async checkLWDAlerts() {
    const result = await pool.query(
      `SELECT sr.*, pm.name, pm.email 
       FROM separation_reports sr
       JOIN people_managers pm ON sr.employee_id = pm.employee_id
       WHERE sr.status = 'pending' AND sr.lwd > CURRENT_DATE`
    );

    for (const separation of result.rows) {
      const daysRemaining = differenceInDays(new Date(separation.lwd), new Date());
      
      if ([60, 30, 7].includes(daysRemaining)) {
        await this.notificationService.notifyLWDAlert(
          separation.name,
          separation.email,
          daysRemaining
        );
        
        if (daysRemaining === 60) {
          await this.initiateReassignment(separation.employee_id);
        }
      }
    }
  }

  async initiateReassignment(pmId: string) {
    const employees = await pool.query(
      `SELECT * FROM employees WHERE current_pm_id = $1 AND status = 'active' AND is_frozen = false`,
      [pmId]
    );

    logger.info('Initiating reassignment', { pmId, employeeCount: employees.rows.length });

    for (const employee of employees.rows) {
      const matches = await this.matchingService.findBestPM(employee);
      
      if (matches.length > 0) {
        const bestMatch = matches[0];
        await this.matchingService.assignPM(
          employee.employee_id,
          bestMatch.pm.employee_id,
          'reassignment',
          bestMatch.score
        );
      } else {
        await pool.query(
          `INSERT INTO exceptions (employee_id, exception_type, description, status)
           VALUES ($1, 'no_pm_found', 'No eligible PM found for reassignment', 'open')`,
          [employee.employee_id]
        );
      }
    }
  }

  async checkCapacityBreaches() {
    const result = await pool.query(
      `SELECT * FROM people_managers 
       WHERE reportee_count >= max_capacity AND is_active = true`
    );

    for (const pm of result.rows) {
      logger.warn('PM capacity breach detected', { pmId: pm.employee_id, capacity: pm.reportee_count });
      
      await pool.query(
        `INSERT INTO exceptions (employee_id, exception_type, description, status)
         VALUES ($1, 'capacity_breach', $2, 'open')
         ON CONFLICT DO NOTHING`,
        [pm.employee_id, `PM has ${pm.reportee_count}/${pm.max_capacity} reportees`]
      );

      // Trigger re-alignment notification so the team can redistribute reportees
      await this.notificationService.notifyOverloadedPM(
        pm.employee_id,
        pm.name,
        pm.email,
        pm.reportee_count,
        pm.max_capacity
      );
    }
  }
}
