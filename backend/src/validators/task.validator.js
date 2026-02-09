const { body, param, query } = require('express-validator');
const { TASK_STATUS, TASK_PRIORITY, DEPENDENCY_TYPES } = require('../config/constants');

const createTaskValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage('Invalid priority'),
  body('status')
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage('Invalid status'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  body('assigneeIds')
    .optional()
    .isArray()
    .withMessage('Assignee IDs must be an array'),
  body('assigneeIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignee ID'),
  body('milestoneId')
    .optional()
    .isMongoId()
    .withMessage('Invalid milestone ID'),
  body('parentTaskId')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent task ID'),
  body('labels')
    .optional()
    .isArray()
    .withMessage('Labels must be an array'),
];

const updateTaskValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Task title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
  body('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage('Invalid priority'),
  body('status')
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage('Invalid status'),
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  body('progress')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100'),
];

const assignTaskValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('assigneeIds')
    .isArray({ min: 1 })
    .withMessage('At least one assignee is required'),
  body('assigneeIds.*')
    .isMongoId()
    .withMessage('Invalid assignee ID'),
];

const updateStatusValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('status')
    .isIn(Object.values(TASK_STATUS))
    .withMessage('Invalid status'),
];

const addDependencyValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('dependsOnTaskId')
    .isMongoId()
    .withMessage('Invalid dependency task ID'),
  body('type')
    .optional()
    .isIn(Object.values(DEPENDENCY_TYPES))
    .withMessage('Invalid dependency type'),
];

const listTasksValidator = [
  query('status')
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage('Invalid status'),
  query('priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage('Invalid priority'),
  query('assigneeId')
    .optional()
    .isMongoId()
    .withMessage('Invalid assignee ID'),
  query('milestoneId')
    .optional()
    .isMongoId()
    .withMessage('Invalid milestone ID'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'dueDate', 'priority', 'status', 'title'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc', '1', '-1'])
    .withMessage('Invalid sort order'),
];

const bulkUpdateValidator = [
  body('taskIds')
    .isArray({ min: 1 })
    .withMessage('At least one task ID is required'),
  body('taskIds.*')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('updates')
    .isObject()
    .withMessage('Updates must be an object'),
  body('updates.status')
    .optional()
    .isIn(Object.values(TASK_STATUS))
    .withMessage('Invalid status'),
  body('updates.priority')
    .optional()
    .isIn(Object.values(TASK_PRIORITY))
    .withMessage('Invalid priority'),
  body('updates.assigneeIds')
    .optional()
    .isArray()
    .withMessage('Assignee IDs must be an array'),
];

const createLabelValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Label name is required')
    .isLength({ max: 50 })
    .withMessage('Label name cannot exceed 50 characters'),
  body('color')
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid color format'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
];

module.exports = {
  createTaskValidator,
  updateTaskValidator,
  assignTaskValidator,
  updateStatusValidator,
  addDependencyValidator,
  listTasksValidator,
  bulkUpdateValidator,
  createLabelValidator,
};
