const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Validation middleware - checks express-validator results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    }));

    return ApiResponse.badRequest(res, 'Validation failed', formattedErrors);
  }

  next();
};

/**
 * Sanitize MongoDB query parameters to prevent NoSQL injection
 */
const sanitizeQuery = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Remove keys starting with $ (MongoDB operators)
      if (key.startsWith('$')) {
        continue;
      }

      if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  req.query = sanitize(req.query);
  req.body = sanitize(req.body);
  req.params = sanitize(req.params);

  next();
};

/**
 * Validate MongoDB ObjectId format
 */
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName];
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;

    if (id && !objectIdRegex.test(id)) {
      return ApiResponse.badRequest(res, `Invalid ${paramName} format`);
    }

    next();
  };
};

/**
 * Validate pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page);
    if (isNaN(pageNum) || pageNum < 1) {
      return ApiResponse.badRequest(res, 'Page must be a positive integer');
    }
    req.query.page = pageNum;
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return ApiResponse.badRequest(res, 'Limit must be between 1 and 100');
    }
    req.query.limit = limitNum;
  }

  next();
};

/**
 * Validate date format
 */
const validateDateParam = (paramName) => {
  return (req, res, next) => {
    const dateValue = req.query[paramName] || req.body[paramName];

    if (dateValue) {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return ApiResponse.badRequest(res, `Invalid date format for ${paramName}`);
      }
    }

    next();
  };
};

module.exports = {
  validate,
  sanitizeQuery,
  validateObjectId,
  validatePagination,
  validateDateParam,
};
