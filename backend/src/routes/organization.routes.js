const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const {
  authenticate,
  authorizeRoles,
  authorizeOrganization,
  validateObjectId,
  avatarUpload,
  handleUploadError,
} = require('../middleware');
const { ROLES } = require('../config/constants');

// All routes require authentication
router.use(authenticate);

// Get current user's organization
router.get('/me', organizationController.getMyOrganization);

// Create organization
router.post('/', organizationController.createOrganization);

// Get organization
router.get(
  '/:id',
  validateObjectId('id'),
  authorizeOrganization,
  organizationController.getOrganization
);

// Update organization (Super Admin only)
router.put(
  '/:id',
  validateObjectId('id'),
  authorizeOrganization,
  authorizeRoles(ROLES.SUPER_ADMIN),
  organizationController.updateOrganization
);

// Update organization settings (Super Admin only)
router.put(
  '/:id/settings',
  validateObjectId('id'),
  authorizeOrganization,
  authorizeRoles(ROLES.SUPER_ADMIN),
  organizationController.updateSettings
);

// Upload organization logo (Super Admin only)
router.post(
  '/:id/logo',
  validateObjectId('id'),
  authorizeOrganization,
  authorizeRoles(ROLES.SUPER_ADMIN),
  avatarUpload.single('logo'),
  handleUploadError,
  organizationController.uploadLogo
);

// Get organization statistics
router.get(
  '/:id/stats',
  validateObjectId('id'),
  authorizeOrganization,
  organizationController.getOrganizationStats
);

// Get organization users
router.get(
  '/:id/users',
  validateObjectId('id'),
  authorizeOrganization,
  organizationController.getOrganizationUsers
);

// Update user role (Super Admin only)
router.put(
  '/:id/users/:userId/role',
  validateObjectId('id'),
  authorizeOrganization,
  authorizeRoles(ROLES.SUPER_ADMIN),
  organizationController.updateUserRole
);

// Deactivate user (Super Admin only)
router.put(
  '/:id/users/:userId/deactivate',
  validateObjectId('id'),
  authorizeOrganization,
  authorizeRoles(ROLES.SUPER_ADMIN),
  organizationController.deactivateUser
);

// Reactivate user (Super Admin only)
router.put(
  '/:id/users/:userId/reactivate',
  validateObjectId('id'),
  authorizeOrganization,
  authorizeRoles(ROLES.SUPER_ADMIN),
  organizationController.reactivateUser
);

// Delete organization (Owner only)
router.delete(
  '/:id',
  validateObjectId('id'),
  organizationController.deleteOrganization
);

module.exports = router;
