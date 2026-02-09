export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  PROJECT_ADMIN: 'project_admin',
  PROJECT_MANAGER: 'project_manager',
  TEAM_MEMBER: 'team_member',
  CLIENT: 'client',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.PROJECT_ADMIN]: 'Project Admin',
  [ROLES.PROJECT_MANAGER]: 'Project Manager',
  [ROLES.TEAM_MEMBER]: 'Team Member',
  [ROLES.CLIENT]: 'Client',
};

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const PROJECT_STATUS_LABELS = {
  [PROJECT_STATUS.ACTIVE]: 'Active',
  [PROJECT_STATUS.ON_HOLD]: 'On Hold',
  [PROJECT_STATUS.COMPLETED]: 'Completed',
  [PROJECT_STATUS.ARCHIVED]: 'Archived',
};

export const TASK_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
  CLOSED: 'closed',
};

export const TASK_STATUS_LABELS = {
  [TASK_STATUS.OPEN]: 'Open',
  [TASK_STATUS.IN_PROGRESS]: 'In Progress',
  [TASK_STATUS.REVIEW]: 'In Review',
  [TASK_STATUS.COMPLETED]: 'Completed',
  [TASK_STATUS.CLOSED]: 'Closed',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const TASK_PRIORITY_LABELS = {
  [TASK_PRIORITY.LOW]: 'Low',
  [TASK_PRIORITY.MEDIUM]: 'Medium',
  [TASK_PRIORITY.HIGH]: 'High',
  [TASK_PRIORITY.URGENT]: 'Urgent',
};

export const ISSUE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  REOPENED: 'reopened',
};

export const ISSUE_STATUS_LABELS = {
  [ISSUE_STATUS.OPEN]: 'Open',
  [ISSUE_STATUS.IN_PROGRESS]: 'In Progress',
  [ISSUE_STATUS.RESOLVED]: 'Resolved',
  [ISSUE_STATUS.CLOSED]: 'Closed',
  [ISSUE_STATUS.REOPENED]: 'Reopened',
};

export const ISSUE_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export const ISSUE_SEVERITY_LABELS = {
  [ISSUE_SEVERITY.CRITICAL]: 'Critical',
  [ISSUE_SEVERITY.HIGH]: 'High',
  [ISSUE_SEVERITY.MEDIUM]: 'Medium',
  [ISSUE_SEVERITY.LOW]: 'Low',
};

export const SEVERITY_COLORS = {
  [ISSUE_SEVERITY.CRITICAL]: 'bg-red-600',
  [ISSUE_SEVERITY.HIGH]: 'bg-orange-500',
  [ISSUE_SEVERITY.MEDIUM]: 'bg-yellow-500',
  [ISSUE_SEVERITY.LOW]: 'bg-green-500',
};

export const ISSUE_TYPE = {
  BUG: 'bug',
  FEATURE_REQUEST: 'feature_request',
  IMPROVEMENT: 'improvement',
  TASK: 'task',
};

export const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  OVERDUE: 'overdue',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const PRIORITY_COLORS = {
  [TASK_PRIORITY.LOW]: 'bg-green-500',
  [TASK_PRIORITY.MEDIUM]: 'bg-yellow-500',
  [TASK_PRIORITY.HIGH]: 'bg-orange-500',
  [TASK_PRIORITY.URGENT]: 'bg-red-500',
};

export const STATUS_COLORS = {
  [TASK_STATUS.OPEN]: 'bg-blue-500',
  [TASK_STATUS.IN_PROGRESS]: 'bg-yellow-500',
  [TASK_STATUS.REVIEW]: 'bg-purple-500',
  [TASK_STATUS.COMPLETED]: 'bg-green-500',
  [TASK_STATUS.CLOSED]: 'bg-gray-500',
};

export const PROJECT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];
