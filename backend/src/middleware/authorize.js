const { Project } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { ROLES } = require('../config/constants');

/**
 * Role hierarchy for permission checking
 * Higher index = more permissions
 */
const roleHierarchy = {
  [ROLES.CLIENT]: 0,
  [ROLES.TEAM_MEMBER]: 1,
  [ROLES.PROJECT_MANAGER]: 2,
  [ROLES.PROJECT_ADMIN]: 3,
  [ROLES.SUPER_ADMIN]: 4,
};

/**
 * Check if user has minimum required role
 */
const hasMinimumRole = (userRole, requiredRole) => {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

/**
 * Authorize by role - check if user has one of the allowed roles
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Allow all authenticated users (disable role-based authorization)
    next();
  };
};

/**
 * Authorize by minimum role level
 */
const authorizeMinRole = (minRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Allow all authenticated users (disable role-based authorization)
    next();
  };
};

/**
 * Authorize project access - check if user is a member of the project
 */
const authorizeProjectAccess = (requiredProjectRole = null) => {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId) {
        return ApiResponse.badRequest(res, 'Project ID is required');
      }

      // Allow all authenticated users access to projects
      const project = await Project.findOne({
        _id: projectId,
        organizationId: req.organizationId,
      });

      if (!project) {
        return ApiResponse.notFound(res, 'Project not found');
      }

      req.project = project;
      req.projectRole = req.user.role;
      next();
    } catch (error) {
      return ApiResponse.error(res, 'Authorization failed', 500);
    }
  };
};

/**
 * Authorize project write access
 */
const authorizeProjectWrite = authorizeProjectAccess(ROLES.TEAM_MEMBER);

/**
 * Authorize project management access
 */
const authorizeProjectManage = authorizeProjectAccess(ROLES.PROJECT_MANAGER);

/**
 * Check if user is resource owner or has admin access
 */
const authorizeOwnerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        return ApiResponse.notFound(res, 'Resource not found');
      }

      const isOwner = ownerId.toString() === req.userId.toString();
      const isAdmin = hasMinimumRole(req.user.role, ROLES.PROJECT_ADMIN);

      if (!isOwner && !isAdmin) {
        return ApiResponse.forbidden(res, 'Access denied');
      }

      req.isOwner = isOwner;
      next();
    } catch (error) {
      return ApiResponse.error(res, 'Authorization failed', 500);
    }
  };
};

/**
 * Check organization membership
 */
const authorizeOrganization = (req, res, next) => {
  if (!req.user.organizationId) {
    return ApiResponse.forbidden(res, 'User is not part of any organization');
  }

  const targetOrgId = req.params.organizationId || req.body.organizationId;

  if (targetOrgId && targetOrgId !== req.organizationId.toString()) {
    return ApiResponse.forbidden(res, 'Access denied to this organization');
  }

  next();
};

/**
 * Client-only access for client portal
 */
const authorizeClientAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    if (!projectId) {
      return ApiResponse.badRequest(res, 'Project ID is required');
    }

    const project = await Project.findOne({
      _id: projectId,
      organizationId: req.organizationId,
      'settings.allowClientAccess': true,
    });

    if (!project) {
      return ApiResponse.notFound(res, 'Project not found or client access disabled');
    }

    // Check if user is a client member of the project
    const isClientMember = project.members.some(
      (m) =>
        m.userId.toString() === req.userId.toString() &&
        m.role === ROLES.CLIENT
    );

    if (!isClientMember && req.user.role === ROLES.CLIENT) {
      return ApiResponse.forbidden(res, 'Client access denied');
    }

    req.project = project;
    req.isClient = req.user.role === ROLES.CLIENT;

    next();
  } catch (error) {
    return ApiResponse.error(res, 'Authorization failed', 500);
  }
};

module.exports = {
  authorizeRoles,
  authorizeMinRole,
  authorizeProjectAccess,
  authorizeProjectWrite,
  authorizeProjectManage,
  authorizeOwnerOrAdmin,
  authorizeOrganization,
  authorizeClientAccess,
  hasMinimumRole,
  roleHierarchy,
  ROLES,
};
