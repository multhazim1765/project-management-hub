const jwt = require('jsonwebtoken');
const { User, Organization, Invitation } = require('../models');
const jwtConfig = require('../config/jwt');
const { generateToken } = require('../utils/helpers');
const { USER_STATUS, ROLES, INVITATION_STATUS } = require('../config/constants');
const emailService = require('./email.service');
const logger = require('../utils/logger');

class AuthService {
  /**
   * Generate access token
   */
  generateAccessToken(userId) {
    return jwt.sign({ userId }, jwtConfig.accessToken.secret, {
      expiresIn: jwtConfig.accessToken.expiry,
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId) {
    return jwt.sign({ userId }, jwtConfig.refreshToken.secret, {
      expiresIn: jwtConfig.refreshToken.expiry,
    });
  }

  /**
   * Register a new user and organization
   */
  async register(userData) {
    const { email, password, firstName, lastName, organizationName } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create organization (always create one, even if organizationName is not provided)
    const organization = new Organization({
      name: organizationName || `${firstName} ${lastName}'s Workspace`,
      owner: null, // Will be updated after user creation
    });

    // Create user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: ROLES.SUPER_ADMIN,
      status: USER_STATUS.PENDING,
      organizationId: organization._id,
      emailVerificationToken: generateToken(32),
      emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    await user.save();

    // Update organization owner
    organization.owner = user._id;
    await organization.save();

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, user.emailVerificationToken);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
    }

    return {
      user: user.toJSON(),
      organization: organization.toJSON(),
    };
  }

  /**
   * Login user
   */
  async login(email, password, userAgent = '') {
    const user = await User.findByCredentials(email, password);

    if (user.status === USER_STATUS.SUSPENDED) {
      throw new Error('Your account has been suspended');
    }

    // Auto-verify email for development (remove in production if email verification is required)
    if (!user.emailVerified) {
      user.emailVerified = true;
      user.status = USER_STATUS.ACTIVE;
      await user.save();
    }

    // Ensure user is active
    if (user.status !== USER_STATUS.ACTIVE) {
      user.status = USER_STATUS.ACTIVE;
      await user.save();
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Save refresh token
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: refreshTokenExpiry,
      userAgent,
    });

    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    user.lastLogin = new Date();
    await user.save();

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Logout user
   */
  async logout(userId, refreshToken) {
    await User.updateOne(
      { _id: userId },
      { $pull: { refreshTokens: { token: refreshToken } } }
    );
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId) {
    await User.updateOne({ _id: userId }, { $set: { refreshTokens: [] } });
  }

  /**
   * Refresh access token
   */
  async refreshToken(user, oldRefreshToken) {
    // Generate new tokens
    const accessToken = this.generateAccessToken(user._id);
    const newRefreshToken = this.generateRefreshToken(user._id);

    // Replace old refresh token with new one using atomic update
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);

    // Use atomic update to avoid version conflicts
    await User.updateOne(
      { _id: user._id },
      {
        $pull: { refreshTokens: { token: oldRefreshToken } },
      }
    );

    // Push the new token
    await User.updateOne(
      { _id: user._id },
      {
        $push: {
          refreshTokens: {
            token: newRefreshToken,
            expiresAt: refreshTokenExpiry,
          },
        },
      }
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new Error('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.status = USER_STATUS.ACTIVE;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpiry = undefined;

    await user.save();

    return user;
  }

  /**
   * Resend verification email
   */
  async resendVerification(email) {
    const user = await User.findOne({ email, status: USER_STATUS.PENDING });

    if (!user) {
      throw new Error('User not found or already verified');
    }

    user.emailVerificationToken = generateToken(32);
    user.emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    await emailService.sendVerificationEmail(user.email, user.emailVerificationToken);
  }

  /**
   * Forgot password
   */
  async forgotPassword(email) {
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    user.passwordResetToken = generateToken(32);
    user.passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.save();

    await emailService.sendPasswordResetEmail(user.email, user.passwordResetToken);
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.refreshTokens = []; // Logout from all devices

    await user.save();
  }

  /**
   * Change password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new Error('User not found');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new Error('Current password is incorrect');
    }

    user.password = newPassword;
    user.refreshTokens = []; // Logout from all devices

    await user.save();
  }

  /**
   * Invite user to organization
   */
  async inviteUser(invitedBy, inviteData) {
    const { email, role, projectIds, message } = inviteData;
    const organizationId = invitedBy.organizationId;

    // Check if user already exists in organization
    const existingUser = await User.findOne({ email, organizationId });
    if (existingUser) {
      throw new Error('User is already a member of this organization');
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      email,
      organizationId,
      status: INVITATION_STATUS.PENDING,
    });

    if (existingInvitation) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Create invitation
    const invitation = new Invitation({
      email,
      organizationId,
      role,
      projectIds,
      invitedBy: invitedBy._id,
      message,
    });

    await invitation.save();

    // Send invitation email
    await emailService.sendInvitationEmail(
      email,
      invitation.token,
      invitedBy.fullName,
      invitedBy.organizationId.name || 'Organization'
    );

    return invitation;
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(token, userData) {
    const { password, firstName, lastName } = userData;

    const invitation = await Invitation.findValidByToken(token);
    if (!invitation) {
      throw new Error('Invalid or expired invitation');
    }

    // Check if user already exists
    let user = await User.findOne({ email: invitation.email });

    if (user) {
      // Add user to organization
      user.organizationId = invitation.organizationId;
      user.role = invitation.role;
    } else {
      // Create new user
      user = new User({
        email: invitation.email,
        password,
        firstName,
        lastName,
        role: invitation.role,
        organizationId: invitation.organizationId,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
      });
    }

    await user.save();

    // Add user to projects if specified
    if (invitation.projectIds?.length > 0) {
      const Project = require('../models/Project');
      await Project.updateMany(
        { _id: { $in: invitation.projectIds } },
        {
          $push: {
            members: {
              userId: user._id,
              role: invitation.role,
              addedBy: invitation.invitedBy,
            },
          },
        }
      );
    }

    // Mark invitation as accepted
    await invitation.accept();

    return user;
  }

  /**
   * Revoke invitation
   */
  async revokeInvitation(invitationId, userId) {
    const invitation = await Invitation.findById(invitationId);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    await invitation.revoke();
  }

  /**
   * Get pending invitations for organization
   */
  async getPendingInvitations(organizationId) {
    return Invitation.findPendingByOrganization(organizationId);
  }
}

module.exports = new AuthService();
