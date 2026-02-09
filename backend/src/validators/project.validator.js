const { body, param, query } = require('express-validator');
const { PROJECT_STATUS, ROLES } = require('../config/constants');

const createProjectValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('key')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Project key cannot exceed 10 characters')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Project key must be uppercase letters and numbers only'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (value && req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
  body('templateId')
    .optional()
    .isMongoId()
    .withMessage('Invalid template ID'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Invalid color format'),
];

const updateProjectValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage('Invalid status'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid priority'),
];

const addMemberValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
  body('role')
    .isIn([ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER, ROLES.CLIENT])
    .withMessage('Invalid role'),
];

const removeMemberValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid project ID'),
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),
];

const listProjectsValidator = [
  query('status')
    .optional()
    .isIn(Object.values(PROJECT_STATUS))
    .withMessage('Invalid status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query too long'),
];

const createFromTemplateValidator = [
  body('templateId')
    .isMongoId()
    .withMessage('Invalid template ID'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
];

module.exports = {
  createProjectValidator,
  updateProjectValidator,
  addMemberValidator,
  removeMemberValidator,
  listProjectsValidator,
  createFromTemplateValidator,
};
