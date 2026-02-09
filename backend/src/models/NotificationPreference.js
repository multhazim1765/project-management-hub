const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../config/constants');

const notificationSettingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
    },
    email: {
      type: Boolean,
      default: true,
    },
    inApp: {
      type: Boolean,
      default: true,
    },
    push: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    emailEnabled: {
      type: Boolean,
      default: true,
    },
    inAppEnabled: {
      type: Boolean,
      default: true,
    },
    pushEnabled: {
      type: Boolean,
      default: false,
    },
    digestEnabled: {
      type: Boolean,
      default: false,
    },
    digestFrequency: {
      type: String,
      enum: ['daily', 'weekly'],
      default: 'daily',
    },
    digestTime: {
      type: String,
      default: '09:00',
    },
    quietHoursEnabled: {
      type: Boolean,
      default: false,
    },
    quietHoursStart: {
      type: String,
      default: '22:00',
    },
    quietHoursEnd: {
      type: String,
      default: '08:00',
    },
    settings: {
      type: [notificationSettingSchema],
      default: () =>
        Object.values(NOTIFICATION_TYPES).map((type) => ({
          type,
          email: true,
          inApp: true,
          push: true,
        })),
    },
    mutedProjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index
notificationPreferenceSchema.index({ userId: 1 });

// Method to check if notification should be sent
notificationPreferenceSchema.methods.shouldNotify = function (type, channel) {
  // Check if global channel is enabled
  if (channel === 'email' && !this.emailEnabled) return false;
  if (channel === 'inApp' && !this.inAppEnabled) return false;
  if (channel === 'push' && !this.pushEnabled) return false;

  // Check quiet hours for email and push
  if ((channel === 'email' || channel === 'push') && this.quietHoursEnabled) {
    const now = new Date();
    const currentTime =
      now.getHours().toString().padStart(2, '0') +
      ':' +
      now.getMinutes().toString().padStart(2, '0');

    const start = this.quietHoursStart;
    const end = this.quietHoursEnd;

    // Handle overnight quiet hours
    if (start > end) {
      if (currentTime >= start || currentTime < end) return false;
    } else {
      if (currentTime >= start && currentTime < end) return false;
    }
  }

  // Check specific notification type setting
  const setting = this.settings.find((s) => s.type === type);
  if (!setting) return true; // Default to enabled if not found

  return setting[channel];
};

// Method to update settings for a notification type
notificationPreferenceSchema.methods.updateSetting = async function (type, updates) {
  const settingIndex = this.settings.findIndex((s) => s.type === type);

  if (settingIndex >= 0) {
    Object.assign(this.settings[settingIndex], updates);
  } else {
    this.settings.push({
      type,
      email: updates.email ?? true,
      inApp: updates.inApp ?? true,
      push: updates.push ?? true,
    });
  }

  return this.save();
};

// Method to mute/unmute project
notificationPreferenceSchema.methods.toggleProjectMute = async function (projectId) {
  const index = this.mutedProjects.indexOf(projectId);
  if (index >= 0) {
    this.mutedProjects.splice(index, 1);
  } else {
    this.mutedProjects.push(projectId);
  }
  return this.save();
};

// Static method to get or create preferences
notificationPreferenceSchema.statics.getOrCreate = async function (userId) {
  let preferences = await this.findOne({ userId });

  if (!preferences) {
    preferences = new this({ userId });
    await preferences.save();
  }

  return preferences;
};

// Static method to get users to notify
notificationPreferenceSchema.statics.getUsersToNotify = async function (
  userIds,
  notificationType,
  channel,
  projectId = null
) {
  const preferences = await this.find({
    userId: { $in: userIds },
  });

  return userIds.filter((userId) => {
    const pref = preferences.find((p) => p.userId.toString() === userId.toString());

    // If no preferences set, default to notify
    if (!pref) return true;

    // Check if project is muted
    if (projectId && pref.mutedProjects.includes(projectId)) return false;

    // Check notification preferences
    return pref.shouldNotify(notificationType, channel);
  });
};

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
