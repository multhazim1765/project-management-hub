const { Organization, User, Project } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const fileService = require('../services/file.service');
const logger = require('../utils/logger');

/**
 * @desc    Create organization
 * @route   POST /api/organizations
 * @access  Private
 */
const createOrganization = asyncHandler(async (req, res) => {
  const { name, description, website, industry, size } = req.body;

  // Check if user already has an organization
  const existingOrg = await Organization.findOne({ owner: req.userId });
  if (existingOrg) {
    return ApiResponse.badRequest(
      res,
      'You already own an organization. Each user can own only one organization.'
    );
  }

  const organization = new Organization({
    name,
    description,
    website,
    industry,
    size,
    owner: req.userId,
  });

  await organization.save();

  // Update user's organization
  await User.findByIdAndUpdate(req.userId, {
    organizationId: organization._id,
    role: 'super_admin',
  });

  await organization.populate('owner', 'firstName lastName email avatar');

  ApiResponse.created(res, { organization }, 'Organization created successfully');
});

/**
 * @desc    Get organization
 * @route   GET /api/organizations/:id
 * @access  Private (Organization Member)
 */
const getOrganization = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id)
    .populate('owner', 'firstName lastName email avatar')
    .populate('memberCount')
    .populate('projectCount');

  if (!organization) {
    return ApiResponse.notFound(res, 'Organization not found');
  }

  // Check if user belongs to this organization
  if (organization._id.toString() !== req.organizationId) {
    return ApiResponse.forbidden(res, 'You do not have access to this organization');
  }

  ApiResponse.success(res, { organization });
});

/**
 * @desc    Get current user's organization
 * @route   GET /api/organizations/me
 * @access  Private
 */
const getMyOrganization = asyncHandler(async (req, res) => {
  if (!req.organizationId) {
    return ApiResponse.notFound(res, 'You are not part of any organization');
  }

  const organization = await Organization.findById(req.organizationId)
    .populate('owner', 'firstName lastName email avatar')
    .populate('memberCount')
    .populate('projectCount');

  if (!organization) {
    return ApiResponse.notFound(res, 'Organization not found');
  }

  ApiResponse.success(res, { organization });
});

/**
 * @desc    Update organization
 * @route   PUT /api/organizations/:id
 * @access  Private (Super Admin)
 */
const updateOrganization = asyncHandler(async (req, res) => {
  const { name, description, website, industry, size } = req.body;

  const organization = await Organization.findById(req.params.id);

  if (!organization) {
    return ApiResponse.notFound(res, 'Organization not found');
  }

  // Update fields
  if (name) organization.name = name;
  if (description !== undefined) organization.description = description;
  if (website !== undefined) organization.website = website;
  if (industry) organization.industry = industry;
  if (size) organization.size = size;

  await organization.save();

  await organization.populate('owner', 'firstName lastName email avatar');

  ApiResponse.success(res, { organization }, 'Organization updated');
});

/**
 * @desc    Update organization settings
 * @route   PUT /api/organizations/:id/settings
 * @access  Private (Super Admin)
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { settings } = req.body;

  const organization = await Organization.findById(req.params.id);

  if (!organization) {
    return ApiResponse.notFound(res, 'Organization not found');
  }

  // Update settings
  organization.settings = {
    ...organization.settings,
    ...settings,
  };

  await organization.save();

  ApiResponse.success(res, { organization }, 'Settings updated');
});

/**
 * @desc    Upload organization logo
 * @route   POST /api/organizations/:id/logo
 * @access  Private (Super Admin)
 */
const uploadLogo = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id);

  if (!organization) {
    return ApiResponse.notFound(res, 'Organization not found');
  }

  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file uploaded');
  }

  // Delete old logo if exists
  if (organization.logo) {
    try {
      const oldKey = organization.logo.replace('/uploads/', '');
      await fileService.deleteFile(oldKey);
    } catch (error) {
      logger.warn('Failed to delete old logo:', error);
    }
  }

  // Upload new logo
  const fileData = await fileService.uploadFile(req.file, {
    folder: 'organizations/logos',
    organizationId: organization._id,
  });

  organization.logo = fileData.url;
  await organization.save();

  ApiResponse.success(res, { organization }, 'Logo uploaded successfully');
});

/**
 * @desc    Get organization users
 * @route   GET /api/organizations/:id/users
 * @access  Private (Organization Member)
 */
const getOrganizationUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;

  const query = { organizationId: req.params.id };

  if (role) {
    query.role = role;
  }

  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await User.countDocuments(query);
  const skip = (page - 1) * limit;

  const users = await User.find(query)
    .select('firstName lastName email avatar role jobTitle isActive createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const pagination = {
    currentPage: parseInt(page),
    totalPages: Math.ceil(total / limit),
    totalItems: total,
    perPage: parseInt(limit),
  };

  ApiResponse.paginated(res, { users }, pagination);
});

