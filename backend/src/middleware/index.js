const { authenticate, optionalAuth, verifyRefreshToken } = require('./auth');
const {
  authorizeRoles,
  authorizeMinRole,
  authorizeProjectAccess,
  authorizeProjectWrite,
  authorizeProjectManage,
  authorizeOwnerOrAdmin,
  authorizeOrganization,
  authorizeClientAccess,
  ROLES,
} = require('./authorize');
const {
  validate,
  sanitizeQuery,
  validateObjectId,
  validatePagination,
  validateDateParam,
} = require('./validate');
const {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
} = require('./errorHandler');
const {
  apiLimiter,
  authLimiter,
  createAccountLimiter,
  passwordResetLimiter,
  uploadLimiter,
} = require('./rateLimiter');
const {
  upload,
  avatarUpload,
  documentUpload,
  handleUploadError,
} = require('./upload');

module.exports = {
  // Auth
  authenticate,
  optionalAuth,
  verifyRefreshToken,

  // Authorization
  authorizeRoles,
  authorizeMinRole,
  authorizeProjectAccess,
  authorizeProjectWrite,
  authorizeProjectManage,
  authorizeOwnerOrAdmin,
  authorizeOrganization,
  authorizeClientAccess,
  ROLES,

  // Validation
  validate,
  sanitizeQuery,
  validateObjectId,
  validatePagination,
  validateDateParam,

  // Error handling
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,

  // Rate limiting
  apiLimiter,
  authLimiter,
  createAccountLimiter,
  passwordResetLimiter,
  uploadLimiter,

  // File upload
  upload,
  avatarUpload,
  documentUpload,
  handleUploadError,
};
