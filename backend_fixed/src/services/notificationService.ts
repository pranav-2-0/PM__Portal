import { logger } from '../utils/logger';

interface NotificationPayload {
  to: string[];
  subject: string;
  body: string;
  type: 'email' | 'teams';
  adaptiveCard?: any;
}

interface PMRecommendation {
  assignmentId: number;
  employeeName: string;
  employeeId: string;
  pmName: string;
  pmEmail: string;
  score: number;
  reasons: string[];
  capacity: string;
}

export class NotificationService {
  /**
   * Phase 4: Send Teams Adaptive Card for PM recommendation
   */
  async sendPMRecommendationCard(recommendation: PMRecommendation, approverEmail: string) {
    const adaptiveCard = this.createPMRecommendationCard(recommendation);
    
    return this.sendNotification({
      to: [approverEmail],
      subject: `PM Assignment Recommendation: ${recommendation.employeeName}`,
      body: '',
      type: 'teams',
      adaptiveCard
    });
  }

  /**
   * Phase 4: Send Teams Adaptive Card for approval request
   */
  async sendApprovalRequestCard(assignmentId: number, employeeName: string, pmName: string, approverEmail: string) {
    const adaptiveCard = this.createApprovalRequestCard(assignmentId, employeeName, pmName);
    
    return this.sendNotification({
      to: [approverEmail],
      subject: `Approval Required: PM Assignment for ${employeeName}`,
      body: '',
      type: 'teams',
      adaptiveCard
    });
  }

  /**
   * Phase 4: Send Teams Adaptive Card for exception handling
   */
  async sendExceptionCard(exceptionId: number, employeeName: string, exceptionType: string, description: string) {
    const adaptiveCard = this.createExceptionCard(exceptionId, employeeName, exceptionType, description);
    
    return this.sendNotification({
      to: ['pm-alignment-team@capgemini.com'],
      subject: `Exception Alert: ${exceptionType}`,
      body: '',
      type: 'teams',
      adaptiveCard
    });
  }

  async sendNotification(payload: NotificationPayload) {
    logger.info('Sending notification', { to: payload.to, subject: payload.subject, type: payload.type });
    
    if (payload.type === 'teams' && payload.adaptiveCard) {
      // Mock Teams webhook implementation
      console.log(`
        ========================================
        TEAMS ADAPTIVE CARD
        ========================================
        To: ${payload.to.join(', ')}
        Subject: ${payload.subject}
        Card: ${JSON.stringify(payload.adaptiveCard, null, 2)}
        ========================================
      `);
    } else {
      // Mock email implementation
      console.log(`
        ========================================
        EMAIL NOTIFICATION
        ========================================
        To: ${payload.to.join(', ')}
        Subject: ${payload.subject}
        Body: ${payload.body}
        ========================================
      `);
    }
    
    return { success: true, message: 'Notification sent' };
  }