/**
 * @desc    Update user role in organization
 * @route   PUT /api/organizations/:id/users/:userId/role
 * @access  Private (Super Admin)
 */
const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const user = await User.findOne({
    _id: userId,
    organizationId: req.params.id,
  });

  if (!user) {
    return ApiResponse.notFound(res, 'User not found in this organization');
  }

  // Prevent changing own role
  if (user._id.toString() === req.userId) {
    return ApiResponse.badRequest(res, 'You cannot change your own role');
  }

  // Prevent changing organization owner role
  const organization = await Organization.findById(req.params.id);
  if (organization.owner.toString() === userId) {
    return ApiResponse.badRequest(
      res,
      'Cannot change the role of the organization owner'
    );
  }

  user.role = role;
  await user.save();

  ApiResponse.success(
    res,
    { user: user.toObject() },
    'User role updated successfully'
  );
});

/**
 * @desc    Deactivate user in organization
 * @route   PUT /api/organizations/:id/users/:userId/deactivate
 * @access  Private (Super Admin)
 */
const deactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findOne({
    _id: userId,
    organizationId: req.params.id,
  });

  if (!user) {
    return ApiResponse.notFound(res, 'User not found in this organization');
  }

  // Prevent deactivating self
  if (user._id.toString() === req.userId) {
    return ApiResponse.badRequest(res, 'You cannot deactivate yourself');
  }

  // Prevent deactivating organization owner
  const organization = await Organization.findById(req.params.id);
  if (organization.owner.toString() === userId) {
    return ApiResponse.badRequest(res, 'Cannot deactivate the organization owner');
  }

  user.isActive = false;
  await user.save();

  ApiResponse.success(res, { user: user.toObject() }, 'User deactivated successfully');
});

/**
 * @desc    Reactivate user in organization
 * @route   PUT /api/organizations/:id/users/:userId/reactivate
 * @access  Private (Super Admin)
 */
const reactivateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findOne({
    _id: userId,
    organizationId: req.params.id,
  });

  if (!user) {
    return ApiResponse.notFound(res, 'User not found in this organization');
  }

  user.isActive = true;
  await user.save();

  ApiResponse.success(res, { user: user.toObject() }, 'User reactivated successfully');
});

/**
 * @desc    Get organization statistics
 * @route   GET /api/organizations/:id/stats
 * @access  Private (Organization Member)
 */
const getOrganizationStats = asyncHandler(async (req, res) => {
  const orgId = req.params.id;

  // Get counts
  const userCount = await User.countDocuments({ organizationId: orgId });
  const activeUserCount = await User.countDocuments({
    organizationId: orgId,
    isActive: true,
  });

  const projectCount = await Project.countDocuments({ organizationId: orgId });
  const activeProjectCount = await Project.countDocuments({
    organizationId: orgId,
    status: 'active',
  });

  const organization = await Organization.findById(orgId);

  const stats = {
    users: {
      total: userCount,
      active: activeUserCount,
      limit: organization.billingInfo.maxUsers,
    },
    projects: {
      total: projectCount,
      active: activeProjectCount,
      limit: organization.billingInfo.maxProjects,
    },
    storage: {
      used: organization.storageUsed,
      limit: organization.billingInfo.maxStorage,
      usedPercentage: Math.round(
        (organization.storageUsed / organization.billingInfo.maxStorage) * 100
      ),
    },
    billing: {
      plan: organization.billingInfo.plan,
      status: organization.billingInfo.subscriptionStatus,
      currentPeriodEnd: organization.billingInfo.currentPeriodEnd,
    },
  };

  ApiResponse.success(res, { stats });
});

/**
 * @desc    Delete organization
 * @route   DELETE /api/organizations/:id
 * @access  Private (Organization Owner)
 */
const deleteOrganization = asyncHandler(async (req, res) => {
  const organization = await Organization.findById(req.params.id);

  if (!organization) {
    return ApiResponse.notFound(res, 'Organization not found');
  }

  // Only owner can delete
  if (organization.owner.toString() !== req.userId) {
    return ApiResponse.forbidden(
      res,
      'Only the organization owner can delete the organization'
    );
  }

  // Soft delete - just deactivate
  organization.isActive = false;
  await organization.save();

  ApiResponse.success(res, null, 'Organization deactivated successfully');
});

module.exports = {
  createOrganization,
  getOrganization,
  getMyOrganization,
  updateOrganization,
  updateSettings,
  uploadLogo,
  getOrganizationUsers,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  getOrganizationStats,
  deleteOrganization,
};
