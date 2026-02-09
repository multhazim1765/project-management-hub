const jwt = require('jsonwebtoken');
const { User, Organization } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const jwtConfig = require('../config/jwt');
const { USER_STATUS } = require('../config/constants');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.unauthorized(res, 'Access token required');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, jwtConfig.accessToken.secret);

      const user = await User.findById(decoded.userId)
        .populate('organizationId', 'name slug');

      if (!user) {
        return ApiResponse.unauthorized(res, 'User not found');
      }

      if (user.status !== USER_STATUS.ACTIVE) {
        return ApiResponse.unauthorized(res, 'Account is not active');
      }

      // Create a default organization if user doesn't have one
      let organizationId = user.organizationId?._id;
      if (!organizationId) {
        const org = new Organization({
          name: `${user.firstName} ${user.lastName}'s Workspace`,
          owner: user._id,
        });
        await org.save();
        organizationId = org._id;
        user.organizationId = org._id;
        await user.save();
      }

      req.user = user;
      req.userId = user._id;
      req.organizationId = organizationId;

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Token expired');
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return ApiResponse.unauthorized(res, 'Invalid token');
      }
      throw jwtError;
    }
  } catch (error) {
    return ApiResponse.error(res, 'Authentication failed', 500);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, jwtConfig.accessToken.secret);
      const user = await User.findById(decoded.userId);

      if (user && user.status === USER_STATUS.ACTIVE) {
        req.user = user;
        req.userId = user._id;
        req.organizationId = user.organizationId;
      }
    } catch {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Refresh token verification
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    // Try to get refresh token from cookie first (preferred), then from body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return ApiResponse.badRequest(res, 'Refresh token required');
    }

    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshToken.secret);

      const user = await User.findById(decoded.userId).select('+refreshTokens');

      if (!user) {
        return ApiResponse.unauthorized(res, 'User not found');
      }

      // Check if refresh token exists in user's token list
      const tokenExists = user.refreshTokens.some(
        (t) => t.token === refreshToken && t.expiresAt > new Date()
      );

      if (!tokenExists) {
        return ApiResponse.unauthorized(res, 'Invalid refresh token');
      }

      req.user = user;
      req.refreshToken = refreshToken;

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Refresh token expired');
      }
      return ApiResponse.unauthorized(res, 'Invalid refresh token');
    }
  } catch (error) {
    return ApiResponse.error(res, 'Token verification failed', 500);
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  verifyRefreshToken,
};