  /**
   * Create Teams Adaptive Card for PM recommendation with override option
   */
  private createPMRecommendationCard(recommendation: PMRecommendation) {
    return {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'PM Assignment Recommendation',
          weight: 'Bolder',
          size: 'Large',
          color: 'Accent'
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Employee:', value: `${recommendation.employeeName} (${recommendation.employeeId})` },
            { title: 'Recommended PM:', value: recommendation.pmName },
            { title: 'PM Email:', value: recommendation.pmEmail },
            { title: 'Match Score:', value: `${recommendation.score.toFixed(2)}%` },
            { title: 'PM Capacity:', value: recommendation.capacity }
          ]
        },
        {
          type: 'TextBlock',
          text: 'Match Reasons:',
          weight: 'Bolder',
          spacing: 'Medium'
        },
        {
          type: 'TextBlock',
          text: recommendation.reasons.join(', '),
          wrap: true
        },
        {
          type: 'Input.Text',
          id: 'comments',
          placeholder: 'Optional comments',
          isMultiline: true
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Approve',
          style: 'positive',
          data: {
            action: 'approve',
            assignmentId: recommendation.assignmentId
          }
        },
        {
          type: 'Action.Submit',
          title: 'Override PM',
          data: {
            action: 'override',
            assignmentId: recommendation.assignmentId
          }
        },
        {
          type: 'Action.Submit',
          title: 'Reject',
          style: 'destructive',
          data: {
            action: 'reject',
            assignmentId: recommendation.assignmentId
          }
        }
      ]
    };
  }

  /**
   * Create Teams Adaptive Card for approval request
   */
  private createApprovalRequestCard(assignmentId: number, employeeName: string, pmName: string) {
    return {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: 'PM Assignment Approval Required',
          weight: 'Bolder',
          size: 'Large',
          color: 'Warning'
        },
        {
          type: 'TextBlock',
          text: `Please review and approve the PM assignment for ${employeeName}.`,
          wrap: true
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Employee:', value: employeeName },
            { title: 'New PM:', value: pmName },
            { title: 'Assignment ID:', value: assignmentId.toString() }
          ]
        },
        {
          type: 'Input.Text',
          id: 'comments',
          placeholder: 'Comments (required for rejection)',
          isMultiline: true
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Approve',
          style: 'positive',
          data: {
            action: 'approve',
            workflowId: assignmentId
          }
        },
        {
          type: 'Action.Submit',
          title: 'Reject',
          style: 'destructive',
          data: {
            action: 'reject',
            workflowId: assignmentId
          }
        }
      ]
    };
  }

  /**
   * Create Teams Adaptive Card for exception handling
   */
  private createExceptionCard(exceptionId: number, employeeName: string, exceptionType: string, description: string) {
    return {
      type: 'AdaptiveCard',
      version: '1.4',
      body: [
        {
          type: 'TextBlock',
          text: '⚠️ Exception Alert',
          weight: 'Bolder',
          size: 'Large',
          color: 'Attention'
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Employee:', value: employeeName },
            { title: 'Exception Type:', value: exceptionType },
            { title: 'Description:', value: description },
            { title: 'Exception ID:', value: exceptionId.toString() }
          ]
        },
        {
          type: 'Input.Text',
          id: 'resolution',
          placeholder: 'Resolution notes',
          isMultiline: true
        },
        {
          type: 'Input.Text',
          id: 'justification',
          placeholder: 'Manual override justification (if applicable)',
          isMultiline: true
        }
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Resolve',
          style: 'positive',
          data: {
            action: 'resolve',
            exceptionId
          }
        },
        {
          type: 'Action.Submit',
          title: 'Reassign',
          data: {
            action: 'reassign',
            exceptionId
          }
        },
        {
          type: 'Action.OpenUrl',
          title: 'View Details',
          url: `${process.env.APP_URL || 'http://localhost:3000'}/exceptions/${exceptionId}`
        }
      ]
    };
  }

  async notifyPMAssignment(employeeName: string, pmName: string, pmEmail: string) {
    return this.sendNotification({
      to: [pmEmail],
      subject: 'New PM Assignment',
      body: `You have been assigned as People Manager for ${employeeName}. Please review and approve.`,
      type: 'email',
    });
  }

  async notifyApprovalRequired(assignmentId: number, approverEmail: string, employeeName: string) {
    return this.sendNotification({
      to: [approverEmail],
      subject: 'PM Assignment Approval Required',
      body: `Please review and approve PM assignment for ${employeeName}. Assignment ID: ${assignmentId}`,
      type: 'email',
    });
  }

  async notifyLWDAlert(pmName: string, pmEmail: string, daysRemaining: number) {
    return this.sendNotification({
      to: [pmEmail, 'pm-alignment@capgemini.com'],
      subject: `PM Separation Alert - ${daysRemaining} days remaining`,
      body: `${pmName} has ${daysRemaining} days until LWD. Please initiate reassignment process.`,
      type: 'email',
    });
  }

  async notifyAssignmentComplete(employeeEmail: string, pmName: string) {
    return this.sendNotification({
      to: [employeeEmail],
      subject: 'Your People Manager Assignment',
      body: `Your People Manager has been assigned: ${pmName}. Please reach out for introduction.`,
      type: 'email',
    });
  }

  /**
   * Notify PM alignment team that a PM is overloaded and requires re-alignment.
   * Triggered automatically whenever reportee_count >= max_capacity.
   */
  async notifyOverloadedPM(pmId: string, pmName: string, pmEmail: string, current: number, max: number) {
    return this.sendNotification({
      to: [pmEmail, 'pm-alignment@capgemini.com'],
      subject: `PM Re-alignment Required — ${pmName} is Overloaded (${current}/${max})`,
      body: [
        `People Manager ${pmName} (${pmId}) has reached or exceeded their capacity limit.`,
        `Current reportees: ${current} / Max allowed: ${max}`,
        ``,
        `Action required: Please initiate PM re-alignment to redistribute reportees.`,
        `Log in to the PM Alignment Portal to review and reassign.`,
      ].join('\n'),
      type: 'email',
    });
  }
}
