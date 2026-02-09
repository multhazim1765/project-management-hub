const express = require('express');
const router = express.Router();
const { authController } = require('../controllers');
const {
  authenticate,
  verifyRefreshToken,
  validate,
  authLimiter,
  createAccountLimiter,
  passwordResetLimiter,
  avatarUpload,
  handleUploadError,
} = require('../middleware');
const {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  acceptInvitationValidator,
} = require('../validators');

// Public routes
router.post('/register', createAccountLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);
router.post('/accept-invitation', acceptInvitationValidator, validate, authController.acceptInvitation);

// Token refresh
router.post('/refresh-token', verifyRefreshToken, authController.refreshToken);

// Protected routes
router.use(authenticate);

router.get('/me', authController.getMe);
router.post('/logout', authController.logout);
router.post('/logout-all', authController.logoutAll);
router.post('/change-password', changePasswordValidator, validate, authController.changePassword);
router.put('/profile', authController.updateProfile);
router.post('/avatar', avatarUpload.single('avatar'), handleUploadError, authController.uploadAvatar);

module.exports = router;
