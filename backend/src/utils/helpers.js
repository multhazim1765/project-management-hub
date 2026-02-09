const crypto = require('crypto');
const { PAGINATION } = require('../config/constants');

/**
 * Generate a random token
 * @param {number} length - Token length in bytes
 * @returns {string} - Hex string token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Calculate pagination parameters
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} - Pagination object
 */
const getPagination = (page, limit, total) => {
  const currentPage = Math.max(1, parseInt(page) || PAGINATION.DEFAULT_PAGE);
  const perPage = Math.min(
    Math.max(1, parseInt(limit) || PAGINATION.DEFAULT_LIMIT),
    PAGINATION.MAX_LIMIT
  );
  const totalPages = Math.ceil(total / perPage);
  const skip = (currentPage - 1) * perPage;

  return {
    currentPage,
    perPage,
    total,
    totalPages,
    skip,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

/**
 * Format date to ISO string without time
 * @param {Date} date - Date object
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Check if a date is overdue
 * @param {Date} dueDate - Due date
 * @returns {boolean} - True if overdue
 */
const isOverdue = (dueDate) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

/**
 * Calculate progress percentage
 * @param {number} completed - Completed items
 * @param {number} total - Total items
 * @returns {number} - Progress percentage (0-100)
 */
const calculateProgress = (completed, total) => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

/**
 * Sanitize object by removing undefined and null values
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

/**
 * Extract mentions from text content
 * @param {string} content - Text content
 * @returns {Array} - Array of mentioned usernames
 */
const extractMentions = (content) => {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return [...new Set(mentions)];
};

/**
 * Generate slug from string
 * @param {string} text - Input text
 * @returns {string} - URL-friendly slug
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Get date range for weekly timesheet
 * @param {Date} date - Any date within the week
 * @returns {Object} - Start and end dates of the week
 */
const getWeekRange = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);

  const startOfWeek = new Date(d.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return { startOfWeek, endOfWeek };
};

module.exports = {
  generateToken,
  getPagination,
  formatDate,
  isOverdue,
  calculateProgress,
  sanitizeObject,
  extractMentions,
  generateSlug,
  getWeekRange,
};
