const { authService } = require('../services');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);

  ApiResponse.created(res, result, 'Registration successful. Please check your email to verify your account.');
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const userAgent = req.headers['user-agent'] || '';

  const result = await authService.login(email, password, userAgent);

  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ApiResponse.success(res, {
    user: result.user,
    accessToken: result.accessToken,
  }, 'Login successful');
});

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (refreshToken) {
    await authService.logout(req.userId, refreshToken);
  }

  res.clearCookie('refreshToken');

  ApiResponse.success(res, null, 'Logged out successfully');
});

/**
 * @desc    Logout from all devices
 * @route   POST /api/auth/logout-all
 * @access  Private
 */
const logoutAll = asyncHandler(async (req, res) => {
  await authService.logoutAll(req.userId);

  res.clearCookie('refreshToken');

  ApiResponse.success(res, null, 'Logged out from all devices');
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
const refreshToken = asyncHandler(async (req, res) => {
  const result = await authService.refreshToken(req.user, req.refreshToken);

  // Set new refresh token as HTTP-only cookie
  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  ApiResponse.success(res, {
    accessToken: result.accessToken,
  }, 'Token refreshed');
});

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  ApiResponse.success(res, { user: req.user });
});

/**
 * @desc    Verify email
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;

  await authService.verifyEmail(token);

  ApiResponse.success(res, null, 'Email verified successfully');
});

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  await authService.resendVerification(email);

  ApiResponse.success(res, null, 'Verification email sent');
});

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  await authService.forgotPassword(email);

  // Always return success to prevent email enumeration
  ApiResponse.success(res, null, 'If an account exists with this email, you will receive a password reset link');
});

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  await authService.resetPassword(token, password);

  ApiResponse.success(res, null, 'Password reset successful');
});

/**
 * @desc    Change password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  await authService.changePassword(req.userId, currentPassword, newPassword);

  res.clearCookie('refreshToken');

  ApiResponse.success(res, null, 'Password changed successfully. Please login again.');
});

/**
 * @desc    Update profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, jobTitle, department, timezone } = req.body;

  const user = req.user;
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone !== undefined) user.phone = phone;
  if (jobTitle !== undefined) user.jobTitle = jobTitle;
  if (department !== undefined) user.department = department;
  if (timezone) user.timezone = timezone;

  await user.save();

  ApiResponse.success(res, { user }, 'Profile updated');
});

/**
 * @desc    Upload avatar
 * @route   POST /api/auth/avatar
 * @access  Private
 */
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    return ApiResponse.badRequest(res, 'Please upload an image');
  }

  const { fileService } = require('../services');
  const result = await fileService.uploadFile(req.file, { folder: 'avatars' });

  req.user.avatar = result.url;
  await req.user.save();

  ApiResponse.success(res, { avatar: result.url }, 'Avatar uploaded');
});

/**
 * @desc    Invite user to organization
 * @route   POST /api/organizations/:id/invite
 * @access  Private (Admin)
 */
const inviteUser = asyncHandler(async (req, res) => {
  const invitation = await authService.inviteUser(req.user, req.body);

  ApiResponse.created(res, { invitation }, 'Invitation sent');
});

/**
 * @desc    Accept invitation
 * @route   POST /api/auth/accept-invitation
 * @access  Public
 */
const acceptInvitation = asyncHandler(async (req, res) => {
  const user = await authService.acceptInvitation(req.body.token, req.body);

  ApiResponse.success(res, { user }, 'Invitation accepted. You can now login.');
});

/**
 * @desc    Get pending invitations
 * @route   GET /api/organizations/:id/invitations
 * @access  Private (Admin)
 */
const getPendingInvitations = asyncHandler(async (req, res) => {
  const invitations = await authService.getPendingInvitations(req.organizationId);

  ApiResponse.success(res, { invitations });
});

/**
 * @desc    Revoke invitation
 * @route   DELETE /api/invitations/:id
 * @access  Private (Admin)
 */
const revokeInvitation = asyncHandler(async (req, res) => {
  await authService.revokeInvitation(req.params.id, req.userId);

  ApiResponse.success(res, null, 'Invitation revoked');
});

module.exports = {
  register,
  login,
  logout,
  logoutAll,
  refreshToken,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  uploadAvatar,
  inviteUser,
  acceptInvitation,
  getPendingInvitations,
  revokeInvitation,
};
