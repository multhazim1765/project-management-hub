const { Notification, NotificationPreference } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination } = require('../utils/helpers');

/**
 * @desc    Get notifications
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly, type } = req.query;

  const result = await Notification.getForUser(req.userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    unreadOnly: unreadOnly === 'true',
    type,
  });

  const pagination = getPagination(page, limit, result.total);

  ApiResponse.paginated(
    res,
    {
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    },
    pagination
  );
});

/**
 * @desc    Get unread count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.getUnreadCount(req.userId);

  ApiResponse.success(res, { count });
});

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.userId,
  });

  if (!notification) {
    return ApiResponse.notFound(res, 'Notification not found');
  }

  await notification.markAsRead();

  ApiResponse.success(res, { notification });
});

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.markAllAsRead(req.userId);

  ApiResponse.success(res, { count: result.modifiedCount }, 'All notifications marked as read');
});

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({
    _id: req.params.id,
    userId: req.userId,
  });

  ApiResponse.success(res, null, 'Notification deleted');
});

/**
 * @desc    Get notification preferences
 * @route   GET /api/notification-preferences
 * @access  Private
 */
const getPreferences = asyncHandler(async (req, res) => {
  const preferences = await NotificationPreference.getOrCreate(req.userId);

  ApiResponse.success(res, { preferences });
});

/**
 * @desc    Update notification preferences
 * @route   PUT /api/notification-preferences
 * @access  Private
 */
const updatePreferences = asyncHandler(async (req, res) => {
  const {
    emailEnabled,
    inAppEnabled,
    pushEnabled,
    digestEnabled,
    digestFrequency,
    digestTime,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
  } = req.body;

  const preferences = await NotificationPreference.getOrCreate(req.userId);

  if (emailEnabled !== undefined) preferences.emailEnabled = emailEnabled;
  if (inAppEnabled !== undefined) preferences.inAppEnabled = inAppEnabled;
  if (pushEnabled !== undefined) preferences.pushEnabled = pushEnabled;
  if (digestEnabled !== undefined) preferences.digestEnabled = digestEnabled;
  if (digestFrequency) preferences.digestFrequency = digestFrequency;
  if (digestTime) preferences.digestTime = digestTime;
  if (quietHoursEnabled !== undefined) preferences.quietHoursEnabled = quietHoursEnabled;
  if (quietHoursStart) preferences.quietHoursStart = quietHoursStart;
  if (quietHoursEnd) preferences.quietHoursEnd = quietHoursEnd;

  await preferences.save();

  ApiResponse.success(res, { preferences }, 'Preferences updated');
});

/**
 * @desc    Update notification type settings
 * @route   PUT /api/notification-preferences/:type
 * @access  Private
 */
const updateTypeSetting = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const { email, inApp, push } = req.body;

  const preferences = await NotificationPreference.getOrCreate(req.userId);
  await preferences.updateSetting(type, { email, inApp, push });

  ApiResponse.success(res, { preferences }, 'Notification type settings updated');
});

/**
 * @desc    Mute/unmute project notifications
 * @route   POST /api/notification-preferences/projects/:projectId/toggle
 * @access  Private
 */
const toggleProjectMute = asyncHandler(async (req, res) => {
  const preferences = await NotificationPreference.getOrCreate(req.userId);
  await preferences.toggleProjectMute(req.params.projectId);

  const isMuted = preferences.mutedProjects.includes(req.params.projectId);

  ApiResponse.success(res, { isMuted }, `Project notifications ${isMuted ? 'muted' : 'unmuted'}`);
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
  updateTypeSetting,
  toggleProjectMute,
};
