module.exports = {
  // User Roles
  ROLES: {
    SUPER_ADMIN: 'super_admin',
    PROJECT_ADMIN: 'project_admin',
    PROJECT_MANAGER: 'project_manager',
    TEAM_MEMBER: 'team_member',
    CLIENT: 'client',
  },

  // User Status
  USER_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
  },

  // Project Status
  PROJECT_STATUS: {
    ACTIVE: 'active',
    ON_HOLD: 'on_hold',
    COMPLETED: 'completed',
    ARCHIVED: 'archived',
  },

  // Task Status
  TASK_STATUS: {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    REVIEW: 'review',
    COMPLETED: 'completed',
    CLOSED: 'closed',
  },

  // Task Priority
  TASK_PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
  },

  // Issue Status
  ISSUE_STATUS: {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    REOPENED: 'reopened',
  },

  // Issue Severity
  ISSUE_SEVERITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },

  // Issue Type
  ISSUE_TYPE: {
    BUG: 'bug',
    FEATURE_REQUEST: 'feature_request',
    IMPROVEMENT: 'improvement',
    TASK: 'task',
  },

  // Milestone Status
  MILESTONE_STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    OVERDUE: 'overdue',
  },

  // Invitation Status
  INVITATION_STATUS: {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
  },

  // Timer Status
  TIMER_STATUS: {
    RUNNING: 'running',
    PAUSED: 'paused',
    STOPPED: 'stopped',
  },

  // Notification Types
  NOTIFICATION_TYPES: {
    TASK_ASSIGNED: 'task_assigned',
    TASK_UPDATED: 'task_updated',
    TASK_COMPLETED: 'task_completed',
    COMMENT_ADDED: 'comment_added',
    MENTION: 'mention',
    DEADLINE_REMINDER: 'deadline_reminder',
    MILESTONE_DUE: 'milestone_due',
    PROJECT_INVITATION: 'project_invitation',
    TIMESHEET_APPROVAL: 'timesheet_approval',
    ISSUE_ASSIGNED: 'issue_assigned',
    ISSUE_UPDATED: 'issue_updated',
  },

  // Dependency Types
  DEPENDENCY_TYPES: {
    FINISH_TO_START: 'finish_to_start',
    START_TO_START: 'start_to_start',
    FINISH_TO_FINISH: 'finish_to_finish',
    START_TO_FINISH: 'start_to_finish',
  },

  // Entity Types (for attachments, comments, etc.)
  ENTITY_TYPES: {
    TASK: 'task',
    ISSUE: 'issue',
    DISCUSSION: 'discussion',
    PROJECT: 'project',
    DOCUMENT: 'document',
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // File Upload
  FILE_UPLOAD: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ],
  },
};
