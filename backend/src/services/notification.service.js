const { Notification, NotificationPreference, User } = require('../models');
const { NOTIFICATION_TYPES } = require('../config/constants');
const emailService = require('./email.service');
const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.io = null;
  }

  /**
   * Initialize with Socket.IO instance
   */
  initialize(io) {
    this.io = io;
    logger.info('Notification service initialized with Socket.IO');
  }

  /**
   * Create and send notification
   */
  async notify(userId, type, data) {
    try {
      // Check user preferences
      const preferences = await NotificationPreference.getOrCreate(userId);

      // Check if project is muted
      if (data.projectId && preferences.mutedProjects.includes(data.projectId)) {
        return null;
      }

      // Create in-app notification if enabled
      let notification = null;
      if (preferences.shouldNotify(type, 'inApp')) {
        notification = await Notification.createNotification({
          userId,
          type,
          title: data.title,
          message: data.message,
          link: data.link,
          data: data.metadata,
          actorId: data.actorId,
          projectId: data.projectId,
          entityType: data.entityType,
          entityId: data.entityId,
        });

        // Send real-time notification via WebSocket
        if (this.io) {
          this.io.to(`user:${userId}`).emit('notification', {
            ...notification.toObject(),
            actor: data.actor,
          });
        }
      }

      // Send email notification if enabled
      if (preferences.shouldNotify(type, 'email')) {
        await this.sendEmailNotification(userId, type, data);
      }

      return notification;
    } catch (error) {
      logger.error('Error creating notification:', error);
      return null;
    }
  }

  /**
   * Send notification to multiple users
   */
  async notifyMany(userIds, type, data) {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.notify(userId, type, data))
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter(Boolean);
  }

  /**
   * Send email based on notification type
   */
  async sendEmailNotification(userId, type, data) {
    try {
      const user = await User.findById(userId);
      if (!user?.email) return;

      switch (type) {
        case NOTIFICATION_TYPES.TASK_ASSIGNED:
          await emailService.sendTaskAssignmentEmail(
            user.email,
            data.task,
            data.actor?.fullName || 'Someone',
            data.projectName
          );
          break;

        case NOTIFICATION_TYPES.DEADLINE_REMINDER:
          await emailService.sendDeadlineReminderEmail(
            user.email,
            data.task,
            data.projectName,
            data.daysUntilDue
          );
          break;

        case NOTIFICATION_TYPES.MENTION:
          await emailService.sendMentionEmail(
            user.email,
            data.actor?.fullName || 'Someone',
            data.entityType,
            data.entityTitle,
            data.content,
            data.link
          );
          break;

        // Add more email types as needed
        default:
          // Generic email for other notification types
          break;
      }

      // Update notification email status
      if (data.notificationId) {
        await Notification.findByIdAndUpdate(data.notificationId, {
          emailSent: true,
          emailSentAt: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error sending email notification:', error);
    }
  }

  /**
   * Notify task assignment
   */
  async notifyTaskAssignment(task, assignees, assigner, project) {
    for (const assigneeId of assignees) {
      if (assigneeId.toString() === assigner._id.toString()) continue;

      await this.notify(assigneeId, NOTIFICATION_TYPES.TASK_ASSIGNED, {
        title: 'New Task Assigned',
        message: `${assigner.fullName} assigned you to "${task.title}"`,
        link: `/projects/${project._id}/tasks/${task._id}`,
        actorId: assigner._id,
        projectId: project._id,
        entityType: 'task',
        entityId: task._id,
        actor: assigner,
        task,
        projectName: project.name,
      });
    }
  }

  /**
   * Notify task update
   */
  async notifyTaskUpdate(task, updater, project, watchers) {
    const userIds = [
      ...task.assigneeIds,
      task.createdBy,
      ...watchers,
    ].filter(
      (id, index, self) =>
        id.toString() !== updater._id.toString() &&
        self.findIndex((i) => i.toString() === id.toString()) === index
    );

    await this.notifyMany(userIds, NOTIFICATION_TYPES.TASK_UPDATED, {
      title: 'Task Updated',
      message: `${updater.fullName} updated "${task.title}"`,
      link: `/projects/${project._id}/tasks/${task._id}`,
      actorId: updater._id,
      projectId: project._id,
      entityType: 'task',
      entityId: task._id,
      actor: updater,
    });
  }

  /**
   * Notify comment added
   */
  async notifyComment(comment, author, entityType, entity, project) {
    let userIds = [];

    if (entityType === 'task') {
      userIds = [
        ...entity.assigneeIds,
        entity.createdBy,
        ...entity.watchers,
      ];
    } else if (entityType === 'discussion') {
      userIds = [...entity.participants, entity.createdBy];
    }

    // Add mentioned users
    if (comment.mentions?.length > 0) {
      userIds = [...userIds, ...comment.mentions];
    }

    // Remove duplicates and author
    userIds = userIds.filter(
      (id, index, self) =>
        id.toString() !== author._id.toString() &&
        self.findIndex((i) => i.toString() === id.toString()) === index
    );

    await this.notifyMany(userIds, NOTIFICATION_TYPES.COMMENT_ADDED, {
      title: 'New Comment',
      message: `${author.fullName} commented on "${entity.title}"`,
      link: `/projects/${project._id}/${entityType}s/${entity._id}`,
      actorId: author._id,
      projectId: project._id,
      entityType,
      entityId: entity._id,
      actor: author,
    });

    // Send separate mention notifications
    if (comment.mentions?.length > 0) {
      for (const mentionedUserId of comment.mentions) {
        await this.notify(mentionedUserId, NOTIFICATION_TYPES.MENTION, {
          title: 'You were mentioned',
          message: `${author.fullName} mentioned you in a comment`,
          link: `/projects/${project._id}/${entityType}s/${entity._id}`,
          actorId: author._id,
          projectId: project._id,
          entityType: 'comment',
          entityId: comment._id,
          actor: author,
          entityTitle: entity.title,
          content: comment.content,
        });
      }
    }
  }

  /**
   * Notify milestone due
   */
  async notifyMilestoneDue(milestone, project, daysUntilDue) {
    const projectMembers = project.members.map((m) => m.userId);

    await this.notifyMany(projectMembers, NOTIFICATION_TYPES.MILESTONE_DUE, {
      title: 'Milestone Due Soon',
      message: `Milestone "${milestone.name}" is due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}`,
      link: `/projects/${project._id}/milestones`,
      projectId: project._id,
      entityType: 'milestone',
      entityId: milestone._id,
    });
  }

  /**
   * Notify deadline reminder
   */
  async notifyDeadlineReminder(task, project, daysUntilDue) {
    await this.notifyMany(task.assigneeIds, NOTIFICATION_TYPES.DEADLINE_REMINDER, {
      title: 'Task Deadline Reminder',
      message: `"${task.title}" is due ${daysUntilDue === 0 ? 'today' : daysUntilDue === 1 ? 'tomorrow' : `in ${daysUntilDue} days`}`,
      link: `/projects/${project._id}/tasks/${task._id}`,
      projectId: project._id,
      entityType: 'task',
      entityId: task._id,
      task,
      projectName: project.name,
      daysUntilDue,
    });
  }

  /**
   * Notify issue assignment
   */
  async notifyIssueAssignment(issue, assignee, assigner, project) {
    if (assignee._id.toString() === assigner._id.toString()) return;

    await this.notify(assignee._id, NOTIFICATION_TYPES.ISSUE_ASSIGNED, {
      title: 'Issue Assigned',
      message: `${assigner.fullName} assigned you to issue "${issue.title}"`,
      link: `/projects/${project._id}/issues/${issue._id}`,
      actorId: assigner._id,
      projectId: project._id,
      entityType: 'issue',
      entityId: issue._id,
      actor: assigner,
    });
  }

  /**
   * Notify timesheet approval
   */
  async notifyTimesheetApproval(userId, approver, status, projectName) {
    await this.notify(userId, NOTIFICATION_TYPES.TIMESHEET_APPROVAL, {
      title: `Timesheet ${status === 'approved' ? 'Approved' : 'Rejected'}`,
      message: `${approver.fullName} ${status} your timesheet for ${projectName}`,
      link: '/timesheets',
      actorId: approver._id,
      actor: approver,
    });
  }
}

module.exports = new NotificationService();
